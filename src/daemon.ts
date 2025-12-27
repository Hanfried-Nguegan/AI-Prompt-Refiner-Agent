/**
 * Daemon entry point
 * Usage: bun run src/daemon.ts
 */

import { createDaemonServer } from './daemon/index.js';

const daemon = createDaemonServer();
daemon.start();
