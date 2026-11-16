import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { senderAddress } from '../../lib/profile.js';
import { handler as listHistory } from '../list_history/handler.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$Profile,
  captured: { params?: gmail_v1.Params$Resource$Users$Getprofile },
): gmail_v1.Gmail {
  return {
    users: {
      getProfile: async (params: gmail_v1.Params$Resource$Users$Getprofile) => {
        captured.params = params;
        return { data };
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_profile', () => {
  it('passes exact account parameters and projects the documented profile', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Getprofile } = {};
    const data = {
      emailAddress: 'me@example.com',
      messagesTotal: 10,
      threadsTotal: 4,
      historyId: '123',
    };
    const result = await handler(fakeGmail(data, captured));
    expect(schema.input.parse({})).toEqual({});
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual(data);
    expect(schema.output.parse(result)).toEqual(data);
  });

  it('omits missing and null fields while preserving zero counts', async () => {
    for (const data of [
      {},
      { emailAddress: null, messagesTotal: null, threadsTotal: null, historyId: null },
    ]) {
      const result = await handler(fakeGmail(data, {}));
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
    const result = await handler(fakeGmail({ messagesTotal: 0, threadsTotal: 0 }, {}));
    expect(schema.output.parse(result)).toMatchObject({ messagesTotal: 0, threadsTotal: 0 });
  });

  it('fetches fresh checkpoints despite the compose sender cache and bootstraps history', async () => {
    let calls = 0;
    const captured: { params?: gmail_v1.Params$Resource$Users$History$List } = {};
    const gmail = {
      users: {
        getProfile: async (params: gmail_v1.Params$Resource$Users$Getprofile) => {
          expect(params).toEqual({ userId: 'me' });
          calls += 1;
          return {
            data: {
              emailAddress: 'me@example.com',
              historyId: String(calls),
              messagesTotal: calls,
            },
          };
        },
        history: {
          list: async (params: gmail_v1.Params$Resource$Users$History$List) => {
            captured.params = params;
            return { data: { historyId: '4' } };
          },
        },
      },
    } as unknown as gmail_v1.Gmail;
    expect(await senderAddress(gmail)).toBe('me@example.com');
    expect((await handler(gmail)).historyId).toBe('2');
    const profile = schema.output.parse(await handler(gmail));
    expect(profile).toMatchObject({ historyId: '3', messagesTotal: 3 });
    await listHistory(gmail, { startHistoryId: profile.historyId! });
    expect(captured.params).toEqual({ userId: 'me', startHistoryId: '3' });
    expect(await senderAddress(gmail)).toBe('me@example.com');
    expect(calls).toBe(3);
  });
});
