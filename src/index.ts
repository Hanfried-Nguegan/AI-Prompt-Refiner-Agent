import * as vscode from "vscode";

let activated = false;

export function activate(context: vscode.ExtensionContext) {
  if (activated) return;
  activated = true;

  const command = vscode.commands.registerCommand(
    "promptRefiner.refineSelection",
    refineSelection
  );
  
  context.subscriptions.push(command);
  console.log("✓ Prompt Refiner extension loaded");
}

async function refineSelection() {
  // Try active editor first, then search all open editors
  let editor = vscode.window.activeTextEditor;
  
  if (!editor || !editor.document) {
    // Search through all open text editors
    const visibleEditors = vscode.window.visibleTextEditors;
    if (visibleEditors.length > 0) {
      editor = visibleEditors[0];
    }
  }

  if (!editor) {
    vscode.window.showErrorMessage("No text editor found");
    return;
  }

  const selectedText = editor.document.getText(editor.selection).trim();
  if (!selectedText) {
    vscode.window.showErrorMessage("No text selected");
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
      editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, refined);
      });
      vscode.window.showInformationMessage("✨ Done!");
    } else {
      vscode.window.showErrorMessage("No refined result");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`❌ Error: ${msg}`);
  }
}

export function deactivate() {}