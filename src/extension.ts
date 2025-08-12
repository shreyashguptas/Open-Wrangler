import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Command used by the cell status bar button
  context.subscriptions.push(
    vscode.commands.registerCommand('open-wrangler.openFromCell', async () => {
      const table = await resolveActiveCellTable();
      if (!table) {
        vscode.window.showInformationMessage('No DataFrame-like output found in the active cell.');
        return;
      }
      await openTableEditor(table.title, table.rows);
    })
  );

  // Show a status bar action under notebook cells to open in Open‑Wrangler
  context.subscriptions.push(
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('jupyter-notebook', {
      provideCellStatusBarItems(cell) {
        // Show the button when the cell has any output; refine this later to detect DataFrame
        if ((cell.outputs?.length ?? 0) === 0) return [];
        const item = new vscode.NotebookCellStatusBarItem(
          'Open in Open‑Wrangler',
          vscode.NotebookCellStatusBarAlignment.Left
        );
        item.command = 'open-wrangler.openFromCell';
        item.tooltip = 'Open this cell output in Open‑Wrangler';
        return [item];
      }
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

type TablePreview = { title: string; rows: unknown[][] } | undefined;

async function resolveActiveCellTable(): Promise<TablePreview> {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) return undefined;
  const cellIndex = editor.selections?.length ? editor.selections[0].start : editor.selection?.start ?? 0;
  const cell = editor.notebook.cellAt(cellIndex);
  if (!cell) return undefined;

  // Basic heuristics: inspect cell outputs for text table or HTML table, and take a small head()
  for (const out of cell.outputs ?? []) {
    for (const item of out.items ?? []) {
      const mime = item.mime;
      try {
        if (mime === 'text/plain') {
          const text = new TextDecoder().decode(item.data);
          const parsed = parsePlainTextTable(text);
          if (parsed) return { title: 'Cell output', rows: parsed };
        }
        if (mime === 'text/html') {
          const html = new TextDecoder().decode(item.data);
          const parsed = parseHtmlTable(html);
          if (parsed) return { title: 'Cell HTML table', rows: parsed };
        }
        if (mime === 'application/vnd.dataresource+json') {
          const json = JSON.parse(new TextDecoder().decode(item.data));
          const rows = toRowsFromDataResource(json, 50);
          if (rows) return { title: json?.schema?.name ?? 'Data', rows };
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return undefined;
}

function toRowsFromDataResource(resource: any, limit: number): unknown[][] | undefined {
  const fields: string[] = resource?.schema?.fields?.map((f: any) => f?.name) ?? [];
  const data: any[] = resource?.data ?? [];
  if (fields.length === 0 || data.length === 0) return undefined;
  const header = fields;
  const body = data.slice(0, limit).map(row => header.map(h => row[h]));
  return [header, ...body];
}

function parsePlainTextTable(text: string): unknown[][] | undefined {
  // Very naive parsing for Pandas text repr (fallback). Improve later.
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return undefined;
  // Heuristic: if it looks like CSV-like header followed by rows
  const header = lines[0].split(/\s{2,}|\t|,\s?/);
  if (header.length < 2) return undefined;
  const rows = lines.slice(1, Math.min(lines.length, 51)).map(l => l.split(/\s{2,}|\t|,\s?/).slice(0, header.length));
  return [header, ...rows];
}

function parseHtmlTable(html: string): unknown[][] | undefined {
  // We cannot use DOM in extension host; do a minimal regex-based parse for <table><tr><td>... demo
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return undefined;
  const rowMatches = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows: unknown[][] = [];
  for (const rm of rowMatches) {
    const cells = rm.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) ?? [];
    rows.push(cells.map(c => c.replace(/<[^>]+>/g, '').trim()));
  }
  if (rows.length === 0) return undefined;
  // Ensure header row exists
  if (rows.length === 1) {
    const header = rows[0].map((_, i) => `col${i + 1}`);
    return [header, rows[0]];
  }
  return rows.slice(0, 51);
}
