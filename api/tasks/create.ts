import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as auth from '../../src/services/auth.js';
import * as supabase from '../../src/services/supabase.js';
import * as clickup from '../../src/services/clickup.js';

interface TaskAssignment {
  taskId: string;
  assignedToUserId: string;
}

interface CreateTasksRequest {
  taskIds: string[];
  assignments: TaskAssignment[];
}

interface CreatedTaskResult {
  taskId: string;
  clickupTaskId: string;
  title: string;
  assignedTo: string;
  assignedToEmail: string;
}

/**
 * Vercel API Route: POST /api/tasks/create
 * Create selected tasks in ClickUp and mark as created
 * Request body: {
 *   taskIds: string[],
 *   assignments: [{ taskId: string, assignedToUserId: string }]
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = auth.getAuthenticatedUser(req);

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { taskIds, assignments } = req.body as CreateTasksRequest;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      res.status(400).json({ error: 'taskIds array is required' });
      return;
    }

    if (!assignments || !Array.isArray(assignments)) {
      res.status(400).json({ error: 'assignments array is required' });
      return;
    }

    // First, apply assignments to tasks
    if (assignments.length > 0) {
      await supabase.assignTasksToUsers(assignments);
      console.log(`[API] Assigned ${assignments.length} tasks to users`);
    }

    // Get all tasks to be created
    const tasksToCreate = await supabase.getExtractedTasks(taskIds[0]); // Get from first task's meeting

    // Group by assigned user
    const tasksByUser = new Map<string, typeof tasksToCreate>();

    for (const task of tasksToCreate) {
      if (taskIds.includes(task.id) && !task.is_duplicate) {
        const assignedUserId = task.assigned_to_user_id || user.id;

        if (!tasksByUser.has(assignedUserId)) {
          tasksByUser.set(assignedUserId, []);
        }

        tasksByUser.get(assignedUserId)!.push(task);
      }
    }

    const createdTasks: CreatedTaskResult[] = [];
    const taskUpdates: Array<{ taskId: string; clickupTaskId: string }> = [];

    // Create tasks for each user
    for (const [userId, userTasks] of tasksByUser.entries()) {
      try {
        const targetUser = await supabase.getUserById(userId);
        if (!targetUser) {
          console.error(`[API] Target user not found: ${userId}`);
          continue;
        }

        // We need the ClickUp API key - check if it's available
        // For now, assume we have a shared API key in environment
        // In production, this should come from the user's stored credentials
        const apiKey = process.env.CLICKUP_API_KEY;
        if (!apiKey) {
          throw new Error('ClickUp API key not configured');
        }

        // Create tasks in ClickUp
        const clickupTasks = await clickup.createTasksInClickUp(
          apiKey,
          targetUser.clickup_list_id,
          userTasks.map(t => ({
            title: t.title,
            description: t.description || undefined,
            priority: (t.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
            dueDate: t.due_date || undefined
          }))
        );

        // Record created tasks
        for (let i = 0; i < userTasks.length; i++) {
          const task = userTasks[i];
          const clickupTask = clickupTasks[i];

          if (clickupTask) {
            createdTasks.push({
              taskId: task.id,
              clickupTaskId: clickupTask.id,
              title: task.title,
              assignedTo: targetUser.display_name || targetUser.email,
              assignedToEmail: targetUser.email
            });

            taskUpdates.push({
              taskId: task.id,
              clickupTaskId: clickupTask.id
            });
          }
        }

        console.log(`[API] Created ${clickupTasks.length} tasks in ClickUp for ${targetUser.email}`);
      } catch (error) {
        console.error(`[API] Error creating tasks for user ${userId}:`, error);
        // Continue with next user
      }
    }

    // Mark tasks as created in database
    if (taskUpdates.length > 0) {
      await supabase.markTasksCreatedInClickUp(taskUpdates);
    }

    res.status(200).json({
      message: `Successfully created ${createdTasks.length} tasks in ClickUp`,
      createdTasks,
      totalCreated: createdTasks.length,
      totalRequested: taskIds.length,
      errors: taskIds.length - createdTasks.length > 0 ? `${taskIds.length - createdTasks.length} tasks failed` : undefined
    });
  } catch (error) {
    console.error('[API] Error creating tasks:', error);
    res.status(500).json({
      error: 'Failed to create tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
