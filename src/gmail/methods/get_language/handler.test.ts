import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$LanguageSettings,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getlanguage },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        getLanguage: async (params: gmail_v1.Params$Resource$Users$Settings$Getlanguage) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_language', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getlanguage } = {};
    const data = { displayLanguage: 'en-GB' } as const;
    const result = await handler(fakeGmail(data, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [{}, { displayLanguage: null }]) {
      const result = await handler(fakeGmail(data, {}));
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
