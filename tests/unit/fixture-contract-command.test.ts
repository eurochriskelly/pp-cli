import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetApiClient } = vi.hoisted(() => ({
  mockGetApiClient: vi.fn()
}));

vi.mock('../../src/lib/helpers.js', () => ({
  getApiClient: mockGetApiClient,
  assertOutputFormat: (format: string | undefined) => format ?? 'table'
}));

import { createFixtureCommands } from '../../src/commands/fixture.js';

describe('fixture command API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends API card fields to the carded endpoint', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    mockGetApiClient.mockResolvedValue({ client });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createFixtureCommands().parseAsync(
      [
        'node', 'test', 'card', '123', '456', '--team', '1', '--player', 'Jane Doe',
        '--number', '10', '--type', 'yellow'
      ],
      { from: 'node' }
    );

    expect(client.post).toHaveBeenCalledWith('/api/tournaments/123/fixtures/456/carded', {
      team: '1',
      playerName: 'Jane Doe',
      playerNumber: 10,
      cardColor: 'yellow'
    });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('uses the API rewind endpoint without pretending to reset an arbitrary fixture', async () => {
    const client = { put: vi.fn().mockResolvedValue({}) };
    mockGetApiClient.mockResolvedValue({ client });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createFixtureCommands().parseAsync(['node', 'test', 'rewind', '123'], { from: 'node' });

    expect(client.put).toHaveBeenCalledWith('/api/tournaments/123/fixtures/rewind');
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
