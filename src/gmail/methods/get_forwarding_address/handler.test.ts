import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$ForwardingAddress,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Forwardingaddresses$Get },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        forwardingAddresses: {
          get: async (params: gmail_v1.Params$Resource$Users$Settings$Forwardingaddresses$Get) => {
            captured.params = params;
            return { data };
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_forwarding_address', () => {
  it('passes exact account parameters and projects the resource', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Forwardingaddresses$Get } =
      {};
    const data = { forwardingEmail: 'dest@example.com', verificationStatus: 'accepted' } as const;
    const result = await handler(
      fakeGmail(data, captured),
      schema.input.parse({ forwardingEmail: 'me@example.com' }),
    );
    expect(captured.params).toEqual({ userId: 'me', forwardingEmail: 'me@example.com' });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });
  it('drops null and absent resource fields', async () => {
    for (const data of [{}, { forwardingEmail: null, verificationStatus: null }]) {
      const result = await handler(
        fakeGmail(data, {}),
        schema.input.parse({ forwardingEmail: 'me@example.com' }),
      );
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('drops unknown and unspecified verification enums', async () => {
    for (const verificationStatus of ['futureValue', 'verificationStatusUnspecified', 'pending']) {
      const data = { verificationStatus };
      const result = await handler(
        fakeGmail(data, {}),
        schema.input.parse({ forwardingEmail: 'me@example.com' }),
      );
      const projected = result;
      expect(projected?.verificationStatus).toBe(
        verificationStatus === 'pending' ? 'pending' : undefined,
      );
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
