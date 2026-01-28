# Context Orchestrator - Product Specification

## Overview

Context Orchestrator is a web application that automatically extracts actionable tasks from Fireflies.ai meeting transcripts using Claude AI and creates them in ClickUp, with intelligent deduplication to prevent duplicate task creation.

## Problem Statement

After meetings, action items often get lost or forgotten. Manually reviewing meeting transcripts and creating tasks is time-consuming and error-prone. Teams need an automated way to:

1. Extract action items from meeting recordings
2. Avoid creating duplicate tasks
3. Review and approve tasks before creation
4. Integrate with existing task management tools

## Target Users

### Primary User: Users orchestrating context across multiple clients, orgs, or projects
- Has regular meetings recorded in Fireflies.ai
- Uses ClickUp for task management
- Wants to automate the meeting-to-task workflow
- Comfortable with basic technical setup (environment variables, API keys)

## Core Features

### 1. Meeting Selection
- View meetings from Fireflies.ai by date range
- Select one or multiple meetings to process
- See meeting titles and dates

### 2. Task Extraction
- AI-powered extraction using Claude
- Identifies action items, deadlines, priorities
- Extracts task descriptions and context

### 3. Intelligent Deduplication
- **String similarity**: Quick pre-filter using Levenshtein distance
- **Semantic analysis**: Claude AI compares task meanings
- **ClickUp cache**: Checks against existing tasks in ClickUp

### 4. Task Review
- View extracted tasks before creation
- See duplicate detection results
- Edit or remove tasks as needed

### 5. ClickUp Integration
- Create tasks in specified ClickUp list
- Map priorities (urgent, high, normal, low)
- Include task descriptions and context

### 6. Simple Authentication
- Password-protected access
- Session-based authentication
- Easy setup with single environment variable

## User Stories

### Authentication
- As a user, I can log in with a password so that only authorized people can access the app
- As a user, I stay logged in for 24 hours so I don't have to re-authenticate frequently
- As a user, I can log out to secure my session

### Meeting Processing
- As a user, I can select a date range to filter meetings
- As a user, I can see a list of meetings from Fireflies.ai
- As a user, I can select multiple meetings to process together
- As a user, I can process meetings and extract tasks with one click

### Task Review
- As a user, I can see all extracted tasks before they're created
- As a user, I can see which tasks are duplicates
- As a user, I can review task titles, descriptions, and priorities

### Task Creation
- As a user, I can create selected tasks in ClickUp
- As a user, I can see confirmation of created tasks
- As a user, I can configure my ClickUp List ID and Team ID

## Success Criteria

### Functional
- [ ] User can log in with configured password
- [ ] User can view meetings from Fireflies.ai
- [ ] User can process meetings and extract tasks
- [ ] Duplicate tasks are identified and flagged
- [ ] Tasks are created in ClickUp with correct details
- [ ] User configuration persists across sessions

### Performance
- [ ] Meeting list loads in under 3 seconds
- [ ] Task extraction completes in under 30 seconds per meeting
- [ ] Deduplication runs in under 10 seconds for typical batch
- [ ] ClickUp task creation completes in under 2 seconds per task

### Reliability
- [ ] App handles API errors gracefully
- [ ] Failed task creation doesn't crash the app
- [ ] Session persists across page refreshes
- [ ] Database operations are atomic

### Usability
- [ ] User can complete full workflow in under 5 minutes
- [ ] Error messages are clear and actionable
- [ ] UI works on desktop browsers (Chrome, Firefox, Safari)
- [ ] Mobile-responsive is nice-to-have

## Out of Scope (Current Version)

- Multi-user with individual accounts (use OAuth for this)
- Task editing before creation
- Scheduling/recurring processing
- Integration with other task tools (Asana, Jira, etc.)
- Email notifications
- Mobile app

## Future Considerations

### OAuth Authentication
Once customized for a team, consider adding:
- Microsoft OAuth for enterprise teams
- Google OAuth for Google Workspace teams
- Individual user accounts and permissions

### Additional Integrations
- Asana, Jira, Linear, Notion
- Slack notifications
- Email summaries

### Advanced Features
- Scheduled automatic processing
- Custom task extraction prompts
- Meeting categorization
- Analytics dashboard

## Glossary

| Term | Definition |
|------|------------|
| Meeting | A recorded call in Fireflies.ai with transcript and summary |
| Task | An actionable item extracted from a meeting |
| Deduplication | Process of identifying and flagging duplicate tasks |
| Session | An authenticated user's login period (24 hours) |
| ClickUp List | The destination folder/list where tasks are created |
