"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    // Command used by the cell status bar button
    context.subscriptions.push(vscode.commands.registerCommand('open-wrangler.openFromCell', async () => {
        const table = await resolveActiveCellTable();
        if (!table) {
            vscode.window.showInformationMessage('No DataFrame-like output found in the active cell.');
            return;
        }
        await openTableEditor(table.title, table.rows);
    }));
    // Show a status bar action under notebook cells to open in Open‑Wrangler
    context.subscriptions.push(vscode.notebooks.registerNotebookCellStatusBarItemProvider('jupyter-notebook', {
        provideCellStatusBarItems(cell) {
            // Show the button when the cell has any output; refine this later to detect DataFrame
            if ((cell.outputs?.length ?? 0) === 0)
                return [];
            const item = new vscode.NotebookCellStatusBarItem('Open in Open‑Wrangler', vscode.NotebookCellStatusBarAlignment.Left);
            item.command = 'open-wrangler.openFromCell';
            item.tooltip = 'Open this cell output in Open‑Wrangler';
            return [item];
        }
    }));
}
function deactivate() { }
async function openTableEditor(title, previewRows) {
    const doc = await vscode.workspace.openTextDocument({
        content: renderTable(previewRows),
        language: 'markdown'
    });
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
}
function renderTable(rows) {
    if (rows.length === 0)
        return 'Empty table';
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
async function resolveActiveCellTable() {
    const editor = vscode.window.activeNotebookEditor;
    if (!editor)
        return undefined;
    const cellIndex = editor.selections?.length ? editor.selections[0].start : editor.selection?.start ?? 0;
    const cell = editor.notebook.cellAt(cellIndex);
    if (!cell)
        return undefined;
    // Basic heuristics: inspect cell outputs for text table or HTML table, and take a small head()
    for (const out of cell.outputs ?? []) {
        for (const item of out.items ?? []) {
            const mime = item.mime;
            try {
                if (mime === 'text/plain') {
                    const text = new TextDecoder().decode(item.data);
                    const parsed = parsePlainTextTable(text);
                    if (parsed)
                        return { title: 'Cell output', rows: parsed };
                }
                if (mime === 'text/html') {
                    const html = new TextDecoder().decode(item.data);
                    const parsed = parseHtmlTable(html);
                    if (parsed)
                        return { title: 'Cell HTML table', rows: parsed };
                }
                if (mime === 'application/vnd.dataresource+json') {
                    const json = JSON.parse(new TextDecoder().decode(item.data));
                    const rows = toRowsFromDataResource(json, 50);
                    if (rows)
                        return { title: json?.schema?.name ?? 'Data', rows };
                }
            }
            catch {
                // ignore parse errors
            }
        }
    }
    return undefined;
}
function toRowsFromDataResource(resource, limit) {
    const fields = resource?.schema?.fields?.map((f) => f?.name) ?? [];
    const data = resource?.data ?? [];
    if (fields.length === 0 || data.length === 0)
        return undefined;
    const header = fields;
    const body = data.slice(0, limit).map(row => header.map(h => row[h]));
    return [header, ...body];
}
function parsePlainTextTable(text) {
    // Very naive parsing for Pandas text repr (fallback). Improve later.
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2)
        return undefined;
    // Heuristic: if it looks like CSV-like header followed by rows
    const header = lines[0].split(/\s{2,}|\t|,\s?/);
    if (header.length < 2)
        return undefined;
    const rows = lines.slice(1, Math.min(lines.length, 51)).map(l => l.split(/\s{2,}|\t|,\s?/).slice(0, header.length));
    return [header, ...rows];
}
function parseHtmlTable(html) {
    // We cannot use DOM in extension host; do a minimal regex-based parse for <table><tr><td>... demo
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
    // Ensure header row exists
    if (rows.length === 1) {
        const header = rows[0].map((_, i) => `col${i + 1}`);
        return [header, rows[0]];
    }
    return rows.slice(0, 51);
}
//# sourceMappingURL=extension.js.map