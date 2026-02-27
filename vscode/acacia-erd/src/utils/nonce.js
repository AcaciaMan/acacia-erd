"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNonce = getNonce;
/**
 * Generates a random nonce string for Content Security Policy (CSP) in webview HTML.
 * Used to restrict inline script execution to only scripts with the matching nonce.
 * @returns A 32-character alphanumeric random string
 */
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=nonce.js.map