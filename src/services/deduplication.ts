import Anthropic from '@anthropic-ai/sdk';
import type { Task } from '../types.js';

let anthropic: Anthropic | null = null;

interface TaskWithMetadata extends Task {
  index: number;
  source?: string;
}

interface DuplicateMatch {
  taskIndex: number;
  duplicateOfIndex: number | null;
  reason: string;
}

interface DeduplicationResult {
  duplicates: DuplicateMatch[];
  uniqueTasks: Task[];
  totalDuplicates: number;
}

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

/**
 * Calculate simple string similarity (Levenshtein-like)
 * Returns a score from 0-1 where 1 is identical
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1;

  // If one contains the other substantially
  if (s1.includes(s2) || s2.includes(s1)) {
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    if (ratio > 0.7) return ratio;
  }

  // Levenshtein distance
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getLevenshteinDistance(shorter, longer);
  const maxDist = longer.length;
  return 1 - editDistance / maxDist;
}

/**
 * Levenshtein distance calculation
 */
function getLevenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}

/**
 * Quick filter: Find potential duplicates using string similarity
 * Returns pairs of indices that are similar enough for Claude review
 */
function findPotentialDuplicates(tasks: TaskWithMetadata[]): Array<[number, number]> {
  const potentialDuplicates: Array<[number, number]> = [];

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const similarity = calculateSimilarity(tasks[i].title, tasks[j].title);

      // If titles are similar enough, mark as potential duplicate for Claude review
      if (similarity > 0.6) {
        potentialDuplicates.push([i, j]);
      }
    }
  }

  return potentialDuplicates;
}

/**
 * Use Claude to semantically identify duplicates
 */
export async function deduplicateTasks(tasks: Task[]): Promise<DeduplicationResult> {
  if (tasks.length === 0) {
    return {
      duplicates: [],
      uniqueTasks: [],
      totalDuplicates: 0
    };
  }

  const client = getAnthropicClient();

  // Add metadata to tasks
  const tasksWithMeta: TaskWithMetadata[] = tasks.map((t, i) => ({
    ...t,
    index: i
  }));

  // Quick pre-filter for potential duplicates
  console.log(`[Dedup] Analyzing ${tasks.length} tasks for duplicates...`);
  const potentialPairs = findPotentialDuplicates(tasksWithMeta);
  console.log(`[Dedup] Found ${potentialPairs.length} potential duplicate pairs for review`);

  if (potentialPairs.length === 0) {
    // No potential duplicates, return all as unique
    return {
      duplicates: [],
      uniqueTasks: tasks,
      totalDuplicates: 0
    };
  }

  // Build task list for Claude with indices
  const taskList = tasksWithMeta
    .map(t => `[${t.index}] "${t.title}"\n    Description: ${t.description}\n    Priority: ${t.priority}`)
    .join('\n\n');

  const prompt = `You are a task deduplication expert. Analyze the following tasks and identify duplicates.

Two tasks are duplicates if they represent the same action or objective, even if worded differently.
Focus on semantic meaning, not exact wording.

Tasks to analyze:
${taskList}

Potential duplicates for review (based on title similarity):
${potentialPairs.map(([i, j]) => `- Tasks [${i}] and [${j}]`).join('\n')}

Return ONLY valid JSON (no markdown, no explanation):
{
  "duplicates": [
    {
      "taskIndex": 2,
      "duplicateOfIndex": 0,
      "reason": "Same action item: both about updating documentation"
    }
  ],
  "summary": "Found X duplicates across Y tasks"
}

Rules for duplicates:
1. Mark duplicateOfIndex as the FIRST occurrence of the duplicate
2. Leave duplicateOfIndex as null if it's the first occurrence and shouldn't be marked as duplicate
3. Only mark tasks as duplicates if they're truly the same action
4. Consider context from descriptions when comparing`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Dedup] No JSON found in Claude response, treating as no duplicates');
      return {
        duplicates: [],
        uniqueTasks: tasks,
        totalDuplicates: 0
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.duplicates || !Array.isArray(parsed.duplicates)) {
      console.warn('[Dedup] Invalid response format from Claude');
      return {
        duplicates: [],
        uniqueTasks: tasks,
        totalDuplicates: 0
      };
    }

    const duplicates: DuplicateMatch[] = parsed.duplicates.map((dup: any) => ({
      taskIndex: dup.taskIndex,
      duplicateOfIndex: dup.duplicateOfIndex,
      reason: dup.reason || 'Identified as duplicate'
    }));

    // Filter out unique tasks
    const duplicateIndices = new Set(duplicates.map(d => d.taskIndex));
    const uniqueTasks = tasksWithMeta
      .filter(t => !duplicateIndices.has(t.index))
      .map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        dueDate: t.dueDate
      }));

    console.log(`[Dedup] Identified ${duplicates.length} duplicates (${uniqueTasks.length} unique tasks remain)`);

    return {
      duplicates,
      uniqueTasks,
      totalDuplicates: duplicates.length
    };
  } catch (error) {
    console.error('[Dedup] Error during deduplication:', error);
    // Return all tasks as unique if deduplication fails
    return {
      duplicates: [],
      uniqueTasks: tasks,
      totalDuplicates: 0
    };
  }
}

/**
 * Check tasks against user's existing ClickUp tasks
 */
export async function checkAgainstClickUp(
  extractedTasks: Task[],
  existingClickUpTasks: Array<{ title: string; id: string }>
): Promise<Array<{ extractedTaskIndex: number; clickupTaskId: string; similarity: number }>> {
  const matches: Array<{ extractedTaskIndex: number; clickupTaskId: string; similarity: number }> = [];

  for (let i = 0; i < extractedTasks.length; i++) {
    const extractedTask = extractedTasks[i];

    for (const existingTask of existingClickUpTasks) {
      const similarity = calculateSimilarity(extractedTask.title, existingTask.title);

      // If similar enough, flag as potential match
      if (similarity > 0.75) {
        matches.push({
          extractedTaskIndex: i,
          clickupTaskId: existingTask.id,
          similarity
        });
      }
    }
  }

  if (matches.length > 0) {
    console.log(`[Dedup] Found ${matches.length} potential matches with existing ClickUp tasks`);
  }

  return matches;
}

/**
 * Merge similar tasks from multiple meetings
 * Uses Claude to identify and merge duplicate tasks across different meetings
 */
export async function mergeSimilarTasks(
  tasksByMeeting: Array<{ meetingTitle: string; tasks: Task[] }>
): Promise<Task[]> {
  if (tasksByMeeting.length === 0) {
    return [];
  }

  // Flatten all tasks with meeting source
  const allTasksWithSource: TaskWithMetadata[] = [];
  let index = 0;

  for (const meeting of tasksByMeeting) {
    for (const task of meeting.tasks) {
      allTasksWithSource.push({
        ...task,
        index: index++,
        source: meeting.meetingTitle
      });
    }
  }

  if (allTasksWithSource.length <= 1) {
    return allTasksWithSource.map(t => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.dueDate
    }));
  }

  console.log(`[Dedup] Merging ${allTasksWithSource.length} tasks from ${tasksByMeeting.length} meetings...`);

  // Find potential duplicates
  const potentialPairs = findPotentialDuplicates(allTasksWithSource);

  if (potentialPairs.length === 0) {
    // No potential duplicates
    return allTasksWithSource.map(t => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.dueDate
    }));
  }

  const client = getAnthropicClient();

  // Build task list for Claude
  const taskList = allTasksWithSource
    .map(t => `[${t.index}] "${t.title}" (from: ${t.source})\n    Description: ${t.description}\n    Priority: ${t.priority}`)
    .join('\n\n');

  const prompt = `You are a task consolidation expert. These tasks come from multiple meetings.
Identify duplicates that should be merged into a single task.

${taskList}

Return ONLY valid JSON:
{
  "merges": [
    {
      "primaryIndex": 0,
      "mergeIndices": [3, 7],
      "mergedTask": {
        "title": "Consolidated title",
        "description": "Merged description from all sources",
        "priority": "high"
      }
    }
  ]
}

For each merge group:
- primaryIndex: the main task to keep
- mergeIndices: other task indices to merge into primary
- mergedTask: the consolidated task combining all relevant info`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return allTasksWithSource.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        dueDate: t.dueDate
      }));
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return allTasksWithSource.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        dueDate: t.dueDate
      }));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const merges = parsed.merges || [];

    // Build result with merges applied
    const merged = new Set<number>();
    const result: Task[] = [];

    for (const merge of merges) {
      if (merge.mergedTask) {
        result.push(merge.mergedTask);
        merged.add(merge.primaryIndex);
        for (const idx of merge.mergeIndices || []) {
          merged.add(idx);
        }
      }
    }

    // Add tasks that weren't merged
    for (const task of allTasksWithSource) {
      if (!merged.has(task.index)) {
        result.push({
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate
        });
      }
    }

    console.log(`[Dedup] Merged ${merged.size} tasks into ${result.length} final tasks`);
    return result;
  } catch (error) {
    console.error('[Dedup] Error during merge:', error);
    // Return all tasks if merge fails
    return allTasksWithSource.map(t => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.dueDate
    }));
  }
}
