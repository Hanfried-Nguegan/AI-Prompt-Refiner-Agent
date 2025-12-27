/**
 * CLI entry point - refines prompts from stdin
 */

import { refinePrompt } from '../services/index.js';
import { loadCliConfig } from '../config/index.js';
import { readStdin, copyToClipboard, printSuccess, exitWithError } from './io.js';

/**
 * Main CLI runner
 */
export async function runCli(): Promise<void> {
  // Read prompt from stdin
  const prompt = await readStdin();

  if (!prompt) {
    exitWithError('No prompt provided via stdin');
  }

  const config = loadCliConfig();

  try {
    // Refine the prompt
    const refined = await refinePrompt(prompt, {
      useDaemon: config.useDaemon,
      socketPath: config.socketPath,
      timeoutMs: config.timeoutMs,
    });

    // Output and copy to clipboard
    printSuccess(refined);
    await copyToClipboard(refined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitWithError(`Refining failed: ${message}`);
  }
}
