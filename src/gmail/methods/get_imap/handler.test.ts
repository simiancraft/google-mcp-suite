import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$ImapSettings,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getimap },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        getImap: async (params: gmail_v1.Params$Resource$Users$Settings$Getimap) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_imap', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getimap } = {};
    const data = {
      enabled: true,
      autoExpunge: false,
      expungeBehavior: 'archive',
      maxFolderSize: 0,
    } as const;
    const result = await handler(fakeGmail(data, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [
      {},
      { enabled: null, autoExpunge: null, expungeBehavior: null, maxFolderSize: null },
    ]) {
      const result = await handler(fakeGmail(data, {}));
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });

  it('drops unknown enum values', async () => {
    const result = await handler(fakeGmail({ expungeBehavior: 'futureValue' }, {}));
    expect(JSON.parse(JSON.stringify(result))).toEqual({});
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});
