"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guessLastExpressionVariableName = guessLastExpressionVariableName;
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
//# sourceMappingURL=variableGuess.js.map