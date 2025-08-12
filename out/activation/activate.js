"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const registerCommands_1 = require("./registerCommands");
const registerStatusBar_1 = require("./registerStatusBar");
function activate(context) {
    (0, registerCommands_1.registerCommands)(context);
    (0, registerStatusBar_1.registerStatusBar)(context);
}
function deactivate() { }
//# sourceMappingURL=activate.js.map