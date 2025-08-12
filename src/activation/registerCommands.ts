import * as vscode from 'vscode';
import { info } from '../utils/logging';
import { resolveActiveCellTable } from '../features/openFromCell/resolveActiveCellTable';
import { createPreviewPanel } from '../webview/previewPanel';

export function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('open-wrangler.openFromCell', async () => {
      info('[command] open-wrangler.openFromCell invoked');
      const table = await resolveActiveCellTable();
      if (!table) {
        vscode.window.showInformationMessage('No DataFrame-like output found in the active cell.');
        return;
      }
      createPreviewPanel(table.title, table.rows, table.rowCount, table.colCount);
    })
  );
}


