import fetch from "node-fetch";
/**
 * Read prompt safely from stdin
 */
const prompt = await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
});
if (!prompt) {
    console.error("❌ No prompt provided via stdin");
    process.exit(1);
}
/**
 * Normalize n8n / LLM output
 * - Handles double-encoded strings like "\"text...\""
 * - Safely unwraps once
 */
function normalizeOutput(value) {
    if (typeof value !== "string")
        return String(value);
    if (value.startsWith('"') && value.endsWith('"')) {
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    return value;
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
    // n8n may return array or object
    const responseObj = Array.isArray(data) ? data[0] : data;
    if (!responseObj) {
        console.error("❌ Invalid response from n8n");
        console.log(JSON.stringify(data, null, 2));
        process.exit(1);
    }
    const raw = responseObj.output ??
        responseObj.refined ??
        responseObj.text ??
        responseObj.content;
    if (!raw) {
        console.error("❌ No usable output field found");
        console.log(JSON.stringify(data, null, 2));
        process.exit(1);
    }
    const refined = normalizeOutput(raw);
    if (!refined || refined.trim() === "") {
        console.error("❌ Refined prompt is empty");
        process.exit(1);
    }
    console.log("\n✨ Refined Prompt (copied to clipboard):\n");
    console.log(refined);
    // Copy to clipboard (macOS)
    await Bun.spawn(["pbcopy"], {
        stdin: new TextEncoder().encode(refined),
    });
}
catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error connecting to n8n webhook:");
    console.error(message);
    process.exit(1);
}
//# sourceMappingURL=refine.js.map