import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as auth from '../../src/services/auth.js';
import * as supabase from '../../src/services/supabase.js';

/**
 * Vercel API Route: GET /api/auth/user
 * Returns current authenticated user info
 *
 * POST /api/auth/user
 * Updates user's ClickUp configuration
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = auth.getAuthenticatedUser(req);

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const userConfig = await supabase.getUserById(user.id);

      if (!userConfig) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({
        id: userConfig.id,
        email: userConfig.email,
        displayName: userConfig.display_name,
        clickupListId: userConfig.clickup_list_id,
        clickupTeamId: userConfig.clickup_team_id,
        isConfigured: !!userConfig.clickup_list_id && !!userConfig.clickup_team_id,
        createdAt: userConfig.created_at
      });
    } catch (error) {
      console.error('[Auth] Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  } else if (req.method === 'POST') {
    try {
      const { clickupListId, clickupTeamId } = req.body;

      if (!clickupListId || !clickupTeamId) {
        res.status(400).json({ error: 'clickupListId and clickupTeamId are required' });
        return;
      }

      await auth.updateUserClickUpConfig(user.id, clickupListId, clickupTeamId);

      const updated = await supabase.getUserById(user.id);

      res.status(200).json({
        message: 'User configuration updated',
        user: {
          id: updated?.id,
          email: updated?.email,
          displayName: updated?.display_name,
          clickupListId: updated?.clickup_list_id,
          clickupTeamId: updated?.clickup_team_id,
          isConfigured: !!updated?.clickup_list_id && !!updated?.clickup_team_id
        }
      });
    } catch (error) {
      console.error('[Auth] Error updating user config:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
