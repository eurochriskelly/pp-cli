import * as yaml from 'js-yaml';
import type { OutputFormat } from '../types/index.js';

export interface FormatterOptions {
  format: OutputFormat;
  headers?: string[];
}

export function formatOutput(data: unknown, options: FormatterOptions): string {
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

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function formatYaml(data: unknown): string {
  return yaml.dump(data);
}

function formatCsv(data: unknown, headers?: string[]): string {
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
          const value = (item as Record<string, unknown>)[col];
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
      const value = (data as Record<string, unknown>)[col];
      return formatCsvValue(value);
    });
    csv += row.join(',') + '\n';
    
    return csv;
  }

  // Handle primitive
  return String(data);
}

function formatCsvValue(value: unknown): string {
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

function formatTable(data: unknown, headers?: string[]): string {
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
      const widths: number[] = cols.map(col => col.length);
      
      const rows = data.map(item => {
        return cols.map((col, index) => {
          const value = formatCellValue((item as Record<string, unknown>)[col]);
          widths[index] = Math.max(widths[index], value.length);
          return value;
        });
      });
      
      // Build output
      const lines: string[] = [];
      
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
    const entries = Object.entries(data as Record<string, unknown>);
    const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
    
    const lines = entries.map(([key, value]) => {
      return `${key.padEnd(maxKeyLength)}  ${formatCellValue(value)}`;
    });
    
    return lines.join('\n');
  }

  // Handle primitive
  return String(data);
}

function formatCellValue(value: unknown): string {
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
