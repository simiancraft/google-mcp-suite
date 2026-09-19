import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: { forwardingAddresses?: gmail_v1.Schema$ForwardingAddress[] | null },
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Forwardingaddresses$List },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        forwardingAddresses: {
          list: async (
            params: gmail_v1.Params$Resource$Users$Settings$Forwardingaddresses$List,
          ) => {
            captured.params = params;
            return { data };
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('list_forwarding_addresses', () => {
  it('passes exact account parameters and projects the resource', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Forwardingaddresses$List } =
      {};
    const data = { forwardingEmail: 'dest@example.com', verificationStatus: 'accepted' } as const;
    const result = await handler(fakeGmail({ forwardingAddresses: [data] }, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual({ forwardingAddresses: [data] });
    expect(() => schema.output.parse(result)).not.toThrow();
  });
  it('normalizes absent, null, and empty collections', async () => {
    for (const data of [{}, { forwardingAddresses: null }, { forwardingAddresses: [] }]) {
      const result = await handler(fakeGmail(data, {}));
      expect(result).toEqual({ forwardingAddresses: [] });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('drops unknown and unspecified verification enums', async () => {
    for (const verificationStatus of ['futureValue', 'verificationStatusUnspecified', 'pending']) {
      const data = { verificationStatus };
      const result = await handler(fakeGmail({ forwardingAddresses: [data] }, {}));
      const projected = result.forwardingAddresses[0];
      expect(projected?.verificationStatus).toBe(
        verificationStatus === 'pending' ? 'pending' : undefined,
      );
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
