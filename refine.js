import fetch from "node-fetch";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error("❌ No prompt provided");
  process.exit(1);
}

const res = await fetch("http://localhost:5678/webhook/refine-prompt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt }),
});

const data = await res.json();

console.log("\n✨ Refined Prompt:\n");
console.log(data.output);
