import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type {
  Task,
  PlannerTask,
  ClickUpTask
} from '../types.js';

let supabaseClient: SupabaseClient | null = null;

interface UserRecord {
  id: string;
  email: string;
  microsoft_id: string;
  display_name: string | null;
  clickup_list_id: string;
  clickup_team_id: string;
  created_at: string;
  updated_at: string;
}

interface ProcessedMeetingRecord {
  id: string;
  user_id: string;
  meeting_id: string;
  meeting_title: string | null;
  meeting_date: string | null;
  processed_at: string;
  task_count: number;
  created_at: string;
}

interface ExtractedTaskRecord {
  id: string;
  processed_meeting_id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  assigned_to_user_id: string | null;
  clickup_task_id: string | null;
  created_in_clickup_at: string | null;
  is_duplicate: boolean;
  duplicate_of_task_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ClickUpTaskCacheRecord {
  id: string;
  user_id: string;
  clickup_task_id: string;
  title: string;
  list_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get or initialize Supabase client
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }

    supabaseClient = createClient(url, key);
    console.log('[Supabase] Client initialized');
  }

  return supabaseClient;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Supabase] Error getting user by email:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserRecord | null> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Supabase] Error getting user by ID:', error);
    throw error;
  }
}

/**
 * Get all users (for assignment dropdown)
 */
export async function getAllUsers(): Promise<UserRecord[]> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .order('display_name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting all users:', error);
    throw error;
  }
}

/**
 * Create or update user
 */
export async function createOrUpdateUser(
  email: string,
  microsoftId: string,
  displayName: string,
  clickupListId: string,
  clickupTeamId: string
): Promise<UserRecord> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('users')
      .upsert({
        email,
        microsoft_id: microsoftId,
        display_name: displayName,
        clickup_list_id: clickupListId,
        clickup_team_id: clickupTeamId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[Supabase] User ${email} created/updated`);
    return data;
  } catch (error) {
    console.error('[Supabase] Error creating/updating user:', error);
    throw error;
  }
}

/**
 * Check if meeting already processed
 */
export async function isMeetingProcessed(
  userId: string,
  meetingId: string
): Promise<boolean> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('processed_meetings')
      .select('id')
      .eq('user_id', userId)
      .eq('meeting_id', meetingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('[Supabase] Error checking if meeting processed:', error);
    throw error;
  }
}

/**
 * Mark meeting as processed
 */
export async function markMeetingProcessed(
  userId: string,
  meetingId: string,
  meetingTitle: string,
  meetingDate: Date,
  taskCount: number
): Promise<ProcessedMeetingRecord> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('processed_meetings')
      .insert({
        user_id: userId,
        meeting_id: meetingId,
        meeting_title: meetingTitle,
        meeting_date: meetingDate.toISOString(),
        task_count: taskCount,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[Supabase] Marked meeting ${meetingId} as processed`);
    return data;
  } catch (error) {
    console.error('[Supabase] Error marking meeting processed:', error);
    throw error;
  }
}

/**
 * Save extracted tasks to database
 */
export async function saveExtractedTasks(
  processedMeetingId: string,
  tasks: Task[]
): Promise<ExtractedTaskRecord[]> {
  const client = getSupabaseClient();

  try {
    const taskRecords = tasks.map(task => ({
      processed_meeting_id: processedMeetingId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.dueDate || null,
      is_duplicate: false,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await client
      .from('extracted_tasks')
      .insert(taskRecords)
      .select();

    if (error) throw error;

    console.log(`[Supabase] Saved ${tasks.length} extracted tasks`);
    return data || [];
  } catch (error) {
    console.error('[Supabase] Error saving extracted tasks:', error);
    throw error;
  }
}

/**
 * Get extracted tasks for a meeting
 */
export async function getExtractedTasks(
  processedMeetingId: string
): Promise<ExtractedTaskRecord[]> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('extracted_tasks')
      .select('*')
      .eq('processed_meeting_id', processedMeetingId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting extracted tasks:', error);
    throw error;
  }
}

/**
 * Get all extracted tasks for multiple meetings
 */
export async function getExtractedTasksByMeetings(
  processedMeetingIds: string[]
): Promise<ExtractedTaskRecord[]> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('extracted_tasks')
      .select('*')
      .in('processed_meeting_id', processedMeetingIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting extracted tasks for meetings:', error);
    throw error;
  }
}

/**
 * Update tasks with duplicate flags
 */
export async function markDuplicateTasks(
  duplicates: Array<{ taskId: string; duplicateOfTaskId: string | null }>
): Promise<void> {
  const client = getSupabaseClient();

  try {
    for (const dup of duplicates) {
      await client
        .from('extracted_tasks')
        .update({
          is_duplicate: true,
          duplicate_of_task_id: dup.duplicateOfTaskId
        })
        .eq('id', dup.taskId);
    }

    console.log(`[Supabase] Marked ${duplicates.length} tasks as duplicates`);
  } catch (error) {
    console.error('[Supabase] Error marking duplicate tasks:', error);
    throw error;
  }
}

/**
 * Assign tasks to users
 */
export async function assignTasksToUsers(
  assignments: Array<{ taskId: string; userId: string }>
): Promise<void> {
  const client = getSupabaseClient();

  try {
    for (const assignment of assignments) {
      await client
        .from('extracted_tasks')
        .update({ assigned_to_user_id: assignment.userId })
        .eq('id', assignment.taskId);
    }

    console.log(`[Supabase] Assigned ${assignments.length} tasks to users`);
  } catch (error) {
    console.error('[Supabase] Error assigning tasks to users:', error);
    throw error;
  }
}

/**
 * Mark tasks as created in ClickUp
 */
export async function markTasksCreatedInClickUp(
  taskUpdates: Array<{ taskId: string; clickupTaskId: string }>
): Promise<void> {
  const client = getSupabaseClient();

  try {
    for (const update of taskUpdates) {
      await client
        .from('extracted_tasks')
        .update({
          clickup_task_id: update.clickupTaskId,
          created_in_clickup_at: new Date().toISOString()
        })
        .eq('id', update.taskId);
    }

    console.log(`[Supabase] Marked ${taskUpdates.length} tasks as created in ClickUp`);
  } catch (error) {
    console.error('[Supabase] Error marking tasks created in ClickUp:', error);
    throw error;
  }
}

/**
 * Get pending tasks for a user (not yet created in ClickUp)
 */
export async function getPendingTasksForUser(userId: string): Promise<ExtractedTaskRecord[]> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('extracted_tasks')
      .select(`
        *,
        processed_meeting_id (
          id,
          meeting_title,
          meeting_date
        )
      `)
      .eq('assigned_to_user_id', userId)
      .is('created_in_clickup_at', null)
      .eq('is_duplicate', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting pending tasks:', error);
    throw error;
  }
}

/**
 * Cache ClickUp tasks for deduplication
 */
export async function cacheClickUpTasks(
  userId: string,
  tasks: Array<{ clickupTaskId: string; title: string; listId: string }>
): Promise<void> {
  const client = getSupabaseClient();

  try {
    // Clear existing cache for this user
    await client
      .from('clickup_task_cache')
      .delete()
      .eq('user_id', userId);

    // Insert new cache
    const cacheRecords = tasks.map(task => ({
      user_id: userId,
      clickup_task_id: task.clickupTaskId,
      title: task.title,
      list_id: task.listId
    }));

    await client
      .from('clickup_task_cache')
      .insert(cacheRecords);

    console.log(`[Supabase] Cached ${tasks.length} ClickUp tasks for user ${userId}`);
  } catch (error) {
    console.error('[Supabase] Error caching ClickUp tasks:', error);
    throw error;
  }
}

/**
 * Get ClickUp task cache for a user
 */
export async function getClickUpTaskCache(userId: string): Promise<ClickUpTaskCacheRecord[]> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('clickup_task_cache')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting ClickUp task cache:', error);
    throw error;
  }
}

/**
 * Get processing history for a user
 */
export async function getProcessingHistory(userId: string) {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('processed_meetings')
      .select('*')
      .eq('user_id', userId)
      .order('processed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting processing history:', error);
    throw error;
  }
}

/**
 * Get duplicate summary using the view
 */
export async function getDuplicateSummary(): Promise<any[]> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('duplicate_summary')
      .select('*')
      .limit(100);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Supabase] Error getting duplicate summary:', error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userId: string) {
  const client = getSupabaseClient();

  try {
    // Count metrics
    const { data: processingData } = await client
      .from('processed_meetings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: tasksData } = await client
      .from('extracted_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to_user_id', userId);

    const { data: createdData } = await client
      .from('extracted_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to_user_id', userId)
      .not('created_in_clickup_at', 'is', null);

    return {
      meetings_processed: processingData?.length || 0,
      tasks_extracted: tasksData?.length || 0,
      tasks_created: createdData?.length || 0
    };
  } catch (error) {
    console.error('[Supabase] Error getting user statistics:', error);
    throw error;
  }
}

/**
 * Close connection (if needed in future)
 */
export async function closeConnection(): Promise<void> {
  // Supabase client doesn't require explicit closure
  supabaseClient = null;
  console.log('[Supabase] Client closed');
}
