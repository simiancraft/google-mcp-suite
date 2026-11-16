import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Delete },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        cse: {
          identities: {
            delete: async (
              params: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Delete,
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

describe('delete_cse_identity', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Delete } = {};
    const result = await handler(
      fakeGmail({}, captured),
      schema.input.parse({ emailAddress: 'me@example.com' }),
    );
    expect(captured.params).toEqual({ userId: 'me', cseEmailAddress: 'me@example.com' });
    expect(JSON.parse(JSON.stringify(result))).toEqual({ emailAddress: 'me@example.com' });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [{}, {}]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Delete } =
        {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ emailAddress: 'me@example.com' }),
      );
      expect(captured.params).toEqual({ userId: 'me', cseEmailAddress: 'me@example.com' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({ emailAddress: 'me@example.com' });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
