/**
 * CLI utilities for reading input and writing output
 */

import { spawn } from 'child_process';

/**
 * Detect the current platform
 */
function getPlatform(): 'darwin' | 'linux' | 'win32' | 'unknown' {
  const platform = process.platform;
  if (platform === 'darwin' || platform === 'linux' || platform === 'win32') {
    return platform;
  }
  return 'unknown';
}

/**
 * Check if running in Bun runtime
 */
function isBun(): boolean {
  return typeof Bun !== 'undefined';
}

/**
 * Read all data from stdin
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

/**
 * Get clipboard command and args for current platform
 */
function getClipboardCommand(): { cmd: string; args: string[] } | null {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      return { cmd: 'pbcopy', args: [] };
    case 'linux':
      return { cmd: 'xclip', args: ['-selection', 'clipboard'] };
    case 'win32':
      return { cmd: 'clip', args: [] };
    default:
      return null;
  }
}

/**
 * Copy text to clipboard (cross-platform)
 */
export async function copyToClipboard(text: string): Promise<void> {
  const clipboardCmd = getClipboardCommand();

  if (!clipboardCmd) {
    console.warn('⚠️ Clipboard not supported on this platform');
    return;
  }

  // Use Bun's spawn if available
  if (isBun()) {
    try {
      await Bun.spawn([clipboardCmd.cmd, ...clipboardCmd.args], {
        stdin: new TextEncoder().encode(text),
      });
      return;
    } catch {
      // Fall through to Node.js implementation
    }
  }

  // Node.js implementation
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(clipboardCmd.cmd, clipboardCmd.args, {
      stdio: ['pipe', 'ignore', 'ignore'],
    });

    proc.stdin.write(text);
    proc.stdin.end();

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Try fallback for Linux (xsel)
        if (getPlatform() === 'linux' && clipboardCmd.cmd === 'xclip') {
          const fallback = spawn('xsel', ['--clipboard', '--input'], {
            stdio: ['pipe', 'ignore', 'ignore'],
          });
          fallback.stdin.write(text);
          fallback.stdin.end();
          fallback.on('close', (fallbackCode) => {
            if (fallbackCode === 0) resolve();
            else reject(new Error('Clipboard copy failed. Install xclip or xsel.'));
          });
          fallback.on('error', () => {
            reject(new Error('Clipboard copy failed. Install xclip or xsel.'));
          });
        } else {
          reject(new Error(`Clipboard command exited with code ${code}`));
        }
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Clipboard command failed: ${err.message}`));
    });
  });
}

/**
 * Print success message with refined prompt
 */
export function printSuccess(_: string): void {
  console.log('\n✨ Refined prompt copied to clipboard.');
}

/**
 * Print error message and exit
 */
export function exitWithError(message: string, code: number = 1): never {
  console.error(`❌ ${message}`);
  process.exit(code);
}
