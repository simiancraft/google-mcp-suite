import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Sendas$Smimeinfo$Setdefault },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        sendAs: {
          smimeInfo: {
            setDefault: async (
              params: gmail_v1.Params$Resource$Users$Settings$Sendas$Smimeinfo$Setdefault,
            ) => {
              captured.params = params;
              return { data };
            },
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('set_default_smime_info', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: {
      params?: gmail_v1.Params$Resource$Users$Settings$Sendas$Smimeinfo$Setdefault;
    } = {};
    const result = await handler(
      fakeGmail({}, captured),
      schema.input.parse({ sendAsEmail: 'me@example.com', id: 'cert-1' }),
    );
    expect(captured.params).toEqual({ userId: 'me', sendAsEmail: 'me@example.com', id: 'cert-1' });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      sendAsEmail: 'me@example.com',
      id: 'cert-1',
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [{}, {}]) {
      const captured: {
        params?: gmail_v1.Params$Resource$Users$Settings$Sendas$Smimeinfo$Setdefault;
      } = {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ sendAsEmail: 'me@example.com', id: 'cert-1' }),
      );
      expect(captured.params).toEqual({
        userId: 'me',
        sendAsEmail: 'me@example.com',
        id: 'cert-1',
      });
      expect(JSON.parse(JSON.stringify(result))).toEqual({
        sendAsEmail: 'me@example.com',
        id: 'cert-1',
      });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
