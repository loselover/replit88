# AI API Gateway

A self-hosted reverse proxy that routes requests to **OpenAI** and **Anthropic** models via [Replit AI Integrations](https://docs.replit.com/ai/integrations) — no external API keys required on the server side.

Compatible with clients like **CherryStudio**, **Open WebUI**, **Cursor**, and any OpenAI-compatible tool.

[![Run on Replit](https://replit.com/badge/github/loselover/replit88)](https://replit.com/new/github/loselover/replit88)

---

## Features

- `/v1/chat/completions` — OpenAI-compatible endpoint (supports GPT and Claude models)
- `/v1/messages` — Anthropic-compatible endpoint (supports Claude models)
- `/v1/models` — Lists all available models
- Dark-themed API Portal dashboard at `/`
- Bearer token + `x-api-key` authentication
- Streaming support (SSE)
- Automatic format conversion between OpenAI ↔ Anthropic

## Available Models

| Model | Provider |
|-------|----------|
| gpt-4o | OpenAI |
| gpt-4o-mini | OpenAI |
| gpt-4.1 | OpenAI |
| gpt-4.1-mini | OpenAI |
| o4-mini | OpenAI |
| claude-opus-4-5 | Anthropic |
| claude-sonnet-4-5 | Anthropic |
| claude-haiku-4-5 | Anthropic |
| claude-haiku-3-5 | Anthropic |

---

## One-Click Deploy to Replit

1. Click the **Run on Replit** button above
2. If prompted for a run command, enter: `pnpm run dev`
3. Go to **Tools → Integrations** and connect **OpenAI** and **Anthropic**
4. Go to **Tools → Secrets** and add `PROXY_API_KEY` = any password you choose
5. Click **Publish**

### Step 1 — Add AI Integrations

In your Replit project, go to **Tools → Integrations** and connect:

- ✅ **OpenAI** — for GPT models
- ✅ **Anthropic** — for Claude models

These are free to connect via Replit and require no external API keys.

### Step 2 — Set Your API Key Secret

In **Tools → Secrets**, add:

```
PROXY_API_KEY = your-chosen-password
```

This is the key you'll use in your AI client to authenticate with this gateway.

### Step 3 — Publish

Click **Publish** in Replit. Your gateway will be live at a `.replit.app` domain.

---

## Client Setup (CherryStudio)

### OpenAI Provider Type
| Field | Value |
|-------|-------|
| Base URL | `https://your-app.replit.app` |
| API Key | your `PROXY_API_KEY` value |

### Anthropic Provider Type
| Field | Value |
|-------|-------|
| Base URL | `https://your-app.replit.app` |
| API Key | your `PROXY_API_KEY` value |

---

## API Usage

```bash
# List models
curl https://your-app.replit.app/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Chat (OpenAI format)
curl https://your-app.replit.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'

# Chat (Anthropic format)
curl https://your-app.replit.app/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'
```

---

## Tech Stack

- **API Server** — Node.js + Express + TypeScript
- **Portal** — React + Vite + Tailwind CSS
- **Runtime** — Replit (pnpm monorepo)
