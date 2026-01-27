import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as auth from '../../src/services/auth.js';
import * as supabase from '../../src/services/supabase.js';
import * as fireflies from '../../src/services/fireflies.js';
import * as taskExtractor from '../../src/services/task-extractor.js';
import * as dedup from '../../src/services/deduplication.js';
import * as clickup from '../../src/services/clickup.js';

interface ProcessMeetingsRequest {
  meetingIds: string[];
}

interface ProcessedTaskWithDuplicate {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string | null;
  isDuplicate: boolean;
  duplicateOfIndex?: number;
}

/**
 * Vercel API Route: POST /api/meetings/process
 * Process selected meetings and extract tasks
 * Request body: { meetingIds: string[] }
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
    const { meetingIds } = req.body as ProcessMeetingsRequest;

    if (!meetingIds || !Array.isArray(meetingIds) || meetingIds.length === 0) {
      res.status(400).json({ error: 'meetingIds array is required and must not be empty' });
      return;
    }

    // Verify user is configured
    const configured = await auth.isUserConfigured(user.id);
    if (!configured) {
      res.status(400).json({ error: 'User ClickUp configuration is required. Please configure your ClickUp settings first.' });
      return;
    }

    const userConfig = await supabase.getUserById(user.id);
    if (!userConfig) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log(`[API] Processing ${meetingIds.length} meetings for user ${user.email}`);

    // Generate session ID
    const sessionId = `session-${user.id}-${Date.now()}`;

    // Process each meeting
    const allExtractedTasks: Array<{ title: string; description: string; priority: string; dueDate: string | null; meetingId: string }> = [];
    const processedMeetingRecords: string[] = [];

    for (const meetingId of meetingIds) {
      try {
        // Check if already processed
        const isProcessed = await supabase.isMeetingProcessed(user.id, meetingId);
        if (isProcessed) {
          console.log(`[API] Meeting ${meetingId} already processed, skipping`);
          continue;
        }

        // Get meeting details
        const meetings = await fireflies.listRecentMeetings(100);
        const meeting = meetings.find(m => m.id === meetingId);
        if (!meeting) {
          console.error(`[API] Meeting ${meetingId} not found`);
          continue;
        }

        // Get meeting summary
        const summary = await fireflies.getMeetingSummaryForExtraction(meetingId);

        // Extract tasks with Claude
        const tasks = await taskExtractor.extractTasks(summary);

        if (tasks.length > 0) {
          // Save to Supabase
          const processedMeeting = await supabase.markMeetingProcessed(
            user.id,
            meetingId,
            meeting.title,
            meeting.date,
            tasks.length
          );

          // Save tasks
          const savedTasks = await supabase.saveExtractedTasks(processedMeeting.id, tasks);
          processedMeetingRecords.push(processedMeeting.id);

          // Add to all tasks for deduplication
          allExtractedTasks.push(...tasks.map(t => ({
            ...t,
            meetingId: processedMeeting.id
          })));

          console.log(`[API] Extracted ${tasks.length} tasks from meeting ${meeting.title}`);
        }
      } catch (error) {
        console.error(`[API] Error processing meeting ${meetingId}:`, error);
        // Continue with next meeting
      }
    }

    if (processedMeetingRecords.length === 0) {
      res.status(400).json({ error: 'No new meetings were processed' });
      return;
    }

    // Run deduplication on all extracted tasks
    let duplicateCount = 0;
    if (allExtractedTasks.length > 1) {
      try {
        const dedupResult = await dedup.deduplicateTasks(
          allExtractedTasks.map(t => ({
            title: t.title,
            description: t.description,
            priority: t.priority,
            dueDate: t.dueDate
          }))
        );

        duplicateCount = dedupResult.totalDuplicates;

        // Mark duplicates in database
        if (dedupResult.duplicates.length > 0) {
          const duplicates = dedupResult.duplicates.map(d => ({
            taskIndex: d.taskIndex,
            duplicateOfTaskId: d.duplicateOfIndex !== null ? allExtractedTasks[d.duplicateOfIndex].meetingId : null
          }));
          await supabase.markDuplicateTasks(
            duplicates.map(d => ({
              taskId: allExtractedTasks[d.taskIndex].meetingId,
              duplicateOfTaskId: d.duplicateOfTaskId
            }))
          );
        }

        console.log(`[API] Deduplication complete: ${duplicateCount} duplicates found`);
      } catch (error) {
        console.error('[API] Error during deduplication:', error);
        // Continue without deduplication
      }
    }

    // Get all extracted tasks for session
    const sessionTasks = await supabase.getExtractedTasksByMeetings(processedMeetingRecords);

    // Cache user's ClickUp tasks for deduplication
    try {
      const userClickUpTasks = await clickup.getTasksFromList(
        process.env.CLICKUP_API_KEY || '',
        userConfig.clickup_list_id
      );

      await supabase.cacheClickUpTasks(
        user.id,
        userClickUpTasks.map(t => ({
          clickupTaskId: t.id,
          title: t.name,
          listId: userConfig.clickup_list_id
        }))
      );
    } catch (error) {
      console.error('[API] Error caching ClickUp tasks:', error);
    }

    res.status(200).json({
      sessionId,
      totalMeetingsProcessed: processedMeetingRecords.length,
      totalTasksExtracted: allExtractedTasks.length,
      duplicatesFound: duplicateCount,
      tasksReadyForReview: sessionTasks.length - duplicateCount,
      message: 'Meetings processed successfully. Proceed to task review.'
    });
  } catch (error) {
    console.error('[API] Error processing meetings:', error);
    res.status(500).json({
      error: 'Failed to process meetings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
