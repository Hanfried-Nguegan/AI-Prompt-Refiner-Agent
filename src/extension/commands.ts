/**
 * VS Code extension commands
 *
 * This module provides self-contained prompt refinement that works in any workspace.
 * It calls the refiner service directly - no workspace task dependency required.
 */

import type * as vscode from 'vscode';
import * as ui from './ui.js';
import { refinePrompt } from '../services/refiner.js';
import { loadCliConfig } from '../config/index.js';

// Match default refiner timeout (180s)
const REFINE_TIMEOUT_MS = 180000;

interface ExtensionState {
  lastEditorWithSelection: vscode.TextEditor | null;
}

/**
 * Create the refine selection command handler
 * Works in any VS Code workspace - no task configuration needed
 */
export function createRefineSelectionCommand(vscodeApi: typeof vscode, state: ExtensionState) {
  return async function refineSelection(): Promise<void> {
    // Check if we're in chat mode
    const isInChat = vscodeApi.window.activeTextEditor?.document.languageId === 'chat';

    // Find editor with selection
    const editor = ui.findEditorWithSelection(vscodeApi, state.lastEditorWithSelection);
    let selectedText: string;

    // Get text from editor or clipboard
    if (editor && !editor.selection.isEmpty) {
      selectedText = editor.document.getText(editor.selection).trim();
    } else {
      // Fallback to clipboard
      selectedText = (await ui.readClipboard(vscodeApi)).trim();
    }

    // Validate we have text to refine
    if (!selectedText) {
      if (isInChat) {
        ui.showError(
          vscodeApi,
          "To refine in Chat: Copy your prompt → Run 'Refine Selection' → Paste the result back"
        );
      } else {
        ui.showError(vscodeApi, 'No text selected or found in clipboard');
      }
      return;
    }

    try {
      // Refine directly using the service (no task dependency)
      const refined = await ui.withSpinner(vscodeApi, '🔄 Refining...', async () => {
        // Check if daemon mode is preferred
        const cliConfig = loadCliConfig();

        return refinePrompt(selectedText, {
          useDaemon: cliConfig.useDaemon,
          socketPath: cliConfig.socketPath,
          timeoutMs: REFINE_TIMEOUT_MS,
        });
      });

      if (!refined) {
        ui.showError(vscodeApi, 'No refined result');
        return;
      }

      // Copy to clipboard
      await ui.writeClipboard(vscodeApi, refined);

      // Replace in editor if we have one
      if (editor && !editor.selection.isEmpty) {
        await ui.replaceInEditor(editor, editor.selection, refined);
        ui.showInfo(vscodeApi, '✨ Done!');
      } else {
        // Just show success message for clipboard mode without revealing content
        const msg = isInChat
          ? '✨ Refined and copied to clipboard. Paste it in Chat.'
          : '✨ Refined and copied to clipboard.';
        ui.showInfo(vscodeApi, msg);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ui.showError(vscodeApi, `Error: ${message}`);
    }
  };
}
