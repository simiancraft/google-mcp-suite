import { describe, expect, it } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buffer } from 'node:stream/consumers';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(captured: {
  id?: string | undefined;
  bytes?: Buffer | undefined;
}): gmail_v1.Gmail {
  return {
    users: {
      getProfile: async () => ({ data: { emailAddress: 'me@example.com' } }),
      drafts: {
        update: async (params: gmail_v1.Params$Resource$Users$Drafts$Update) => {
          captured.id = params.id ?? undefined;
          expect(params.userId).toBe('me');
          expect(params.media?.mimeType).toBe('message/rfc822');
          expect(params.requestBody?.message?.raw).toBeUndefined();
          captured.bytes = await buffer(params.media?.body);
          expect(params).toEqual({
            userId: 'me',
            id: 'D1',
            requestBody: { message: {} },
            media: { mimeType: 'message/rfc822', body: params.media?.body },
          });
          return { data: { id: 'D1' } };
        },
        get: async () => ({
          data: {
            id: 'D1',
            message: { payload: { headers: [{ name: 'Subject', value: 'New' }] } },
          },
        }),
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('update_draft', () => {
  it('replaces the draft content and projects it', async () => {
    const captured: { id?: string | undefined; bytes?: Buffer | undefined } = {};
    const result = await handler(fakeGmail(captured), {
      draftId: 'D1',
      to: ['x@example.com'],
      subject: 'New',
    });
    expect(captured.id).toBe('D1');
    expect(captured.bytes?.toString('utf8')).toContain('x@example.com');
    expect(result).toMatchObject({ id: 'D1', subject: 'New' });
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('reads attachments from disk into the MIME media', async () => {
    const dir = join(
      tmpdir(),
      `update-attach-${process.pid}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'photo.png');
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(path, bytes);

    const captured: { id?: string | undefined; bytes?: Buffer | undefined } = {};
    await handler(fakeGmail(captured), {
      draftId: 'D1',
      to: ['x@example.com'],
      body: 'see attached',
      attachments: [{ path }],
    });

    const decoded = captured.bytes?.toString('utf8');
    expect(decoded).toContain('Content-Type: multipart/mixed');
    expect(decoded).toContain('Content-Disposition: attachment; filename="photo.png"');
    expect(decoded).toContain('Content-Type: image/png; name="photo.png"');
    expect(decoded).toContain(bytes.toString('base64'));
  });
  it('rejects oversize MIME before calling the compose endpoint', async () => {
    const captured: { bytes?: Buffer | undefined } = {};
    await expect(
      handler(fakeGmail(captured), {
        draftId: 'D1',
        to: ['x@example.com'],
        htmlBody: 'a'.repeat(35 * 1024 * 1024),
      }),
    ).rejects.toThrow(/The encoded message is \d+ bytes; Gmail's message limit is 36700160 bytes/);
    expect(captured.bytes).toBeUndefined();
  });
});
