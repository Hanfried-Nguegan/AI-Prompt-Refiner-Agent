/**
 * Structured logger for Prompt Refiner
 * Lightweight logger with JSON output for production observability
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(context: string): Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()];
}

function formatEntry(
  level: LogLevel,
  message: string,
  context?: string,
  meta?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...meta,
  };
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const sanitized = { ...meta };

  // Redact sensitive fields
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

function createLogFunction(
  level: LogLevel,
  context?: string
): (message: string, meta?: Record<string, unknown>) => void {
  return (message: string, meta?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;

    const entry = formatEntry(level, message, context, sanitizeMeta(meta));

    // JSON output for production, pretty for development
    const output =
      process.env.NODE_ENV === 'production'
        ? JSON.stringify(entry)
        : `[${entry.timestamp}] ${entry.level.toUpperCase()}${context ? ` [${context}]` : ''}: ${message}${meta ? ' ' + JSON.stringify(sanitizeMeta(meta)) : ''}`;

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  };
}

function createLogger(context?: string): Logger {
  return {
    debug: createLogFunction('debug', context),
    info: createLogFunction('info', context),
    warn: createLogFunction('warn', context),
    error: createLogFunction('error', context),
    child: (childContext: string) =>
      createLogger(context ? `${context}:${childContext}` : childContext),
  };
}

// Default logger instance
export const logger = createLogger();

// Factory for creating contextual loggers
export { createLogger };
