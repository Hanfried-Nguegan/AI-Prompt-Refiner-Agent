# Prompt Refiner

A modular, context-ready prompt refinement tool that connects your editor, terminal, and IDE to an n8n automation workflow. Built with TypeScript, designed for speed and flexibility.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Overview

Prompt Refiner gives you three seamless ways to refine your prompts:

- **In VS Code** — Select text, hit Cmd+Shift+P, run "Refine Selection", and watch it improve in place.
- **From Terminal** — Pipe your prompt to the CLI, get the refined version back on your clipboard instantly.
- **Cached & Fast** — Run a persistent daemon in the background that caches results, eliminating startup overhead for repeated refinements.

All three mechanisms use the same underlying engine: a strict TypeScript core that sends your prompt to your n8n workflow, handles retries intelligently when rate-limited, and returns the refined result.

## Prerequisites

You'll need:

- **Bun** (v1.0+ JavaScript runtime) — [Install here](https://bun.sh)
- **n8n** instance (free cloud or self-hosted) — [Create account](https://n8n.cloud)
- **OpenAI API key** (or another LLM provider configured in n8n)

## Quick Start

### 1. One-Line Install (Recommended)

```bash
git clone https://github.com/Hanfried-Nguegan/AI-Prompt-Refiner-Agent.git
cd AI-Prompt-Refiner-Agent
./install.sh
```

This will:
- Install dependencies
- Build the project
- Link the CLI globally (`prompt-refiner` command)
- Optionally start the daemon

### 2. Set Up n8n Workflow

You don't need to build the workflow from scratch — it's included in the repo.

**In n8n:**

1. Go to Workflows → New → Import from file
2. Upload `n8n/refiner-workflow.json` from this repo
3. The workflow opens with nodes pre-configured:
   - **RotateKey** — Cycles through your OpenAI API keys (set `OPENAI_KEYS` env variable in n8n)
   - **CallModel** — Calls OpenAI's gpt-4o-mini to refine your prompt
   - **Respond** — Sends the refined result back to Prompt Refiner

**Webhook setup:**

1. In the "Respond" node, copy the webhook URL
2. Create `.env` in this repo:
```bash
cp .env.example .env
# Add your webhook URL
REFINER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### 3. Use It Anywhere

After installation, the `prompt-refiner` command works from any directory:

**Terminal (CLI):**

```bash
echo "write me a prompt about typescript" | prompt-refiner
# Result copied to clipboard automatically
```

**VS Code (Extension):**

The extension works in **any VS Code workspace** after installation — no per-project configuration needed.

1. In VS Code, open Extensions (Cmd+Shift+X)
2. Click the three-dot menu, select "Install from VSIX"
3. Select `prompt-refiner-1.1.0.vsix` from the repo folder
4. Reload VS Code
5. Select text in any file, then Cmd+Shift+P → "Refine Selection"

**Terminal (Daemon) — Recommended for speed:**

```bash
# Terminal 1: Start the daemon (runs in background)
prompt-refiner-daemon

# Terminal 2: Use it with caching — works from any directory
REFINER_DAEMON=1 echo "your prompt" | prompt-refiner
# Repeating the same prompt = instant (cached) response
```

### Alternative: Manual Install

If you prefer manual setup:

```bash
bun install
bun run build
bun link  # Makes prompt-refiner available globally
```

## How It Works

### The Pipeline

```text
Your prompt → lib.ts (HTTP client + retry logic) → n8n webhook → AI refinement → Result back to you
```

### Three Interfaces, One Engine

- **CLI** (`src/refine.ts`) — Reads stdin or clipboard, writes result to clipboard
- **Daemon** (`src/daemon.ts`) — UNIX socket server that caches refinements (LRU with TTL)
- **Extension** (`src/extension-main.ts`) — VS Code Command Palette integration, in-editor refinement

The core refinement logic lives in `src/lib.ts`. All three mechanisms call it the same way, just with different input/output handling.

### Caching Strategy

The daemon keeps an LRU cache with time-based eviction. Same prompt → instant cached response, no API call. Cache expires after 60 seconds by default, but you can configure it.

## Configuration

These environment variables control timeout, retry, and cache behavior:

| Variable                  | Default                      | Description                                         |
| ------------------------- | ---------------------------- | --------------------------------------------------- |
| `REFINER_WEBHOOK_URL`     | (required)                   | Your n8n endpoint — where prompts get sent          |
| `REFINER_TIMEOUT_MS`      | `15000`                      | How long to wait for n8n to respond (milliseconds)  |
| `REFINER_MAX_RETRIES`     | `3`                          | How many times to retry if n8n is rate-limiting     |
| `REFINER_DAEMON_SOCKET`   | `/tmp/prompt-refiner.sock`   | Where the daemon listens (UNIX socket)              |
| `REFINER_CACHE_MAX`       | `200`                        | Max refinements to keep in daemon cache             |
| `REFINER_CACHE_TTL_MS`    | `60000`                      | How long before cached results expire               |
| `REFINER_DAEMON`          | `0`                          | Set to `1` to prefer daemon over direct HTTP calls  |
| `LOG_LEVEL`               | `info`                       | Logging verbosity: `debug`, `info`, `warn`, `error` |

## Logging

The daemon uses structured JSON logging for observability:

```json
{"level":"info","ts":"2024-01-15T10:30:00.000Z","msg":"Daemon started","socket":"/tmp/prompt-refiner.sock"}
{"level":"debug","ts":"2024-01-15T10:30:01.123Z","msg":"Cache hit","prompt":"(first 50 chars...)"}
```

Control verbosity with `LOG_LEVEL`:

```bash
LOG_LEVEL=debug bun run daemon    # Verbose output
LOG_LEVEL=error bun run daemon    # Errors only
```

Sensitive data (webhook URLs, API keys) are automatically redacted from logs.

## Handling Rate Limits

If n8n is overwhelmed, it returns a 429 (rate limit) status. Prompt Refiner automatically retries with exponential backoff — it doesn't just fail, it waits and tries again.

If you're hitting limits frequently, try these approaches:

**Increase timeout and retries** (give n8n more time to recover):

```bash
REFINER_TIMEOUT_MS=300000 REFINER_MAX_RETRIES=5 bun run cli
```

**Use the daemon** (cached results skip API calls entirely):

```bash
bun run daemon
REFINER_DAEMON=1 bun run cli  # Repeating prompts = instant
```

**Add delay between requests** (from your script/workflow):

```bash
sleep 1 && echo "your prompt" | bun run cli
```

## Architecture

The codebase is organized into layers:

```text
src/
├── refine.ts           # CLI entry point
├── daemon.ts           # Daemon entry point
├── lib.ts              # Core exports for library consumers
├── index.ts            # Main library exports
├── types/              # TypeScript interfaces & error types
├── config/             # Environment-based configuration
├── services/           # HTTP client, daemon client, refiner service
├── daemon/             # Socket server with LRU caching
├── cli/                # CLI I/O and runner logic
├── utils/              # Logging, retry, cache, validation
└── extension/          # VS Code extension components
```

**Strict TypeScript throughout.** Compilation uses `strict: true`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess` for maximum type safety.

Built with dependency injection — each component gets what it needs, making it easy to test and extend.

### How n8n Workflow Works

The included workflow (`n8n/refiner-workflow.json`) does this:

1. **Receive webhook call** — Prompt Refiner sends your prompt here
2. **Rotate API key** — Cycles through your OpenAI keys to avoid rate limits
3. **Call OpenAI** — Sends prompt to gpt-4o-mini (you can change the model)
4. **Return result** — Sends refined prompt back to Prompt Refiner

The workflow is stateless — each refinement is independent. Rate limiting is handled by Prompt Refiner's retry logic (exponential backoff).

## Development

### Build

```bash
bun install          # Install dependencies
bun run build        # Compile TypeScript to dist/
```

This generates optimized JavaScript in `dist/` — same code, but compiled and ready to run.

### Test

```bash
bun run test         # Run all unit tests
bun run test:watch   # Watch mode for TDD
```

Tests use Vitest and cover utilities, configuration, and core logic.

### Lint & Format

```bash
bun run lint         # Check for linting issues
bun run lint:fix     # Auto-fix linting issues
bun run format       # Format code with Prettier
bun run format:check # Check formatting without changing files
```

### Type Check

```bash
bun run typecheck    # Verify TypeScript types
```

### All Quality Checks

```bash
bun run lint && bun run format:check && bun run typecheck && bun run test
```

## Cross-Platform Support

The CLI works on macOS, Linux, and Windows:

| Platform | Clipboard Tool |
| -------- | -------------- |
| macOS    | `pbcopy`       |
| Linux    | `xclip` or `xsel` (install one) |
| Windows  | `clip` (built-in) |

The daemon uses UNIX sockets on macOS/Linux. On Windows, consider using WSL or the direct CLI mode.

## Packaging

The VS Code extension is pre-packaged as `prompt-refiner-1.0.0.vsix` in this repo — ready to install.

**To update or rebuild:**

```bash
bun run build      # Compile TypeScript to dist/
bun run package    # Create new VSIX (requires vsce)
```

**To publish to VS Code Marketplace** (optional, for public distribution):

This requires an Azure DevOps organization and Personal Access Token. See the [vsce documentation](https://github.com/microsoft/vscode-vsce) for full details. For now, sharing the VSIX via GitHub is simpler and works great.

## Git & Security

The `.gitignore` protects sensitive files:

- `.env` files (never commit your webhook URL)
- `node_modules/` and build artifacts
- OS-specific files

Use `.env.example` as a template for `.env` — it documents what variables you need without exposing actual values.

## Troubleshooting

### "Task 'Refine Clipboard' not found" (VS Code)

Make sure the task `Refine Clipboard` exists in `.vscode/tasks.json`. The extension needs it to run the CLI.

### Daemon socket already in use

If the daemon crashes, the socket might linger at `/tmp/prompt-refiner.sock`. Remove it:

```bash
rm /tmp/prompt-refiner.sock
```

### n8n returns 429 (rate limit)

The client retries automatically, but if it keeps happening, increase `REFINER_MAX_RETRIES` and `REFINER_TIMEOUT_MS`, or wait between calls.

### Extension doesn't show in VS Code

Make sure VS Code can find the extension. Load it manually via the Extensions panel (Cmd+Shift+X) or run the VSIX installer.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/my-feature`
3. **Make your changes** with tests if applicable
4. **Run quality checks**: `bun run lint && bun run test && bun run typecheck`
5. **Submit a Pull Request**

Please ensure:

- Code passes all linting and type checks
- New features include tests where appropriate
- Commit messages are clear and descriptive

## Why This Approach?

Three interfaces solve different problems:

- **CLI** is perfect for scripts and one-off refinements
- **Daemon** is perfect for interactive use — no startup overhead, fast responses
- **VS Code** is perfect for editing — stay in your editor, refine inline

One engine keeps them in sync. Change the refinement logic once, all three benefit immediately.

## License

[MIT](./LICENSE)
