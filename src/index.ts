#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import * as fireflies from './services/fireflies.js';
import * as taskExtractor from './services/task-extractor.js';
import * as planner from './services/planner.js';
import * as clickup from './services/clickup.js';
import * as teams from './services/teams.js';
import type { PlannerTask } from './types.js';

dotenv.config();

const program = new Command();

program
  .name('context-orchestrator')
  .description('Convert Fireflies.ai meeting transcripts to Planner and ClickUp tasks')
  .version('1.0.0');

async function selectTasksForClickUp(tasks: PlannerTask[]): Promise<PlannerTask[]> {
  if (tasks.length === 0) {
    return [];
  }

  const { selected } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selected',
    message: 'Select tasks to add to ClickUp:',
    choices: tasks.map(t => ({
      name: `${t.title} [Priority: ${t.priority}]`,
      value: t,
      checked: false
    }))
  }]);

  return selected;
}

program
  .command('process')
  .description('Process most recent Fireflies meeting')
  .option('--meeting-id <id>', 'Specific Fireflies meeting ID to process')
  .option('--plan-id <id>', 'Planner plan ID', process.env.PLANNER_PLAN_ID)
  .option('--clickup-list-id <id>', 'ClickUp list ID', process.env.CLICKUP_LIST_ID)
  .action(async (options) => {
    try {
      if (!options.planId) {
        console.error('Error: Planner plan ID is required. Set PLANNER_PLAN_ID in .env or use --plan-id option');
        process.exit(1);
      }

      if (!options.clickupListId) {
        console.error('Error: ClickUp list ID is required. Set CLICKUP_LIST_ID in .env or use --clickup-list-id option');
        process.exit(1);
      }

      console.log('🚀 Starting context orchestration...\n');

      let meetingId: string;

      if (options.meetingId) {
        meetingId = options.meetingId;
        console.log(`Using specified meeting ID: ${meetingId}\n`);
      } else {
        console.log('Step 1: Fetching recent meetings from Fireflies...');
        const meetings = await fireflies.listRecentMeetings(10);

        if (meetings.length === 0) {
          console.log('No meetings found in Fireflies. Exiting.');
          return;
        }

        console.log(`   ✓ Found ${meetings.length} meetings\n`);

        const { selectedMeeting } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedMeeting',
          message: 'Select a meeting to process:',
          choices: meetings.map(m => ({
            name: `${m.title} (${m.date.toLocaleDateString()})`,
            value: m.id
          }))
        }]);

        meetingId = selectedMeeting;
      }

      console.log('\nStep 2: Fetching meeting summary from Fireflies...');
      const meetingSummary = await fireflies.getMeetingSummaryForExtraction(meetingId);
      console.log(`   ✓ Retrieved meeting summary (${meetingSummary.length} characters)\n`);

      console.log('Step 3: Analyzing content with Claude API...');
      const tasks = await taskExtractor.extractTasks(meetingSummary);
      console.log(`   ✓ Identified ${tasks.length} actionable tasks\n`);

      if (tasks.length === 0) {
        console.log('No tasks found in the meeting summary. Exiting.');
        return;
      }

      console.log('Step 4: Creating tasks in Microsoft Planner...');
      const plannerTasks = await planner.createTasksInPlanner(
        options.planId,
        tasks
      );
      console.log(`   ✓ Created ${plannerTasks.length} tasks in Planner\n`);

      console.log('Step 5: Select tasks for ClickUp...');
      const selectedTasks = await selectTasksForClickUp(plannerTasks);

      if (selectedTasks.length === 0) {
        console.log('   No tasks selected. Done!\n');
        return;
      }

      console.log('\nStep 6: Creating tasks in ClickUp...');
      const clickupTasks = await clickup.createTasksInClickUp(
        options.clickupListId,
        selectedTasks
      );
      console.log(`   ✓ Created ${clickupTasks.length} tasks in ClickUp\n`);

      console.log('✅ Complete!');
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    } finally {
      // Clean up MCP clients
      await planner.closeMCPClient();
      await clickup.closeMCPClient();
    }
  });

program
  .command('post-to-teams')
  .description('Post Planner tasks to Teams for approval')
  .option('--meeting-id <id>', 'Specific Fireflies meeting ID to process')
  .option('--plan-id <id>', 'Planner plan ID', process.env.PLANNER_PLAN_ID)
  .option('--team-name <name>', 'Teams team name', process.env.TEAMS_TEAM_NAME)
  .option('--channel-name <name>', 'Teams channel name', process.env.TEAMS_CHANNEL_NAME || 'ClickUp Task Orchestrator')
  .action(async (options) => {
    try {
      if (!options.planId) {
        console.error('Error: Planner plan ID is required. Set PLANNER_PLAN_ID in .env or use --plan-id option');
        process.exit(1);
      }

      if (!options.teamName) {
        console.error('Error: Teams team name is required. Set TEAMS_TEAM_NAME in .env or use --team-name option');
        process.exit(1);
      }

      console.log('🚀 Starting Teams approval workflow...\n');

      // Step 1: Get meeting
      let meetingId: string;
      let meetingTitle: string;

      if (options.meetingId) {
        meetingId = options.meetingId;
        console.log(`Using specified meeting ID: ${meetingId}\n`);

        // Get meeting info for title
        const meetings = await fireflies.listRecentMeetings(50);
        const meeting = meetings.find(m => m.id === meetingId);
        meetingTitle = meeting ? meeting.title : 'Unknown Meeting';
      } else {
        console.log('Step 1: Fetching recent meetings from Fireflies...');
        const meetings = await fireflies.listRecentMeetings(10);

        if (meetings.length === 0) {
          console.log('No meetings found in Fireflies. Exiting.');
          return;
        }

        console.log(`   ✓ Found ${meetings.length} meetings\n`);

        const { selectedMeeting } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedMeeting',
          message: 'Select a meeting to process:',
          choices: meetings.map(m => ({
            name: `${m.title} (${m.date.toLocaleDateString()})`,
            value: { id: m.id, title: m.title }
          }))
        }]);

        meetingId = selectedMeeting.id;
        meetingTitle = selectedMeeting.title;
      }

      // Step 2: Get meeting summary
      console.log('\nStep 2: Fetching meeting summary from Fireflies...');
      const meetingSummary = await fireflies.getMeetingSummaryForExtraction(meetingId);
      console.log(`   ✓ Retrieved meeting summary (${meetingSummary.length} characters)\n`);

      // Step 3: Extract tasks with Claude
      console.log('Step 3: Analyzing content with Claude API...');
      const tasks = await taskExtractor.extractTasks(meetingSummary);
      console.log(`   ✓ Identified ${tasks.length} actionable tasks\n`);

      if (tasks.length === 0) {
        console.log('No tasks found in the meeting summary. Exiting.');
        return;
      }

      // Step 4: Create tasks in Planner
      console.log('Step 4: Creating tasks in Microsoft Planner...');
      const plannerTasks = await planner.createTasksInPlanner(
        options.planId,
        tasks
      );
      console.log(`   ✓ Created ${plannerTasks.length} tasks in Planner\n`);

      // Step 5: Find Teams channel
      console.log('Step 5: Finding Teams channel...');
      const channel = await teams.findChannelByName(options.teamName, options.channelName);
      console.log(`   ✓ Found channel: ${channel.channelName} in team ${channel.teamName}\n`);

      // Step 6: Create session
      console.log('Step 6: Creating approval session...');
      const sessionId = await teams.createSession(
        meetingId,
        meetingTitle,
        channel.teamId,
        channel.channelId
      );
      console.log(`   ✓ Created session: ${sessionId}\n`);

      // Step 7: Post tasks to Teams
      console.log('Step 7: Posting tasks to Teams...');
      for (const task of plannerTasks) {
        try {
          const messageId = await teams.postTaskToChannel(
            channel.teamId,
            channel.channelId,
            task
          );
          await teams.addTaskToSession(sessionId, task, messageId);
          console.log(`   ✓ Posted: ${task.title}`);
        } catch (error) {
          console.error(`   ✗ Failed to post: ${task.title}`, error);
        }
      }

      console.log('\n✅ Tasks posted to Teams!');
      console.log(`\n📋 Session ID: ${sessionId}`);
      console.log(`📍 Channel: ${channel.teamName} > ${channel.channelName}`);
      console.log(`📝 Tasks posted: ${plannerTasks.length}`);
      console.log('\n👉 Next step: React with 👍 to approve tasks in Teams');
      console.log(`👉 Then run: npm run dev -- check-approvals --session-id ${sessionId}`);

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    } finally {
      await planner.closeMCPClient();
      await teams.closeMCPClient();
    }
  });

program
  .command('check-approvals')
  .description('Check Teams approvals and create ClickUp tasks')
  .option('--session-id <id>', 'Specific session ID to check')
  .option('--clickup-list-id <id>', 'ClickUp list ID', process.env.CLICKUP_LIST_ID)
  .action(async (options) => {
    try {
      if (!options.clickupListId) {
        console.error('Error: ClickUp list ID is required. Set CLICKUP_LIST_ID in .env or use --clickup-list-id option');
        process.exit(1);
      }

      let sessionId = options.sessionId;

      // If no session ID provided, use the latest
      if (!sessionId) {
        console.log('No session ID provided, using latest session...');
        sessionId = await teams.getLatestSessionId();

        if (!sessionId) {
          console.error('Error: No sessions found. Run post-to-teams first.');
          process.exit(1);
        }

        console.log(`   Using session: ${sessionId}\n`);
      }

      console.log('🔍 Checking approvals...\n');

      // Check approvals
      const approvedTasks = await teams.checkApprovals(sessionId);

      console.log('\n' + '='.repeat(60));

      if (approvedTasks.length === 0) {
        console.log('ℹ️  No tasks approved yet. Exiting.');
        return;
      }

      console.log(`\n✅ Found ${approvedTasks.length} approved tasks!\n`);

      // Create approved tasks in ClickUp
      console.log('Creating tasks in ClickUp...');
      for (const task of approvedTasks) {
        try {
          const clickupTasks = await clickup.createTasksInClickUp(
            options.clickupListId,
            [task]
          );

          if (clickupTasks.length > 0) {
            await teams.markTaskAsCreated(sessionId, task.id, clickupTasks[0].id);
          }
        } catch (error) {
          console.error(`   ✗ Failed to create: ${task.title}`, error);
        }
      }

      console.log('\n✅ Approval check complete!');
      console.log(`📝 Created ${approvedTasks.length} tasks in ClickUp`);

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    } finally {
      await clickup.closeMCPClient();
      await teams.closeMCPClient();
    }
  });

program.parse();
