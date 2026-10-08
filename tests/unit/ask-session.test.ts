import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addAskAttachments, createAskSession, loadAskSession } from '../../src/ask/session-store.js';
import { inspectAttachment } from '../../src/ask/attachments.js';

describe('ask session storage', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ppx-ask-test-'));
    process.env.PPX_CONFIG_DIR = directory;
  });

  afterEach(async () => {
    delete process.env.PPX_CONFIG_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it('persists sessions and snapshots attachments for follow-up turns', async () => {
    const source = join(directory, 'fixtures.tsv');
    await writeFile(source, 'TIME\tTEAM1\tTEAM2\n09:00\tA\tB\n');
    const session = await createAskSession('test/model');

    await addAskAttachments(session, [source]);
    const loaded = await loadAskSession(session.id);

    expect(loaded.model).toBe('test/model');
    expect(loaded.attachments).toHaveLength(1);
    expect(loaded.attachments[0].path).not.toBe(source);
    await rm(source);
    const inspection = await inspectAttachment(loaded.attachments[0]);
    expect(inspection).toMatchObject({ readable: true, truncated: false });
    expect(inspection.preview).toContain('09:00\tA\tB');
  });

  it('rejects path-shaped session ids', async () => {
    await expect(loadAskSession('../../session')).rejects.toThrow('Invalid ask session id');
  });
});
