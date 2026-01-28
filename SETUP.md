# Context Orchestrator - Setup Guide

A web application that automatically converts Fireflies.ai meeting transcripts into actionable ClickUp tasks using Claude AI, with intelligent deduplication.

**Workflow**: Fireflies meeting → Claude AI extracts tasks → Deduplication → Review in web UI → Create in ClickUp

## Prerequisites

- Node.js 22+
- Accounts needed:
  - [Supabase](https://supabase.com) (free tier works)
  - [Fireflies.ai](https://fireflies.ai) (meeting transcripts)
  - [ClickUp](https://clickup.com) (task management)
  - [Anthropic](https://console.anthropic.com) (Claude API)

---

## MCP Server Selection

This project uses unofficial MCP (Model Context Protocol) servers that accept API keys via environment variables instead of OAuth. This design choice simplifies setup for single-user or small team deployments.

### Servers Used

| Service | MCP Server | Repository |
|---------|------------|------------|
| Fireflies | fireflies-mcp-server | [AshieLoche/fireflies-mcp-server](https://github.com/AshieLoche/fireflies-mcp-server) |
| ClickUp | @taazkareem/clickup-mcp-server | [taazkareem/clickup-mcp-server](https://github.com/taazkareem/clickup-mcp-server) |

### Why API Keys Instead of OAuth?

- **Simpler Setup**: No callback URLs, token refresh logic, or OAuth flow implementation required
- **Faster Development**: Get up and running quickly without configuring OAuth providers
- **Single-User Focus**: Ideal for personal or small team deployments where per-user auth isn't needed

For enterprise or multi-tenant deployments requiring per-user authentication, consider implementing OAuth with the official APIs instead.

### Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| MCP Servers | Free | Open source |
| Fireflies.ai | Paid plan required | API access needs Pro tier or higher - [pricing](https://fireflies.ai/pricing) |
| ClickUp | Free tier available | API included with all plans - [pricing](https://clickup.com/pricing) |
| Claude API | Pay-per-token | See [Anthropic pricing](https://anthropic.com/pricing) |
| Supabase | Free tier available | Generous free tier for small projects - [pricing](https://supabase.com/pricing) |

---

## Step 1: Clone & Install (2 min)

```bash
git clone <your-repo-url>
cd context-orchestrator
npm install
cp .env.example .env
```

---

## Step 2: Create Supabase Project (5 min)

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Configure:
   - **Name**: `context-orchestrator`
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 2.2 Run Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `sql/schema.sql`
4. Click **Run**
5. Verify tables were created: `users`, `processed_meetings`, `extracted_tasks`, `clickup_task_cache`

### 2.3 Get Credentials

1. Go to **Project Settings** → **API**
2. Copy these values to your `.env` file:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 3: Set App Password (1 min)

Choose a secure password for accessing the application:

```env
APP_PASSWORD=your_secure_password_here
```

This password protects access to the web UI. Share it only with authorized users.

---

## Step 4: Get API Keys (5 min)

### 4.1 Fireflies API Key

1. Log in to [app.fireflies.ai](https://app.fireflies.ai)
2. Go to **Settings** → **API & Integrations**
3. Copy your API key

```env
FIREFLIES_API_KEY=your_fireflies_api_key
```

### 4.2 Anthropic (Claude) API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Create a new key or copy existing

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 4.3 ClickUp API Key

1. Log in to [app.clickup.com](https://app.clickup.com)
2. Go to **Settings** (bottom left) → **Apps**
3. Click **Generate** under API Token

```env
CLICKUP_API_KEY=pk_xxxxx
```

---

## Step 5: Generate Session Secret (1 min)

Generate a random string for session encryption:

```bash
# macOS/Linux
openssl rand -base64 32

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:

```env
SESSION_SECRET=your_generated_random_string
```

---

## Step 6: Start Development

```bash
# Run both frontend and API
npm run dev:all

# Or run separately in two terminals:
npm run dev:api    # API on http://localhost:3001
npm run dev:web    # Frontend on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Step 7: First Login & Configuration

### 7.1 Login

1. Enter the `APP_PASSWORD` you configured
2. You'll be redirected to the dashboard

### 7.2 Configure Your ClickUp Settings

After first login, configure your ClickUp destination:

1. Go to your ClickUp workspace
2. Navigate to the List where you want tasks created
3. Copy the **List ID** from the URL: `https://app.clickup.com/123456/v/li/789012` → List ID is `789012`
4. Get your **Team ID** from Settings → Workspace settings
5. Update your profile in the web app with these values

### 7.3 Process Your First Meeting

1. Select a date range containing meetings
2. Choose meetings to process
3. Review extracted tasks
4. Click Create to add tasks to ClickUp

---

## Deploying to Vercel (Production)

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Vercel auto-detects settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `web/dist`

### 3. Add Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add all variables from your `.env` file:

- `APP_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `FIREFLIES_API_KEY`
- `ANTHROPIC_API_KEY`
- `CLICKUP_API_KEY`
- `SESSION_SECRET`

### 4. Deploy

```bash
vercel deploy --prod
```

Or push to main branch for automatic deployment.

---

## Troubleshooting

### Login Issues

**Error: Invalid password**
- Verify `APP_PASSWORD` is set correctly in `.env`
- Check the password matches exactly (case-sensitive)

### Database Connection Issues

**Error: Connection refused / Invalid API key**
- Verify `SUPABASE_URL` starts with `https://` and ends with `.supabase.co`
- Check API keys are copied correctly (no extra spaces)
- Ensure your Supabase project is active (not paused)

### API Not Starting

**Error: EADDRINUSE (port in use)**
- Another process is using port 3001
- Kill it: `lsof -ti:3001 | xargs kill` (macOS/Linux)

**Error: Module not found**
- Run `npm install` again
- Check you're in the correct directory

### Task Creation Fails

**Error: ClickUp API unauthorized**
- Verify `CLICKUP_API_KEY` is valid
- Check your ClickUp account has API access
- Ensure the List ID and Team ID are correct

### Claude API Issues

**Error: 401 Unauthorized**
- Verify `ANTHROPIC_API_KEY` starts with `sk-ant-`
- Check you have API credits available

**Error: 429 Rate Limited**
- Wait a moment and try again
- Consider processing fewer meetings at once

---

## Environment Variables Reference

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `APP_PASSWORD` | Yes | Login password | Choose a secure password |
| `SUPABASE_URL` | Yes | Database URL | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Yes | Public API key | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key | Supabase → Project Settings → API |
| `FIREFLIES_API_KEY` | Yes | Meeting transcripts | Fireflies → Settings → API |
| `ANTHROPIC_API_KEY` | Yes | Claude AI | console.anthropic.com → API Keys |
| `CLICKUP_API_KEY` | Yes | Task creation | ClickUp → Settings → Apps |
| `SESSION_SECRET` | Yes | Session encryption | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | No | Environment mode | `development` or `production` |

---

## Available Scripts

```bash
# Development
npm run dev:all       # Run frontend + API together (recommended)
npm run dev:api       # API only (port 3001)
npm run dev:web       # Frontend only (port 5173)

# Building
npm run build         # Build everything for production
npm run build:web     # Build frontend only

# Testing
npm run test          # Run all tests
npm run test:watch    # Watch mode

# Code Quality
npm run lint          # Check for issues
npm run format        # Auto-format code

# Deployment
vercel deploy         # Deploy to Vercel
```

---

## Adding OAuth Later

Once you've customized this tool to your needs, you may want to add Microsoft or Google OAuth for team access. This allows:

- Multiple users with individual accounts
- Single sign-on with existing corporate credentials
- Better security for production environments

See the [Passport.js documentation](http://www.passportjs.org/) for OAuth integration guides.

---

## Next Steps

Once you're up and running:

1. **Process Meetings**: Select date ranges and extract tasks
2. **Review Tasks**: Use the web UI to review extracted tasks
3. **Configure ClickUp**: Set your List ID and Team ID
4. **Monitor**: Check Supabase dashboard for activity

For architecture details, see `CLAUDE.md`.
