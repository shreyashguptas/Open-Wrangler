import * as vscode from 'vscode';

export const log = vscode.window.createOutputChannel('Open-Wrangler');

export function info(message: string) {
  log.appendLine(message);
}


