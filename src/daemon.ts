import net from "net";
import fs from "fs";
import path from "path";
import { refinePrompt } from "./lib.js";

const socketPath = process.env.REFINER_DAEMON_SOCKET ?? "/tmp/prompt-refiner.sock";

try {
  if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
} catch {}

const server = net.createServer(async (conn) => {
  let buf = "";
  conn.setEncoding("utf8");
  conn.on("data", (d) => (buf += d));
  conn.on("end", async () => {
    try {
      const trimmed = buf.trim();
      if (!trimmed) {
        conn.write("ERROR: no prompt provided");
        conn.end();
        return;
      }
      const refined = await refinePrompt(trimmed, { timeoutMs: Number(process.env.REFINER_TIMEOUT_MS ?? 6000) });
      conn.write(refined);
      conn.end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      conn.write(`ERROR: ${msg}`);
      conn.end();
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
