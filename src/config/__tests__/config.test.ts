import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadRefinerConfig, loadDaemonConfig, loadCliConfig, DEFAULTS } from '../index.js';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars
    delete process.env.REFINER_WEBHOOK_URL;
    delete process.env.REFINER_TIMEOUT_MS;
    delete process.env.REFINER_MAX_RETRIES;
    delete process.env.REFINER_BASE_DELAY_MS;
    delete process.env.REFINER_DAEMON_SOCKET;
    delete process.env.REFINER_CACHE_TTL_MS;
    delete process.env.REFINER_CACHE_MAX;
    delete process.env.REFINER_DAEMON;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('loadRefinerConfig', () => {
    it('uses defaults when no env vars set', () => {
      const config = loadRefinerConfig();

      expect(config.webhookUrl).toBe(DEFAULTS.WEBHOOK_URL);
      expect(config.timeoutMs).toBe(DEFAULTS.TIMEOUT_MS);
      expect(config.maxRetries).toBe(DEFAULTS.MAX_RETRIES);
      expect(config.baseDelayMs).toBe(DEFAULTS.BASE_DELAY_MS);
    });

    it('reads from environment variables', () => {
      process.env.REFINER_WEBHOOK_URL = 'http://custom.url';
      process.env.REFINER_TIMEOUT_MS = '5000';
      process.env.REFINER_MAX_RETRIES = '5';

      const config = loadRefinerConfig();

      expect(config.webhookUrl).toBe('http://custom.url');
      expect(config.timeoutMs).toBe(5000);
      expect(config.maxRetries).toBe(5);
    });

    it('applies overrides', () => {
      const config = loadRefinerConfig({
        webhookUrl: 'http://override.url',
        timeoutMs: 3000,
      });

      expect(config.webhookUrl).toBe('http://override.url');
      expect(config.timeoutMs).toBe(3000);
    });
  });

  describe('loadDaemonConfig', () => {
    it('uses defaults when no env vars set', () => {
      const config = loadDaemonConfig();

      expect(config.socketPath).toBe(DEFAULTS.SOCKET_PATH);
      expect(config.cacheTtlMs).toBe(DEFAULTS.CACHE_TTL_MS);
      expect(config.cacheMaxEntries).toBe(DEFAULTS.CACHE_MAX_ENTRIES);
    });

    it('reads from environment variables', () => {
      process.env.REFINER_DAEMON_SOCKET = '/custom/socket.sock';
      process.env.REFINER_CACHE_TTL_MS = '30000';

      const config = loadDaemonConfig();

      expect(config.socketPath).toBe('/custom/socket.sock');
      expect(config.cacheTtlMs).toBe(30000);
    });
  });

  describe('loadCliConfig', () => {
    it('defaults useDaemon to false', () => {
      const config = loadCliConfig();

      expect(config.useDaemon).toBe(false);
    });

    it('parses REFINER_DAEMON=1 as true', () => {
      process.env.REFINER_DAEMON = '1';

      const config = loadCliConfig();

      expect(config.useDaemon).toBe(true);
    });

    it('parses REFINER_DAEMON=true as true', () => {
      process.env.REFINER_DAEMON = 'true';

      const config = loadCliConfig();

      expect(config.useDaemon).toBe(true);
    });
  });
});
