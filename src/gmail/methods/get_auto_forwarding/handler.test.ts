import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$AutoForwarding,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getautoforwarding },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        getAutoForwarding: async (
          params: gmail_v1.Params$Resource$Users$Settings$Getautoforwarding,
        ) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_auto_forwarding', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getautoforwarding } = {};
    const data = {
      enabled: false,
      emailAddress: 'forward@example.com',
      disposition: 'leaveInInbox',
    } as const;
    const result = await handler(fakeGmail(data, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [{}, { enabled: null, emailAddress: null, disposition: null }]) {
      const result = await handler(fakeGmail(data, {}));
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });

  it('drops unknown enum values', async () => {
    const result = await handler(fakeGmail({ disposition: 'futureValue' }, {}));
    expect(JSON.parse(JSON.stringify(result))).toEqual({});
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});
