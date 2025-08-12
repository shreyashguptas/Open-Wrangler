import * as vscode from 'vscode';
import { info } from '../../utils/logging';
import { ParsedTable, parseHtmlTable, parsePlainTextTable, toRowsFromDataResource } from '../../parsing/outputParsing';
import type { TablePreview } from './types';

export async function resolveActiveCellTable(): Promise<TablePreview> {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) { info('[resolve] no activeNotebookEditor'); return undefined; }
  const cellIndex = editor.selections?.length ? editor.selections[0].start : editor.selection?.start ?? 0;
  const cell = editor.notebook.cellAt(cellIndex);
  if (!cell) { info('[resolve] no active cell'); return undefined; }

  for (const out of cell.outputs ?? []) {
    for (const item of out.items ?? []) {
      const mime = item.mime;
      info(`[resolve] inspecting mime=${mime}`);
      try {
        if (mime === 'application/vnd.dataresource+json') {
          const json = JSON.parse(new TextDecoder().decode(item.data));
          const parsed = toRowsFromDataResource(json);
          if (parsed) {
            const label = json?.schema?.name || guessLastExpressionVariableName(cell.document.getText()) || 'Data';
            info(`[resolve] parsed dataresource rows=${parsed.rows.length} counts rowCount=${parsed.rowCount ?? 'n/a'} colCount=${parsed.colCount ?? 'n/a'}`);
            return { title: label, rows: parsed.rows, rowCount: parsed.rowCount, colCount: parsed.colCount };
          }
        }
        if (mime === 'text/html') {
          const html = new TextDecoder().decode(item.data);
          const parsed = parseHtmlTable(html);
          if (parsed) {
            const label = guessLastExpressionVariableName(cell.document.getText()) ?? 'Cell HTML table';
            info(`[resolve] parsed text/html rows=${parsed.rows.length} counts rowCount=${parsed.rowCount ?? 'n/a'} colCount=${parsed.colCount ?? 'n/a'}`);
            return { title: label, rows: parsed.rows, rowCount: parsed.rowCount, colCount: parsed.colCount };
          }
        }
        if (mime === 'text/plain') {
          const text = new TextDecoder().decode(item.data);
          const parsed = parsePlainTextTable(text);
          if (parsed) {
            const label = guessLastExpressionVariableName(cell.document.getText()) ?? 'Cell output';
            info(`[resolve] parsed text/plain rows=${parsed.rows.length} counts rowCount=${parsed.rowCount ?? 'n/a'} colCount=${parsed.colCount ?? 'n/a'}`);
            return { title: label, rows: parsed.rows, rowCount: parsed.rowCount, colCount: parsed.colCount };
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return undefined;
}

function guessLastExpressionVariableName(source: string): string | undefined {
  const lines = source.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return undefined;
  const last = lines[lines.length - 1];
  const identMatch = last.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:[#].*)?$/);
  if (identMatch) return identMatch[1];
  const funcOnIdent = last.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\./);
  if (funcOnIdent) return funcOnIdent[1];
  const displayCall = last.match(/\((\s*[A-Za-z_][A-Za-z0-9_]*\s*)\)\s*$/);
  if (displayCall) return displayCall[1].trim();
  return undefined;
}


