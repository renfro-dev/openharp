import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { PlannerTask, ClickUpTask } from '../types.js';

let mcpClient: Client | null = null;

function mapPriority(plannerPriority: number): number {
  // Planner: 1=urgent, 3=high, 5=normal, 9=low
  // ClickUp: 1=urgent, 2=high, 3=normal, 4=low
  if (plannerPriority <= 1) return 1; // urgent
  if (plannerPriority <= 3) return 2; // high
  if (plannerPriority <= 5) return 3; // normal
  return 4; // low
}

/**
 * Get or create ClickUp MCP client
 */
async function getMCPClient(): Promise<Client> {
  if (!mcpClient) {
    mcpClient = new Client({
      name: 'context-orchestrator-clickup',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@taazkareem/clickup-mcp-server'],
      env: {
        ...process.env,
        CLICKUP_API_KEY: process.env.CLICKUP_API_KEY || '',
        CLICKUP_TEAM_ID: process.env.CLICKUP_TEAM_ID || ''
      }
    });

    await mcpClient.connect(transport);
    console.log('[ClickUp] Connected to ClickUp MCP server');
  }

  return mcpClient;
}

/**
 * Create tasks in ClickUp
 * Creates tasks one by one using the create_task tool from ClickUp MCP server
 */
export async function createTasksInClickUp(
  listId: string,
  tasks: PlannerTask[]
): Promise<ClickUpTask[]> {
  const client = await getMCPClient();
  const createdTasks: ClickUpTask[] = [];

  for (const task of tasks) {
    try {
      const result = await client.callTool({
        name: 'create_task',
        arguments: {
          listId,
          name: task.title,
          description: task.description || '',
          priority: mapPriority(task.priority),
          dueDate: task.dueDateTime || undefined
        }
      });

      const clickupTask = JSON.parse((result.content as any)[0].text);
      createdTasks.push(clickupTask);
      console.log(`   ✓ Created ClickUp task: ${task.title}`);
    } catch (error) {
      console.error(`   ✗ Failed to create ClickUp task "${task.title}":`, error);
      throw error;
    }
  }

  return createdTasks;
}

/**
 * Close the MCP client connection
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    console.log('[ClickUp] Closed ClickUp MCP client');
  }
}
