import * as vscode from 'vscode';
import { registerCommands } from './registerCommands';
import { registerStatusBar } from './registerStatusBar';

export function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  registerStatusBar(context);
}

export function deactivate() {}


