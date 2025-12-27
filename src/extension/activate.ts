/**
 * VS Code extension activation
 */

import type * as vscode from 'vscode';
import { createRefineSelectionCommand } from './commands.js';

const COMMAND_ID = 'promptRefiner.refineSelection';

interface ExtensionState {
  lastEditorWithSelection: vscode.TextEditor | null;
}

/**
 * Activate the extension
 */
export function createExtension(vscodeApi: typeof vscode) {
  let activated = false;
  const state: ExtensionState = {
    lastEditorWithSelection: null,
  };

  return {
    activate(context: vscode.ExtensionContext): void {
      if (activated) return;
      activated = true;

      // Track editors with selections
      setupSelectionTracking(vscodeApi, state, context);

      // Register command
      const command = vscodeApi.commands.registerCommand(
        COMMAND_ID,
        createRefineSelectionCommand(vscodeApi, state)
      );

      context.subscriptions.push(command);

      console.log('✓ Prompt Refiner extension loaded');
    },

    deactivate(): void {
      // Cleanup if needed
    },
  };
}

/**
 * Set up tracking for editors with selections
 */
function setupSelectionTracking(
  vscodeApi: typeof vscode,
  state: ExtensionState,
  context: vscode.ExtensionContext
): void {
  // Track when active editor changes
  const editorChangeDisposable = vscodeApi.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.selection && !editor.selection.isEmpty) {
      state.lastEditorWithSelection = editor;
    }
  });

  // Track when selection changes
  const selectionChangeDisposable = vscodeApi.window.onDidChangeTextEditorSelection((e) => {
    const firstSelection = e.selections[0];
    if (e.textEditor && firstSelection && !firstSelection.isEmpty) {
      state.lastEditorWithSelection = e.textEditor;
    }
  });

  context.subscriptions.push(editorChangeDisposable, selectionChangeDisposable);
}
