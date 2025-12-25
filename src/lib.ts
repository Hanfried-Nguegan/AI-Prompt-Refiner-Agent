import fetch from "node-fetch";
import http from "http";

export function normalizeOutput(value: unknown): string {
  if (typeof value !== "string") return String(value);

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

function findFirstNonEmptyString(obj: unknown): string | null {
  if (obj == null) return null;
  if (typeof obj === "string") {
    if (obj.trim() !== "") return obj;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirstNonEmptyString(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const found = findFirstNonEmptyString((obj as Record<string, unknown>)[key]);
      if (found) return found;
    }
  }
  return null;
}

export async function refinePrompt(prompt: string, options?: { url?: string; timeoutMs?: number }) {
  const url = options?.url ?? process.env.REFINER_WEBHOOK_URL ?? "http://localhost:5678/webhook/refine-prompt";
  // Increase default timeout to handle slower LLM responses while still being reasonable
  const timeoutMs = options?.timeoutMs ?? Number(process.env.REFINER_TIMEOUT_MS ?? 15000);

  const agent = new http.Agent({ keepAlive: true });

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      agent: (_parsed) => agent,
      signal: controller.signal as any,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const responseObj = Array.isArray(data) ? data[0] : data;
    if (!responseObj) throw new Error("Invalid response from n8n");

    let raw = (responseObj as any).output ?? (responseObj as any).refined ?? (responseObj as any).text ?? (responseObj as any).content;
    if (!raw) raw = findFirstNonEmptyString(responseObj) ?? undefined;
    if (!raw) throw new Error("No usable output field found");

    const refined = normalizeOutput(raw);
    if (!refined || refined.trim() === "") throw new Error("Refined prompt is empty");
    return refined;
  } finally {
    clearTimeout(id);
  }
}
