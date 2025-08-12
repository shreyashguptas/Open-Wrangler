declare const bootstrap: { title: string; rows: unknown[][]; rowCount?: number; colCount?: number };

const root = document.getElementById('app')!;
const header = bootstrap.rows[0] || [];
const rawBody = bootstrap.rows.slice(1);
let body = rawBody.slice();
let dataRows = body.length;
const reportedRows = Number.isFinite(Number(bootstrap.rowCount)) ? Number(bootstrap.rowCount) : dataRows;
const totalCols = Number.isFinite(Number(bootstrap.colCount)) ? Number(bootstrap.colCount) : header.length;
let pageSize = 10;
let pageIndex = 0;
let sortCol: number = -1;
let sortDir: 'asc' | 'desc' | null = null;

function el(tag: string, attrs: Record<string, string> = {}, ...children: Array<Node | string>) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
  for (const c of children) n.append(c as any);
  return n;
}

function renderHeader() {
  return el('div', { class: 'header' },
    el('span', { class: 'title' }, `Open "${bootstrap.title}" in Open‑Wrangler`),
    el('span', { class: 'meta' }, `${reportedRows} rows × ${totalCols} cols`)
  );
}

function renderTable() {
  const start = pageIndex * pageSize;
  const end = Math.min(start + pageSize, dataRows);
  const pageRows = body.slice(start, end);
  const thead = el('thead');
  const thr = el('tr');
  header.forEach((h: any, i: number) => {
    const isSorted = i === sortCol && !!sortDir;
    const labelText = isSorted ? `${h} ${sortDir === 'asc' ? '▲' : '▼'}` : String(h);
    const th = el('th', { 'data-col': String(i) });
    const btn = el('button', { class: 'th-menu-button', title: 'Column options' }, '⋯');
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); openMenuFor(th as HTMLTableCellElement, i); });
    th.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openMenuFor(th as HTMLTableCellElement, i); });
    const label = el('span', { class: 'th-label' }, labelText);
    if (isSorted) (label as HTMLElement).classList.add('th-sorted');
    th.append(el('div', { class: 'th-container' }, label, btn));
    thr.append(th);
  });
  thead.append(thr);
  const tbody = el('tbody');
  pageRows.forEach(r => {
    const tr = el('tr');
    (r as unknown[]).forEach(v => tr.append(el('td', {}, v === undefined ? '' : String(v))));
    tbody.append(tr);
  });
  const table = el('table', {}, thead, tbody);
  return el('div', { class: 'grid' }, table);
}

function renderPager() {
  const totalPages = Math.max(1, Math.ceil(dataRows / pageSize));
  const info = el('span', {}, `Page ${pageIndex + 1} of ${totalPages}`);
  const prev = el('button', { id: 'prev', disabled: pageIndex === 0 ? 'true' : '' }, '‹');
  const next = el('button', { id: 'next', disabled: pageIndex + 1 >= totalPages ? 'true' : '' }, '›');
  const size = el('select', { id: 'size' },
    el('option', { value: '10', selected: pageSize === 10 ? 'true' : '' }, '10'),
    el('option', { value: '25', selected: pageSize === 25 ? 'true' : '' }, '25'),
    el('option', { value: '50', selected: pageSize === 50 ? 'true' : '' }, '50')
  );
  const label = el('span', {}, 'per page');
  const pager = el('div', { class: 'pager' }, prev, next, info, size, label);
  (prev as HTMLButtonElement).onclick = () => { if (pageIndex > 0) { pageIndex--; update(); } };
  (next as HTMLButtonElement).onclick = () => { const t = Math.ceil(dataRows / pageSize); if (pageIndex + 1 < t) { pageIndex++; update(); } };
  (size as HTMLSelectElement).onchange = () => { pageSize = parseInt((size as HTMLSelectElement).value, 10); pageIndex = 0; update(); };
  return pager;
}

function openMenuFor(thEl: HTMLElement, colIndex: number) {
  const rect = thEl.getBoundingClientRect();
  const x = rect.right - 8; const y = rect.bottom + 4;
  showMenuAt(x, y, colIndex);
}

function showMenuAt(x: number, y: number, colIndex: number) {
  hideMenu();
  const menu = el('div', { class: 'ow-menu', id: 'ow-menu' });
  const isSortedAsc = sortCol === colIndex && sortDir === 'asc';
  const isSortedDesc = sortCol === colIndex && sortDir === 'desc';
  const asc = el('div', { class: 'item' }, isSortedAsc ? '✓ Sort ascending' : 'Sort ascending');
  const desc = el('div', { class: 'item' }, isSortedDesc ? '✓ Sort descending' : 'Sort descending');
  const clear = el('div', { class: 'item' }, 'Clear sort');
  (asc as HTMLElement).onclick = () => { sortBy(colIndex, 'asc'); };
  (desc as HTMLElement).onclick = () => { sortBy(colIndex, 'desc'); };
  (clear as HTMLElement).onclick = () => { clearSort(); };
  (menu as HTMLElement).style.left = x + 'px';
  (menu as HTMLElement).style.top = y + 'px';
  menu.append(asc, desc, clear);
  document.body.append(menu);
  const dismiss = (ev: MouseEvent) => {
    const m = document.getElementById('ow-menu');
    if (!m) return;
    if (!m.contains(ev.target as Node)) hideMenu();
  };
  setTimeout(() => {
    document.addEventListener('click', dismiss);
    document.addEventListener('contextmenu', dismiss);
    document.addEventListener('scroll', hideMenu, { capture: true } as any);
    window.addEventListener('resize', hideMenu);
  }, 0);
}

function hideMenu() {
  const existing = document.getElementById('ow-menu');
  if (existing) existing.remove();
  document.removeEventListener('scroll', hideMenu as any, { capture: true } as any);
  window.removeEventListener('resize', hideMenu);
}

function sortBy(colIndex: number, direction: 'asc' | 'desc') {
  sortCol = colIndex; sortDir = direction;
  const numeric = isColumnNumeric(colIndex); const factor = direction === 'asc' ? 1 : -1;
  body = rawBody.slice().sort((a, b) => compareValues((a as any)[colIndex], (b as any)[colIndex], numeric) * factor);
  dataRows = body.length; pageIndex = 0; hideMenu(); update();
}

function clearSort() {
  sortCol = -1; sortDir = null; body = rawBody.slice(); dataRows = body.length; pageIndex = 0; hideMenu(); update();
}

function isColumnNumeric(colIndex: number) {
  const sample = rawBody.slice(0, Math.min(100, rawBody.length)).map(r => (r as any)[colIndex]);
  return sample.every(v => v === null || v === '' || v === undefined || !Number.isNaN(Number(v)));
}

function compareValues(a: any, b: any, numeric: boolean) {
  const aMissing = a === undefined || a === null || a === '';
  const bMissing = b === undefined || b === null || b === '';
  if (aMissing && bMissing) return 0; if (aMissing) return 1; if (bMissing) return -1;
  if (numeric) { const na = Number(a); const nb = Number(b); if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0; if (!Number.isFinite(na)) return 1; if (!Number.isFinite(nb)) return -1; return na - nb; }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function update() { root.replaceChildren(renderHeader(), renderTable(), renderPager()); }
update();


