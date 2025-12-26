# Prompt Refiner

Posts prompts to an n8n webhook and gets them back refined. Handles OpenAI rate limits with retries and backoff.

## Setup

```bash
bun install
export REFINER_WEBHOOK_URL="https://your-n8n.com/webhook/refiner"
```

## Usage

**From clipboard:**
```bash
bun run cli
```

**From stdin:**
```bash
echo "Your prompt here" | bun run cli
```

**With daemon (faster for repeated refinements):**
```bash
# Terminal 1: Start daemon
bun run daemon

# Terminal 2: Use with caching
pbpaste | REFINER_DAEMON=1 bun run cli
```

## Rate Limit Tips

Getting 429s from OpenAI? These work:

**1. Rotate API keys in n8n**

Set up a Function node before your AI call:

```javascript
const keys = process.env.OPENAI_KEYS.split(',').map(k => k.trim());
const meta = this.getWorkflowStaticData('global');
meta.index = (meta.index || 0) % keys.length;
const key = keys[meta.index++];
return [{ json: { apiKey: key } }];
```

Use `{{$json.apiKey}}` in your HTTP node.

**2. Throttle requests**

Add a Wait node (500-1000ms) between heavy calls, and use SplitInBatches with size 1 for bulk operations.

**3. Use a smaller model**

GPT-3.5 instead of GPT-4, or reduce `max_tokens`.

## Configuration

| Variable | Default | Use |
|----------|---------|-----|
| `REFINER_WEBHOOK_URL` | - | n8n webhook endpoint |
| `REFINER_TIMEOUT_MS` | 30000 | Request timeout |
| `REFINER_MAX_RETRIES` | 3 | Retry attempts |
| `REFINER_DAEMON_SOCKET` | /tmp/refiner.sock | Daemon socket path |

## Architecture

- **src/services/** - HTTP client, refinement logic
- **src/utils/** - Config, logging, input parsing
- **src/daemon/** - UNIX socket server for caching
- **dist/** - Compiled JavaScript (ready to run)

The code is TypeScript with strict types throughout.
