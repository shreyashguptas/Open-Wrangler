import * as vscode from 'vscode';

const log = vscode.window.createOutputChannel('Open-Wrangler');

export function activate(context: vscode.ExtensionContext) {
  // Command used by the cell status bar button
  context.subscriptions.push(
    vscode.commands.registerCommand('open-wrangler.openFromCell', async () => {
      log.appendLine('[command] open-wrangler.openFromCell invoked');
      const table = await resolveActiveCellTable();
      if (!table) {
        vscode.window.showInformationMessage('No DataFrame-like output found in the active cell.');
        return;
      }
      await openTableWebview(table.title, table.rows);
    })
  );

  // Show a status bar action under notebook cells to open in Open‑Wrangler
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

export function deactivate() {}

async function openTableWebview(title: string, rows: unknown[][]): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'openWranglerPreview',
    `Open "${title}" in Open‑Wrangler`,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const script = getWebviewScript();
  const styles = getWebviewStyles();
  const payload = JSON.stringify({ title, rows });
  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Open‑Wrangler</title>
<style>${styles}</style>
</head>
<body>
  <div id="app"></div>
  <script>
    const bootstrap = ${payload};
    ${script}
  </script>
</body>
</html>`;

  log.appendLine(`[webview] opened preview for title="${title}" rows=${rows.length}`);
}

function getWebviewStyles(): string {
  return `
  :root { --fg: #e7e7e7; --muted: #a0a0a0; --bg: #1e1e1e; --panel: #252526; --accent: #0e639c; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); font: 12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
  #app { height: 100vh; display: flex; flex-direction: column; }
  .header { display:flex; align-items:center; gap:8px; padding:8px 10px; background: var(--panel); border-bottom: 1px solid #333; }
  .title { font-weight: 600; }
  .meta { color: var(--muted); margin-left: auto; }
  .grid { overflow: auto; flex: 1; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #333; white-space: nowrap; }
  th { background: #2a2a2a; position: sticky; top: 0; z-index: 1; }
  .pager { display:flex; gap:8px; align-items:center; padding:6px 10px; border-top: 1px solid #333; background: var(--panel); }
  button { background: #3a3a3a; color: var(--fg); border: 1px solid #444; padding: 2px 8px; border-radius: 3px; cursor: pointer; }
  button[disabled] { opacity: 0.5; cursor: default; }
  select { background: #2a2a2a; color: var(--fg); border: 1px solid #444; padding: 2px 6px; }
  `;
}

function getWebviewScript(): string {
  // Minimal client-side pagination and rendering. Runs inside the webview sandbox.
  return `
  const root = document.getElementById('app');
  const header = bootstrap.rows[0] || [];
  const body = bootstrap.rows.slice(1);
  const totalRows = body.length;
  const totalCols = header.length;
  let pageSize = 10;
  let pageIndex = 0; // zero-based

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k, String(v)));
    for (const c of children) n.append(c);
    return n;
  }

  function renderHeader() {
    return el('div', { class: 'header' },
      el('span', { class: 'title' }, 'Open "' + bootstrap.title + '" in Open‑Wrangler'),
      el('span', { class: 'meta' }, totalRows + ' rows × ' + totalCols + ' cols')
    );
  }

  function renderTable() {
    const start = pageIndex * pageSize;
    const end = Math.min(start + pageSize, totalRows);
    const pageRows = body.slice(start, end);
    const thead = el('thead');
    const thr = el('tr');
    header.forEach(h => thr.append(el('th', {}, h)));
    thead.append(thr);
    const tbody = el('tbody');
    pageRows.forEach(r => {
      const tr = el('tr');
      r.forEach(v => tr.append(el('td', {}, v === undefined ? '' : String(v))));
      tbody.append(tr);
    });
    const table = el('table', {}, thead, tbody);
    return el('div', { class: 'grid' }, table);
  }

  function renderPager() {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const info = el('span', {}, 'Page ' + (pageIndex + 1) + ' of ' + totalPages);
    const prev = el('button', { id: 'prev', disabled: pageIndex === 0 ? 'true' : '' }, '‹');
    const next = el('button', { id: 'next', disabled: pageIndex + 1 >= totalPages ? 'true' : '' }, '›');
    const size = el('select', { id: 'size' },
      el('option', { value: '10', selected: pageSize===10 ? 'true' : '' }, '10'),
      el('option', { value: '25', selected: pageSize===25 ? 'true' : '' }, '25'),
      el('option', { value: '50', selected: pageSize===50 ? 'true' : '' }, '50')
    );
    const label = el('span', {}, 'per page');
    const pager = el('div', { class: 'pager' }, prev, next, info, size, label);
    prev.onclick = () => { if (pageIndex > 0) { pageIndex--; update(); } };
    next.onclick = () => { const t = Math.ceil(totalRows / pageSize); if (pageIndex + 1 < t) { pageIndex++; update(); } };
    size.onchange = () => { pageSize = parseInt(size.value, 10); pageIndex = 0; update(); };
    return pager;
  }

  function update() {
    root.replaceChildren(renderHeader(), renderTable(), renderPager());
  }
  update();
  `;
}

type TablePreview = { title: string; rows: unknown[][] } | undefined;

async function resolveActiveCellTable(): Promise<TablePreview> {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) { log.appendLine('[resolve] no activeNotebookEditor'); return undefined; }
  const cellIndex = editor.selections?.length ? editor.selections[0].start : editor.selection?.start ?? 0;
  const cell = editor.notebook.cellAt(cellIndex);
  if (!cell) { log.appendLine('[resolve] no active cell'); return undefined; }

  // Prefer rich outputs first (DataResource/HTML), then fall back to plain text parsing.
  for (const out of cell.outputs ?? []) {
    for (const item of out.items ?? []) {
      const mime = item.mime;
      log.appendLine(`[resolve] inspecting mime=${mime}`);
      try {
        if (mime === 'application/vnd.dataresource+json') {
          const json = JSON.parse(new TextDecoder().decode(item.data));
          const rows = toRowsFromDataResource(json);
          if (rows) {
            const label = json?.schema?.name || guessLastExpressionVariableName(cell.document.getText()) || 'Data';
            log.appendLine(`[resolve] parsed dataresource rows=${rows.length}`);
            return { title: label, rows };
          }
        }
        if (mime === 'text/html') {
          const html = new TextDecoder().decode(item.data);
          const parsed = parseHtmlTable(html);
          if (parsed) {
            const label = guessLastExpressionVariableName(cell.document.getText()) ?? 'Cell HTML table';
            log.appendLine(`[resolve] parsed text/html rows=${parsed.length}`);
            return { title: label, rows: parsed };
          }
        }
        if (mime === 'text/plain') {
          const text = new TextDecoder().decode(item.data);
          const parsed = parsePlainTextTable(text);
          if (parsed) {
            const label = guessLastExpressionVariableName(cell.document.getText()) ?? 'Cell output';
            log.appendLine(`[resolve] parsed text/plain rows=${parsed.length}`);
            return { title: label, rows: parsed };
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return undefined;
}

function toRowsFromDataResource(resource: any): unknown[][] | undefined {
  const fields: string[] = resource?.schema?.fields?.map((f: any) => f?.name) ?? [];
  const data: any[] = resource?.data ?? [];
  if (fields.length === 0 || data.length === 0) return undefined;
  const header = fields;
  const body = data.map(row => header.map(h => row[h]));
  return normalizeRowsRemoveIndex([header, ...body]);
}

function parsePlainTextTable(text: string): unknown[][] | undefined {
  // Naive Pandas text repr parsing; prefer HTML/JSON. Only use top rows (head) and ignore tail/ellipsis.
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.filter(l => l.trim().length > 0);
  if (lines.length < 2) return undefined;
  const header = lines[0].split(/\s{2,}|\t|,\s?/);
  if (header.length < 2) return undefined;
  const dataLines: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\.{3,}\s*$/.test(line) || line.includes('…')) break; // stop at ellipsis
    dataLines.push(line);
    if (dataLines.length >= 2000) break; // guardrail
  }
  const rows = dataLines.map(l => l.split(/\s{2,}|\t|,\s?/).slice(0, header.length));
  return normalizeRowsRemoveIndex([header, ...rows]);
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
    return normalizeRowsRemoveIndex([header, rows[0]]);
  }
  return normalizeRowsRemoveIndex(rows);
}

function guessLastExpressionVariableName(source: string): string | undefined {
  // Inspect the last non-empty line. If it is a simple identifier or attribute access or call on an identifier,
  // return the base identifier name. This is a best-effort guess for labeling.
  const lines = source.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return undefined;
  const last = lines[lines.length - 1];
  // Patterns: identifier; identifier.head(...); display(identifier); identifier.to_string();
  const identMatch = last.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:[#].*)?$/);
  if (identMatch) return identMatch[1];
  const funcOnIdent = last.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\./);
  if (funcOnIdent) return funcOnIdent[1];
  const displayCall = last.match(/\((\s*[A-Za-z_][A-Za-z0-9_]*\s*)\)\s*$/);
  if (displayCall) return displayCall[1].trim();
  return undefined;
}

function normalizeRowsRemoveIndex(rows: unknown[][]): unknown[][] {
  if (rows.length === 0) return rows;
  const [header, ...body] = rows;
  if (header.length === 0) return rows;
  const firstHeader = String(header[0] ?? '').toLowerCase();
  const looksLikeIndexHeader = firstHeader === '' || firstHeader === 'index' || firstHeader.startsWith('unnamed');
  const sample = body.slice(0, Math.min(10, body.length)).map(r => r?.[0]);
  const numeric = sample.every(v => v !== undefined && /^-?\d+$/.test(String(v)));
  // Check monotonic increasing by 1 when numeric
  let monotonic = true;
  if (numeric && sample.length >= 2) {
    for (let i = 1; i < sample.length; i++) {
      const prev = Number(sample[i - 1]);
      const cur = Number(sample[i]);
      if (!Number.isFinite(prev) || !Number.isFinite(cur) || cur !== prev + 1) { monotonic = false; break; }
    }
  } else {
    monotonic = false;
  }
  if (looksLikeIndexHeader && monotonic) {
    const newHeader = header.slice(1);
    const newBody = body.map(r => r.slice(1));
    return [newHeader, ...newBody];
  }
  return rows;
}
