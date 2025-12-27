/**
 * Daemon server for low-latency prompt refinement
 */

import net from 'net';
import fs from 'fs';
import type { DaemonConfig } from '../types/index.js';
import { loadDaemonConfig, loadRefinerConfig } from '../config/index.js';
import { sendToWebhook } from '../services/http-client.js';
import { LRUCache, createLogger } from '../utils/index.js';

const log = createLogger('daemon');

export interface DaemonServer {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Create and configure a daemon server instance
 */
export function createDaemonServer(configOverrides?: Partial<DaemonConfig>): DaemonServer {
  const config = loadDaemonConfig(configOverrides);
  const refinerConfig = loadRefinerConfig();

  // Initialize cache
  const cache = new LRUCache<string>({
    ttlMs: config.cacheTtlMs,
    maxEntries: config.cacheMaxEntries,
  });

  let server: net.Server | null = null;

  /**
   * Handle incoming connection
   */
  async function handleConnection(conn: net.Socket): Promise<void> {
    let buffer = '';
    const startTime = Date.now();

    conn.setEncoding('utf8');

    conn.on('data', (data) => {
      buffer += data;
    });

    conn.on('end', async () => {
      try {
        const prompt = buffer.trim();

        if (!prompt) {
          conn.write('ERROR: no prompt provided');
          conn.end();
          return;
        }

        // Check cache first
        const cached = cache.get(prompt);
        if (cached) {
          conn.write(cached);
          conn.end();
          log.info('Cache hit', { durationMs: Date.now() - startTime });
          return;
        }

        // Refine via webhook
        const refined = await sendToWebhook(prompt, refinerConfig);

        // Cache the result
        cache.set(prompt, refined);

        conn.write(refined);
        conn.end();
        log.info('Refined prompt', { durationMs: Date.now() - startTime });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        conn.write(`ERROR: ${message}`);
        conn.end();
        log.error('Refinement failed', { durationMs: Date.now() - startTime, error: message });
      }
    });
  }

  /**
   * Clean up socket file if it exists
   */
  function cleanupSocket(): void {
    try {
      if (fs.existsSync(config.socketPath)) {
        fs.unlinkSync(config.socketPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  return {
    start() {
      if (server) {
        log.warn('Daemon server is already running');
        return;
      }

      // Clean up any existing socket
      cleanupSocket();

      // Create server
      server = net.createServer(handleConnection);

      server.listen(config.socketPath, () => {
        // Set socket permissions (owner only)
        fs.chmodSync(config.socketPath, 0o600);
        log.info('Daemon started', { socketPath: config.socketPath });
      });

      server.on('error', (error) => {
        log.error('Server error', { error: error.message });
      });

      // Handle graceful shutdown
      const shutdown = () => {
        this.stop();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    },

    stop() {
      if (server) {
        server.close();
        server = null;
      }
      cleanupSocket();
      log.info('Daemon stopped');
    },

    isRunning() {
      return server !== null;
    },
  };
}
