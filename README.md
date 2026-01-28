# OpenHarp

A template for building an AI-powered meeting-to-task orchestration system. Automatically extract actionable tasks from Fireflies.ai meeting transcripts using Claude AI and create them in ClickUp.

## Features

- **Meeting Integration**: Fetch transcripts from Fireflies.ai
- **AI Task Extraction**: Extract action items using Claude AI
- **Intelligent Deduplication**: Semantic + cache-based duplicate detection
- **ClickUp Sync**: Create tasks with priorities and descriptions

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js/Express or Vercel serverless
- Database: Supabase (PostgreSQL)
- AI: Anthropic Claude API

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your API keys
3. See `SETUP.md` for detailed instructions

## Documentation

- `docs/SPEC.md` - Product requirements
- `docs/DESIGN.md` - Technical architecture
- `docs/PLAN.md` - Implementation roadmap

## License

MIT
