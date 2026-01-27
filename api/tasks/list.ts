import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as auth from '../../src/services/auth.js';
import * as supabase from '../../src/services/supabase.js';

interface TaskWithMetadata {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  isDuplicate: boolean;
  duplicateOfTaskId: string | null;
  createdAt: string;
  meetingTitle: string | null;
  meetingDate: string | null;
}

/**
 * Vercel API Route: GET /api/tasks/list
 * Get extracted tasks for review (not yet created in ClickUp)
 * Query params: sessionId (optional), limit (default: 100)
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
    const { limit = '100' } = req.query;

    // Get pending tasks for user
    const pendingTasks = await supabase.getPendingTasksForUser(user.id);

    // Get all users for assignment options
    const allUsers = await supabase.getAllUsers();

    // Format tasks with meeting info
    const tasksWithMeta: TaskWithMetadata[] = pendingTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.due_date,
      isDuplicate: task.is_duplicate,
      duplicateOfTaskId: task.duplicate_of_task_id,
      createdAt: task.created_at,
      meetingTitle: (task as any).processed_meeting_id?.meeting_title,
      meetingDate: (task as any).processed_meeting_id?.meeting_date
    }));

    res.status(200).json({
      tasks: tasksWithMeta.slice(0, parseInt(limit as string, 10)),
      totalTasks: tasksWithMeta.length,
      users: allUsers.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name || u.email
      }))
    });
  } catch (error) {
    console.error('[API] Error listing tasks:', error);
    res.status(500).json({
      error: 'Failed to list tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
