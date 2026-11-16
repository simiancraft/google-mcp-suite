import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(calls: { gets: number }): gmail_v1.Gmail {
  return {
    users: {
      threads: {
        list: async () => ({
          data: {
            threads: [{ id: 'T1', historyId: '120', snippet: 'hello there' }],
            nextPageToken: 'next',
          },
        }),
        get: async () => {
          calls.gets += 1;
          return { data: {} };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('search_threads', () => {
  it('returns thread ids and snippets in one call, with no per-thread fetch', async () => {
    const calls = { gets: 0 };
    const result = await handler(fakeGmail(calls), { query: 'is:unread' });
    expect(calls.gets).toBe(0);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]).toMatchObject({ id: 'T1', historyId: '120', snippet: 'hello there' });
    expect(result.nextPageToken).toBe('next');
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});

it('omits null or absent thread history IDs', async () => {
  for (const data of [{}, { historyId: null }]) {
    const gmail = {
      users: { threads: { list: async () => ({ data: { threads: [data] } }) } },
    } as unknown as gmail_v1.Gmail;
    const result = await handler(gmail, {});
    expect(result.threads[0]!.historyId).toBeUndefined();
    expect(() => schema.output.parse(result)).not.toThrow();
  }
});
