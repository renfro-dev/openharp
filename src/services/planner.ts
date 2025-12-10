import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Task, PlannerTask } from '../types.js';

let mcpClient: Client | null = null;

function mapPriority(priority: string): number {
  const mapping: Record<string, number> = {
    urgent: 1,
    high: 3,
    normal: 5,
    low: 9
  };
  return mapping[priority] || 5;
}

/**
 * Get or create MS365 MCP client for Planner
 */
async function getMCPClient(): Promise<Client> {
  if (!mcpClient) {
    mcpClient = new Client({
      name: 'context-orchestrator-planner',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@softeria/ms-365-mcp-server']
    });

    await mcpClient.connect(transport);
    console.log('[Planner] Connected to MS365 MCP server');
  }

  return mcpClient;
}

/**
 * Create tasks in Microsoft Planner
 * Uses only the create-planner-task tool from MS365 MCP server
 */
export async function createTasksInPlanner(
  planId: string,
  tasks: Task[]
): Promise<PlannerTask[]> {
  const client = await getMCPClient();
  const createdTasks: PlannerTask[] = [];

  for (const task of tasks) {
    try {
      const result = await client.callTool({
        name: 'create-planner-task',
        arguments: {
          body: {
            planId,
            title: task.title,
            details: {
              description: task.description
            },
            priority: mapPriority(task.priority),
            dueDateTime: task.dueDate ? new Date(task.dueDate).toISOString() : undefined
          }
        }
      });

      const plannerTask = JSON.parse((result.content as any)[0].text);
      createdTasks.push({
        id: plannerTask.id,
        title: plannerTask.title,
        description: task.description,
        priority: mapPriority(task.priority),
        dueDateTime: task.dueDate || undefined,
        planId
      });
    } catch (error) {
      console.error(`Failed to create task "${task.title}":`, error);
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
    console.log('[Planner] Closed MS365 MCP client');
  }
}
