"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const activate_1 = require("./activation/activate");
function activate(context) {
    (0, activate_1.activate)(context);
}
function deactivate() {
    (0, activate_1.deactivate)();
}
//# sourceMappingURL=extension.js.map