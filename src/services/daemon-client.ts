/**
 * Unix socket client for daemon communication
 */

import net from 'net';
import { RefinerError, RefineErrorCode } from '../types/index.js';

export interface DaemonClientOptions {
  socketPath: string;
  timeoutMs: number;
}

/**
 * Send prompt to daemon via Unix socket
 */
export function sendToDaemon(prompt: string, options: DaemonClientOptions): Promise<string> {
  const { socketPath, timeoutMs } = options;

  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath);
    let buffer = '';
    let timeoutId: NodeJS.Timeout | null = null;

    // Set up timeout
    timeoutId = setTimeout(() => {
      client.destroy();
      reject(new RefinerError('Daemon request timed out', RefineErrorCode.TIMEOUT));
    }, timeoutMs);

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    client.on('connect', () => {
      client.write(prompt);
      client.end();
    });

    client.on('data', (data) => {
      buffer += data.toString();
    });

    client.on('end', () => {
      cleanup();

      // Check for daemon error response
      if (buffer.startsWith('ERROR:')) {
        reject(new RefinerError(buffer.substring(7).trim(), RefineErrorCode.DAEMON_ERROR));
        return;
      }

      resolve(buffer);
    });

    client.on('error', (error) => {
      cleanup();
      reject(
        new RefinerError(
          `Daemon connection error: ${error.message}`,
          RefineErrorCode.DAEMON_ERROR,
          error
        )
      );
    });
  });
}
