"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.warning = warning;
exports.info = info;
exports.debug = debug;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.truncate = truncate;
exports.parseId = parseId;
exports.validateRequired = validateRequired;
exports.isValidEmail = isValidEmail;
const chalk_1 = __importDefault(require("chalk"));
function success(message) {
    console.log(chalk_1.default.green('✓'), message);
}
function error(message) {
    console.error(chalk_1.default.red('✗'), message);
}
function warning(message) {
    console.log(chalk_1.default.yellow('⚠'), message);
}
function info(message) {
    console.log(chalk_1.default.blue('ℹ'), message);
}
function debug(obj) {
    if (process.env.DEBUG) {
        console.log(chalk_1.default.gray('DEBUG:'), obj);
    }
}
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function truncate(str, maxLength) {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}
function parseId(id) {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid ID: "${id}". Must be a number.`);
    }
    return parsed;
}
function validateRequired(value, name) {
    if (value === undefined || value === null || value === '') {
        throw new Error(`${name} is required`);
    }
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
//# sourceMappingURL=utils.js.map