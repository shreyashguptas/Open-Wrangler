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
exports.registerStatusBar = registerStatusBar;
const vscode = __importStar(require("vscode"));
const variableGuess_1 = require("../utils/variableGuess");
function registerStatusBar(context) {
    context.subscriptions.push(vscode.notebooks.registerNotebookCellStatusBarItemProvider('jupyter-notebook', {
        provideCellStatusBarItems(cell) {
            if ((cell.outputs?.length ?? 0) === 0)
                return [];
            const guess = (0, variableGuess_1.guessLastExpressionVariableName)(cell.document.getText());
            const label = guess ? `Open "${guess}" in Open‑Wrangler` : 'Open in Open‑Wrangler';
            const item = new vscode.NotebookCellStatusBarItem(label, vscode.NotebookCellStatusBarAlignment.Left);
            item.command = 'open-wrangler.openFromCell';
            item.tooltip = 'Open this cell output in Open‑Wrangler';
            return [item];
        }
    }));
}
//# sourceMappingURL=registerStatusBar.js.map