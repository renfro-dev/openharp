import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';

/**
 * Vercel API Route: GET /api/auth/callback
 * OAuth callback from Microsoft
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  passport.authenticate('azuread-openidconnect', (err: any, user: any, info: any) => {
    if (err) {
      console.error('[Auth] Authentication error:', err);
      res.status(500).json({ error: 'Authentication failed', details: err.message });
      return;
    }

    if (!user) {
      console.error('[Auth] No user returned from authentication:', info);
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }

    // Serialize user to session
    req.logIn(user, (err: any) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'Login failed' });
        return;
      }

      // Redirect to dashboard
      res.redirect('/dashboard');
    });
  })(req, res);
}
