Prompt Refiner — Quick fixes for n8n rate limits

This project posts prompts to an n8n webhook and returns a refined prompt.
If you hit provider rate limits (429), the fastest, most effective mitigation is to add API-key rotation at the n8n side and to throttle requests.

Recommended immediate changes (n8n)

1) API key rotation (Function node)
- Create an environment variable in n8n with a comma-separated list of API keys, e.g. `OPENAI_KEYS=key1,key2,key3`.
- Add a `Function` node before the AI/HTTP node to pick a key per execution.

Function node code (JavaScript):

```javascript
// n8n Function node
// Expects process.env.OPENAI_KEYS available in n8n (or set a Workflow variable)
const keys = (process.env.OPENAI_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
if (!keys.length) throw new Error('No API keys configured in OPENAI_KEYS');

// simple rotating index stored as workflow static data
const meta = this.getWorkflowStaticData('global');
meta.rotateIndex = (meta.rotateIndex || 0) % keys.length;
const key = keys[meta.rotateIndex];
meta.rotateIndex = (meta.rotateIndex + 1) % keys.length;

// pass selected key to next node
return [{ json: { OPENAI_KEY: key } }];
```

- In your AI/HTTP node, use `{{$json.OPENAI_KEY}}` as the API key header value.

2) Throttle / rate-limit batching
- Use `SplitInBatches` with a `batchSize` of 1 (or small) when sending many prompts.
- Between retries or heavy actions, use a `Wait` node (e.g., 500-1500ms) to avoid bursts.

3) Reduce model load
- Use a smaller model or reduce `max_tokens` for quick refinements.
- If you don't need the highest-quality outputs, choose faster/cheaper engines.

Server-side (this repo) improvements already added

- Retry with exponential backoff on 429/"rate limit" responses (`src/lib.ts`).
- Increased default timeout to 15s (configurable via `REFINER_TIMEOUT_MS`).
- Optional persistent daemon with caching (`src/daemon.ts`) to avoid startup overhead and to cache repeated prompts.

How to use the daemon + client for low-latency runs

1. Start daemon once:

```bash
bun run daemon
```

2. Use the client (fast path, uses UNIX socket cache):

```bash
pbpaste | REFINER_DAEMON=1 bun run cli
```

If you want, I can prepare an n8n export (workflow JSON) with the Function node and a sample HTTP node configured to accept the rotated key. Reply `export n8n` and I'll generate it.
