import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetApiClient } = vi.hoisted(() => ({
  mockGetApiClient: vi.fn()
}));

vi.mock('../../src/lib/helpers.js', () => ({
  getApiClient: mockGetApiClient,
  assertOutputFormat: (format: string | undefined) => format ?? 'table'
}));

import { createDoctorCommand, createSystemCommands } from '../../src/commands/system.js';

describe('system commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as unknown as { ppOpts?: { format?: string } }).ppOpts = { format: 'json' };
  });

  afterEach(() => {
    delete (global as unknown as { ppOpts?: unknown }).ppOpts;
    process.exitCode = undefined;
  });

  it('returns the API capability contract as JSON', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        contractVersion: '1.0.0',
        api: { name: 'PitchPerfect API' },
        workflows: { fixtureImport: {} }
      })
    };
    mockGetApiClient.mockResolvedValue({ client });
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value));
    });

    await createSystemCommands().parseAsync(['node', 'test', 'capabilities'], { from: 'node' });

    expect(client.get).toHaveBeenCalledWith('/api/system/capabilities');
    expect(JSON.parse(logs[0])).toMatchObject({
      contractVersion: '1.0.0',
      workflows: { fixtureImport: {} }
    });
    logSpy.mockRestore();
  });

  it('reports a compatible, reachable API through doctor', async () => {
    const client = {
      get: vi.fn((path: string) => {
        if (path === '/api/system/health') return Promise.resolve({ status: 'healthy' });
        if (path === '/api/system/mode') return Promise.resolve({ mode: 'database' });
        return Promise.resolve({ contractVersion: '1.0.0' });
      })
    };
    mockGetApiClient.mockResolvedValue({ client });
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value));
    });

    await createDoctorCommand().parseAsync(['node', 'test'], { from: 'node' });

    expect(JSON.parse(logs[0])).toMatchObject({
      ok: true,
      api: { contract: { version: '1.0.0', compatible: true } }
    });
    expect(process.exitCode).toBeUndefined();
    logSpy.mockRestore();
  });

  it('returns a non-zero status when the API contract is incompatible', async () => {
    const client = {
      get: vi.fn((path: string) => {
        if (path === '/api/system/health') return Promise.resolve({ status: 'healthy' });
        if (path === '/api/system/mode') return Promise.resolve({ mode: 'database' });
        return Promise.resolve({ contractVersion: '2.0.0' });
      })
    };
    mockGetApiClient.mockResolvedValue({ client });
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value));
    });

    await createDoctorCommand().parseAsync(['node', 'test'], { from: 'node' });

    expect(JSON.parse(logs[0])).toMatchObject({
      ok: false,
      api: { contract: { version: '2.0.0', compatible: false } }
    });
    expect(process.exitCode).toBe(2);
    logSpy.mockRestore();
  });
});
