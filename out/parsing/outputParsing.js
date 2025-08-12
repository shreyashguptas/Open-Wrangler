"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRowsFromDataResource = toRowsFromDataResource;
exports.parsePlainTextTable = parsePlainTextTable;
exports.parseHtmlTable = parseHtmlTable;
exports.parseCountsFromHtml = parseCountsFromHtml;
exports.normalizeRowsRemoveIndex = normalizeRowsRemoveIndex;
function toRowsFromDataResource(resource) {
    const fields = resource?.schema?.fields?.map((f) => f?.name) ?? [];
    const data = resource?.data ?? [];
    if (fields.length === 0 || data.length === 0)
        return undefined;
    const header = fields;
    const body = data.map(row => header.map(h => row[h]));
    const normalized = normalizeRowsRemoveIndex([header, ...body]);
    const providedRowCount = resource?.rowCount ?? resource?.count ?? resource?.schema?.dimensions?.rowCount;
    const providedColCount = resource?.colCount ?? resource?.schema?.dimensions?.columnCount ?? fields.length;
    return { rows: normalized, rowCount: providedRowCount, colCount: providedColCount };
}
function parsePlainTextTable(text) {
    const rawLines = text.split(/\r?\n/);
    const lines = rawLines.filter(l => l.trim().length > 0);
    if (lines.length < 2)
        return undefined;
    const header = lines[0].split(/\s{2,}|\t|,\s?/);
    if (header.length < 2)
        return undefined;
    const dataLines = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*\.{3,}\s*$/.test(line) || line.includes('…'))
            break;
        dataLines.push(line);
        if (dataLines.length >= 2000)
            break;
    }
    const rows = dataLines.map(l => l.split(/\s{2,}|\t|,\s?/).slice(0, header.length));
    let rowCount;
    let colCount;
    const summaryMatch = text.match(/\[\s*([0-9,]+)\s*rows?\s*[×x]\s*([0-9,]+)\s*columns?\s*\]/i);
    if (summaryMatch) {
        rowCount = Number(summaryMatch[1].replace(/,/g, ''));
        colCount = Number(summaryMatch[2].replace(/,/g, ''));
    }
    const normalized = normalizeRowsRemoveIndex([header, ...rows]);
    if (colCount !== undefined && normalized[0]?.length !== header.length) {
        const delta = header.length - (normalized[0]?.length ?? header.length);
        if (delta === 1)
            colCount = Math.max(0, colCount - 1);
    }
    return { rows: normalized, rowCount, colCount };
}
function parseHtmlTable(html) {
    const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
    if (!tableMatch)
        return undefined;
    const rowMatches = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const rows = [];
    for (const rm of rowMatches) {
        const cells = rm.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) ?? [];
        rows.push(cells.map(c => c.replace(/<[^>]+>/g, '').trim()));
    }
    if (rows.length === 0)
        return undefined;
    if (rows.length === 1) {
        const header = rows[0].map((_, i) => `col${i + 1}`);
        const normalizedSingle = normalizeRowsRemoveIndex([header, rows[0]]);
        const counts = parseCountsFromHtml(html);
        return { rows: normalizedSingle, rowCount: counts.rowCount, colCount: counts.colCount };
    }
    const normalized = normalizeRowsRemoveIndex(rows);
    const counts = parseCountsFromHtml(html);
    if (counts.colCount !== undefined && normalized[0]?.length < (rows[0]?.length ?? normalized[0]?.length)) {
        const delta = (rows[0]?.length ?? 0) - normalized[0].length;
        if (delta === 1)
            counts.colCount = Math.max(0, counts.colCount - 1);
    }
    return { rows: normalized, rowCount: counts.rowCount, colCount: counts.colCount };
}
function parseCountsFromHtml(html) {
    const match = html.match(/([0-9][0-9,]*)\s*rows?\s*[×x]\s*([0-9][0-9,]*)\s*(?:cols?|columns?)/i);
    if (!match)
        return {};
    return {
        rowCount: Number(match[1].replace(/,/g, '')),
        colCount: Number(match[2].replace(/,/g, ''))
    };
}
function normalizeRowsRemoveIndex(rows) {
    if (rows.length === 0)
        return rows;
    const [header, ...body] = rows;
    if (header.length === 0)
        return rows;
    const firstHeader = String(header[0] ?? '').toLowerCase();
    const looksLikeIndexHeader = firstHeader === '' || firstHeader === 'index' || firstHeader.startsWith('unnamed');
    const sample = body.slice(0, Math.min(10, body.length)).map(r => r?.[0]);
    const numeric = sample.every(v => v !== undefined && /^-?\d+$/.test(String(v)));
    let monotonic = true;
    if (numeric && sample.length >= 2) {
        for (let i = 1; i < sample.length; i++) {
            const prev = Number(sample[i - 1]);
            const cur = Number(sample[i]);
            if (!Number.isFinite(prev) || !Number.isFinite(cur) || cur !== prev + 1) {
                monotonic = false;
                break;
            }
        }
    }
    else {
        monotonic = false;
    }
    if (looksLikeIndexHeader && monotonic) {
        const newHeader = header.slice(1);
        const newBody = body.map(r => r.slice(1));
        return [newHeader, ...newBody];
    }
    return rows;
}
//# sourceMappingURL=outputParsing.js.map