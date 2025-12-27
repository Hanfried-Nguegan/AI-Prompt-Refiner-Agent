/**
 * VS Code extension task runner
 */

import type * as vscode from 'vscode';

export interface TaskResult {
  success: boolean;
  error?: string;
}

/**
 * Find a task by name
 */
export async function findTask(
  vscodeApi: typeof vscode,
  taskName: string
): Promise<vscode.Task | null> {
  const tasks = await vscodeApi.tasks.fetchTasks();
  return tasks.find((t) => t.name === taskName) ?? null;
}

/**
 * Execute a task and wait for completion
 */
export async function executeTask(
  vscodeApi: typeof vscode,
  task: vscode.Task,
  timeoutMs: number = 30000
): Promise<TaskResult> {
  return new Promise((resolve) => {
    const disposable = vscodeApi.tasks.onDidEndTask((e) => {
      if (e.execution.task === task) {
        disposable.dispose();
        resolve({ success: true });
      }
    });

    // Start task execution
    vscodeApi.tasks.executeTask(task);

    // Set up timeout
    setTimeout(() => {
      disposable.dispose();
      resolve({ success: false, error: 'Task timed out' });
    }, timeoutMs);
  });
}

/**
 * Find and execute a task by name
 */
export async function runTaskByName(
  vscodeApi: typeof vscode,
  taskName: string,
  timeoutMs: number = 30000
): Promise<TaskResult> {
  const task = await findTask(vscodeApi, taskName);

  if (!task) {
    return { success: false, error: `Task '${taskName}' not found` };
  }

  return executeTask(vscodeApi, task, timeoutMs);
}
