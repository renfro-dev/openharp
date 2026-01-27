# Supabase Setup Guide

## Project Creation

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Configure:
   - **Organization**: Your workspace
   - **Project Name**: `context-orchestrator`
   - **Database Password**: Generate strong password (save in 1Password/secure location)
   - **Region**: `us-west-1` (or closest to your deployment)
   - **Pricing Plan**: Free tier works for testing, Pro ($25/mo) for production

## Project URL and Keys

After creation, go to Project Settings → API:

**Required Credentials (for .env):**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

**For Vercel:**
- Add all three as environment secrets

## Database Schema Setup

### Option 1: Run SQL Directly (Recommended)

1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the entire SQL from `sql/schema.sql`
4. Click "Run"
5. Verify all tables created

### Option 2: Use Migration Files (Optional)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-id xxxxx

# Run migrations
supabase db pull  # Pulls existing schema
supabase migration new initial_schema
# Edit migration file with schema.sql content
supabase db push
```

## Verify Schema

In Supabase SQL Editor, run:

```sql
-- List all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify indexes
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Test insert (optional)
INSERT INTO users (email, microsoft_id, display_name, clickup_list_id, clickup_team_id)
VALUES ('test@example.com', 'test123', 'Test User', 'list123', 'team123');
```

## Row Level Security (RLS)

**IMPORTANT**: Set up RLS policies for production:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clickup_task_cache ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid()::text = id::text);

-- Similar policies for other tables...
```

For development, you can disable RLS initially:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- (disable for other tables)
```

## Authentication Setup

### Microsoft OAuth Integration

1. In Supabase dashboard: Authentication → Providers
2. Find "Microsoft"
3. Configure:
   - **Client ID**: From Azure AD (see below)
   - **Client Secret**: From Azure AD
   - **Tenant ID**: Your Microsoft tenant (or 'common' for multi-tenant)

### Azure AD Configuration

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for "App registrations"
3. Click "New registration"
4. Configure:
   - **Name**: `Context Orchestrator Web`
   - **Supported account types**: Accounts in your organizational directory only (or multi-tenant)
   - **Redirect URI**:
     - Development: `http://localhost:5173/auth/microsoft/callback`
     - Production: `https://yourdomain.vercel.app/auth/microsoft/callback`
5. Copy **Client ID** and **Directory (tenant) ID**
6. Go to Certificates & Secrets
7. Create new client secret (copy value immediately)

## Testing Connection

```bash
# Test Supabase connection
npm run dev

# Load environment and test
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.auth.getSession().then(console.log);
"
```

## Backups

Enable automatic backups in Supabase (included with Pro plan):

1. Project Settings → Backups
2. Configure backup frequency
3. Test restore periodically

## Troubleshooting

### Connection Issues

```
Error: Invalid API key
→ Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
→ Check keys haven't expired or been rotated
```

### Authentication Issues

```
Error: Microsoft OAuth failed
→ Check Client ID and Client Secret are correct
→ Verify redirect URL matches exactly
→ Check tenant ID is correct
```

### RLS Policy Issues

```
Error: new row violates row-level security policy
→ Check RLS policies are configured correctly
→ For development, consider disabling RLS initially
```

## Monitoring

**Useful Queries:**

```sql
-- User growth
SELECT DATE(created_at) as date, COUNT(*) as new_users
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Processing activity
SELECT user_id, COUNT(*) as processed_count, COUNT(DISTINCT meeting_id) as unique_meetings
FROM processed_meetings
GROUP BY user_id;

-- Task creation rate
SELECT DATE(created_at) as date, COUNT(*) as tasks_created
FROM extracted_tasks
WHERE created_in_clickup_at IS NOT NULL
GROUP BY DATE(created_at);

-- Duplicate detection stats
SELECT COUNT(*) as total_tasks,
       SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicates,
       ROUND(100.0 * SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) / COUNT(*), 2) as duplicate_rate
FROM extracted_tasks;
```

## Next Steps

1. ✅ Create Supabase project
2. ✅ Get credentials
3. ✅ Run schema setup
4. ✅ Configure Microsoft OAuth
5. → Build backend services to connect to database
