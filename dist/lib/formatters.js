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
exports.formatOutput = formatOutput;
const yaml = __importStar(require("js-yaml"));
function formatOutput(data, options) {
    switch (options.format) {
        case 'json':
            return formatJson(data);
        case 'yaml':
            return formatYaml(data);
        case 'csv':
            return formatCsv(data, options.headers);
        case 'table':
        default:
            return formatTable(data, options.headers);
    }
}
function formatJson(data) {
    return JSON.stringify(data, null, 2);
}
function formatYaml(data) {
    return yaml.dump(data);
}
function formatCsv(data, headers) {
    if (!data) {
        return '';
    }
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
            const cols = headers || Object.keys(firstItem);
            // Header row
            let csv = cols.join(',') + '\n';
            // Data rows
            for (const item of data) {
                const row = cols.map(col => {
                    const value = item[col];
                    return formatCsvValue(value);
                });
                csv += row.join(',') + '\n';
            }
            return csv;
        }
    }
    // Handle single object
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const cols = headers || Object.keys(data);
        // Header row
        let csv = cols.join(',') + '\n';
        // Single data row
        const row = cols.map(col => {
            const value = data[col];
            return formatCsvValue(value);
        });
        csv += row.join(',') + '\n';
        return csv;
    }
    // Handle primitive
    return String(data);
}
function formatCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    // Escape values containing commas, quotes, or newlines
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function formatTable(data, headers) {
    if (!data) {
        return 'No data';
    }
    // Handle array of objects
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return 'No data';
        }
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
            const cols = headers || Object.keys(firstItem);
            // Calculate column widths
            const widths = cols.map(col => col.length);
            const rows = data.map(item => {
                return cols.map((col, index) => {
                    const value = formatCellValue(item[col]);
                    widths[index] = Math.max(widths[index], value.length);
                    return value;
                });
            });
            // Build output
            const lines = [];
            // Header row
            const headerRow = cols.map((col, i) => col.toUpperCase().padEnd(widths[i])).join('  ');
            lines.push(headerRow);
            // Separator line
            const separator = cols.map((_, i) => '-'.repeat(widths[i])).join('  ');
            lines.push(separator);
            // Data rows
            for (const row of rows) {
                const line = row.map((cell, i) => cell.padEnd(widths[i])).join('  ');
                lines.push(line);
            }
            return lines.join('\n');
        }
        // Array of primitives
        return data.map(item => formatCellValue(item)).join('\n');
    }
    // Handle single object
    if (typeof data === 'object' && data !== null) {
        const entries = Object.entries(data);
        const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
        const lines = entries.map(([key, value]) => {
            return `${key.padEnd(maxKeyLength)}  ${formatCellValue(value)}`;
        });
        return lines.join('\n');
    }
    // Handle primitive
    return String(data);
}
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.length > 0 ? `[${value.length} items]` : '[]';
        }
        return '[Object]';
    }
    return String(value);
}
//# sourceMappingURL=formatters.js.map