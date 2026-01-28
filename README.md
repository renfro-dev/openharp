# OpenHarp

An open-source template for building an AI-powered meeting-to-task orchestration system. Extract actionable tasks from Fireflies.ai meeting transcripts using Claude AI and create them in the appropriate list in ClickUp. 

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

## MCP Server Selection

This project uses unofficial MCP servers that accept API keys via environment variables instead of OAuth. This simplifies setup for single-user or small team deployments.

| Service | MCP Server | Why |
|---------|------------|-----|
| Fireflies | [AshieLoche/fireflies-mcp-server](https://github.com/AshieLoche/fireflies-mcp-server) | API key auth, no OAuth flow needed |
| ClickUp | [@taazkareem/clickup-mcp-server](https://github.com/taazkareem/clickup-mcp-server) | API key via env var, simple configuration |

**Trade-offs**:
- Avoids OAuth complexity (callback URLs, token refresh, flow implementation)
- Faster to get running for development and small deployments
- For enterprise/multi-tenant requiring per-user auth, consider official OAuth implementations instead

**Costs**:
- MCP servers: Free and open source
- Fireflies.ai: API access requires a paid plan (Pro or higher) - see [Fireflies pricing](https://fireflies.ai/pricing)
- ClickUp: API access included with all plans (Free tier available) - see [ClickUp pricing](https://clickup.com/pricing)
- Claude API: Pay-per-token usage - see [Anthropic pricing](https://anthropic.com/pricing)

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
