import * as vscode from "vscode";

let activated = false;
let lastEditorWithSelection: vscode.TextEditor | null = null;

export function activate(context: vscode.ExtensionContext) {
  if (activated) return;
  activated = true;

  // Track when editors have selections
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.selection && !editor.selection.isEmpty) {
      lastEditorWithSelection = editor;
    }
  });

  vscode.window.onDidChangeTextEditorSelection(e => {
    if (e.textEditor && !e.selections[0].isEmpty) {
      lastEditorWithSelection = e.textEditor;
    }
  });

  const command = vscode.commands.registerCommand(
    "promptRefiner.refineSelection",
    refineSelection
  );
  
  context.subscriptions.push(command);
  console.log("✓ Prompt Refiner extension loaded");
}

async function refineSelection() {
  // Try: active editor → last editor with selection → any visible editor
  let editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  
  if (!editor || editor.selection.isEmpty) {
    editor = lastEditorWithSelection || undefined;
  }
  
  if (!editor || editor.selection.isEmpty) {
    const visibleEditors = vscode.window.visibleTextEditors.filter(
      e => e.document.languageId !== "chat"
    );
    if (visibleEditors.length > 0) {
      editor = visibleEditors[0];
    }
  }

  let selectedText: string;

  // Try to get selection from editor
  if (editor && !editor.selection.isEmpty) {
    selectedText = editor.document.getText(editor.selection).trim();
  } else {
    // Fallback: read from clipboard if no selection found
    selectedText = (await vscode.env.clipboard.readText()).trim();
  }

  if (!selectedText) {
    vscode.window.showErrorMessage("No text selected or found in clipboard");
    return;
  }

  try {
    vscode.window.showInformationMessage("🔄 Refining...");

    // Copy to clipboard
    await vscode.env.clipboard.writeText(selectedText);
    await new Promise(r => setTimeout(r, 500));

    // Find and run task
    const tasks = await vscode.tasks.fetchTasks();
    const task = tasks.find(t => t.name === "Refine Clipboard");

    if (!task) {
      vscode.window.showErrorMessage("Task 'Refine Clipboard' not found");
      return;
    }

    // Execute with timeout
    await Promise.race([
      new Promise(resolve => {
        const disposable = vscode.tasks.onDidEndTask(e => {
          if (e.execution.task === task) {
            disposable.dispose();
            resolve(null);
          }
        });
        vscode.tasks.executeTask(task);
      }),
      new Promise(resolve => setTimeout(() => resolve(null), 30000))
    ]);

    await new Promise(r => setTimeout(r, 500));
    const refined = await vscode.env.clipboard.readText();

    if (refined && refined !== selectedText) {
      // If we have an editor, replace the selection
      if (editor && !editor.selection.isEmpty) {
        editor.edit(editBuilder => {
          editBuilder.replace(editor.selection, refined);
        });
        vscode.window.showInformationMessage("✨ Done!");
      } else {
        // Just show the refined text in a message
        vscode.window.showInformationMessage(`✨ Refined (copied to clipboard):\n${refined.slice(0, 100)}...`);
      }
    } else {
      vscode.window.showErrorMessage("No refined result");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`❌ Error: ${msg}`);
  }
}

export function deactivate() {}