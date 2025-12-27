/**
 * CLI entry point
 * Usage: echo "your prompt" | bun run src/refine.ts
 */

import { runCli } from './cli/index.js';

await runCli();
