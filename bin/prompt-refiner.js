#!/usr/bin/env node
/**
 * Global CLI entry point for prompt-refiner
 * This file is used when installed globally via npm/bun
 */

import { runCli } from '../dist/cli/index.js';

runCli().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
