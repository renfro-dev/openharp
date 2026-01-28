# Context Orchestrator - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐            │
│  │  Login   │  │  Dashboard   │  │   Processing   │            │
│  │  Page    │  │    Page      │  │     Page       │            │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘            │
│       │               │                   │                     │
│       └───────────────┴───────────────────┘                     │
│                       │                                         │
│              ┌────────┴────────┐                               │
│              │   API Client    │                               │
│              │   (Axios)       │                               │
│              └────────┬────────┘                               │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTP/REST
┌───────────────────────┼─────────────────────────────────────────┐
│                       │         Backend (Vercel Serverless)     │
│              ┌────────┴────────┐                               │
│              │   API Routes    │                               │
│              │  /api/auth/*    │                               │
│              │  /api/meetings/*│                               │
│              │  /api/tasks/*   │                               │
│              └────────┬────────┘                               │
│                       │                                         │
│  ┌────────────────────┼────────────────────┐                   │
│  │                Services                  │                   │
│  │  ┌──────┐ ┌───────┐ ┌─────────┐ ┌─────┐│                   │
│  │  │ Auth │ │Firefly│ │  Dedup  │ │Click││                   │
│  │  │      │ │  es   │ │         │ │ Up  ││                   │
│  │  └──┬───┘ └───┬───┘ └────┬────┘ └──┬──┘│                   │
│  └─────┼─────────┼──────────┼─────────┼───┘                   │
│        │         │          │         │                         │
└────────┼─────────┼──────────┼─────────┼─────────────────────────┘
         │         │          │         │
    ┌────┴────┐ ┌──┴──┐  ┌────┴───┐ ┌───┴────┐
    │Supabase │ │Fire-│  │Claude  │ │ClickUp │
    │   DB    │ │flies│  │  API   │ │  API   │
    └─────────┘ │ API │  └────────┘ └────────┘
                └─────┘
```

## Technology Choices

### Frontend

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| React | 18.x | UI Framework | Component-based, large ecosystem |
| TypeScript | 5.x | Type Safety | Catch errors early, better IDE support |
| Vite | 5.x | Build Tool | Fast HMR, modern ESM support |
| React Router | 6.x | Routing | Standard for React SPAs |
| Axios | 1.x | HTTP Client | Promise-based, interceptors |

### Backend

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Node.js | 22.x | Runtime | LTS, native ESM support |
| TypeScript | 5.x | Type Safety | Shared types with frontend |
| Vercel | - | Hosting | Serverless, easy deployment |
| Express | 5.x | Framework | Used by Vercel under the hood |

### Database

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| Supabase | PostgreSQL + API | Free tier, easy setup, real-time |
| PostgreSQL | Relational DB | ACID compliance, complex queries |

### External APIs

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Fireflies.ai | Meeting transcripts | API Key (GraphQL) |
| Anthropic Claude | Task extraction, deduplication | API Key (REST) |
| ClickUp | Task creation | API Key (REST) |

## Data Flow

### 1. Login Flow

```
User → LoginPage → POST /api/auth/login → Verify APP_PASSWORD
                                        → Create session token
                                        → Set cookie
                                        → Return user data
```

### 2. Meeting Selection Flow

```
User → DashboardPage → GET /api/meetings/list?from=X&to=Y
                     → Fireflies GraphQL API
                     → Return meeting list
                     → Display in UI
```

### 3. Task Extraction Flow

```
User → Select meetings → POST /api/meetings/process
                       → For each meeting:
                         → Fetch summary from Fireflies
                         → Send to Claude for extraction
                         → Store tasks in Supabase
                       → Run deduplication
                       → Return session ID + stats
```

### 4. Deduplication Flow

```
Extracted tasks → String similarity filter (Levenshtein)
               → Claude semantic comparison
               → ClickUp cache comparison
               → Mark duplicates in database
```

### 5. Task Creation Flow

```
User → Select tasks → POST /api/tasks/create
                    → For each task:
                      → Create in ClickUp
                      → Update database with ClickUp ID
                    → Return results
```

## Database Schema

### Entity Relationship

```
┌──────────────┐       ┌────────────────────┐
│    users     │       │ processed_meetings │
├──────────────┤       ├────────────────────┤
│ id (PK)      │───┐   │ id (PK)            │
│ email        │   │   │ user_id (FK)       │──┐
│ display_name │   └──>│ meeting_id         │  │
│ clickup_*    │       │ meeting_title      │  │
│ created_at   │       │ processed_at       │  │
└──────────────┘       └────────────────────┘  │
                                               │
       ┌───────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐       ┌────────────────────┐
│   extracted_tasks    │       │ clickup_task_cache │
├──────────────────────┤       ├────────────────────┤
│ id (PK)              │       │ id (PK)            │
│ processed_meeting_id │       │ user_id (FK)       │
│ title                │       │ clickup_task_id    │
│ description          │       │ title              │
│ priority             │       │ list_id            │
│ is_duplicate         │       │ updated_at         │
│ clickup_task_id      │       └────────────────────┘
│ created_at           │
└──────────────────────┘
```

### Key Indexes

```sql
-- Fast user lookups
CREATE INDEX idx_users_email ON users(email);

-- Meeting queries by user
CREATE INDEX idx_processed_meetings_user_id ON processed_meetings(user_id);

-- Task queries
CREATE INDEX idx_extracted_tasks_meeting_id ON extracted_tasks(processed_meeting_id);
CREATE INDEX idx_extracted_tasks_is_duplicate ON extracted_tasks(is_duplicate);
```

## API Design

### Authentication Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /api/auth/login | `{ password }` | `{ user, token }` |
| POST | /api/auth/logout | - | `{ message }` |
| GET | /api/auth/user | - | `{ user }` |
| POST | /api/auth/user | `{ clickupListId, clickupTeamId }` | `{ user }` |

### Meeting Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | /api/meetings/list | `?from=DATE&to=DATE` | `{ meetings[] }` |
| POST | /api/meetings/process | `{ meetingIds[] }` | `{ sessionId, stats }` |

### Task Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | /api/tasks/list | `?sessionId=X` | `{ tasks[] }` |
| POST | /api/tasks/create | `{ taskIds[] }` | `{ created, failed }` |

## Security Considerations

### Authentication
- Password stored as environment variable (not in code/database)
- Session tokens are random 64-character strings
- Cookies are HttpOnly and SameSite=Strict
- 24-hour session expiration

### API Security
- All API keys stored in environment variables
- No secrets committed to repository
- HTTPS enforced in production (Vercel default)

### Data Protection
- User data isolated by user_id
- No sensitive data in client-side storage
- API responses sanitized

## Error Handling

### API Errors
```typescript
// Standard error response format
{
  error: string,      // User-friendly message
  code?: string,      // Error code for debugging
  details?: any       // Additional context (dev only)
}
```

### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Server error |

## Performance Considerations

### Caching
- ClickUp tasks cached in database for deduplication
- Session tokens cached in memory (single instance)
- No frontend caching (data changes frequently)

### Optimization
- Sequential API calls to avoid rate limits
- Batch database operations where possible
- Lazy loading of task details

### Scalability Limits
- In-memory session store: Single instance only
- Vercel serverless: 10-second timeout (free), 60-second (pro)
- Supabase free tier: 500MB storage, 2GB transfer

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│                  Vercel                      │
│  ┌─────────────┐  ┌─────────────────────┐   │
│  │  Frontend   │  │  Serverless API     │   │
│  │  (Static)   │  │  Functions          │   │
│  │             │  │                     │   │
│  │  /          │  │  /api/auth/*        │   │
│  │  /login     │  │  /api/meetings/*    │   │
│  │  /dashboard │  │  /api/tasks/*       │   │
│  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │Supabase │  │Fireflies │  │ClickUp   │
   │  (DB)   │  │  (API)   │  │  (API)   │
   └─────────┘  └──────────┘  └──────────┘
```

## Extension Points

### Adding OAuth
1. Add Passport.js strategy (Microsoft/Google)
2. Create OAuth callback endpoint
3. Update LoginPage with OAuth button
4. Modify user creation to use OAuth profile

### Adding New Task Destinations
1. Create new service in `src/services/`
2. Implement `createTask()` function
3. Add configuration to user profile
4. Update task creation endpoint

### Customizing Task Extraction
1. Modify prompt in `task-extractor.ts`
2. Adjust output parsing
3. Update Task type if needed
