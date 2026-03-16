"use strict";
/**
 * Confirmation code store for destructive operations
 * Codes expire after 60 seconds and are persisted to disk
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfirmationCode = generateConfirmationCode;
exports.storeConfirmationCode = storeConfirmationCode;
exports.verifyConfirmationCode = verifyConfirmationCode;
exports.clearConfirmationCode = clearConfirmationCode;
exports.getConfirmationTimeRemaining = getConfirmationTimeRemaining;
const config_js_1 = require("./config.js");
const CODE_EXPIRY_MS = 60 * 1000; // 60 seconds
/**
 * Generate a random 6-digit confirmation code
 */
function generateConfirmationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Store a confirmation code for a tournament
 * Returns the generated code (or the provided code if given)
 */
async function storeConfirmationCode(tournamentId, code) {
    const session = await (0, config_js_1.loadSession)();
    // Initialize confirmationCodes if needed
    if (!session.confirmationCodes) {
        session.confirmationCodes = {};
    }
    // Clean up expired codes
    await cleanupExpiredCodes(session);
    const finalCode = code || generateConfirmationCode();
    const now = Date.now();
    session.confirmationCodes[tournamentId] = {
        code: finalCode,
        createdAt: now,
        expiresAt: now + CODE_EXPIRY_MS
    };
    await (0, config_js_1.saveSession)(session);
    return finalCode;
}
/**
 * Verify a confirmation code for a tournament
 * Returns true if valid, false otherwise
 */
async function verifyConfirmationCode(tournamentId, code) {
    const session = await (0, config_js_1.loadSession)();
    if (!session.confirmationCodes) {
        return false;
    }
    await cleanupExpiredCodes(session);
    const entry = session.confirmationCodes[tournamentId];
    if (!entry) {
        return false;
    }
    if (Date.now() > entry.expiresAt) {
        delete session.confirmationCodes[tournamentId];
        await (0, config_js_1.saveSession)(session);
        return false;
    }
    return entry.code === code;
}
/**
 * Clear a confirmation code for a tournament
 */
async function clearConfirmationCode(tournamentId) {
    const session = await (0, config_js_1.loadSession)();
    if (session.confirmationCodes) {
        delete session.confirmationCodes[tournamentId];
        await (0, config_js_1.saveSession)(session);
    }
}
/**
 * Clean up all expired confirmation codes
 */
async function cleanupExpiredCodes(session) {
    if (!session.confirmationCodes) {
        return;
    }
    const now = Date.now();
    let hasExpired = false;
    for (const [tournamentId, entry] of Object.entries(session.confirmationCodes)) {
        if (now > entry.expiresAt) {
            delete session.confirmationCodes[tournamentId];
            hasExpired = true;
        }
    }
    if (hasExpired) {
        await (0, config_js_1.saveSession)(session);
    }
}
/**
 * Get time remaining for a confirmation code in seconds
 * Returns 0 if code doesn't exist or is expired
 */
async function getConfirmationTimeRemaining(tournamentId) {
    const session = await (0, config_js_1.loadSession)();
    if (!session.confirmationCodes) {
        return 0;
    }
    await cleanupExpiredCodes(session);
    const entry = session.confirmationCodes[tournamentId];
    if (!entry) {
        return 0;
    }
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining);
}
//# sourceMappingURL=confirmation-codes.js.map