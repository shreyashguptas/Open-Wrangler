"use strict";
(() => {
  // webview-src/previewApp.ts
  var root = document.getElementById("app");
  var header = bootstrap.rows[0] || [];
  var rawBody = bootstrap.rows.slice(1);
  var body = rawBody.slice();
  var dataRows = body.length;
  var reportedRows = Number.isFinite(Number(bootstrap.rowCount)) ? Number(bootstrap.rowCount) : dataRows;
  var totalCols = Number.isFinite(Number(bootstrap.colCount)) ? Number(bootstrap.colCount) : header.length;
  var pageSize = 10;
  var pageIndex = 0;
  var sortCol = -1;
  var sortDir = null;
  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    for (const c of children) n.append(c);
    return n;
  }
  function renderHeader() {
    return el(
      "div",
      { class: "header" },
      el("span", { class: "title" }, `Open "${bootstrap.title}" in Open\u2011Wrangler`),
      el("span", { class: "meta" }, `${reportedRows} rows \xD7 ${totalCols} cols`)
    );
  }
  function renderTable() {
    const start = pageIndex * pageSize;
    const end = Math.min(start + pageSize, dataRows);
    const pageRows = body.slice(start, end);
    const thead = el("thead");
    const thr = el("tr");
    header.forEach((h, i) => {
      const isSorted = i === sortCol && !!sortDir;
      const labelText = isSorted ? `${h} ${sortDir === "asc" ? "\u25B2" : "\u25BC"}` : String(h);
      const th = el("th", { "data-col": String(i) });
      const btn = el("button", { class: "th-menu-button", title: "Column options" }, "\u22EF");
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openMenuFor(th, i);
      });
      th.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        openMenuFor(th, i);
      });
      const label = el("span", { class: "th-label" }, labelText);
      if (isSorted) label.classList.add("th-sorted");
      th.append(el("div", { class: "th-container" }, label, btn));
      thr.append(th);
    });
    thead.append(thr);
    const tbody = el("tbody");
    pageRows.forEach((r) => {
      const tr = el("tr");
      r.forEach((v) => tr.append(el("td", {}, v === void 0 ? "" : String(v))));
      tbody.append(tr);
    });
    const table = el("table", {}, thead, tbody);
    return el("div", { class: "grid" }, table);
  }
  function renderPager() {
    const totalPages = Math.max(1, Math.ceil(dataRows / pageSize));
    const info = el("span", {}, `Page ${pageIndex + 1} of ${totalPages}`);
    const prev = el("button", { id: "prev", disabled: pageIndex === 0 ? "true" : "" }, "\u2039");
    const next = el("button", { id: "next", disabled: pageIndex + 1 >= totalPages ? "true" : "" }, "\u203A");
    const size = el(
      "select",
      { id: "size" },
      el("option", { value: "10", selected: pageSize === 10 ? "true" : "" }, "10"),
      el("option", { value: "25", selected: pageSize === 25 ? "true" : "" }, "25"),
      el("option", { value: "50", selected: pageSize === 50 ? "true" : "" }, "50")
    );
    const label = el("span", {}, "per page");
    const pager = el("div", { class: "pager" }, prev, next, info, size, label);
    prev.onclick = () => {
      if (pageIndex > 0) {
        pageIndex--;
        update();
      }
    };
    next.onclick = () => {
      const t = Math.ceil(dataRows / pageSize);
      if (pageIndex + 1 < t) {
        pageIndex++;
        update();
      }
    };
    size.onchange = () => {
      pageSize = parseInt(size.value, 10);
      pageIndex = 0;
      update();
    };
    return pager;
  }
  function openMenuFor(thEl, colIndex) {
    const rect = thEl.getBoundingClientRect();
    const x = rect.right - 8;
    const y = rect.bottom + 4;
    showMenuAt(x, y, colIndex);
  }
  function showMenuAt(x, y, colIndex) {
    hideMenu();
    const menu = el("div", { class: "ow-menu", id: "ow-menu" });
    const isSortedAsc = sortCol === colIndex && sortDir === "asc";
    const isSortedDesc = sortCol === colIndex && sortDir === "desc";
    const asc = el("div", { class: "item" }, isSortedAsc ? "\u2713 Sort ascending" : "Sort ascending");
    const desc = el("div", { class: "item" }, isSortedDesc ? "\u2713 Sort descending" : "Sort descending");
    const clear = el("div", { class: "item" }, "Clear sort");
    asc.onclick = () => {
      sortBy(colIndex, "asc");
    };
    desc.onclick = () => {
      sortBy(colIndex, "desc");
    };
    clear.onclick = () => {
      clearSort();
    };
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.append(asc, desc, clear);
    document.body.append(menu);
    const dismiss = (ev) => {
      const m = document.getElementById("ow-menu");
      if (!m) return;
      if (!m.contains(ev.target)) hideMenu();
    };
    setTimeout(() => {
      document.addEventListener("click", dismiss);
      document.addEventListener("contextmenu", dismiss);
      document.addEventListener("scroll", hideMenu, { capture: true });
      window.addEventListener("resize", hideMenu);
    }, 0);
  }
  function hideMenu() {
    const existing = document.getElementById("ow-menu");
    if (existing) existing.remove();
    document.removeEventListener("scroll", hideMenu, { capture: true });
    window.removeEventListener("resize", hideMenu);
  }
  function sortBy(colIndex, direction) {
    sortCol = colIndex;
    sortDir = direction;
    const numeric = isColumnNumeric(colIndex);
    const factor = direction === "asc" ? 1 : -1;
    body = rawBody.slice().sort((a, b) => compareValues(a[colIndex], b[colIndex], numeric) * factor);
    dataRows = body.length;
    pageIndex = 0;
    hideMenu();
    update();
  }
  function clearSort() {
    sortCol = -1;
    sortDir = null;
    body = rawBody.slice();
    dataRows = body.length;
    pageIndex = 0;
    hideMenu();
    update();
  }
  function isColumnNumeric(colIndex) {
    const sample = rawBody.slice(0, Math.min(100, rawBody.length)).map((r) => r[colIndex]);
    return sample.every((v) => v === null || v === "" || v === void 0 || !Number.isNaN(Number(v)));
  }
  function compareValues(a, b, numeric) {
    const aMissing = a === void 0 || a === null || a === "";
    const bMissing = b === void 0 || b === null || b === "";
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (numeric) {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0;
      if (!Number.isFinite(na)) return 1;
      if (!Number.isFinite(nb)) return -1;
      return na - nb;
    }
    return String(a).localeCompare(String(b), void 0, { numeric: true, sensitivity: "base" });
  }
  function update() {
    root.replaceChildren(renderHeader(), renderTable(), renderPager());
  }
  update();
})();
//# sourceMappingURL=preview.js.map
