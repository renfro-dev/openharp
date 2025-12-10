import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import type {
  PlannerTask,
  TeamsChannel,
  TeamsApprovalState,
  TeamsApprovalSession,
  TeamsApprovalTask,
  Reaction
} from '../types.js';

let mcpClient: Client | null = null;

const STATE_DIR = path.join(process.cwd(), '.state');
const STATE_FILE = path.join(STATE_DIR, 'teams-approval.json');

/**
 * Get priority emoji for display
 */
function getPriorityEmoji(priority: number): string {
  if (priority <= 1) return '🔴'; // urgent
  if (priority <= 3) return '🟠'; // high
  if (priority <= 5) return '🟡'; // normal
  return '🟢'; // low
}

/**
 * Get priority text for display
 */
function getPriorityText(priority: number): string {
  if (priority <= 1) return 'Urgent';
  if (priority <= 3) return 'High';
  if (priority <= 5) return 'Normal';
  return 'Low';
}

/**
 * Get or create MS365 MCP client for Teams
 */
async function getMCPClient(): Promise<Client> {
  if (!mcpClient) {
    mcpClient = new Client({
      name: 'context-orchestrator-teams',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@softeria/ms-365-mcp-server', '--org-mode']
    });

    await mcpClient.connect(transport);
    console.log('[Teams] Connected to MS365 MCP server');
  }

  return mcpClient;
}

/**
 * Close the MCP client connection
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    console.log('[Teams] Closed MS365 MCP client');
  }
}

/**
 * Find Teams channel by name
 */
export async function findChannelByName(teamName: string, channelName: string): Promise<TeamsChannel> {
  const client = await getMCPClient();

  try {
    // First, find the team
    console.log(`[Teams] Searching for team: "${teamName}"`);
    const teamsResult = await client.callTool({
      name: 'list-joined-teams',
      arguments: {}
    });

    const teamsData = JSON.parse((teamsResult.content as any)[0].text);
    const teams = teamsData.value || [];

    const team = teams.find((t: any) => t.displayName === teamName);
    if (!team) {
      throw new Error(`Team "${teamName}" not found. Available teams: ${teams.map((t: any) => t.displayName).join(', ')}`);
    }

    const teamId = team.id;
    console.log(`[Teams] Found team: ${teamName} (${teamId})`);

    // Then, find the channel
    console.log(`[Teams] Searching for channel: "${channelName}"`);
    const channelsResult = await client.callTool({
      name: 'list-team-channels',
      arguments: { teamId: teamId }
    });

    const resultText = (channelsResult.content as any)[0].text;
    const channelsData = JSON.parse(resultText);
    const allChannels = channelsData.value || [];

    // Filter channels in code instead of using $filter
    const matchingChannels = allChannels.filter((c: any) => c.displayName === channelName);

    if (matchingChannels.length === 0) {
      throw new Error(`Channel "${channelName}" not found. Available channels: ${allChannels.map((c: any) => c.displayName).join(', ')}`);
    }

    const channel = matchingChannels[0];
    const channelId = channel.id;
    console.log(`[Teams] Found channel: ${channelName} (${channelId})`);

    return {
      teamId,
      channelId,
      teamName,
      channelName
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw error;
      }
      throw new Error(`Failed to find Teams channel: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Post task to Teams channel
 */
export async function postTaskToChannel(
  teamId: string,
  channelId: string,
  task: PlannerTask
): Promise<string> {
  const client = await getMCPClient();

  const priorityEmoji = getPriorityEmoji(task.priority);
  const priorityText = getPriorityText(task.priority);
  const dueDate = task.dueDateTime ? new Date(task.dueDateTime).toLocaleDateString() : 'Not set';

  const messageContent = `
<h3>📋 ${task.title}</h3>
<p><strong>Priority:</strong> ${priorityEmoji} ${priorityText}</p>
<p><strong>Description:</strong> ${task.description || 'No description provided'}</p>
<p><strong>Due Date:</strong> ${dueDate}</p>
<p><strong>Planner Task ID:</strong> <code>${task.id}</code></p>
<hr>
<p><em>React with 👍 to approve this task for ClickUp</em></p>
  `.trim();

  try {
    const result = await client.callTool({
      name: 'send-channel-message',
      arguments: {
        teamId: teamId,
        channelId: channelId,
        body: {
          body: {
            content: messageContent,
            contentType: 'html'
          }
        }
      }
    });

    const message = JSON.parse((result.content as any)[0].text);
    return message.id;
  } catch (error) {
    console.error(`[Teams] Failed to post task "${task.title}":`, error);
    throw error;
  }
}

/**
 * Get message reactions
 */
export async function getMessageReactions(
  teamId: string,
  channelId: string,
  messageId: string
): Promise<Reaction[]> {
  const client = await getMCPClient();

  try {
    const result = await client.callTool({
      name: 'get-channel-message',
      arguments: {
        teamId: teamId,
        channelId: channelId,
        chatMessageId: messageId
      }
    });

    const resultText = (result.content as any)[0].text;

    // Check if it's an MCP error
    if (resultText.startsWith('MCP error')) {
      console.error(`[Teams] MCP error getting reactions for message ${messageId}:`, resultText);
      return [];
    }

    const message = JSON.parse(resultText);
    console.log(`[Teams] Message ${messageId} has reactions:`, JSON.stringify(message.reactions || null));
    return message.reactions || [];
  } catch (error) {
    console.error(`[Teams] Failed to get reactions for message ${messageId}:`, error);
    return [];
  }
}

/**
 * Check if a task is approved (has at least 1 thumbs up)
 */
function isApproved(reactions: Reaction[]): boolean {
  // Check for thumbs up emoji - Graph API returns the actual emoji character
  const thumbsUp = reactions.find(r => r.reactionType === '👍' || r.reactionType === 'like');
  return thumbsUp ? reactions.length > 0 : false;
}

/**
 * Get approval count
 */
function getApprovalCount(reactions: Reaction[]): number {
  // Count all thumbs up reactions
  const thumbsUpReactions = reactions.filter(r => r.reactionType === '👍' || r.reactionType === 'like');
  return thumbsUpReactions.length;
}

/**
 * Load state from file
 */
export async function loadState(): Promise<TeamsApprovalState> {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return { version: '1.0.0', sessions: {} };
    }

    const data = await fs.promises.readFile(STATE_FILE, 'utf-8');
    const state = JSON.parse(data);

    // Validate schema version
    if (state.version !== '1.0.0') {
      console.warn('[Teams] Warning: State file has incompatible version, creating backup and starting fresh');
      await fs.promises.copyFile(STATE_FILE, `${STATE_FILE}.backup.${Date.now()}`);
      return { version: '1.0.0', sessions: {} };
    }

    return state;
  } catch (error) {
    console.error('[Teams] Error: Failed to load state file, creating backup and starting with fresh state');

    // Create backup if file exists but is corrupted
    if (fs.existsSync(STATE_FILE)) {
      await fs.promises.copyFile(STATE_FILE, `${STATE_FILE}.corrupt.${Date.now()}`);
    }

    return { version: '1.0.0', sessions: {} };
  }
}

/**
 * Save state to file
 */
export async function saveState(state: TeamsApprovalState): Promise<void> {
  try {
    // Ensure directory exists
    if (!fs.existsSync(STATE_DIR)) {
      await fs.promises.mkdir(STATE_DIR, { recursive: true });
    }

    await fs.promises.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Teams] Error: Failed to save state file:', error);
    throw error;
  }
}

/**
 * Create a new session
 */
export async function createSession(
  meetingId: string,
  meetingTitle: string,
  teamId: string,
  channelId: string
): Promise<string> {
  const state = await loadState();

  const sessionId = `${meetingId}-${Date.now()}`;

  state.sessions[sessionId] = {
    sessionId,
    meetingId,
    meetingTitle,
    createdAt: new Date().toISOString(),
    teamId,
    channelId,
    tasks: {}
  };

  await saveState(state);
  return sessionId;
}

/**
 * Add task to session
 */
export async function addTaskToSession(
  sessionId: string,
  task: PlannerTask,
  teamsMessageId: string
): Promise<void> {
  const state = await loadState();

  if (!state.sessions[sessionId]) {
    throw new Error(`Session ${sessionId} not found`);
  }

  state.sessions[sessionId].tasks[task.id] = {
    plannerTaskId: task.id,
    teamsMessageId,
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    dueDateTime: task.dueDateTime,
    postedAt: new Date().toISOString(),
    status: 'posted'
  };

  await saveState(state);
}

/**
 * Get latest session ID
 */
export async function getLatestSessionId(): Promise<string | null> {
  const state = await loadState();
  const sessionIds = Object.keys(state.sessions);

  if (sessionIds.length === 0) {
    return null;
  }

  // Sort by creation time (descending)
  sessionIds.sort((a, b) => {
    const timeA = new Date(state.sessions[a].createdAt).getTime();
    const timeB = new Date(state.sessions[b].createdAt).getTime();
    return timeB - timeA;
  });

  return sessionIds[0];
}

/**
 * Check approvals for a session and return approved tasks
 */
export async function checkApprovals(sessionId: string): Promise<PlannerTask[]> {
  const state = await loadState();

  if (!state.sessions[sessionId]) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const session = state.sessions[sessionId];
  const approvedTasks: PlannerTask[] = [];

  console.log(`[Teams] Checking approvals for session: ${sessionId}`);
  console.log(`[Teams] Meeting: "${session.meetingTitle}"`);
  console.log(`[Teams] Tasks to check: ${Object.keys(session.tasks).length}`);

  for (const [plannerTaskId, task] of Object.entries(session.tasks)) {
    // Skip tasks already created in ClickUp
    if (task.status === 'created-in-clickup') {
      console.log(`   ⏭️  ${task.title} - Already created in ClickUp`);
      continue;
    }

    try {
      const reactions = await getMessageReactions(
        session.teamId,
        session.channelId,
        task.teamsMessageId
      );

      const approved = isApproved(reactions);
      const approvalCount = getApprovalCount(reactions);

      // Update task status
      task.approvalCount = approvalCount;

      if (approved) {
        task.status = 'approved';
        console.log(`   ✅ ${task.title} - Approved (${approvalCount} 👍)`);

        approvedTasks.push({
          id: task.plannerTaskId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDateTime: task.dueDateTime,
          planId: '' // Will be filled by caller if needed
        });
      } else {
        console.log(`   ⏸️  ${task.title} - Not approved yet (${approvalCount} 👍)`);
      }
    } catch (error) {
      console.error(`   ❌ ${task.title} - Error checking approval:`, error);
    }
  }

  // Save updated state
  await saveState(state);

  return approvedTasks;
}

/**
 * Mark task as created in ClickUp
 */
export async function markTaskAsCreated(
  sessionId: string,
  plannerTaskId: string,
  clickupTaskId: string
): Promise<void> {
  const state = await loadState();

  if (!state.sessions[sessionId]) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (!state.sessions[sessionId].tasks[plannerTaskId]) {
    throw new Error(`Task ${plannerTaskId} not found in session ${sessionId}`);
  }

  state.sessions[sessionId].tasks[plannerTaskId].status = 'created-in-clickup';
  state.sessions[sessionId].tasks[plannerTaskId].clickupTaskId = clickupTaskId;
  state.sessions[sessionId].tasks[plannerTaskId].processedAt = new Date().toISOString();

  await saveState(state);
}
