# AI API Integration Gateway

## Overview

Unified reverse proxy for OpenAI and Anthropic models. One endpoint, all models. Clients like CherryStudio can connect using either OpenAI or Anthropic provider types.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **AI SDKs**: OpenAI SDK, Anthropic SDK (via Replit AI Integrations)
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL + Drizzle ORM (available but not actively used by proxy)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### API Proxy (`/v1`)
- `GET /v1/models` — Lists all available models (9 models: 6 OpenAI, 3 Anthropic)
- `POST /v1/chat/completions` — OpenAI-compatible format, routes to OpenAI or Anthropic based on model name
- `POST /v1/messages` — Anthropic-native format, routes Claude models natively and GPT models with format conversion
- Authentication: Bearer token via `PROXY_API_KEY` secret

### Portal Frontend (`/`)
- Dark-themed dashboard showing health status, endpoints, models, and setup instructions
- Live health indicator polling `/api/healthz`
- CherryStudio setup guide

### Model Routing
- Models starting with `claude-` route to Anthropic
- All other models route to OpenAI
- Bidirectional format conversion between OpenAI and Anthropic formats
- Full streaming (SSE) support for both providers

## Environment Variables

- `PROXY_API_KEY` — Secret key for authenticating proxy requests
- `AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-provisioned by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` / `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-provisioned by Replit AI Integrations
- `SESSION_SECRET` — Session secret
- `DATABASE_URL` — PostgreSQL connection string

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Available Models

### OpenAI
- gpt-5.2, gpt-5.1, gpt-5, gpt-5-mini, o4-mini, o3

### Anthropic
- claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
