/**
 * VS Code extension entry point
 */

import * as vscode from 'vscode';
import { createExtension } from './extension/index.js';

const extension = createExtension(vscode);

export const activate = extension.activate;
export const deactivate = extension.deactivate;
