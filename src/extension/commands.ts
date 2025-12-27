/**
 * VS Code extension commands
 */

import type * as vscode from 'vscode';
import * as ui from './ui.js';
import { runTaskByName } from './tasks.js';

const TASK_NAME = 'Refine Clipboard';
const TASK_TIMEOUT_MS = 30000;
const CLIPBOARD_DELAY_MS = 500;

interface ExtensionState {
  lastEditorWithSelection: vscode.TextEditor | null;
}

/**
 * Create the refine selection command handler
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
      // Copy to clipboard for the task
      await ui.writeClipboard(vscodeApi, selectedText);
      await sleep(CLIPBOARD_DELAY_MS);

      // Run the refine task with spinner
      const result = await ui.withSpinner(vscodeApi, '🔄 Refining...', async () => {
        return runTaskByName(vscodeApi, TASK_NAME, TASK_TIMEOUT_MS);
      });

      if (!result.success) {
        ui.showError(vscodeApi, result.error ?? 'Task failed');
        return;
      }

      // Wait for clipboard to be updated
      await sleep(CLIPBOARD_DELAY_MS);

      // Get refined text from clipboard
      const refined = await ui.readClipboard(vscodeApi);

      if (!refined || refined === selectedText) {
        ui.showError(vscodeApi, 'No refined result');
        return;
      }

      // Replace in editor if we have one
      if (editor && !editor.selection.isEmpty) {
        await ui.replaceInEditor(editor, editor.selection, refined);
        ui.showInfo(vscodeApi, '✨ Done!');
      } else {
        // Just show success message for clipboard mode
        const truncated = refined.length > 80 ? `${refined.slice(0, 80)}...` : refined;
        const msg = isInChat
          ? `✨ Refined (copied to clipboard). Paste it in Chat: ${truncated}`
          : `✨ Refined (copied to clipboard): ${truncated}`;
        ui.showInfo(vscodeApi, msg);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ui.showError(vscodeApi, `Error: ${message}`);
    }
  };
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
