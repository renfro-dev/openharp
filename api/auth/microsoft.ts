import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';

/**
 * Vercel API Route: GET /api/auth/microsoft
 * Initiates Microsoft OAuth login flow
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Use Passport to authenticate with Azure AD
  passport.authenticate('azuread-openidconnect', {
    response: res
  })(req, res);
}
