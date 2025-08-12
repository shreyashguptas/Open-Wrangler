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
exports.resolveActiveCellTable = resolveActiveCellTable;
const vscode = __importStar(require("vscode"));
const logging_1 = require("../../utils/logging");
const outputParsing_1 = require("../../parsing/outputParsing");
async function resolveActiveCellTable() {
    const editor = vscode.window.activeNotebookEditor;
    if (!editor) {
        (0, logging_1.info)('[resolve] no activeNotebookEditor');
        return undefined;
    }
    const cellIndex = editor.selections?.length ? editor.selections[0].start : editor.selection?.start ?? 0;
    const cell = editor.notebook.cellAt(cellIndex);
    if (!cell) {
        (0, logging_1.info)('[resolve] no active cell');
        return undefined;
    }
    for (const out of cell.outputs ?? []) {
        for (const item of out.items ?? []) {
            const mime = item.mime;
            (0, logging_1.info)(`[resolve] inspecting mime=${mime}`);
            try {
                if (mime === 'application/vnd.dataresource+json') {
                    const json = JSON.parse(new TextDecoder().decode(item.data));
                    const parsed = (0, outputParsing_1.toRowsFromDataResource)(json);
                    if (parsed) {
                        const label = json?.schema?.name || guessLastExpressionVariableName(cell.document.getText()) || 'Data';
                        (0, logging_1.info)(`[resolve] parsed dataresource rows=${parsed.rows.length} counts rowCount=${parsed.rowCount ?? 'n/a'} colCount=${parsed.colCount ?? 'n/a'}`);
                        return { title: label, rows: parsed.rows, rowCount: parsed.rowCount, colCount: parsed.colCount };
                    }
                }
                if (mime === 'text/html') {
                    const html = new TextDecoder().decode(item.data);
                    const parsed = (0, outputParsing_1.parseHtmlTable)(html);
                    if (parsed) {
                        const label = guessLastExpressionVariableName(cell.document.getText()) ?? 'Cell HTML table';
                        (0, logging_1.info)(`[resolve] parsed text/html rows=${parsed.rows.length} counts rowCount=${parsed.rowCount ?? 'n/a'} colCount=${parsed.colCount ?? 'n/a'}`);
                        return { title: label, rows: parsed.rows, rowCount: parsed.rowCount, colCount: parsed.colCount };
                    }
                }
                if (mime === 'text/plain') {
                    const text = new TextDecoder().decode(item.data);
                    const parsed = (0, outputParsing_1.parsePlainTextTable)(text);
                    if (parsed) {
                        const label = guessLastExpressionVariableName(cell.document.getText()) ?? 'Cell output';
                        (0, logging_1.info)(`[resolve] parsed text/plain rows=${parsed.rows.length} counts rowCount=${parsed.rowCount ?? 'n/a'} colCount=${parsed.colCount ?? 'n/a'}`);
                        return { title: label, rows: parsed.rows, rowCount: parsed.rowCount, colCount: parsed.colCount };
                    }
                }
            }
            catch {
                // ignore parse errors
            }
        }
    }
    return undefined;
}
function guessLastExpressionVariableName(source) {
    const lines = source.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0)
        return undefined;
    const last = lines[lines.length - 1];
    const identMatch = last.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:[#].*)?$/);
    if (identMatch)
        return identMatch[1];
    const funcOnIdent = last.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\./);
    if (funcOnIdent)
        return funcOnIdent[1];
    const displayCall = last.match(/\((\s*[A-Za-z_][A-Za-z0-9_]*\s*)\)\s*$/);
    if (displayCall)
        return displayCall[1].trim();
    return undefined;
}
//# sourceMappingURL=resolveActiveCellTable.js.map