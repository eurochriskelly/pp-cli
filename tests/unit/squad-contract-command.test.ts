import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetApiClient } = vi.hoisted(() => ({
  mockGetApiClient: vi.fn()
}));

vi.mock('../../src/lib/helpers.js', () => ({
  getApiClient: mockGetApiClient,
  assertOutputFormat: (format: string | undefined) => format ?? 'table'
}));

import { createSquadCommands } from '../../src/commands/squad.js';

describe('squad command API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the API squad field names when creating a squad', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ id: 5, teamName: 'Dublin A' })
    };
    mockGetApiClient.mockResolvedValue({ client });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createSquadCommands().parseAsync(
      ['node', 'test', 'create', '123', '--name', 'Dublin A', '--category', 'Senior', '--group', 'A'],
      { from: 'node' }
    );

    expect(client.post).toHaveBeenCalledWith('/api/tournaments/123/squads', {
      teamName: 'Dublin A',
      category: 'Senior',
      groupLetter: 'A',
      teamSheetSubmitted: false,
      notes: undefined
    });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('uses the players endpoint and the API player model', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ id: 7, firstName: 'Jane', secondName: 'Doe' })
    };
    mockGetApiClient.mockResolvedValue({ client });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createSquadCommands().parseAsync(
      [
        'node', 'test', 'add-player', '123', '5', '--first-name', 'Jane', '--last-name', 'Doe',
        '--date-of-birth', '2000-01-02', '--foirreann-id', 'F-22'
      ],
      { from: 'node' }
    );

    expect(client.post).toHaveBeenCalledWith('/api/tournaments/123/squads/5/players', {
      firstName: 'Jane',
      secondName: 'Doe',
      dateOfBirth: '2000-01-02',
      foirreannId: 'F-22'
    });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
