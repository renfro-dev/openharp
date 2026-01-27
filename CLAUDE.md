# Context Orchestrator - Web UI

Multi-user web application to automatically convert Fireflies.ai meeting transcripts into actionable tasks with intelligent deduplication and team collaboration via ClickUp.

**New Architecture**: Web UI (React) + Serverless API (Vercel) + Supabase Database

See @README.md for complete user documentation and setup instructions.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in values)
cp .env.example .env

# Development: Run API and Frontend in parallel
npm run dev:all

# Or separately:
npm run dev:api    # API on http://localhost:3001
npm run dev:web    # Frontend on http://localhost:5173

# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

## New Architecture (2.0)

### Data Flow
```
User logs in (Microsoft OAuth)
    ↓
Select meetings by date range
    ↓
Extract tasks with Claude AI
    ↓
Run deduplication (semantic + cache check)
    ↓
UI displays tasks for review
    ↓
Assign tasks to team members
    ↓
Create in assigned user's ClickUp
```

### Technology Stack

**Frontend**
- React 18 + TypeScript
- Vite for fast development
- React Router for navigation
- Axios for HTTP requests

**Backend (API Routes)**
- Express.js on Vercel serverless
- Passport.js for Microsoft OAuth
- TypeScript throughout

**Database**
- Supabase (PostgreSQL)
- Row-level security for multi-user
- Automatic timestamp management

**External Services**
- Microsoft Azure AD (OAuth)
- Fireflies.ai (meeting transcripts)
- Anthropic Claude (task extraction + deduplication)
- ClickUp (task management)

### Key Services

**Backend Services** (@src/services/)

- @src/services/supabase.ts (250 lines) - Database abstraction
  - User management, meeting tracking, task storage, deduplication, statistics

- @src/services/auth.ts (100 lines) - Microsoft OAuth
  - Passport.js Azure AD integration
  - User configuration management

- @src/services/deduplication.ts (300 lines) - Intelligent duplicate detection
  - String similarity (Levenshtein distance)
  - Claude AI semantic analysis
  - ClickUp cache comparison
  - Multi-meeting task merging

- @src/services/fireflies.ts - Meeting transcript fetching
  - New: `listMeetingsByDateRange()` function

- @src/services/clickup.ts - ClickUp task creation
  - Direct REST API (multi-user ready)
  - No MCP needed (simpler, faster)

**API Routes** (@api/)

- Authentication (3 routes)
  - `GET /api/auth/microsoft` - Start OAuth
  - `GET|POST /api/auth/callback` - OAuth callback
  - `GET|POST /api/auth/user` - User profile/config

- Meetings (2 routes)
  - `GET /api/meetings/list?from=DATE&to=DATE` - List by range
  - `POST /api/meetings/process` - Process + extract tasks

- Tasks (2 routes)
  - `GET /api/tasks/list` - Get pending tasks
  - `POST /api/tasks/create` - Create in ClickUp

**Frontend Components** (@web/src/)

- Pages
  - LoginPage - OAuth login button
  - DashboardPage - Meeting selection
  - ProcessingPage - Real-time status

- Components
  - TaskReviewPanel - Task selection + assignment
  - TaskCard - Individual task display

- Services
  - api.ts - HTTP client

### Database Schema

**Core Tables**
- `users` - Multi-user accounts with ClickUp config
- `processed_meetings` - Track which meetings have been processed
- `extracted_tasks` - All extracted tasks with status
- `clickup_task_cache` - Caching for deduplication

**Views**
- `pending_tasks` - Tasks ready for creation
- `processing_history` - User activity stats
- `duplicate_summary` - Deduplication audit trail

See @sql/schema.sql for complete schema with indexes and triggers.

## Code Organization

```
context-orchestrator/
├── api/                       # Vercel serverless functions
│   ├── auth/
│   │   ├── microsoft.ts      # OAuth initiation
│   │   ├── callback.ts       # OAuth callback
│   │   └── user.ts           # User endpoints
│   ├── meetings/
│   │   ├── list.ts           # List meetings
│   │   └── process.ts        # Process & extract
│   └── tasks/
│       ├── list.ts           # Get tasks
│       └── create.ts         # Create in ClickUp
│
├── web/                       # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ProcessingPage.tsx
│   │   ├── components/
│   │   │   ├── TaskReviewPanel.tsx
│   │   │   └── TaskCard.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── App.tsx
│   └── vite.config.ts
│
├── src/                       # Shared backend services
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── auth.ts
│   │   ├── deduplication.ts
│   │   ├── fireflies.ts
│   │   ├── clickup.ts
│   │   └── task-extractor.ts
│   └── types.ts
│
├── sql/
│   └── schema.sql            # PostgreSQL schema
│
├── .claude/rules/            # Code conventions
│   ├── typescript.md
│   ├── services.md
│   ├── web-ui.md
│   └── deployment.md
│
├── CLAUDE.md                 # This file
├── README.md                 # User documentation
├── DEPLOYMENT_VERCEL.md      # Deployment guide
├── IMPLEMENTATION_GUIDE.md   # Architecture details
├── SUPABASE_SETUP.md         # Database setup
├── .env.example              # Environment template
├── vercel.json               # Vercel config
└── package.json
```

## Environment Configuration

### Required Variables

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=your_secret
MICROSOFT_TENANT_ID=common
MICROSOFT_CALLBACK_URL=http://localhost:5173/auth/callback

# APIs
FIREFLIES_API_KEY=xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLICKUP_API_KEY=pk_xxxxx

# Session
SESSION_SECRET=random_32_char_string
```

See @.env.example for complete reference with helpful comments.

## Development Workflow

### Local Development

```bash
# 1. Set up Supabase
# Create project at supabase.com, run sql/schema.sql

# 2. Configure Azure AD
# Register app at portal.azure.com, get credentials

# 3. Install and setup
npm install
cp .env.example .env
# Edit .env with your credentials

# 4. Run both frontend and API
npm run dev:all

# Or in separate terminals:
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:5173
```

### Testing API Endpoints

```bash
# Get available meetings
curl http://localhost:3001/api/meetings/list?from=2024-12-01&to=2024-12-31

# Process meetings
curl -X POST http://localhost:3001/api/meetings/process \
  -H "Content-Type: application/json" \
  -d '{"meetingIds": ["meeting-id-1"]}'

# Get pending tasks
curl http://localhost:3001/api/tasks/list
```

## Code Conventions

See @.claude/rules/ for detailed guidelines:

- @.claude/rules/typescript.md - TypeScript patterns, ES modules
- @.claude/rules/services.md - Service layer patterns, error handling
- @.claude/rules/web-ui.md - React conventions, component structure
- @.claude/rules/deployment.md - Vercel deployment, environment setup

## State Management

**Database-Backed (No Local Files)**
- User profiles and configuration → Supabase users table
- Meeting processing history → Supabase processed_meetings table
- Extracted tasks → Supabase extracted_tasks table
- Deduplication tracking → is_duplicate flags + duplicate_of_task_id
- ClickUp creation tracking → clickup_task_id + created_in_clickup_at

Benefits:
- ✅ Multi-user support (each user has isolated data)
- ✅ Persistent history across sessions
- ✅ No .state/ directory needed
- ✅ Easy backups with Supabase
- ✅ Real-time data sync

## Authentication

### Microsoft OAuth Flow

1. User clicks "Login with Microsoft"
2. Redirect to `GET /api/auth/microsoft`
3. Passport initiates Azure AD login
4. User signs in at Microsoft portal
5. Redirect back to `GET /api/auth/callback`
6. Session created, user redirected to dashboard

### Session Management

- Passport.js serializes user ID to session
- Express-session stores session in memory (can use Redis for production)
- All API endpoints check `req.isAuthenticated()`

## Deduplication Strategy

**Three-Layer Approach**

1. **String Similarity** (Pre-filter)
   - Levenshtein distance
   - Identifies obvious duplicates quickly
   - Reduces Claude API calls

2. **Claude AI** (Semantic Analysis)
   - Compares task descriptions
   - Understands context and intent
   - Catches subtle duplicates

3. **ClickUp Cache** (Against Existing)
   - Compare with user's ClickUp tasks
   - Prevent creating duplicate tasks
   - Smart merging of similar tasks

Result: Marked in database as `is_duplicate = true` with reference to original

## Deployment

### To Vercel

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 2. Connect to Vercel (first time only)
vercel

# 3. Add environment secrets in Vercel dashboard
# Settings → Environment Variables

# 4. Deploy
vercel deploy --prod
```

See @DEPLOYMENT_VERCEL.md for detailed step-by-step guide.

## Troubleshooting

### OAuth Issues
```
Error: Invalid redirect_uri
→ Check MICROSOFT_CALLBACK_URL matches Azure AD app config
```

### Database Issues
```
Error: Connection refused
→ Verify SUPABASE_URL is correct
→ Check API keys haven't expired
```

### Task Creation Failures
```
Error: Unauthorized
→ Verify CLICKUP_API_KEY is valid
→ Check user's clickup_list_id is configured
```

### Claude Deduplication
```
Error: Rate limited (429)
→ Reduce batch size or add delay between requests
```

See @IMPLEMENTATION_GUIDE.md for detailed troubleshooting.

## Monitoring & Debugging

### Service Logging

All services use prefixed logging:
```
[Supabase] - Database operations
[Auth] - Authentication/OAuth
[Dedup] - Deduplication processing
[ClickUp] - ClickUp API operations
[API] - API route handlers
```

### Debug Mode

Set in .env:
```env
DEBUG=context-orchestrator:*
```

### Database Inspection

```sql
-- Active users
SELECT email, created_at FROM users ORDER BY created_at DESC;

-- Processing activity
SELECT COUNT(*), DATE(processed_at) FROM processed_meetings GROUP BY DATE(processed_at);

-- Dedup effectiveness
SELECT COUNT(*), SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) FROM extracted_tasks;
```

## For Claude Code Users

This file (CLAUDE.md) and the @.claude/rules/ directory follow Claude Code best practices for project memory and documentation organization.

Key files referenced:
- @README.md - User guide
- @IMPLEMENTATION_GUIDE.md - Architecture reference
- @SUPABASE_SETUP.md - Database setup
- @DEPLOYMENT_VERCEL.md - Deployment steps
- @sql/schema.sql - Database schema
- @.claude/rules/ - Code conventions
