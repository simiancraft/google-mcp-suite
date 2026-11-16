import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$LanguageSettings,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Updatelanguage },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        updateLanguage: async (params: gmail_v1.Params$Resource$Users$Settings$Updatelanguage) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('update_language', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Updatelanguage } = {};
    const data = { displayLanguage: 'en-GB' } as const;
    const args = schema.input.parse(data);
    const result = await handler(fakeGmail(data, captured), args);
    expect(captured.params).toEqual({ userId: 'me', requestBody: data });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [{}, { displayLanguage: null }]) {
      const result = await handler(fakeGmail(data, {}), {});
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });

  it('rejects unknown fields', () => {
    expect(() => schema.input.parse({ unknown: true })).toThrow();
  });
  it('returns the language saved by Gmail rather than the requested variant', async () => {
    const result = await handler(fakeGmail({ displayLanguage: 'en' }, {}), {
      displayLanguage: 'en-US',
    });
    expect(result).toEqual({ displayLanguage: 'en' });
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});
