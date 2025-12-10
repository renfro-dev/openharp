import Anthropic from '@anthropic-ai/sdk';
import type { Task } from '../types.js';

let anthropic: Anthropic | null = null;

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

export async function extractTasks(meetingText: string): Promise<Task[]> {
  const client = getAnthropicClient();

  const prompt = `Extract actionable tasks from this meeting summary. Return ONLY a valid JSON object with a "tasks" array.

Each task should have:
- title: Brief task description
- description: More detailed context
- priority: "urgent", "high", "normal", or "low"
- dueDate: "YYYY-MM-DD" format or null

Meeting summary:
${meetingText}

Return format:
{
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "priority": "normal",
      "dueDate": null
    }
  ]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 4096,
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
      throw new Error('No JSON object found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid response format: missing tasks array');
    }

    // Validate each task
    const tasks: Task[] = parsed.tasks.map((task: any) => ({
      title: task.title || 'Untitled Task',
      description: task.description || '',
      priority: ['urgent', 'high', 'normal', 'low'].includes(task.priority)
        ? task.priority
        : 'normal',
      dueDate: task.dueDate || null
    }));

    return tasks;
  } catch (error) {
    throw new Error(`Failed to extract tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
