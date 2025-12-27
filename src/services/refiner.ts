/**
 * Core prompt refinement service
 */

import { RefinerError, RefineErrorCode } from '../types/index.js';
import { loadRefinerConfig, loadCliConfig } from '../config/index.js';
import { sendToWebhook } from './http-client.js';
import { sendToDaemon } from './daemon-client.js';
import { isEmpty } from '../utils/index.js';

export interface RefineOptions {
  /** Webhook URL override */
  url?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Use daemon mode */
  useDaemon?: boolean;
  /** Daemon socket path */
  socketPath?: string;
}

/**
 * Refine a prompt using the n8n webhook or daemon
 */
export async function refinePrompt(prompt: string, options: RefineOptions = {}): Promise<string> {
  // Validate input
  if (isEmpty(prompt)) {
    throw new RefinerError('Prompt cannot be empty', RefineErrorCode.EMPTY_PROMPT);
  }

  const trimmedPrompt = prompt.trim();

  // Check if we should use daemon mode
  if (options.useDaemon) {
    const cliConfig = loadCliConfig(
      options.socketPath !== undefined || options.timeoutMs !== undefined
        ? {
            ...(options.socketPath !== undefined && { socketPath: options.socketPath }),
            ...(options.timeoutMs !== undefined && { timeoutMs: options.timeoutMs }),
          }
        : undefined
    );

    return sendToDaemon(trimmedPrompt, {
      socketPath: cliConfig.socketPath,
      timeoutMs: cliConfig.timeoutMs,
    });
  }

  // Use direct webhook
  const config = loadRefinerConfig(
    options.url !== undefined || options.timeoutMs !== undefined
      ? {
          ...(options.url !== undefined && { webhookUrl: options.url }),
          ...(options.timeoutMs !== undefined && { timeoutMs: options.timeoutMs }),
        }
      : undefined
  );

  return sendToWebhook(trimmedPrompt, config);
}

/**
 * Create a refiner instance with preset configuration
 */
export function createRefiner(defaultOptions: RefineOptions = {}) {
  return {
    refine: (prompt: string, options?: RefineOptions) =>
      refinePrompt(prompt, { ...defaultOptions, ...options }),
  };
}
