import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as auth from '../../src/services/auth.js';
import * as fireflies from '../../src/services/fireflies.js';
import * as supabase from '../../src/services/supabase.js';

/**
 * Vercel API Route: GET /api/meetings/list
 * List meetings by date range
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), limit (default: 50)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = auth.getAuthenticatedUser(req);

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { from, to, limit = '50' } = req.query;

    if (!from || !to) {
      res.status(400).json({ error: 'from and to date parameters are required (YYYY-MM-DD format)' });
      return;
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    // Fetch meetings from Fireflies
    const meetings = await fireflies.listMeetingsByDateRange(
      fromDate,
      toDate,
      parseInt(limit as string, 10)
    );

    // Check which ones have been processed by this user
    const processedIds = new Set<string>();
    for (const meeting of meetings) {
      const processed = await supabase.isMeetingProcessed(user.id, meeting.id);
      if (processed) {
        processedIds.add(meeting.id);
      }
    }

    // Add processing status to each meeting
    const meetingsWithStatus = meetings.map(m => ({
      id: m.id,
      title: m.title,
      date: m.date,
      processed: processedIds.has(m.id)
    }));

    res.status(200).json({
      meetings: meetingsWithStatus,
      total: meetingsWithStatus.length,
      dateRange: {
        from: fromDate,
        to: toDate
      }
    });
  } catch (error) {
    console.error('[API] Error listing meetings:', error);
    res.status(500).json({
      error: 'Failed to list meetings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
