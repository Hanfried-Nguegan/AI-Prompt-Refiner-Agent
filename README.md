# Prompt Refiner

A modular, production-ready prompt refinement tool that connects your editor, terminal, and IDE to an n8n automation workflow. Built with TypeScript, designed for speed and flexibility.

## Overview

Prompt Refiner gives you three seamless ways to refine your prompts:

**In VS Code** — Select text, hit Cmd+Shift+P, run "Refine Selection", and watch it improve in place.

**From Terminal** — Pipe your prompt to the CLI, get the refined version back on your clipboard instantly.

**Cached & Fast** — Run a persistent daemon in the background that caches results, eliminating startup overhead for repeated refinements.

All three mechanisms use the same underlying engine: a strict TypeScript core that sends your prompt to your n8n workflow, handles retries intelligently when rate-limited, and returns the refined result.

## Prerequisites

You'll need:
- **Bun** (JavaScript runtime) — [Install here](https://bun.sh)
- **n8n** instance (free cloud or self-hosted) — [Create account](https://n8n.cloud)
- **OpenAI API key** (or another LLM provider configured in n8n)

## Quick Start

### 1. Install Dependencies

```bash
bun install
bun run build
```

### 2. Set Up n8n Workflow

You don't need to build the workflow from scratch — it's included in the repo.

**In n8n:**
- Go to Workflows → New → Import from file
- Upload `n8n/refiner-workflow.json` from this repo
- The workflow opens with nodes pre-configured:
  - **RotateKey** — Cycles through your OpenAI API keys (set `OPENAI_KEYS` env variable in n8n)
  - **CallModel** — Calls OpenAI's gpt-4o-mini to refine your prompt
  - **Respond** — Sends the refined result back to Prompt Refiner

**Webhook setup:**
- In the "Respond" node, copy the webhook URL
- Create `.env` in this repo:
```bash
cp .env.example .env
# Add your webhook URL
REFINER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### 3. Choose Your Method

**Terminal (CLI)**
```bash
echo "write me a prompt about typescript" | bun run cli
# Result copied to clipboard automatically
```

**VS Code (Extension)**
- Open any file, select some text
- Press Cmd+Shift+P and type "Refine Selection"
- The selected text gets replaced with the refined version

**Terminal (Daemon)**
```bash
# Terminal 1: Start the daemon
bun run daemon

# Terminal 2: Use it with caching
REFINER_DAEMON=1 bun run cli
# Repeating the same prompt = instant (cached) response
```

## How It Works

### The Pipeline

Your prompt → `lib.ts` (HTTP client + retry logic) → n8n webhook → AI refinement → Result back to you

### Three Interfaces, One Engine

- **CLI** (`src/refine.ts`) — Reads stdin or clipboard, writes result to clipboard
- **Daemon** (`src/daemon.ts`) — UNIX socket server that caches refinements (LRU with TTL)
- **Extension** (`src/extension-main.ts`) — VS Code Command Palette integration, in-editor refinement

The core refinement logic lives in `src/lib.ts`. All three mechanisms call it the same way, just with different input/output handling.

### Caching Strategy

The daemon keeps an LRU cache with time-based eviction. Same prompt → instant cached response, no API call. Cache expires after 60 seconds by default, but you can configure it.

## Configuration

These environment variables control timeout, retry, and cache behavior:

| Variable | Default | What It Does |
|----------|---------|--------------|
| `REFINER_WEBHOOK_URL` | (required) | Your n8n endpoint — where prompts get sent |
| `REFINER_TIMEOUT_MS` | 15000 | How long to wait for n8n to respond (milliseconds) |
| `REFINER_MAX_RETRIES` | 3 | How many times to retry if n8n is rate-limiting |
| `REFINER_DAEMON_SOCKET` | /tmp/prompt-refiner.sock | Where the daemon listens (UNIX socket) |
| `REFINER_CACHE_MAX` | 200 | Max refinements to keep in daemon cache |
| `REFINER_CACHE_TTL_MS` | 60000 | How long before cached results expire |

## Handling Rate Limits

If n8n is overwhelmed, it returns a 429 (rate limit) status. Prompt Refiner automatically retries with exponential backoff — it doesn't just fail, it waits and tries again.

If you're hitting limits frequently, try these approaches:

**Increase timeout and retries** (give n8n more time to recover)
```bash
REFINER_TIMEOUT_MS=25000 REFINER_MAX_RETRIES=5 bun run cli
```

**Use the daemon** (cached results skip API calls entirely)
```bash
bun run daemon
REFINER_DAEMON=1 bun run cli  # Repeating prompts = instant
```

**Add delay between requests** (from your script/workflow)
```bash
sleep 1 && echo "your prompt" | bun run cli
```

## Architecture

The codebase is organized into layers:

```
src/
├── refine.ts                 # CLI entry point
├── daemon.ts                 # Daemon server with caching
├── extension-main.ts         # VS Code extension
├── lib.ts                    # Core HTTP client & retry logic
├── types/                    # TypeScript interfaces
├── services/                 # HTTP abstractions
├── utils/                    # Config, logging, input handling
└── core/                     # Orchestration
```

**Strict TypeScript throughout.** Compilation is tight, with full type coverage and zero `any` types.

Built with dependency injection — each component gets what it needs, making it easy to test and extend.

### How n8n Workflow Works

The included workflow (`n8n/refiner-workflow.json`) does this:

1. **Receive webhook call** — Prompt Refiner sends your prompt here
2. **Rotate API key** — Cycles through your OpenAI keys to avoid rate limits
3. **Call OpenAI** — Sends prompt to gpt-4o-mini (you can change the model)
4. **Return result** — Sends refined prompt back to Prompt Refiner

The workflow is stateless — each refinement is independent. Rate limiting is handled by Prompt Refiner's retry logic (exponential backoff).

## Development

Build the TypeScript:
```bash
bun run build
```

This generates optimized JavaScript in `dist/` — same code, but compiled and ready to run.

Run tests (if added):
```bash
bun test
```

## Packaging

The VS Code extension is pre-packaged as `prompt-refiner-1.0.0.vsix`. You can load it directly into VS Code or modify the extension and rebuild:

```bash
# The extension is already compiled in dist/extension.js
# Package it with vsce if you make changes
vsce package
```

## Git & Security

The `.gitignore` protects sensitive files:
- `.env` files (never commit your webhook URL)
- `node_modules/` and build artifacts
- OS-specific files

Use `.env.example` as a template for `.env` — it documents what variables you need without exposing actual values.

## Troubleshooting

**"Task 'Refine Clipboard' not found"** (VS Code)
Make sure the task `Refine Clipboard` exists in `.vscode/tasks.json`. The extension needs it to run the CLI.

**Daemon socket already in use**
If the daemon crashes, the socket might linger at `/tmp/prompt-refiner.sock`. Remove it:
```bash
rm /tmp/prompt-refiner.sock
```

**n8n returns 429 (rate limit)**
The client retries automatically, but if it keeps happening, increase `REFINER_MAX_RETRIES` and `REFINER_TIMEOUT_MS`, or wait between calls.

**Extension doesn't show in VS Code**
Make sure VS Code can find the extension. Load it manually via the Extensions panel (Cmd+Shift+X) or run the VSIX installer.

## Why This Approach?

Three interfaces solve different problems:

- **CLI** is perfect for scripts and one-off refinements
- **Daemon** is perfect for interactive use — no startup overhead, fast responses
- **VS Code** is perfect for editing — stay in your editor, refine inline

One engine keeps them in sync. Change the refinement logic once, all three benefit immediately.
