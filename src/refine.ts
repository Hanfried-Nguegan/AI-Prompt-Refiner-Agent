async function readStdin(): Promise<string> {
  return await new Promise<string>((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
  });
}

function normalizeOutput(value: unknown): unknown {
  if (typeof value !== "string") return value;

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

async function main(): Promise<void> {
  const prompt = await readStdin();

  if (!prompt) {
    console.error("❌ No prompt provided via stdin");
    process.exit(1);
  }

  try {
    const res = await fetch("http://localhost:5678/webhook/refine-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Webhook error response:");
      console.error(text);
      process.exit(1);
    }

    const data = await res.json();

    const responseObj = Array.isArray(data) ? (data[0] as Record<string, unknown>) : (data as Record<string, unknown>);

    if (!responseObj) {
      console.error("❌ Invalid response from n8n");
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const raw =
      (responseObj.output as unknown) ??
      (responseObj.refined as unknown) ??
      (responseObj.text as unknown) ??
      (responseObj.content as unknown);

    if (!raw) {
      console.error("❌ No usable output field found");
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const normalized = normalizeOutput(raw);

    if (typeof normalized !== "string" || normalized.trim() === "") {
      console.error("❌ Refined prompt is empty");
      process.exit(1);
    }

    const refined: string = normalized;

    console.log("\n✨ Refined Prompt (copied to clipboard):\n");
    console.log(refined);

    // Copy to clipboard (macOS)
    await Bun.spawn(["pbcopy"], {
      stdin: new TextEncoder().encode(refined),
    });

  } catch (error: unknown) {
    console.error("❌ Error connecting to n8n webhook:");
    if (error instanceof Error) console.error(error.message);
    else console.error(String(error));
    process.exit(1);
  }
}

void main();
