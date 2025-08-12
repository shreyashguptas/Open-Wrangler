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
    // Command primarily for manual testing
    context.subscriptions.push(vscode.commands.registerCommand('open-wrangler.open', async () => {
        await openTableEditor("Sample", [["col1", "col2"], ["a", "b"]]);
    }));
    // Command used by the cell status bar button
    context.subscriptions.push(vscode.commands.registerCommand('open-wrangler.openFromCell', async () => {
        const active = vscode.window.activeNotebookEditor;
        if (!active) {
            vscode.window.showInformationMessage('No active notebook.');
            return;
        }
        // For now, open a placeholder table view. Later, inspect cell output/variable.
        await openTableEditor("DataFrame", [["col", "value"], ["x", 1]]);
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
//# sourceMappingURL=extension.js.map