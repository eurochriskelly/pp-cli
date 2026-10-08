import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCompletion, mockRunPpx } = vi.hoisted(() => ({
  mockCompletion: vi.fn(),
  mockRunPpx: vi.fn(),
}));

vi.mock('../../src/ask/openrouter.js', () => ({ completeWithOpenRouter: mockCompletion }));
vi.mock('../../src/ask/command-runner.js', () => ({
  displayPpxCommand: (args: string[]) => `ppx ${args.join(' ')}`,
  runPpxCommand: mockRunPpx,
}));

import { runAskTurn } from '../../src/ask/agent.js';
import { createAskSession, loadAskSession } from '../../src/ask/session-store.js';

describe('ask agent loop', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ppx-ask-agent-'));
    process.env.PPX_CONFIG_DIR = directory;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.PPX_CONFIG_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it('executes model-selected ppx argv, exposes it, and tracks token usage', async () => {
    mockCompletion
      .mockResolvedValueOnce({
        choices: [{ message: {
          role: 'assistant', content: null, tool_calls: [{
            id: 'call-1', type: 'function',
            function: { name: 'run_ppx', arguments: '{"args":["tournament","list"]}' },
          }],
        } }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'There are no tournaments.' } }],
        usage: { prompt_tokens: 150, completion_tokens: 10, total_tokens: 160 },
      });
    mockRunPpx.mockResolvedValue({ exitCode: 0, stdout: '[]', stderr: '', timedOut: false });
    const session = await createAskSession('test/model');
    const commands: string[] = [];

    const result = await runAskTurn({
      session,
      prompt: 'What tournaments exist?',
      apiKey: 'test-key',
      globalOptions: { profile: 'staging' },
      maxSteps: 4,
      onCommand: (command) => commands.push(command),
    });

    expect(commands).toEqual(['ppx --profile staging --format json tournament list']);
    expect(mockRunPpx).toHaveBeenCalledWith(['tournament', 'list'], ['--profile', 'staging']);
    expect(result).toMatchObject({ text: 'There are no tournaments.', steps: 2 });
    expect(result.usage.totalTokens).toBe(280);
    expect((await loadAskSession(session.id)).usage.totalTokens).toBe(280);
  });

  it('requires a new explicit approval message before high-impact apply commands', async () => {
    mockCompletion
      .mockResolvedValueOnce({
        choices: [{ message: {
          role: 'assistant', content: null, tool_calls: [{
            id: 'call-apply', type: 'function',
            function: {
              name: 'run_ppx',
              arguments: '{"args":["tournament","load","12","--input-file","fixtures.tsv","--confirmation-code","123456"]}',
            },
          }],
        } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Please confirm before I apply the import.' } }],
      });
    const session = await createAskSession('test/model');

    const result = await runAskTurn({
      session,
      prompt: 'Validate these fixtures',
      apiKey: 'test-key',
      globalOptions: {},
      maxSteps: 3,
      onCommand: vi.fn(),
    });

    expect(mockRunPpx).not.toHaveBeenCalled();
    expect(result.text).toContain('confirm');
    const secondRequestMessages = mockCompletion.mock.calls[1][0].messages as Array<{ role: string; content: string }>;
    expect(secondRequestMessages.at(-1)?.content).toContain('User confirmation is required');
  });

  it('does not treat a negated deletion request as confirmation', async () => {
    mockCompletion
      .mockResolvedValueOnce({
        choices: [{ message: {
          role: 'assistant', content: null, tool_calls: [{
            id: 'delete-card', type: 'function',
            function: { name: 'run_ppx', arguments: '{"args":["fixture","delete-card","12","34","56"]}' },
          }],
        } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'I will not delete the card.' } }],
      });
    const session = await createAskSession('test/model');

    await runAskTurn({
      session,
      prompt: 'Do not delete that card; only show me its details.',
      apiKey: 'test-key',
      globalOptions: {},
      maxSteps: 3,
      onCommand: vi.fn(),
    });

    expect(mockRunPpx).not.toHaveBeenCalled();
    const secondRequestMessages = mockCompletion.mock.calls[1][0].messages as Array<{ role: string; content: string }>;
    expect(secondRequestMessages.at(-1)?.content).toContain('User confirmation is required');
  });

  it('requires confirmation for delete commands in every allowed command family', async () => {
    mockCompletion
      .mockResolvedValueOnce({
        choices: [{ message: {
          role: 'assistant', content: null, tool_calls: [{
            id: 'delete-club', type: 'function',
            function: { name: 'run_ppx', arguments: '{"args":["club","delete","56"]}' },
          }],
        } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'I need confirmation.' } }],
      });
    const session = await createAskSession('test/model');

    await runAskTurn({
      session,
      prompt: 'Show me information about club 56.',
      apiKey: 'test-key',
      globalOptions: {},
      maxSteps: 3,
      onCommand: vi.fn(),
    });

    expect(mockRunPpx).not.toHaveBeenCalled();
  });

  it('allows a destructive command after an explicit approval', async () => {
    mockCompletion
      .mockResolvedValueOnce({
        choices: [{ message: {
          role: 'assistant', content: null, tool_calls: [{
            id: 'delete-card', type: 'function',
            function: { name: 'run_ppx', arguments: '{"args":["fixture","delete-card","12","34","56"]}' },
          }],
        } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'The card was deleted.' } }],
      });
    mockRunPpx.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });
    const session = await createAskSession('test/model');

    await runAskTurn({
      session,
      prompt: 'Yes, I confirm that card deletion.',
      apiKey: 'test-key',
      globalOptions: {},
      maxSteps: 3,
      onCommand: vi.fn(),
    });

    expect(mockRunPpx).toHaveBeenCalledWith(['fixture', 'delete-card', '12', '34', '56'], []);
  });

  it('persists the user message when the provider request fails', async () => {
    mockCompletion.mockRejectedValueOnce(new Error('provider unavailable'));
    const session = await createAskSession('test/model');

    await expect(runAskTurn({
      session,
      prompt: 'List tournaments',
      apiKey: 'test-key',
      globalOptions: {},
      maxSteps: 3,
      onCommand: vi.fn(),
    })).rejects.toThrow('provider unavailable');

    expect((await loadAskSession(session.id)).messages).toContainEqual({
      role: 'user', content: 'List tournaments',
    });
  });

  it('bounds the context sent after a large tool result', async () => {
    mockCompletion
      .mockResolvedValueOnce({
        choices: [{ message: {
          role: 'assistant', content: null, tool_calls: [{
            id: 'list', type: 'function',
            function: { name: 'run_ppx', arguments: '{"args":["tournament","list"]}' },
          }],
        } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Done.' } }],
      });
    mockRunPpx.mockResolvedValue({
      exitCode: 0,
      stdout: 'x'.repeat(200_000),
      stderr: '',
      timedOut: false,
    });
    const session = await createAskSession('test/model');

    await runAskTurn({
      session,
      prompt: 'List tournaments',
      apiKey: 'test-key',
      globalOptions: {},
      maxSteps: 3,
      onCommand: vi.fn(),
    });

    expect(JSON.stringify(mockCompletion.mock.calls[1][0].messages).length).toBeLessThanOrEqual(80_000);
  });
});
