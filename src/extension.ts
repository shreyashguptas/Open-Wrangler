import * as vscode from 'vscode';
import { activate as coreActivate, deactivate as coreDeactivate } from './activation/activate';

export function activate(context: vscode.ExtensionContext) {
  coreActivate(context);
}

export function deactivate() {
  coreDeactivate();
}
