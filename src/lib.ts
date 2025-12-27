/**
 * Library entry point for programmatic use
 *
 * @example
 * ```typescript
 * import { refinePrompt } from 'prompt-refiner';
 *
 * const refined = await refinePrompt('Make this better');
 * console.log(refined);
 * ```
 */

// Core service
export { refinePrompt, createRefiner, type RefineOptions } from './services/index.js';

// Types
export {
  type RefinerConfig,
  type DaemonConfig,
  type CliConfig,
  type WebhookResponse,
  type RefineResult,
  type RefineError,
  type RefineResponse,
  RefineErrorCode,
  RefinerError,
} from './types/index.js';

// Configuration
export { loadRefinerConfig, loadDaemonConfig, loadCliConfig, DEFAULTS } from './config/index.js';

// Utilities (for advanced use)
export {
  normalizeOutput,
  findFirstNonEmptyString,
  isEmpty,
  safeTrim,
  LRUCache,
  withRetry,
  sleep,
} from './utils/index.js';
