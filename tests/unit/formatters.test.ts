import { describe, it, expect } from 'vitest';
import { formatOutput } from '../../src/lib/formatters.js';

describe('formatOutput', () => {
  const testData = [
    { id: 1, name: 'Test 1', status: 'active' },
    { id: 2, name: 'Test 2', status: 'inactive' }
  ];

  it('should format data as table by default', () => {
    const result = formatOutput(testData, { format: 'table' });
    expect(result).toContain('Id');
    expect(result).toContain('Name');
    expect(result).toContain('Status');
    expect(result).toContain('Test 1');
    expect(result).toContain('Test 2');
  });

  it('should format data as JSON', () => {
    const result = formatOutput(testData, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Test 1');
  });

  it('should format data as YAML', () => {
    const result = formatOutput(testData, { format: 'yaml' });
    expect(result).toContain('id: 1');
    expect(result).toContain('name: Test 1');
  });

  it('should format data as CSV', () => {
    const result = formatOutput(testData, { format: 'csv' });
    const lines = result.trim().split('\n');
    expect(lines[0]).toBe('id,name,status');
    expect(lines[1]).toBe('1,Test 1,active');
    expect(lines).toHaveLength(3);
  });

  it('should handle empty arrays', () => {
    const result = formatOutput([], { format: 'table' });
    expect(result).toBe('No data');
  });

  it('should handle null values', () => {
    const data = [{ id: 1, name: null }];
    const result = formatOutput(data, { format: 'table' });
    expect(result).toContain('-');
  });

  it('should handle single objects', () => {
    const data = { id: 1, name: 'Test' };
    const result = formatOutput(data, { format: 'table' });
    expect(result).toContain('Id');
    expect(result).toContain('Name');
    expect(result).toContain('Test');
  });

  it('should escape CSV values with commas', () => {
    const data = [{ name: 'Test, Value' }];
    const result = formatOutput(data, { format: 'csv' });
    expect(result).toContain('"Test, Value"');
  });
});
