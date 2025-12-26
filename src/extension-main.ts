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

    // Wait a moment for clipboard to settle
    await new Promise(resolve => setTimeout(resolve, 300));

    // Run the task
    const tasks = await vscode.tasks.fetchTasks();
    const refineTask = tasks.find(t => t.name === "Refine Clipboard");

    if (!refineTask) {
      vscode.window.showErrorMessage("Task 'Refine Clipboard' not found");
      return;
    }

    const execution = await vscode.tasks.executeTask(refineTask);

    // Wait for task to complete
    await new Promise<void>((resolve) => {
      const disposable = vscode.tasks.onDidEndTask((e) => {
        if (e.execution.task === refineTask) {
          disposable.dispose();
          resolve();
        }
      });
    });

    // Read refined text from clipboard
    const refined = await vscode.env.clipboard.readText();

    if (refined && refined !== selectedText) {
      // Copy refined text back to clipboard
      await vscode.env.clipboard.writeText(refined);

      // Check if Copilot Chat is visible
      const chatVisible = await vscode.commands.executeCommand(
        "copilot.chat.isVisible"
      );

      if (chatVisible) {
        // Focus Copilot Chat and simulate paste
        await vscode.commands.executeCommand("copilot.chat.focus");
        await new Promise(resolve => setTimeout(resolve, 200));
        await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        vscode.window.showInformationMessage(
          "✨ Refined prompt pasted in Copilot Chat!"
        );
      } else {
        // Replace selected text in editor
        await editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, refined);
        });
        vscode.window.showInformationMessage("✨ Prompt refined in editor!");
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`❌ Refinement failed: ${msg}`);
  }
}

export function deactivate() {}
