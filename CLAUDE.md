# Context Orchestrator - Project Template

This is a template for building an AI-powered meeting-to-task orchestration system.

## Getting Started

1. **Read the documentation in `docs/`**:
   - `docs/SPEC.md` - Product requirements and user stories
   - `docs/DESIGN.md` - Technical architecture and design decisions
   - `docs/PLAN.md` - Implementation roadmap and phases

2. **Configure environment**: Copy `.env.example` to `.env` and fill in your API keys

3. **Follow setup guide**: See `SETUP.md` for step-by-step instructions

## Template Structure

```
context-orchestrator/
├── docs/
│   ├── SPEC.md       # What to build (requirements)
│   ├── DESIGN.md     # How to build it (architecture)
│   └── PLAN.md       # When to build it (phases)
├── CLAUDE.md         # This file
├── SETUP.md          # Setup instructions
└── .env.example      # Environment template
```

## Project Overview

**Goal**: Convert Fireflies.ai meeting transcripts into ClickUp tasks using Claude AI.

**Key Features**:
- Fetch meeting transcripts from Fireflies.ai
- Extract actionable tasks using Claude AI
- Deduplicate tasks (semantic + cache-based)
- Create tasks in ClickUp with proper assignments

**Tech Stack** (recommended):
- Frontend: React + TypeScript + Vite
- Backend: Node.js/Express or Vercel serverless
- Database: Supabase (PostgreSQL)
- AI: Anthropic Claude API

## Implementation Notes

When building this project:
- Start with `docs/PLAN.md` for the implementation phases
- Reference `docs/DESIGN.md` for architecture decisions
- Use `docs/SPEC.md` for feature requirements and acceptance criteria
- Configure API keys per `.env.example`
