/**
 * Type definitions for the Context Orchestrator
 */

export interface PDFFile {
  id: string;
  name: string;
  driveId: string;
  lastModifiedDateTime: string;
}

export interface Task {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  dueDate: string | null;
}

export interface PlannerTask {
  id: string;
  title: string;
  description?: string;
  priority: number;
  dueDateTime?: string;
  planId: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  due_date?: string | number;
}

export interface Config {
  onedriveFolderPath: string;
  plannerPlanId: string;
  clickupListId: string;
  anthropicApiKey: string;
}

// Teams-related types
export interface Reaction {
  reactionType: string; // 'like', 'heart', etc.
  count: number;
}

export interface TeamsChannel {
  teamId: string;
  channelId: string;
  teamName: string;
  channelName: string;
}

export interface TeamsMessage {
  id: string;
  content: string;
  createdDateTime: string;
  reactions?: Reaction[];
}

export interface TeamsApprovalTask {
  plannerTaskId: string;
  teamsMessageId: string;
  title: string;
  description: string;
  priority: number;
  dueDateTime?: string;
  postedAt: string;
  status: 'posted' | 'approved' | 'rejected' | 'created-in-clickup';
  approvalCount?: number;
  clickupTaskId?: string;
  processedAt?: string;
}

export interface TeamsApprovalSession {
  sessionId: string;
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
  teamId: string;
  channelId: string;
  tasks: { [plannerTaskId: string]: TeamsApprovalTask };
}

export interface TeamsApprovalState {
  version: string;
  sessions: { [sessionId: string]: TeamsApprovalSession };
}
