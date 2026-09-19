import { describe, expect, it } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buffer } from 'node:stream/consumers';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(captured: { bytes?: Buffer | undefined }): gmail_v1.Gmail {
  return {
    users: {
      getProfile: async () => ({ data: { emailAddress: 'me@example.com' } }),
      drafts: {
        create: async (params: gmail_v1.Params$Resource$Users$Drafts$Create) => {
          expect(params.userId).toBe('me');
          expect(params.media?.mimeType).toBe('message/rfc822');
          expect(params.requestBody?.message?.raw).toBeUndefined();
          captured.bytes = await buffer(params.media?.body);
          expect(params).toEqual({
            userId: 'me',
            requestBody: { message: {} },
            media: { mimeType: 'message/rfc822', body: params.media?.body },
          });
          return { data: { id: 'D1' } };
        },
        get: async () => ({
          data: {
            id: 'D1',
            message: {
              threadId: 'T1',
              payload: { headers: [{ name: 'Subject', value: 'Hello' }] },
            },
          },
        }),
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('create_draft', () => {
  it('builds a MIME media, creates the draft, and projects it', async () => {
    const captured: { bytes?: Buffer | undefined } = {};
    const result = await handler(fakeGmail(captured), {
      to: ['x@example.com'],
      subject: 'Hello',
      body: 'Hi there',
    });

    expect(captured.bytes).toBeTruthy();
    const decoded = captured.bytes?.toString('utf8');
    expect(decoded).toContain('x@example.com');
    expect(decoded).toContain('Hi there');

    expect(result).toMatchObject({ id: 'D1', threadId: 'T1', subject: 'Hello' });
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('reads attachments from disk into the MIME media', async () => {
    const dir = join(
      tmpdir(),
      `draft-attach-${process.pid}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'packet.pdf');
    const bytes = Buffer.from('pdf bytes');
    await writeFile(path, bytes);

    const captured: { bytes?: Buffer | undefined } = {};
    await handler(fakeGmail(captured), {
      to: ['x@example.com'],
      body: 'see attached',
      attachments: [{ path }],
    });

    const decoded = captured.bytes?.toString('utf8');
    expect(decoded).toContain('Content-Type: multipart/mixed');
    expect(decoded).toContain('Content-Disposition: attachment; filename="packet.pdf"');
    expect(decoded).toContain('Content-Type: application/pdf; name="packet.pdf"');
    expect(decoded).toContain(bytes.toString('base64'));
  });

  it('threads a reply: fetches the original for thread + In-Reply-To', async () => {
    const captured: { bytes?: Buffer | undefined; threadId?: string | undefined } = {};
    const gmail = {
      users: {
        getProfile: async () => ({ data: { emailAddress: 'me@example.com' } }),
        messages: {
          get: async () => ({
            data: {
              threadId: 'T9',
              payload: { headers: [{ name: 'Message-ID', value: '<orig@x>' }] },
            },
          }),
        },
        drafts: {
          create: async (params: gmail_v1.Params$Resource$Users$Drafts$Create) => {
            expect(params.userId).toBe('me');
            expect(params.media?.mimeType).toBe('message/rfc822');
            expect(params.requestBody?.message?.raw).toBeUndefined();
            captured.bytes = await buffer(params.media?.body);
            expect(params).toEqual({
              userId: 'me',
              requestBody: { message: { threadId: 'T9' } },
              media: { mimeType: 'message/rfc822', body: params.media?.body },
            });
            captured.threadId = params.requestBody?.message?.threadId ?? undefined;
            return { data: { id: 'D2' } };
          },
          get: async () => ({ data: { id: 'D2', message: { threadId: 'T9' } } }),
        },
      },
    } as unknown as gmail_v1.Gmail;

    await handler(gmail, { to: ['x@example.com'], replyToMessageId: 'M1' });
    expect(captured.threadId).toBe('T9');
    expect(captured.bytes?.toString('utf8')).toContain('In-Reply-To: <orig@x>');
  });
  it('rejects oversize MIME before calling the compose endpoint', async () => {
    const captured: { bytes?: Buffer | undefined } = {};
    await expect(
      handler(fakeGmail(captured), {
        to: ['x@example.com'],
        htmlBody: 'a'.repeat(35 * 1024 * 1024),
      }),
    ).rejects.toThrow(/The encoded message is \d+ bytes; Gmail's message limit is 36700160 bytes/);
    expect(captured.bytes).toBeUndefined();
  });
});
