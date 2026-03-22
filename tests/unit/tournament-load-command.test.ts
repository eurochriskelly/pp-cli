import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const {
  mockGetApiClient,
  mockStoreConfirmationCode,
  mockVerifyConfirmationCode,
  mockClearConfirmationCode,
  mockGenerateConfirmationCode,
  mockReadFile
} = vi.hoisted(() => ({
  mockGetApiClient: vi.fn(),
  mockStoreConfirmationCode: vi.fn(),
  mockVerifyConfirmationCode: vi.fn(),
  mockClearConfirmationCode: vi.fn(),
  mockGenerateConfirmationCode: vi.fn(),
  mockReadFile: vi.fn()
}));

vi.mock('../../src/lib/helpers.js', () => ({
  getApiClient: mockGetApiClient,
  assertOutputFormat: (format: string | undefined) => format ?? 'table'
}));

vi.mock('../../src/lib/confirmation-codes.js', () => ({
  storeConfirmationCode: mockStoreConfirmationCode,
  verifyConfirmationCode: mockVerifyConfirmationCode,
  clearConfirmationCode: mockClearConfirmationCode,
  generateConfirmationCode: mockGenerateConfirmationCode
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile
}));

import { createTournamentCommands } from '../../src/commands/tournament.js';

describe('tournament load command', () => {
  const tsvContent = 'TIME\tMATCH\n09:00\tM.1\n';
  const normalizedTsvContent = 'TIME\tMATCH\n09:00\tM.1';
  const confirmationKey = `tournament-load:123:${createHash('sha256').update(normalizedTsvContent).digest('hex')}`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateConfirmationCode.mockReturnValue('123456');
    mockReadFile.mockResolvedValue(tsvContent);
  });

  it('validates fixtures and generates a confirmation code', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        rows: [{ TIME: '09:00', MATCH: 'M.1' }],
        warnings: [{ message: 'Rest gap is tight', row: 1, column: 'TIME' }],
        stages: ['Gp.1']
      })
    };

    mockGetApiClient.mockResolvedValue({ client });

    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const command = createTournamentCommands();
    await command.parseAsync(['node', 'test', 'load', '123', '--input-file', '/tmp/schedule.tsv'], { from: 'node' });

    expect(client.post).toHaveBeenCalledWith('/api/tournaments/123/validate-tsv', {
      key: Buffer.from(normalizedTsvContent, 'utf-8').toString('base64')
    });
    expect(mockStoreConfirmationCode).toHaveBeenCalledWith(confirmationKey, '123456');
    expect(logs.join('\n')).toContain('ppx tournaments load 123 --input-file=/tmp/schedule.tsv --confirmation-code=123456');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('revalidates and loads fixtures when the confirmation code is valid', async () => {
    const client = {
      post: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{
            TIME: { value: '09:00', warnings: [] },
            MATCH: { value: 'M.1', warnings: [] },
            CATEGORY: { value: 'MENS', warnings: [] },
            PITCH: { value: 'PITCH1', warnings: [] },
            TEAM1: { value: 'A', warnings: [] },
            STAGE: { value: 'GP.1', warnings: [] },
            TEAM2: { value: 'B', warnings: [] },
            UMPIRES: { value: 'C', warnings: [] },
            DURATION: { value: 30, warnings: [] }
          }],
          warnings: []
        })
        .mockResolvedValueOnce({
          message: 'Fixtures created',
          count: 1
        })
    };

    mockGetApiClient.mockResolvedValue({ client });
    mockVerifyConfirmationCode.mockResolvedValue(true);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const command = createTournamentCommands();
    await command.parseAsync(
      ['node', 'test', 'load', '123', '--input-file', '/tmp/schedule.tsv', '--confirmation-code', '123456'],
      { from: 'node' }
    );

    expect(mockVerifyConfirmationCode).toHaveBeenCalledWith(confirmationKey, '123456');
    expect(client.post).toHaveBeenNthCalledWith(2, '/api/tournaments/123/fixtures', [{
      TIME: '09:00',
      MATCH: 'M.1',
      CATEGORY: 'MENS',
      PITCH: 'PITCH1',
      TEAM1: 'A',
      STAGE: 'GP.1',
      TEAM2: 'B',
      UMPIRES: 'C',
      DURATION: 30
    }]);
    expect(mockClearConfirmationCode).toHaveBeenCalledWith(confirmationKey);

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('fails when validation is not successful', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        valid: false,
        errors: ['Duplicate match found']
      })
    };

    mockGetApiClient.mockResolvedValue({ client });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    const command = createTournamentCommands();

    await expect(
      command.parseAsync(['node', 'test', 'load', '123', '--input-file', '/tmp/schedule.tsv'], { from: 'node' })
    ).rejects.toThrow('exit:1');

    expect(client.post).toHaveBeenCalledTimes(1);
    expect(mockStoreConfirmationCode).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('surfaces API object errors instead of the generic fallback message', async () => {
    const client = {
      post: vi.fn().mockRejectedValue({
        message: 'Tournament 123 not found',
        status: 404,
        details: {
          errors: ['Tournament does not exist']
        }
      })
    };

    mockGetApiClient.mockResolvedValue({ client });

    const errors: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map((value) => String(value ?? '')).join(' '));
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    const command = createTournamentCommands();

    await expect(
      command.parseAsync(['node', 'test', 'load', '123', '--input-file', '/tmp/schedule.tsv'], { from: 'node' })
    ).rejects.toThrow('exit:1');

    expect(errors.join('\n')).toContain('Tournament 123 not found');

    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('normalizes TSV headers without rewriting GUI-style placeholders', async () => {
    const bestsContent = readFileSync('tests/schedules/bests.tsv', 'utf-8');
    mockReadFile.mockResolvedValue(bestsContent);

    const client = {
      post: vi.fn().mockResolvedValue({
        rows: [],
        warnings: []
      })
    };

    mockGetApiClient.mockResolvedValue({ client });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const command = createTournamentCommands();
    await command.parseAsync(['node', 'test', 'load', '123', '--input-file', 'tests/schedules/bests.tsv'], { from: 'node' });

    const [, requestBody] = client.post.mock.calls[0];
    const decoded = Buffer.from(requestBody.key, 'base64').toString('utf-8');

    expect(decoded).toContain('TIME\tMATCH\tCATEGORY\tPITCH\tTEAM1\tSTAGE\tTEAM2\tUMPIRES\tDURATION');
    expect(decoded).toContain('2nd best 2nd\tCUP.SF1\tbest 1st\t2nd best 3rd');
    expect(decoded).toContain('winner M.7\tCUP.FIN\twinner M.8\tloser M.8');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
