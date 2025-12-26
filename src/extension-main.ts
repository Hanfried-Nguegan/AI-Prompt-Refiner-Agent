import * as vscode from "vscode";
import * as child_process from "child_process";

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand(
    "promptRefiner.refineSelection",
    refineSelection
  );
  context.subscriptions.push(command);
  console.log("Prompt Refiner extension activated");
}

async function refineSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  // Get selected text
  let selectedText = editor.document.getText(editor.selection).trim();

  if (!selectedText) {
    vscode.window.showErrorMessage("No text selected");
    return;
  }

  try {
    vscode.window.showInformationMessage("🔄 Refining prompt...");

    // Copy to clipboard
    await vscode.env.clipboard.writeText(selectedText);

    // Wait for clipboard to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Run the task
    const tasks = await vscode.tasks.fetchTasks();
    const refineTask = tasks.find(t => t.name === "Refine Clipboard");

    if (!refineTask) {
      vscode.window.showErrorMessage("Task 'Refine Clipboard' not found");
      return;
    }

    const execution = await vscode.tasks.executeTask(refineTask);

    // Wait for task to complete with timeout (30 seconds max)
    const taskCompleted = await Promise.race([
      new Promise<boolean>((resolve) => {
        const disposable = vscode.tasks.onDidEndTask((e) => {
          if (e.execution.task === refineTask) {
            disposable.dispose();
            resolve(true);
          }
        });
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 30000); // 30 second timeout
      })
    ]);

    if (!taskCompleted) {
      vscode.window.showErrorMessage("❌ Refinement timed out (30s)");
      return;
    }

    // Wait longer for clipboard to be updated
    await new Promise(resolve => setTimeout(resolve, 500));

    // Read refined text from clipboard
    const refined = await vscode.env.clipboard.readText();

    if (refined && refined !== selectedText) {
      // Replace selected text with refined version
      await editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, refined);
      });
      vscode.window.showInformationMessage("✨ Prompt refined!");
    } else {
      vscode.window.showErrorMessage("❌ No refined result returned");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`❌ Refinement failed: ${msg}`);
  }
}

export function deactivate() {}
