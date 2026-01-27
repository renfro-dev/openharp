# Context Orchestrator - Quick Start Guide

## 🚀 Start Here

Welcome to the refactored Context Orchestrator! This guide will get you up and running.

### TL;DR - 5 Minute Setup

```bash
# 1. Set up Supabase (5 min at supabase.com)
#    - Create project → Run sql/schema.sql
#    - Copy URL + keys to .env

# 2. Set up Azure AD (5 min at portal.azure.com)
#    - Register app → Copy credentials to .env
#    - Set redirect: http://localhost:5173/auth/callback

# 3. Run locally
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev:all

# 4. Open browser
#    Frontend: http://localhost:5173
#    API: http://localhost:3001
```

---

## 📚 Documentation Map

**For Understanding the Architecture**
- Start: `CLAUDE.md` - Overview & quick start
- Deep Dive: `IMPLEMENTATION_GUIDE.md` - Detailed architecture
- Database: `SUPABASE_SETUP.md` - Database setup guide

**For Setup & Deployment**
- Environment: `.env.example` - All variables with explanations
- Development: `CLAUDE.md` - Dev scripts and commands
- Deployment: `DEPLOYMENT_VERCEL.md` (coming soon)

**For Code Conventions**
- TypeScript: `.claude/rules/typescript.md`
- Services: `.claude/rules/services.md`
- Frontend: `.claude/rules/web-ui.md` (coming soon)

**For Current Status**
- Progress: `IMPLEMENTATION_STATUS.md` - What's done
- Cleanup: `PROJECT_CLEANUP_SUMMARY.md` - What changed
- TODO: See todo list in this directory

---

## 🗂️ Project Structure

```
What Exists (✅ Ready)
├── api/                     # Vercel API routes (9 endpoints)
├── src/services/            # Backend services (5 complete)
├── sql/schema.sql          # Database schema
├── CLAUDE.md               # Architecture guide
├── SUPABASE_SETUP.md       # Database setup
└── Documentation/          # 5 detailed guides

What Doesn't Exist Yet (⏳ Build These)
├── web/                    # React frontend (create this first!)
├── README.md               # (needs update for web UI)
├── DEPLOYMENT_VERCEL.md    # (needs creation)
└── .claude/rules/web-ui.md # (needs creation)

What Was Removed (❌ Gone)
├── src/server.ts           # Old webhook server
├── src/services/planner.ts # Old Planner service
├── src/services/teams.ts   # Old Teams service
├── REPLIT_DEPLOY.md        # Old Replit guide
└── WEBHOOK_SETUP.md        # Old webhook guide
```

---

## 🔧 Development Scripts

```bash
# Run everything
npm run dev:all              # Frontend + API in parallel ⭐ USE THIS

# Or run separately
npm run dev:api              # API only (port 3001)
npm run dev:web              # Frontend only (port 5173)

# Testing
npm run test                 # Run all tests
npm run test:watch           # Watch mode

# Code quality
npm run lint                 # Check code
npm run format               # Auto-format

# Building
npm run build                # Build everything
npm run build:web            # Frontend only

# Deployment
npm start                    # Local Vercel dev
vercel deploy                # Deploy to Vercel
```

---

## 🔑 Environment Variables

### Absolutely Required
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=your_secret
MICROSOFT_CALLBACK_URL=http://localhost:5173/auth/callback

# APIs
FIREFLIES_API_KEY=xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLICKUP_API_KEY=pk_xxxxx

# Session
SESSION_SECRET=random_string_here
```

**Where to get each:**
- Supabase: https://supabase.com (create project → copy keys)
- Azure AD: https://portal.azure.com (App registrations → new app)
- Fireflies: https://fireflies.ai/settings
- Anthropic: https://console.anthropic.com/settings/keys
- ClickUp: ClickUp → Settings → Apps → Generate Token

---

## 🏗️ What's Ready (Backend 100%)

✅ **Database Layer**
- PostgreSQL schema with tables, views, triggers
- Supabase client with full CRUD
- Multi-user support built-in
- Automatic timestamp management

✅ **Authentication**
- Microsoft OAuth via Passport.js
- Session-based auth
- User configuration management

✅ **Task Processing**
- Meeting fetching from Fireflies (with date range)
- Task extraction via Claude
- 3-layer deduplication (string + semantic + cache)

✅ **API Endpoints**
- 3 auth endpoints
- 2 meetings endpoints
- 2 tasks endpoints
- Full error handling

✅ **Configuration**
- Updated .env.example
- New package.json scripts
- Supabase setup guide
- API documentation

---

## 🎨 What to Build Next (Frontend)

### Phase 1: Foundation
- [ ] Create `web/` directory with React + Vite
- [ ] Set up routing (React Router)
- [ ] Create basic layout/navigation
- [ ] Test build process

### Phase 2: Core Components
- [ ] LoginPage (Microsoft OAuth button)
- [ ] DashboardPage (date picker + meeting list)
- [ ] ProcessingPage (status updates)
- [ ] TaskReviewPanel (task selection + assignment)
- [ ] TaskCard (individual task display)

### Phase 3: Integration
- [ ] API client service (Axios + auth)
- [ ] Connect components to backend
- [ ] Error handling
- [ ] Loading states

### Phase 4: Polish
- [ ] Testing (unit + integration)
- [ ] Performance optimization
- [ ] Error tracking (Sentry)
- [ ] Responsive design

---

## 🚀 Development Workflow

### Getting Started

```bash
# 1. Clone and install
git clone ...
cd context-orchestrator
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Create Supabase project
# Go to supabase.com, create project, run sql/schema.sql

# 4. Start development
npm run dev:all
```

### Testing Endpoints

```bash
# List meetings
curl "http://localhost:3001/api/meetings/list?from=2024-12-01&to=2024-12-31"

# Get current user (need auth header)
curl http://localhost:3001/api/auth/user

# Test processing
curl -X POST http://localhost:3001/api/meetings/process \
  -H "Content-Type: application/json" \
  -d '{"meetingIds": ["meeting-id-1"]}'
```

### Common Errors

```
Error: SUPABASE_URL not found
→ Check .env file exists and has SUPABASE_URL

Error: Connection refused to localhost:3001
→ Run `npm run dev:api` first

Error: No module found
→ Run `npm install` to install dependencies

Error: OAuth callback URL mismatch
→ Check MICROSOFT_CALLBACK_URL in Azure AD app config
```

---

## 📖 Recommended Reading Order

1. **Quick Overview**: This file (QUICK_START.md)
2. **Architecture**: CLAUDE.md (20 min read)
3. **Setup**: SUPABASE_SETUP.md (15 min read)
4. **Deep Dive**: IMPLEMENTATION_GUIDE.md (30 min read)
5. **API Reference**: See api/*.ts files
6. **Code Conventions**: .claude/rules/*.md

---

## 💡 Pro Tips

### For Local Development
- Use `npm run dev:all` to run frontend + API together
- Keep browser dev tools open (F12) for debugging
- Check console for [Supabase], [Auth], [API] logs

### For Testing
- Use Postman/Insomnia for API testing
- Test OAuth flow with browser dev tools (Network tab)
- Check Supabase dashboard for database activity

### For Debugging
- Add `console.log()` in services for output
- Check .env file syntax (no spaces around =)
- Clear browser cache if auth issues persist

### For Performance
- Database queries are indexed for common operations
- API routes use serverless (no cold start issues in production)
- Frontend uses React lazy loading for code splitting

---

## 📞 Getting Help

### If You Get Stuck

1. **Check Documentation**
   - CLAUDE.md - Quick overview
   - IMPLEMENTATION_GUIDE.md - Detailed reference
   - API route code - See what it expects

2. **Check Logs**
   - Browser console (F12)
   - Terminal where npm run dev:all is running
   - Supabase dashboard (SQL editor for queries)

3. **Verify Setup**
   - .env file has all required variables
   - Supabase project created and schema run
   - Azure AD app registered with correct redirect URL
   - All API keys valid and not expired

4. **Test Isolate**
   - Test backend APIs with curl/Postman
   - Test frontend without backend
   - Test database queries directly in Supabase

---

## ✅ Checklist Before Starting

Before you start building, make sure you have:

- [ ] Node.js 22+ installed
- [ ] Supabase project created
- [ ] SQL schema imported (sql/schema.sql)
- [ ] Azure AD app registered
- [ ] All API keys obtained
- [ ] .env file filled out
- [ ] `npm install` completed
- [ ] `npm run dev:api` starts without errors
- [ ] You can visit http://localhost:3001/api/health

---

## 🎯 Next Actions

**Right Now:**
1. Read CLAUDE.md (20 minutes)
2. Read SUPABASE_SETUP.md (15 minutes)

**This Week:**
1. Create Supabase project
2. Register Azure AD app
3. Create web/ directory with React + Vite
4. Build LoginPage component
5. Test OAuth flow

**Next Week:**
1. Build DashboardPage and other components
2. Create API client service
3. Connect frontend to backend
4. Manual testing of full workflow

---

**Let's build! 🚀**

Questions? Check CLAUDE.md or IMPLEMENTATION_GUIDE.md

Good luck! 🎉
