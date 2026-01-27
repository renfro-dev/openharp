# Multi-User Web UI Implementation Guide

## Progress Summary

### ✅ Completed

#### Phase 1: Database Schema
- Created Supabase setup guide (`SUPABASE_SETUP.md`)
- Created complete PostgreSQL schema with tables, indexes, views, and utility functions (`sql/schema.sql`)
- Tables: users, processed_meetings, extracted_tasks, clickup_task_cache
- Views: pending_tasks, processing_history, duplicate_summary
- Support for multi-user, deduplication tracking, and task creation history

#### Phase 2: Backend Services

**Supabase Service** (`src/services/supabase.ts`)
- User management (create, read, get all)
- Meeting processing tracking
- Task extraction and storage
- Deduplication marking
- ClickUp task caching
- User statistics and history

**Authentication Service** (`src/services/auth.ts`)
- Passport.js integration with Azure AD
- Microsoft OAuth device code flow
- User profile deserializatio
- ClickUp configuration management
- Session-based authentication

**Deduplication Service** (`src/services/deduplication.ts`)
- String similarity calculations (Levenshtein distance)
- Potential duplicate detection pre-filtering
- Claude AI semantic deduplication
- ClickUp task cache comparison
- Multi-meeting task merging

**Updated Fireflies Service** (`src/services/fireflies.ts`)
- New: `listMeetingsByDateRange(fromDate, toDate, limit)`
- Date range filtering with timestamp conversion
- Results sorted by date (newest first)

**Updated ClickUp Service** (`src/services/clickup.ts`)
- Switched from MCP to direct REST API (for multi-user support)
- Per-user API key support
- Task creation with priority mapping
- Task list retrieval for deduplication
- Direct HTTP API calls to ClickUp

#### Phase 3: API Routes

**Authentication Endpoints**
- `GET /api/auth/microsoft` - Initiate OAuth login
- `GET/POST /api/auth/callback` - OAuth callback handler
- `GET/POST /api/auth/user` - Get/update user configuration

**Meetings Endpoints**
- `GET /api/meetings/list` - List meetings by date range
- `POST /api/meetings/process` - Process selected meetings and extract tasks
  - Validates user configuration
  - Fetches and extracts tasks from Fireflies
  - Runs deduplication
  - Caches ClickUp tasks
  - Returns session info

**Tasks Endpoints**
- `GET /api/tasks/list` - Get pending tasks for review (non-duplicate)
- `POST /api/tasks/create` - Create selected tasks in ClickUp
  - Groups tasks by assigned user
  - Creates in each user's ClickUp list
  - Records creation in database

### 🔄 In Progress / To Do

#### Frontend Components
- [ ] React app setup (Vite + TypeScript)
- [ ] LoginPage.tsx - Microsoft OAuth login button
- [ ] DashboardPage.tsx - Date range selection and meeting list
- [ ] ProcessingPage.tsx - Real-time processing status
- [ ] TaskReviewPanel.tsx - Task selection and user assignment
- [ ] TaskCard.tsx - Individual task display

#### Deployment
- [ ] Create `vercel.json` configuration
- [ ] Restructure project for Vercel serverless
- [ ] Environment variables setup
- [ ] Deployment testing

#### Cleanup
- [ ] Remove `src/server.ts` (webhook server - no longer needed)
- [ ] Remove `src/services/planner.ts` (not using Planner anymore)
- [ ] Remove `src/services/teams.ts` (not using Teams approval)
- [ ] Remove deprecated deployment guides (REPLIT_DEPLOY.md, WEBHOOK_SETUP.md)
- [ ] Remove .state/ directory references

#### Documentation
- [ ] Update CLAUDE.md with new architecture
- [ ] Rewrite README.md for web UI usage
- [ ] Create DEPLOYMENT_VERCEL.md guide
- [ ] Update .env.example with new variables

#### Testing
- [ ] Unit tests for deduplication logic
- [ ] Unit tests for date range filtering
- [ ] Integration tests for full workflow
- [ ] Manual end-to-end testing

## Architecture Overview

### New Flow (Web-Based)

```
User logs in (Microsoft OAuth)
        ↓
Select date range in dashboard UI
        ↓
Fetch meetings from Fireflies API
        ↓
User selects meetings to process
        ↓
Backend processes:
  - Extract tasks with Claude
  - Run deduplication
  - Cache ClickUp tasks
        ↓
UI displays tasks for review
        ↓
User selects tasks + assigns to team members
        ↓
Create tasks in assigned user's ClickUp list
        ↓
Tasks appear in individual ClickUp lists
```

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for bundling
- React Router for navigation
- Axios for HTTP requests
- date-fns for date handling

**Backend**
- Express.js (API routes via Vercel)
- Node.js with TypeScript
- Passport.js for authentication
- @supabase/supabase-js for database

**Infrastructure**
- Vercel for deployment (serverless)
- Supabase for PostgreSQL database
- Microsoft Azure AD for OAuth
- Fireflies.ai GraphQL API
- ClickUp REST API
- Anthropic Claude API

## Key Configuration Files

### Environment Variables (.env)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx
MICROSOFT_TENANT_ID=common
MICROSOFT_CALLBACK_URL=https://yourdomain.vercel.app/auth/microsoft/callback

# APIs
FIREFLIES_API_KEY=xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLICKUP_API_KEY=pk_xxxxx  # Used as fallback for task caching

# Session
SESSION_SECRET=generate-random-string

# Deployment
NODE_ENV=production
VERCEL_ENV=production
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && vite build",
    "start": "node dist/index.js",
    "frontend:dev": "cd web && vite",
    "frontend:build": "cd web && vite build",
    "test": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

## Implementation Checklist

### Before Deploying to Vercel

- [ ] Database schema created in Supabase
- [ ] All backend services tested locally
- [ ] All API routes tested with Postman/curl
- [ ] Frontend components built and tested
- [ ] Environment variables configured in Vercel
- [ ] OAuth callback URL matches deployment domain
- [ ] ClickUp API key valid and has permissions
- [ ] Fireflies API key working
- [ ] Anthropic API key working

### Deployment Steps

1. Set up Supabase project
   - Run SQL schema
   - Get credentials
   - Configure OAuth

2. Configure Vercel
   - Connect GitHub repository
   - Add environment secrets
   - Configure build command: `npm run build`
   - Configure output directory: `dist`

3. Deploy to Vercel
   - Push to GitHub
   - Vercel auto-deploys
   - Monitor build logs

4. Post-Deployment
   - Test OAuth flow
   - Test meeting processing
   - Verify database writes
   - Monitor API logs

## API Endpoints Reference

### Authentication
```
GET  /api/auth/microsoft           # Start OAuth
GET  /api/auth/callback            # OAuth callback
GET  /api/auth/user                # Get user info
POST /api/auth/user                # Update user config
GET  /api/auth/logout              # Logout (if implemented)
```

### Meetings
```
GET  /api/meetings/list?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
POST /api/meetings/process         # { meetingIds: string[] }
GET  /api/meetings/status/:sessionId
```

### Tasks
```
GET  /api/tasks/list?limit=100
POST /api/tasks/create             # { taskIds, assignments }
GET  /api/tasks/history            # User's history (optional)
```

### Users (for assignment dropdown)
```
GET  /api/users                    # Get all configured users
```

## Database Queries for Monitoring

```sql
-- User activity
SELECT email, COUNT(DISTINCT meeting_id) as meetings_processed
FROM processed_meetings pm
JOIN users u ON u.id = pm.user_id
GROUP BY u.email
ORDER BY meetings_processed DESC;

-- Task creation rate
SELECT DATE(created_in_clickup_at) as date, COUNT(*) as tasks_created
FROM extracted_tasks
WHERE created_in_clickup_at IS NOT NULL
GROUP BY DATE(created_in_clickup_at);

-- Duplicate statistics
SELECT
  COUNT(*) as total_tasks,
  SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicates,
  ROUND(100.0 * SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) / COUNT(*), 2) as duplicate_rate
FROM extracted_tasks;
```

## Troubleshooting

### OAuth Issues
```
Error: Invalid redirect_uri
→ Verify MICROSOFT_CALLBACK_URL matches Azure AD app config
→ Check domain is not localhost in production
```

### Database Issues
```
Error: Connection refused
→ Check SUPABASE_URL and SUPABASE_ANON_KEY
→ Verify Supabase project is active
→ Check firewall/network access
```

### Task Creation Failures
```
Error: Unauthorized
→ Verify CLICKUP_API_KEY is valid
→ Check user's clickup_list_id and clickup_team_id are set
→ Ensure ClickUp account has permissions
```

### Claude Deduplication Issues
```
Error: API error 429 (rate limited)
→ Implement exponential backoff
→ Reduce batch size
→ Wait between requests
```

## Next Steps After Implementation

1. **User Testing**
   - Test full workflow with real meetings
   - Collect feedback on UI/UX
   - Verify deduplication accuracy

2. **Optimizations**
   - Implement caching for meetings list
   - Add pagination for large task lists
   - Optimize Claude API calls

3. **Features to Add**
   - Task templates
   - Custom priority levels
   - Recurring task handling
   - Bulk operations

4. **Monitoring**
   - Set up error tracking (Sentry)
   - Add logging aggregation
   - Create dashboard for metrics

## Files Modified/Created

### New Files Created
- `sql/schema.sql` - Database schema
- `src/services/supabase.ts` - Supabase client
- `src/services/auth.ts` - Authentication
- `src/services/deduplication.ts` - Deduplication logic
- `api/auth/microsoft.ts` - OAuth initiation
- `api/auth/callback.ts` - OAuth callback
- `api/auth/user.ts` - User endpoints
- `api/meetings/list.ts` - Meeting list endpoint
- `api/meetings/process.ts` - Meeting processing
- `api/tasks/list.ts` - Task list endpoint
- `api/tasks/create.ts` - Task creation
- `SUPABASE_SETUP.md` - Supabase setup guide
- `IMPLEMENTATION_GUIDE.md` - This file

### Files Modified
- `src/services/fireflies.ts` - Added date range function
- `src/services/clickup.ts` - Switched to direct API

### Files to Remove
- `src/server.ts`
- `src/services/planner.ts`
- `src/services/teams.ts`
- `REPLIT_DEPLOY.md`
- `WEBHOOK_SETUP.md`
- `.state/` directory

## Success Metrics

- ✅ Users can log in with Microsoft account
- ✅ Users can select date range and see meetings
- ✅ Users can process multiple meetings (extract tasks with Claude)
- ✅ Duplicates are detected and flagged
- ✅ Users can assign tasks to team members
- ✅ Tasks created in assigned user's ClickUp list
- ✅ All state stored in Supabase (no local files)
- ✅ Deployed to Vercel with serverless architecture
- ✅ Response times < 5 seconds for typical operations
- ✅ 99% uptime on deployment

---

**Current Status**: Phase 2 (Backend Services) and Phase 3 (API Routes) Complete
**Next Phase**: Phase 4 & 5 (Frontend Components and Deployment)
