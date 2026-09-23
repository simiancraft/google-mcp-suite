import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$ImapSettings,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Updateimap },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        updateImap: async (params: gmail_v1.Params$Resource$Users$Settings$Updateimap) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('update_imap', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Updateimap } = {};
    const data = {
      enabled: true,
      autoExpunge: false,
      expungeBehavior: 'archive',
      maxFolderSize: 0,
    } as const;
    const args = schema.input.parse(data);
    const result = await handler(fakeGmail(data, captured), args);
    expect(captured.params).toEqual({ userId: 'me', requestBody: data });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [
      {},
      { enabled: null, autoExpunge: null, expungeBehavior: null, maxFolderSize: null },
    ]) {
      const result = await handler(fakeGmail(data, {}), {});
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });

  it('drops unknown enum values', async () => {
    const result = await handler(fakeGmail({ expungeBehavior: 'futureValue' }, {}), {});
    expect(JSON.parse(JSON.stringify(result))).toEqual({});
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('rejects unknown fields', () => {
    expect(() => schema.input.parse({ unknown: true })).toThrow();
  });

  it('rejects unspecified and unknown expungeBehavior', () => {
    expect(() => schema.input.parse({ expungeBehavior: 'expungeBehaviorUnspecified' })).toThrow();
    expect(() => schema.input.parse({ expungeBehavior: 'futureValue' })).toThrow();
  });
  it('accepts documented folder sizes and rejects other limits', () => {
    for (const maxFolderSize of [0, 1000, 2000, 5000, 10000]) {
      expect(() => schema.input.parse({ maxFolderSize })).not.toThrow();
    }
    expect(() => schema.input.parse({ maxFolderSize: 123 })).toThrow();
  });
});
