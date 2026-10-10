# OpenHarp

An open-source blueprint for an AI executive assistant that turns meetings into tasks. It reads Fireflies.ai transcripts, uses Claude to extract action items, removes duplicates, and creates the tasks in the right ClickUp list.

**Flow:** Fireflies meeting → Claude extracts tasks → deduplication → review in a web UI → tasks created in ClickUp

> This repository contains the specification, architecture, implementation plan, and setup guide. Application source code is not included here.

## Features

- **Meeting integration:** fetch transcripts from Fireflies.ai
- **AI task extraction:** pull action items out of each transcript with Claude
- **Deduplication:** semantic and cache-based duplicate detection
- **ClickUp sync:** create tasks with priorities and descriptions

## Architecture

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js with Express, or Vercel serverless functions
- **Database:** Supabase (Postgres)
- **AI:** Anthropic Claude API

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/SPEC.md](docs/SPEC.md) | Product requirements |
| [docs/DESIGN.md](docs/DESIGN.md) | Technical architecture |
| [docs/PLAN.md](docs/PLAN.md) | Implementation roadmap |
| [SETUP.md](SETUP.md) | Accounts, API keys, and configuration |
| [.env.example](.env.example) | Required environment variables |

## MCP servers

OpenHarp uses community MCP servers that take API keys from environment variables, so there is no OAuth flow to build.

| Service | MCP server | Why |
|---------|------------|-----|
| Fireflies | [AshieLoche/fireflies-mcp-server](https://github.com/AshieLoche/fireflies-mcp-server) | API key auth |
| ClickUp | [@taazkareem/clickup-mcp-server](https://github.com/taazkareem/clickup-mcp-server) | API key via environment variable |

This keeps setup fast for a single user or small team. For multi-tenant deployments that need per-user authorization, use official OAuth implementations.

## Costs

- **MCP servers:** free and open source
- **Fireflies.ai:** API access needs a paid plan ([pricing](https://fireflies.ai/pricing))
- **ClickUp:** API access on all plans, including free ([pricing](https://clickup.com/pricing))
- **Claude API:** pay per token ([pricing](https://anthropic.com/pricing))

## Status

v0, covering Fireflies and ClickUp.

## License

MIT
