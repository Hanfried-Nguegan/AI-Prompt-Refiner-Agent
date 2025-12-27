/**
 * Core type definitions for Prompt Refiner
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface RefinerConfig {
  /** Webhook URL for n8n refinement service */
  webhookUrl: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay for exponential backoff in milliseconds */
  baseDelayMs: number;
}

export interface DaemonConfig {
  /** Unix socket path for daemon communication */
  socketPath: string;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Maximum cache entries */
  cacheMaxEntries: number;
}

export interface CliConfig {
  /** Whether to use daemon mode */
  useDaemon: boolean;
  /** Daemon socket path */
  socketPath: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface WebhookResponse {
  output?: string;
  refined?: string;
  text?: string;
  content?: string;
  [key: string]: unknown;
}

export interface RefineResult {
  success: true;
  refined: string;
}

export interface RefineError {
  success: false;
  error: string;
  code: RefineErrorCode;
}

export type RefineResponse = RefineResult | RefineError;

// ============================================================================
// Error Types
// ============================================================================

export enum RefineErrorCode {
  EMPTY_PROMPT = 'EMPTY_PROMPT',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  WEBHOOK_ERROR = 'WEBHOOK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  EMPTY_RESPONSE = 'EMPTY_RESPONSE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DAEMON_ERROR = 'DAEMON_ERROR',
}

export class RefinerError extends Error {
  constructor(
    message: string,
    public readonly code: RefineErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RefinerError';
  }
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
}

// ============================================================================
// Extension Types
// ============================================================================

export interface EditorSelection {
  text: string;
  editor: unknown; // vscode.TextEditor - avoiding vscode import in shared types
  selection: unknown; // vscode.Selection
}
