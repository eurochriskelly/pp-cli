import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import { homedir } from 'node:os';
import type { AskAttachment, AskSession } from './types.js';

const EMPTY_USAGE = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

function askRoot(): string {
  const configRoot = process.env.PPX_CONFIG_DIR || join(homedir(), '.pp-cli');
  return join(configRoot, 'ask', 'sessions');
}

function sessionDir(id: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    throw new Error(`Invalid ask session id: ${id}`);
  }
  return join(askRoot(), id);
}

function sessionFile(id: string): string {
  return join(sessionDir(id), 'session.json');
}

export async function createAskSession(model: string): Promise<AskSession> {
  const now = new Date().toISOString();
  const session: AskSession = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    model,
    messages: [],
    attachments: [],
    usage: { ...EMPTY_USAGE },
  };
  await saveAskSession(session);
  return session;
}

export async function loadAskSession(id: string): Promise<AskSession> {
  try {
    return JSON.parse(await fs.readFile(sessionFile(id), 'utf8')) as AskSession;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      throw new Error(`Ask session not found: ${id}`);
    }
    throw err;
  }
}

export async function saveAskSession(session: AskSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  const directory = sessionDir(session.id);
  await fs.mkdir(directory, { recursive: true });
  const target = sessionFile(session.id);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(session, null, 2), { mode: 0o600 });
  await fs.rename(temporary, target);
}

export async function addAskAttachments(session: AskSession, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const attachmentDir = join(sessionDir(session.id), 'attachments');
  await fs.mkdir(attachmentDir, { recursive: true });

  for (const source of paths) {
    const stat = await fs.stat(source);
    if (!stat.isFile()) throw new Error(`Attachment is not a file: ${source}`);
    const id = randomUUID();
    const safeName = basename(source).replace(/[^a-zA-Z0-9._-]/g, '_');
    const destination = join(attachmentDir, `${id}-${safeName}`);
    await fs.copyFile(source, destination);
    await fs.chmod(destination, 0o600);
    const attachment: AskAttachment = {
      id,
      originalName: basename(source),
      path: destination,
      size: stat.size,
    };
    session.attachments.push(attachment);
  }
  await saveAskSession(session);
}
