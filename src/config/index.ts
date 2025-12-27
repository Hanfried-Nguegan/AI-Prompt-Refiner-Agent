/**
 * Configuration management with environment variable support
 */

import type { RefinerConfig, DaemonConfig, CliConfig } from '../types/index.js';

// ============================================================================
// Default Values
// ============================================================================

const DEFAULTS = {
  WEBHOOK_URL: 'http://localhost:5678/webhook/refine-prompt',
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 500,
  SOCKET_PATH: '/tmp/prompt-refiner.sock',
  CACHE_TTL_MS: 60000,
  CACHE_MAX_ENTRIES: 200,
} as const;

// ============================================================================
// Environment Helpers
// ============================================================================

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === '1' || value.toLowerCase() === 'true';
}

// ============================================================================
// Configuration Loaders
// ============================================================================

export function loadRefinerConfig(overrides?: Partial<RefinerConfig>): RefinerConfig {
  return {
    webhookUrl: overrides?.webhookUrl ?? getEnvString('REFINER_WEBHOOK_URL', DEFAULTS.WEBHOOK_URL),
    timeoutMs: overrides?.timeoutMs ?? getEnvNumber('REFINER_TIMEOUT_MS', DEFAULTS.TIMEOUT_MS),
    maxRetries: overrides?.maxRetries ?? getEnvNumber('REFINER_MAX_RETRIES', DEFAULTS.MAX_RETRIES),
    baseDelayMs:
      overrides?.baseDelayMs ?? getEnvNumber('REFINER_BASE_DELAY_MS', DEFAULTS.BASE_DELAY_MS),
  };
}

export function loadDaemonConfig(overrides?: Partial<DaemonConfig>): DaemonConfig {
  return {
    socketPath:
      overrides?.socketPath ?? getEnvString('REFINER_DAEMON_SOCKET', DEFAULTS.SOCKET_PATH),
    cacheTtlMs:
      overrides?.cacheTtlMs ?? getEnvNumber('REFINER_CACHE_TTL_MS', DEFAULTS.CACHE_TTL_MS),
    cacheMaxEntries:
      overrides?.cacheMaxEntries ?? getEnvNumber('REFINER_CACHE_MAX', DEFAULTS.CACHE_MAX_ENTRIES),
  };
}

export function loadCliConfig(overrides?: Partial<CliConfig>): CliConfig {
  return {
    useDaemon: overrides?.useDaemon ?? getEnvBoolean('REFINER_DAEMON', false),
    socketPath:
      overrides?.socketPath ?? getEnvString('REFINER_DAEMON_SOCKET', DEFAULTS.SOCKET_PATH),
    timeoutMs: overrides?.timeoutMs ?? getEnvNumber('REFINER_TIMEOUT_MS', DEFAULTS.TIMEOUT_MS),
  };
}

export { DEFAULTS };
