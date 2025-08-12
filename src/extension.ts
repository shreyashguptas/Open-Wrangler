import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Command primarily for manual testing
  context.subscriptions.push(
    vscode.commands.registerCommand('open-wrangler.open', async () => {
      await openTableEditor("Sample", [["col1", "col2"], ["a", "b"]]);
    })
  );

  // Command used by the cell status bar button
  context.subscriptions.push(
    vscode.commands.registerCommand('open-wrangler.openFromCell', async () => {
      const active = vscode.window.activeNotebookEditor;
      if (!active) {
        vscode.window.showInformationMessage('No active notebook.');
        return;
      }
      // For now, open a placeholder table view. Later, inspect cell output/variable.
      await openTableEditor("DataFrame", [["col", "value"], ["x", 1]]);
    })
  );
}

export function deactivate() {}

async function openTableEditor(title: string, previewRows: unknown[][]): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    content: renderTable(previewRows),
    language: 'markdown'
  });
  await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
}

function renderTable(rows: unknown[][]): string {
  if (rows.length === 0) return 'Empty table';
  const [header, ...rest] = rows;
  const sep = header.map(() => '---');
  const md = [
    `# ${'Preview'}`,
    '',
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rest.map(r => `| ${r.join(' | ')} |`)
  ].join('\n');
  return md;
}
