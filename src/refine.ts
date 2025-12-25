import { refinePrompt } from "./lib.js";
import net from "net";

// Read prompt from stdin
const prompt = await new Promise<string>((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => (data += chunk));
  process.stdin.on("end", () => resolve(data.trim()));
});

if (!prompt) {
  console.error("❌ No prompt provided via stdin");
  process.exit(1);
}

async function run() {
  // talk to daemon over UNIX socket for zero-startup latency when enabled
  const socketPath = process.env.REFINER_DAEMON_SOCKET ?? "/tmp/prompt-refiner.sock";
  const useDaemon = process.env.REFINER_DAEMON === "1";

  try {
    let refined: string;
    if (useDaemon) {
      refined = await new Promise<string>((resolve, reject) => {
        const client = net.createConnection(socketPath);
        let buf = "";
        client.on("connect", () => {
          client.write(prompt);
          client.end();
        });
        client.on("data", (d) => (buf += d.toString()));
        client.on("end", () => resolve(buf));
        client.on("error", (err) => reject(err));
      });
    } else {
      refined = await refinePrompt(prompt, { timeoutMs: Number(process.env.REFINER_TIMEOUT_MS ?? 6000) });
    }

    console.log("\n✨ Refined Prompt (copied to clipboard):\n");
    console.log(refined);

    await Bun.spawn(["pbcopy"], {
      stdin: new TextEncoder().encode(refined),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Refining failed:", msg);
    process.exit(1);
  }
}

await run();
await run();
