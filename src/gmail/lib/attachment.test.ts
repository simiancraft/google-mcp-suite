import { describe, expect, it } from 'bun:test';
import { mkdir, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ATTACHMENTS_PARAM_DESCRIPTION,
  foldBase64,
  loadAttachments,
  mimeTypeForExtension,
} from './attachment.js';
import { MESSAGE_CAP_LABEL } from './limits.js';
import { buildMessageBytes } from './message.js';

async function tempDir(): Promise<string> {
  const dir = join(tmpdir(), `attach-${process.pid}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

describe('mimeTypeForExtension', () => {
  it('maps known extensions, case-insensitively', () => {
    expect(mimeTypeForExtension('packet.pdf')).toBe('application/pdf');
    expect(mimeTypeForExtension('PHOTO.JPG')).toBe('image/jpeg');
    expect(mimeTypeForExtension('notes.md')).toBe('text/markdown');
  });

  it('falls back to octet-stream for unknown or missing extensions', () => {
    expect(mimeTypeForExtension('blob.xyz123')).toBe('application/octet-stream');
    expect(mimeTypeForExtension('no-extension')).toBe('application/octet-stream');
  });

  it('misses soft on prototype-shaped extensions', () => {
    expect(mimeTypeForExtension('file.constructor')).toBe('application/octet-stream');
    expect(mimeTypeForExtension('file.__proto__')).toBe('application/octet-stream');
  });
});

describe('foldBase64', () => {
  it('folds to 76-character CRLF-separated lines', () => {
    const folded = foldBase64('A'.repeat(200));
    const lines = folded.split('\r\n');
    expect(lines.map((line) => line.length)).toEqual([76, 76, 48]);
  });

  it('returns an empty string for empty input', () => {
    expect(foldBase64('')).toBe('');
  });
});

describe('loadAttachments', () => {
  it('returns undefined when there is nothing to attach', async () => {
    expect(await loadAttachments(undefined)).toBeUndefined();
    expect(await loadAttachments([])).toBeUndefined();
  });

  it('reads the file, defaults filename and mime type, and encodes folded base64', async () => {
    const dir = await tempDir();
    const path = join(dir, 'packet.pdf');
    const bytes = Buffer.from('pdf bytes here');
    await writeFile(path, bytes);

    const loaded = await loadAttachments([{ path }]);
    expect(loaded).toHaveLength(1);
    expect(loaded?.[0]).toMatchObject({
      filename: 'packet.pdf',
      contentType: 'application/pdf',
      data: bytes.toString('base64'),
    });
  });

  it("infers the type from the path's extension even when filename carries none", async () => {
    const dir = await tempDir();
    const path = join(dir, 'quarterly.pdf');
    await writeFile(path, Buffer.from([1]));

    const loaded = await loadAttachments([{ path, filename: 'Quarterly Report' }]);
    expect(loaded?.[0]).toMatchObject({
      filename: 'Quarterly Report',
      contentType: 'application/pdf',
    });
  });

  it('honors explicit filename and mimeType, sanitized for header placement', async () => {
    const dir = await tempDir();
    const path = join(dir, 'raw.bin');
    await writeFile(path, Buffer.from([1, 2, 3]));

    const loaded = await loadAttachments([
      { path, filename: 'work "list".csv', mimeType: 'text/csv' },
    ]);
    expect(loaded?.[0]).toMatchObject({ filename: 'work list.csv', contentType: 'text/csv' });
  });

  it('falls back to stubs when filename or mimeType sanitize to nothing', async () => {
    const dir = await tempDir();
    const path = join(dir, 'x');
    await writeFile(path, Buffer.from([0]));

    const loaded = await loadAttachments([{ path, filename: '"""', mimeType: '"""' }]);
    expect(loaded?.[0]).toMatchObject({
      filename: 'attachment',
      contentType: 'application/octet-stream',
    });
  });

  it('refuses combined encoded attachments over the Gmail message limit', async () => {
    const dir = await tempDir();
    const big = join(dir, 'big.bin');
    const small = join(dir, 'small.bin');
    await writeFile(big, Buffer.alloc(13 * 1024 * 1024));
    await writeFile(small, Buffer.alloc(13 * 1024 * 1024));

    // Each file fits alone; together they cross the ceiling.
    await expect(loadAttachments([{ path: big }, { path: small }])).rejects.toThrow(
      /encoded attachments alone.*36700160 bytes/,
    );
  });

  it('refuses an oversize file on its stat size, before buffering it', async () => {
    const dir = await tempDir();
    const path = join(dir, 'sparse.bin');
    await writeFile(path, Buffer.alloc(0));
    // A sparse file: multi-GiB by stat, zero blocks on disk. If the stat
    // check were missing, readFile would try to buffer 8 GiB here.
    await truncate(path, 8 * 1024 * 1024 * 1024);

    await expect(loadAttachments([{ path }])).rejects.toThrow(/message limit/);
  });

  it('refuses a path that is not a regular file', async () => {
    const dir = await tempDir();
    await expect(loadAttachments([{ path: dir }])).rejects.toThrow(/not a regular file/);
  });

  it('surfaces a missing file as a loud error', async () => {
    const dir = await tempDir();
    await expect(loadAttachments([{ path: join(dir, 'absent.pdf') }])).rejects.toThrow();
  });
});

describe('ATTACHMENTS_PARAM_DESCRIPTION', () => {
  it('states the cap with the shared label, derived from the constant', () => {
    expect(ATTACHMENTS_PARAM_DESCRIPTION).toContain(MESSAGE_CAP_LABEL);
  });
});

it('uploads an attachment above the former decoded cap when the MIME message fits', async () => {
  const dir = await tempDir();
  const path = join(dir, 'large.bin');
  await writeFile(path, Buffer.alloc(25 * 1024 * 1024 + 1));
  const attachments = await loadAttachments([{ path }]);
  const bytes = buildMessageBytes({ from: 'me@example.com', to: ['a@b.com'], attachments });
  expect(bytes.byteLength).toBeLessThan(35 * 1024 * 1024);
  expect(bytes.toString()).toContain('Content-Disposition: attachment; filename="large.bin"');
});
