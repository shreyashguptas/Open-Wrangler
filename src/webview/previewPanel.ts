import * as vscode from 'vscode';
import { info } from '../utils/logging';

export function createPreviewPanel(
  title: string,
  rows: unknown[][],
  rowCount?: number,
  colCount?: number
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'openWranglerPreview',
    `Open "${title}" in Open‑Wrangler`,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const styles = getInlineStyles();
  const script = getInlineScript();
  const payload = JSON.stringify({ title, rows, rowCount, colCount });
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

  info(`[webview] opened preview for title="${title}" rows=${rows.length} reportedRowCount=${rowCount ?? 'n/a'} reportedColCount=${colCount ?? 'n/a'}`);
  return panel;
}

function getInlineStyles(): string {
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
  select { background: #2a2a2a; color: #e7e7e7; border: 1px solid #444; padding: 2px 6px; }
  .ow-menu { position: fixed; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; min-width: 160px; box-shadow: 0 6px 18px rgba(0,0,0,0.45); z-index: 1000; }
  .ow-menu .item { padding: 6px 10px; cursor: pointer; }
  .ow-menu .item:hover { background: #3a3a3a; }
  .th-sorted { color: var(--accent); }
  .th-container { display: flex; align-items: center; gap: 6px; }
  .th-label { flex: 1; }
  .th-menu-button { visibility: hidden; background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 0 4px; border-radius: 3px; }
  th:hover .th-menu-button { visibility: visible; }
  .th-menu-button:hover { background: #3a3a3a; color: var(--fg); }
  `;
}

function getInlineScript(): string {
  return `
  const root = document.getElementById('app');
  const header = bootstrap.rows[0] || [];
  const rawBody = bootstrap.rows.slice(1);
  let body = rawBody.slice();
  let dataRows = body.length;
  const reportedRows = Number.isFinite(Number(bootstrap.rowCount)) ? Number(bootstrap.rowCount) : dataRows;
  const totalCols = Number.isFinite(Number(bootstrap.colCount)) ? Number(bootstrap.colCount) : header.length;
  let pageSize = 10;
  let pageIndex = 0;
  let sortCol = -1;
  let sortDir = null;

  function el(tag, attrs = {}, ...children) { const n = document.createElement(tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k, String(v))); for (const c of children) n.append(c); return n; }

  function renderHeader() { return el('div', { class: 'header' }, el('span', { class: 'title' }, 'Open "' + bootstrap.title + '" in Open‑Wrangler'), el('span', { class: 'meta' }, reportedRows + ' rows × ' + totalCols + ' cols')); }

  function renderTable() {
    const start = pageIndex * pageSize; const end = Math.min(start + pageSize, dataRows); const pageRows = body.slice(start, end);
    const thead = el('thead'); const thr = el('tr');
    header.forEach((h, i) => { const isSorted = i === sortCol && !!sortDir; const labelText = isSorted ? (h + ' ' + (sortDir === 'asc' ? '▲' : '▼')) : h; const th = el('th', { 'data-col': String(i) }); const btn = el('button', { class: 'th-menu-button', title: 'Column options' }, '⋯'); btn.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); openMenuFor(th, i); }; th.oncontextmenu = (ev) => { ev.preventDefault(); openMenuFor(th, i); }; const label = el('span', { class: 'th-label' }, labelText); if (isSorted) label.classList.add('th-sorted'); th.append(el('div', { class: 'th-container' }, label, btn)); thr.append(th); });
    thead.append(thr);
    const tbody = el('tbody'); pageRows.forEach(r => { const tr = el('tr'); r.forEach(v => tr.append(el('td', {}, v === undefined ? '' : String(v)))); tbody.append(tr); });
    const table = el('table', {}, thead, tbody); return el('div', { class: 'grid' }, table);
  }

  function renderPager() { const totalPages = Math.max(1, Math.ceil(dataRows / pageSize)); const info = el('span', {}, 'Page ' + (pageIndex + 1) + ' of ' + totalPages); const prev = el('button', { id: 'prev', disabled: pageIndex === 0 ? 'true' : '' }, '‹'); const next = el('button', { id: 'next', disabled: pageIndex + 1 >= totalPages ? 'true' : '' }, '›'); const size = el('select', { id: 'size' }, el('option', { value: '10', selected: pageSize===10 ? 'true' : '' }, '10'), el('option', { value: '25', selected: pageSize===25 ? 'true' : '' }, '25'), el('option', { value: '50', selected: pageSize===50 ? 'true' : '' }, '50')); const label = el('span', {}, 'per page'); const pager = el('div', { class: 'pager' }, prev, next, info, size, label); prev.onclick = () => { if (pageIndex > 0) { pageIndex--; update(); } }; next.onclick = () => { const t = Math.ceil(dataRows / pageSize); if (pageIndex + 1 < t) { pageIndex++; update(); } }; size.onchange = () => { pageSize = parseInt(size.value, 10); pageIndex = 0; update(); }; return pager; }

  function openMenuFor(thEl, colIndex) { const rect = thEl.getBoundingClientRect(); const x = rect.right - 8; const y = rect.bottom + 4; showMenuAt(x, y, colIndex); }

  function showMenuAt(x, y, colIndex) { hideMenu(); const menu = el('div', { class: 'ow-menu', id: 'ow-menu' }); const isSortedAsc = sortCol === colIndex && sortDir === 'asc'; const isSortedDesc = sortCol === colIndex && sortDir === 'desc'; const asc = el('div', { class: 'item' }, isSortedAsc ? '✓ Sort ascending' : 'Sort ascending'); const desc = el('div', { class: 'item' }, isSortedDesc ? '✓ Sort descending' : 'Sort descending'); const clear = el('div', { class: 'item' }, 'Clear sort'); asc.onclick = () => { sortBy(colIndex, 'asc'); }; desc.onclick = () => { sortBy(colIndex, 'desc'); }; clear.onclick = () => { clearSort(); }; menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.append(asc, desc, clear); document.body.append(menu); const dismiss = (ev) => { const m = document.getElementById('ow-menu'); if (!m) return; if (!m.contains(ev.target)) hideMenu(); }; setTimeout(() => { document.addEventListener('click', dismiss); document.addEventListener('contextmenu', dismiss); document.addEventListener('scroll', hideMenu, { capture: true }); window.addEventListener('resize', hideMenu); }, 0); }

  function hideMenu() { const existing = document.getElementById('ow-menu'); if (existing) existing.remove(); document.removeEventListener('scroll', hideMenu, { capture: true }); window.removeEventListener('resize', hideMenu); }

  function sortBy(colIndex, direction) { sortCol = colIndex; sortDir = direction; const numeric = isColumnNumeric(colIndex); const factor = direction === 'asc' ? 1 : -1; body = rawBody.slice().sort((a, b) => compareValues(a[colIndex], b[colIndex], numeric) * factor); dataRows = body.length; pageIndex = 0; hideMenu(); update(); }

  function clearSort() { sortCol = -1; sortDir = null; body = rawBody.slice(); dataRows = body.length; pageIndex = 0; hideMenu(); update(); }

  function isColumnNumeric(colIndex) { const sample = rawBody.slice(0, Math.min(100, rawBody.length)).map(r => r[colIndex]); return sample.every(v => v === null || v === '' || v === undefined || !Number.isNaN(Number(v))); }

  function compareValues(a, b, numeric) { const aMissing = a === undefined || a === null || a === ''; const bMissing = b === undefined || b === null || b === ''; if (aMissing && bMissing) return 0; if (aMissing) return 1; if (bMissing) return -1; if (numeric) { const na = Number(a); const nb = Number(b); if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0; if (!Number.isFinite(na)) return 1; if (!Number.isFinite(nb)) return -1; return na - nb; } return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); }

  function update() { root.replaceChildren(renderHeader(), renderTable(), renderPager()); }
  update();
  `;
}


