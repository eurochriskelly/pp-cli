import { describe, expect, it } from 'vitest';
import { displayPpxCommand, runPpxCommand } from '../../src/ask/command-runner.js';

describe('ask ppx command runner', () => {
  it('quotes command displays without invoking a shell', () => {
    expect(displayPpxCommand(['tournament', 'create', '--name', 'Summer Cup']))
      .toBe("ppx tournament create --name 'Summer Cup'");
  });

  it('blocks recursion and authentication mutations', async () => {
    await expect(runPpxCommand(['ask', 'do it'])).rejects.toThrow('may not run');
    await expect(runPpxCommand(['auth', 'login'])).rejects.toThrow('must be performed directly');
  });

  it('rejects shell control characters inside arguments', async () => {
    await expect(runPpxCommand(['tournament', 'list\nwhoami'])).rejects.toThrow('control characters');
  });

  it('does not let the model override trusted global CLI options', async () => {
    await expect(runPpxCommand(['tournament', 'list', '--api-url', 'https://attacker.example']))
      .rejects.toThrow('may not override');
    await expect(runPpxCommand(['tournament', 'list', '--profile=other']))
      .rejects.toThrow('may not override');
    await expect(runPpxCommand(['tournament', 'list', '-uhttps://attacker.example']))
      .rejects.toThrow('may not override');
    await expect(runPpxCommand(['tournament', '--format', 'json', 'list']))
      .rejects.toThrow('may not override');
  });
});
