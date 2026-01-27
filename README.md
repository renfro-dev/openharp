# Context Orchestrator - Multi-User Web UI

Automatically convert Fireflies.ai meeting transcripts into actionable tasks with intelligent deduplication and team collaboration via ClickUp.

**Modern web application** | **Vercel serverless backend** | **Supabase database** | **Microsoft OAuth** | **Multi-user support**

## ✨ Features

- 🔐 **Secure Login** - Microsoft 365 OAuth authentication
- 📅 **Date Range Selection** - Filter meetings by any date range
- 🤖 **AI Task Extraction** - Claude AI identifies actionable tasks
- 🔍 **Smart Deduplication** - 3-layer duplicate detection (string + semantic + cache)
- 👥 **Team Collaboration** - Assign tasks to team members
- ✅ **One-Click Creation** - Create tasks directly in ClickUp
- 📊 **Multi-User** - Each user has isolated workspace and configuration
- ⚡ **Serverless** - Deployed on Vercel with Supabase database

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Supabase project (free tier works)
- Microsoft 365 account
- Fireflies.ai account
- ClickUp account
- Anthropic Claude API access

### 1. Setup (5 minutes)

```bash
# Clone and install
git clone <repository>
cd context-orchestrator
npm install

# Copy environment template
cp .env.example .env

# Fill in credentials in .env
# See QUICK_START.md for where to find each value
```

### 2. Create Supabase Project (5 minutes)

1. Go to https://supabase.com
2. Create new project
3. Go to SQL Editor
4. Run the schema from `sql/schema.sql`
5. Copy URL and keys to `.env`

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for detailed instructions.

### 3. Configure Microsoft OAuth (5 minutes)

1. Go to https://portal.azure.com
2. Register new app under "App registrations"
3. Create client secret
4. Set redirect URI: `http://localhost:5173/auth/callback`
5. Copy credentials to `.env`

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md#azure-ad-configuration)** for details.

### 4. Start Development

```bash
# Run frontend and API together (recommended)
npm run dev:all

# Or run separately:
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173
```

## 📖 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Getting started guide (5 min read)
- **[CLAUDE.md](./CLAUDE.md)** - Architecture overview (20 min read)
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database setup guide
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Architecture details
- **[PROJECT_CLEANUP_SUMMARY.md](./PROJECT_CLEANUP_SUMMARY.md)** - What changed in refactoring

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for fast development
- React Router for navigation
- Axios for API calls

**Backend**
- Node.js with Express
- Vercel serverless deployment
- Passport.js for authentication
- TypeScript throughout

**Database**
- Supabase (PostgreSQL)
- Multi-user support
- Row-level security
- Automatic backups

**External Services**
- Microsoft Azure AD (OAuth)
- Fireflies.ai (transcripts)
- Anthropic Claude (AI extraction)
- ClickUp (task management)

### Data Flow

```
1. User logs in with Microsoft 365
   ↓
2. Select meetings by date range
   ↓
3. System extracts tasks with Claude AI
   ↓
4. Intelligent deduplication (3-layer)
   ↓
5. UI shows tasks for review
   ↓
6. User selects tasks + assigns to team
   ↓
7. Create in assigned user's ClickUp
```

### Project Structure

```
context-orchestrator/
├── api/                      # Vercel serverless functions
│   ├── auth/                 # OAuth endpoints
│   ├── meetings/             # Meeting processing
│   └── tasks/                # Task management
│
├── src/                      # Shared services
│   ├── services/
│   │   ├── supabase.ts       # Database client
│   │   ├── auth.ts           # OAuth integration
│   │   ├── deduplication.ts  # Duplicate detection
│   │   ├── fireflies.ts      # Meeting fetching
│   │   ├── clickup.ts        # Task creation
│   │   └── task-extractor.ts # Claude AI
│   └── types.ts              # TypeScript interfaces
│
├── web/                      # React frontend (to be created)
│
├── sql/
│   └── schema.sql            # Database schema
│
├── .claude/rules/            # Code conventions
│   ├── typescript.md
│   ├── services.md
│   └── deployment.md
│
└── Configuration files
    ├── .env.example          # Environment template
    ├── package.json          # Dependencies
    ├── tsconfig.json         # TypeScript config
    └── vercel.json           # (to be created)
```

## 🔧 Available Commands

```bash
# Development
npm run dev:all              # Run frontend + API ⭐
npm run dev:api              # API only
npm run dev:web              # Frontend only

# Building
npm run build                # Build everything
npm run build:web            # Frontend only

# Testing
npm run test                 # Run all tests
npm run test:watch           # Watch mode

# Code quality
npm run lint                 # Check code
npm run format               # Auto-format

# Deployment
npm start                    # Local Vercel dev
vercel deploy                # Deploy to Vercel
```

## 📋 API Endpoints

### Authentication
- `GET /api/auth/microsoft` - Start OAuth login
- `GET|POST /api/auth/callback` - OAuth callback
- `GET|POST /api/auth/user` - Get/update user profile

### Meetings
- `GET /api/meetings/list?from=DATE&to=DATE` - List meetings by date range
- `POST /api/meetings/process` - Process meetings and extract tasks

### Tasks
- `GET /api/tasks/list` - Get pending tasks for review
- `POST /api/tasks/create` - Create tasks in ClickUp

See **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** for full API reference.

## 🗄️ Database Schema

**Core Tables:**
- `users` - User profiles and ClickUp configuration
- `processed_meetings` - Meeting processing history
- `extracted_tasks` - All extracted tasks with status
- `clickup_task_cache` - Cache for deduplication

**Views:**
- `pending_tasks` - Tasks ready for creation
- `processing_history` - User activity
- `duplicate_summary` - Deduplication audit

See **[sql/schema.sql](./sql/schema.sql)** for complete schema.

## 🚀 Deployment

### To Vercel

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

```bash
npm run build
vercel deploy --prod
```

See **[DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md)** (coming soon) for detailed guide.

## 📚 Development Workflow

### Local Development

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 2. Start development
npm run dev:all

# 3. Open browser
# Frontend: http://localhost:5173
# API: http://localhost:3001
```

### Testing API Endpoints

```bash
# List meetings
curl "http://localhost:3001/api/meetings/list?from=2024-12-01&to=2024-12-31"

# Process meetings
curl -X POST http://localhost:3001/api/meetings/process \
  -H "Content-Type: application/json" \
  -d '{"meetingIds": ["meeting-id-1"]}'

# Get tasks
curl http://localhost:3001/api/tasks/list
```

## 🐛 Troubleshooting

### OAuth Issues
```
Error: Invalid redirect_uri
→ Check MICROSOFT_CALLBACK_URL matches Azure AD app
```

### Database Connection Failed
```
Error: Connection refused
→ Verify SUPABASE_URL is correct
→ Check API keys in .env
```

### API Not Starting
```
Error: EADDRINUSE
→ Port 3001 already in use
→ Kill other process or change port
```

### Frontend Won't Connect to API
```
Error: Failed to fetch
→ Check API is running on :3001
→ Verify CORS is enabled
→ Check browser console for details
```

For more help, see **[QUICK_START.md](./QUICK_START.md)** and **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**.

## 🎯 Next Steps

1. **Read Documentation**
   - Start with [QUICK_START.md](./QUICK_START.md) (5 min)
   - Then [CLAUDE.md](./CLAUDE.md) (20 min)

2. **Set Up Environment**
   - Create Supabase project
   - Register Azure AD app
   - Configure `.env`

3. **Build Frontend** (when ready)
   - Create `web/` directory
   - Build React components
   - Connect to backend

4. **Deploy to Vercel**
   - Configure `vercel.json`
   - Add environment secrets
   - Deploy

## 📞 Support

- Check **[QUICK_START.md](./QUICK_START.md)** for common questions
- See **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** for technical details
- Read **[CLAUDE.md](./CLAUDE.md)** for architecture overview

## 📄 License

MIT

---

**Ready to get started?** → Open **[QUICK_START.md](./QUICK_START.md)** 🚀
