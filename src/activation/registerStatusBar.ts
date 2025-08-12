import * as vscode from 'vscode';
import { guessLastExpressionVariableName } from '../utils/variableGuess';

export function registerStatusBar(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('jupyter-notebook', {
      provideCellStatusBarItems(cell) {
        if ((cell.outputs?.length ?? 0) === 0) return [];
        const guess = guessLastExpressionVariableName(cell.document.getText());
        const label = guess ? `Open "${guess}" in Open‑Wrangler` : 'Open in Open‑Wrangler';
        const item = new vscode.NotebookCellStatusBarItem(
          label,
          vscode.NotebookCellStatusBarAlignment.Left
        );
        item.command = 'open-wrangler.openFromCell';
        item.tooltip = 'Open this cell output in Open‑Wrangler';
        return [item];
      }
    })
  );
}


