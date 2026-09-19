import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(): gmail_v1.Gmail {
  return {
    users: {
      threads: {
        get: async () => ({
          data: {
            id: 'T1',
            historyId: '120',
            messages: [
              {
                id: 'M1',
                historyId: '119',
                snippet: 'body preview',
                payload: {
                  headers: [
                    { name: 'Subject', value: 'Re: Hello' },
                    { name: 'From', value: 'a@example.com' },
                  ],
                  mimeType: 'text/plain',
                  body: { data: Buffer.from('Full body').toString('base64url') },
                },
              },
            ],
          },
        }),
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_thread', () => {
  it('projects the thread messages, decoding the plaintext body', async () => {
    const result = await handler(fakeGmail(), { threadId: 'T1' });
    expect(result.id).toBe('T1');
    expect(result.historyId).toBe('120');
    expect(result.messages[0]).toMatchObject({
      id: 'M1',
      historyId: '119',
      subject: 'Re: Hello',
      sender: { address: 'a@example.com' },
      plaintextBody: 'Full body',
    });
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});

it('omits null or absent thread history IDs', async () => {
  for (const data of [{}, { historyId: null }]) {
    const gmail = {
      users: { threads: { get: async () => ({ data: data }) } },
    } as unknown as gmail_v1.Gmail;
    const result = await handler(gmail, { threadId: 'T1' });
    expect(result.historyId).toBeUndefined();
    expect(() => schema.output.parse(result)).not.toThrow();
  }
});
