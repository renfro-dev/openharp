/**
 * End-to-end test script
 * Fetches the most recent meeting and processes it through the entire workflow
 */

import dotenv from 'dotenv';
import * as fireflies from './dist/services/fireflies.js';
import * as taskExtractor from './dist/services/task-extractor.js';
import * as planner from './dist/services/planner.js';
import * as clickup from './dist/services/clickup.js';

dotenv.config();

async function runE2ETest() {
  try {
    console.log('🧪 Starting End-to-End Test\n');
    console.log('═'.repeat(60));

    // Step 1: Test Fireflies API
    console.log('\n📡 Step 1: Testing Fireflies API Connection...');
    const meetings = await fireflies.listRecentMeetings(1);

    if (meetings.length === 0) {
      console.log('❌ No meetings found in Fireflies');
      return;
    }

    const mostRecentMeeting = meetings[0];
    console.log(`✅ Fireflies API working`);
    console.log(`   Most recent meeting: "${mostRecentMeeting.title}"`);
    console.log(`   Date: ${mostRecentMeeting.date.toLocaleString()}`);
    console.log(`   ID: ${mostRecentMeeting.id}`);

    // Step 2: Get meeting summary
    console.log('\n📄 Step 2: Fetching meeting summary...');
    const meetingSummary = await fireflies.getMeetingSummaryForExtraction(mostRecentMeeting.id);
    console.log(`✅ Retrieved meeting summary (${meetingSummary.length} characters)`);

    // Step 3: Test Claude API for task extraction
    console.log('\n🤖 Step 3: Testing Claude API for task extraction...');
    const tasks = await taskExtractor.extractTasks(meetingSummary);
    console.log(`✅ Claude API working`);
    console.log(`   Extracted ${tasks.length} tasks`);

    if (tasks.length > 0) {
      console.log('\n   📋 Sample tasks:');
      tasks.slice(0, 3).forEach((task, i) => {
        console.log(`      ${i + 1}. ${task.title}`);
        console.log(`         Priority: ${task.priority}`);
        console.log(`         Assignee: ${task.assignedTo || 'Unassigned'}`);
      });
    }

    if (tasks.length === 0) {
      console.log('   ℹ️  No tasks extracted from meeting (this is okay if meeting had no action items)');
      console.log('\n✅ End-to-End Test Complete (No tasks to create)');
      return;
    }

    // Step 4: Test Microsoft Planner (create tasks)
    console.log('\n📅 Step 4: Testing Microsoft Planner integration...');
    const planId = process.env.PLANNER_PLAN_ID;

    if (!planId) {
      console.log('⚠️  Skipping Planner test (PLANNER_PLAN_ID not configured)');
    } else {
      try {
        const plannerTasks = await planner.createTasksInPlanner(planId, tasks);
        console.log(`✅ Microsoft Planner working`);
        console.log(`   Created ${plannerTasks.length} tasks in Planner`);
      } catch (error) {
        console.log(`⚠️  Planner test failed: ${error.message}`);
      }
    }

    // Step 5: Test ClickUp (create first task only for testing)
    console.log('\n✅ Step 5: Testing ClickUp integration...');
    const clickupListId = process.env.CLICKUP_LIST_ID;

    if (!clickupListId) {
      console.log('⚠️  Skipping ClickUp test (CLICKUP_LIST_ID not configured)');
    } else {
      try {
        // Only create the first task in ClickUp for testing
        const testTask = tasks[0];
        const clickupTasks = await clickup.createTasksInClickUp(clickupListId, [testTask]);
        console.log(`✅ ClickUp working`);
        console.log(`   Created ${clickupTasks.length} test task in ClickUp`);
      } catch (error) {
        console.log(`⚠️  ClickUp test failed: ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ End-to-End Test Complete!');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up MCP clients
    await planner.closeMCPClient();
    await clickup.closeMCPClient();
  }
}

runE2ETest();
