import net from "net";
import fs from "fs";
import path from "path";
import { refinePrompt } from "./lib.js";

const socketPath = process.env.REFINER_DAEMON_SOCKET ?? "/tmp/prompt-refiner.sock";

try {
  if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
} catch {}

// Simple in-memory LRU-like cache for recent prompts
const CACHE_TTL = Number(process.env.REFINER_CACHE_TTL_MS ?? 60000); // 60s
const CACHE_MAX = Number(process.env.REFINER_CACHE_MAX ?? 200);
const cache = new Map<string, { value: string; ts: number }>();

function cacheGet(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  // move to end (most-recent)
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: string) {
  if (cache.size >= CACHE_MAX) {
    // remove oldest
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, ts: Date.now() });
}

const server = net.createServer(async (conn) => {
  let buf = "";
  conn.setEncoding("utf8");
  conn.on("data", (d) => (buf += d));
  conn.on("end", async () => {
    const start = Date.now();
    try {
      const trimmed = buf.trim();
      if (!trimmed) {
        conn.write("ERROR: no prompt provided");
        conn.end();
        return;
      }

      const cached = cacheGet(trimmed);
      if (cached) {
        conn.write(cached);
        conn.end();
        console.log(`CACHE HIT (${Date.now() - start}ms)`);
        return;
      }

      const refined = await refinePrompt(trimmed, { timeoutMs: Number(process.env.REFINER_TIMEOUT_MS ?? 15000) });
      cacheSet(trimmed, refined);
      conn.write(refined);
      conn.end();
      console.log(`REFINED (${Date.now() - start}ms)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      conn.write(`ERROR: ${msg}`);
      conn.end();
      console.error(`REFINE ERROR (${Date.now() - start}ms):`, msg);
    }
  });
});

server.listen(socketPath, () => {
  console.log(`Daemon listening on ${socketPath}`);
  fs.chmodSync(socketPath, 0o600);
});

process.on("SIGINT", () => {
  try { server.close(); } catch {}
  try { fs.unlinkSync(socketPath); } catch {}
  process.exit(0);
});
