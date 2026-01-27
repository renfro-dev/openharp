import passport from 'passport';
import { AzureADStrategy } from 'passport-azure-ad';
import type { Request, Response, NextFunction } from 'express';
import * as supabase from './supabase.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  microsoftId: string;
}

/**
 * Initialize Passport with Microsoft Azure AD strategy
 */
export function initializePassport(): void {
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const callbackURL = process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:5000/auth/microsoft/callback';

  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables are required');
  }

  const strategy = new AzureADStrategy(
    {
      identityMetadata: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
      clientID: clientId,
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: callbackURL,
      allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
      clientSecret: clientSecret,
      passReqToCallback: false,
      scope: ['profile', 'email'],
      loggingLevel: 'info',
      nonceLifetime: null
    },
    async (profile: any, done: any) => {
      try {
        console.log('[Auth] Microsoft OAuth profile received:', {
          id: profile.oid,
          email: profile.upn,
          name: profile.displayName
        });

        const email = profile.upn || profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in profile'));
        }

        // Get or create user in Supabase
        let user = await supabase.getUserByEmail(email);

        if (!user) {
          // First time login - user needs to configure ClickUp
          console.log(`[Auth] New user first login: ${email}`);
          user = await supabase.createOrUpdateUser(
            email,
            profile.oid,
            profile.displayName || email,
            '', // Empty until configured
            ''  // Empty until configured
          );
        } else {
          console.log(`[Auth] Returning user logged in: ${email}`);
        }

        const authenticatedUser: AuthenticatedUser = {
          id: user.id,
          email: user.email,
          displayName: user.display_name || email,
          microsoftId: user.microsoft_id
        };

        return done(null, authenticatedUser);
      } catch (error) {
        console.error('[Auth] Error in authentication callback:', error);
        return done(error);
      }
    }
  );

  passport.use('azuread-openidconnect', strategy);

  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const user = await supabase.getUserById(id);
      if (!user) {
        return done(new Error('User not found'));
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        displayName: user.display_name || user.email,
        microsoftId: user.microsoft_id
      };

      done(null, authenticatedUser);
    } catch (error) {
      done(error);
    }
  });

  console.log('[Auth] Passport configured with Azure AD strategy');
}

/**
 * Middleware: Require authentication
 */
export function loginRequired(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * Get authenticated user from request
 */
export function getAuthenticatedUser(req: Request): AuthenticatedUser | null {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return req.user as AuthenticatedUser;
  }
  return null;
}

/**
 * Check if user has ClickUp configured
 */
export async function isUserConfigured(userId: string): Promise<boolean> {
  try {
    const user = await supabase.getUserById(userId);
    return user != null && !!user.clickup_list_id && !!user.clickup_team_id;
  } catch (error) {
    console.error('[Auth] Error checking user configuration:', error);
    return false;
  }
}

/**
 * Update user's ClickUp configuration
 */
export async function updateUserClickUpConfig(
  userId: string,
  clickupListId: string,
  clickupTeamId: string
): Promise<void> {
  try {
    const user = await supabase.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await supabase.createOrUpdateUser(
      user.email,
      user.microsoft_id,
      user.display_name || user.email,
      clickupListId,
      clickupTeamId
    );

    console.log(`[Auth] Updated ClickUp config for user ${userId}`);
  } catch (error) {
    console.error('[Auth] Error updating user config:', error);
    throw error;
  }
}
