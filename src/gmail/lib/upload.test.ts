import { describe, expect, it } from 'bun:test';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { gmail_v1 } from '@googleapis/gmail/build/v1.js';
import type { OAuth2Client } from 'google-auth-library';
import { buildMessageBytes } from './message.js';

describe('Gmail client media upload', () => {
  it.each([
    'send',
    'create',
    'update',
  ] as const)('sends RFC 822 bytes and thread metadata through %s multipart upload', async (method) => {
    const bytes = buildMessageBytes({
      from: 'me@example.com',
      to: ['you@example.com'],
      subject: 'Reply',
      body: 'Hello',
      inReplyTo: '<original@example.com>',
    });
    const metadata = method === 'send' ? { threadId: 'T1' } : { message: { threadId: 'T1' } };
    const client = new gmail_v1.Gmail({
      auth: {
        request: async (options: {
          url: string;
          params: { uploadType: string };
          headers: Headers;
          data: Readable;
        }) => {
          const suffix =
            method === 'send' ? 'messages/send' : method === 'create' ? 'drafts' : 'drafts/D1';
          expect(options.url).toBe(
            `https://gmail.googleapis.com/upload/gmail/v1/users/me/${suffix}`,
          );
          expect(options.params.uploadType).toBe('multipart');
          expect(options.headers.get('content-type')).toStartWith('multipart/related; boundary=');
          const body = (await buffer(options.data)).toString('utf8');
          expect(body).toContain(
            `content-type: application/json\r\n\r\n${JSON.stringify(metadata)}`,
          );
          expect(body).toContain(`content-type: message/rfc822\r\n\r\n${bytes.toString('utf8')}`);
          return { data: { id: 'result' }, headers: new Headers() };
        },
      } as unknown as OAuth2Client,
    });
    const params = {
      userId: 'me',
      requestBody: metadata,
      media: { mimeType: 'message/rfc822', body: Readable.from([bytes]) },
    };
    const result =
      method === 'send'
        ? await client.users.messages.send(params)
        : method === 'create'
          ? await client.users.drafts.create(params)
          : await client.users.drafts.update({ ...params, id: 'D1' });
    expect(result.data.id).toBe('result');
  });
});
