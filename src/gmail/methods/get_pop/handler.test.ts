import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$PopSettings,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getpop },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        getPop: async (params: gmail_v1.Params$Resource$Users$Settings$Getpop) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_pop', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getpop } = {};
    const data = { accessWindow: 'fromNowOn', disposition: 'markRead' } as const;
    const result = await handler(fakeGmail(data, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [{}, { accessWindow: null, disposition: null }]) {
      const result = await handler(fakeGmail(data, {}));
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });

  it('drops unknown enum values', async () => {
    const result = await handler(
      fakeGmail({ accessWindow: 'futureValue', disposition: 'futureValue' }, {}),
    );
    expect(JSON.parse(JSON.stringify(result))).toEqual({});
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});
