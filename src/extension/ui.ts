/**
 * VS Code extension UI utilities
 */

import type * as vscode from 'vscode';

// Re-export types for extension use
export interface EditorContext {
  text: string;
  editor: vscode.TextEditor;
  selection: vscode.Selection;
}

/**
 * Get the current editor selection if available
 */
export function getEditorSelection(vscodeApi: typeof vscode): EditorContext | null {
  const editor = vscodeApi.window.activeTextEditor;

  if (!editor || !editor.selection || editor.selection.isEmpty) {
    return null;
  }

  return {
    text: editor.document.getText(editor.selection),
    editor,
    selection: editor.selection,
  };
}

/**
 * Find the best editor with a selection
 */
export function findEditorWithSelection(
  vscodeApi: typeof vscode,
  lastEditorWithSelection: vscode.TextEditor | null
): vscode.TextEditor | null {
  // Try active editor first
  const activeEditor = vscodeApi.window.activeTextEditor;

  if (activeEditor && !activeEditor.selection.isEmpty) {
    // Skip if in chat
    if (activeEditor.document.languageId !== 'chat') {
      return activeEditor;
    }
  }

  // Try last known editor with selection
  if (lastEditorWithSelection && !lastEditorWithSelection.selection.isEmpty) {
    return lastEditorWithSelection;
  }

  // Try visible editors (excluding chat)
  const visibleEditors = vscodeApi.window.visibleTextEditors.filter(
    (e) => e.document.languageId !== 'chat' && !e.selection.isEmpty
  );

  return visibleEditors[0] ?? null;
}

/**
 * Replace text in editor at selection
 */
export async function replaceInEditor(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  text: string
): Promise<boolean> {
  return editor.edit((editBuilder) => {
    editBuilder.replace(selection, text);
  });
}

/**
 * Read from clipboard
 */
export async function readClipboard(vscodeApi: typeof vscode): Promise<string> {
  return vscodeApi.env.clipboard.readText();
}

/**
 * Write to clipboard
 */
export async function writeClipboard(vscodeApi: typeof vscode, text: string): Promise<void> {
  return vscodeApi.env.clipboard.writeText(text);
}

/**
 * Show progress notification
 */
export async function withProgress<T>(
  vscodeApi: typeof vscode,
  title: string,
  task: () => Promise<T>
): Promise<T> {
  return vscodeApi.window.withProgress(
    {
      location: vscodeApi.ProgressLocation.Notification,
      title,
    },
    task
  );
}

/**
 * Show info message
 */
export function showInfo(vscodeApi: typeof vscode, message: string): void {
  vscodeApi.window.showInformationMessage(message);
}

/**
 * Show warning message
 */
export function showWarning(vscodeApi: typeof vscode, message: string): void {
  vscodeApi.window.showWarningMessage(message);
}

/**
 * Show error message
 */
export function showError(vscodeApi: typeof vscode, message: string): void {
  vscodeApi.window.showErrorMessage(message);
}
