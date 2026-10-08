import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import type { AskAttachment } from './types.js';

const TEXT_EXTENSIONS = new Set(['.csv', '.tsv', '.txt', '.json', '.yaml', '.yml']);

export async function inspectAttachment(attachment: AskAttachment): Promise<Record<string, unknown>> {
  const extension = extname(attachment.originalName).toLowerCase();
  const base = {
    id: attachment.id,
    name: attachment.originalName,
    size: attachment.size,
    extension,
  };
  if (!TEXT_EXTENSIONS.has(extension)) {
    return {
      ...base,
      readable: false,
      reason: extension === '.xlsx' || extension === '.xls'
        ? 'Excel extraction belongs in the planned ingestion adapter; this CLI prototype preserves the file but does not parse binary workbooks yet.'
        : 'Unsupported attachment type.',
    };
  }

  const handle = await fs.open(attachment.path, 'r');
  try {
    const buffer = Buffer.alloc(Math.min(64_000, attachment.size));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const text = buffer.subarray(0, bytesRead).toString('utf8');
    const lines = text.split(/\r?\n/);
    return {
      ...base,
      readable: true,
      lineCountAtLeast: lines.length,
      truncated: attachment.size > bytesRead,
      preview: lines.slice(0, 40).join('\n'),
    };
  } finally {
    await handle.close();
  }
}
