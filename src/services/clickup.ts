import type { ClickUpTask } from '../types.js';

interface ClickUpTaskInput {
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  dueDate?: string;
}

interface ClickUpResponse {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  due_date?: string;
}

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

function mapPriority(priority: 'urgent' | 'high' | 'normal' | 'low'): number {
  // ClickUp priority levels: 1=urgent, 2=high, 3=normal, 4=low
  const mapping: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4
  };
  return mapping[priority] || 3;
}

/**
 * Create task in ClickUp using direct REST API
 */
async function createTaskInClickUp(
  apiKey: string,
  listId: string,
  task: ClickUpTaskInput
): Promise<ClickUpResponse> {
  const priority = mapPriority(task.priority);

  const body: Record<string, any> = {
    name: task.title,
    priority
  };

  if (task.description) {
    body.description = task.description;
  }

  if (task.dueDate) {
    // ClickUp expects timestamp in milliseconds
    const dueTime = new Date(task.dueDate).getTime();
    body.due_date = dueTime;
  }

  try {
    const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ClickUp API error: ${response.status} ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[ClickUp] Error creating task "${task.title}":`, error);
    throw error;
  }
}

/**
 * Create tasks in ClickUp for a specific user
 * Creates tasks one by one using direct REST API
 */
export async function createTasksInClickUp(
  apiKey: string,
  listId: string,
  tasks: ClickUpTaskInput[]
): Promise<ClickUpTask[]> {
  if (!apiKey) {
    throw new Error('ClickUp API key is required');
  }

  const createdTasks: ClickUpTask[] = [];

  for (const task of tasks) {
    try {
      const response = await createTaskInClickUp(apiKey, listId, task);
      createdTasks.push({
        id: response.id,
        name: response.name,
        description: response.description,
        priority: response.priority,
        due_date: response.due_date
      });
      console.log(`[ClickUp] ✓ Created task: ${task.title}`);
    } catch (error) {
      console.error(`[ClickUp] ✗ Failed to create task "${task.title}":`, error);
      throw error;
    }
  }

  return createdTasks;
}

/**
 * Get tasks from a ClickUp list (for deduplication cache)
 */
export async function getTasksFromList(
  apiKey: string,
  listId: string
): Promise<Array<{ id: string; name: string }>> {
  if (!apiKey) {
    throw new Error('ClickUp API key is required');
  }

  try {
    const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task?limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ClickUp API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return (data.tasks || []).map((t: any) => ({
      id: t.id,
      name: t.name
    }));
  } catch (error) {
    console.error('[ClickUp] Error fetching tasks from list:', error);
    throw error;
  }
}

/**
 * No-op function for API compatibility (no MCP client to close)
 */
export async function closeMCPClient(): Promise<void> {
  // Direct API calls don't need cleanup
  console.log('[ClickUp] No MCP client to close (using direct API)');
}
