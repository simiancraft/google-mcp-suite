import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$List },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        cse: {
          identities: {
            list: async (params: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$List) => {
              captured.params = params;
              return { data };
            },
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('list_cse_identities', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$List } = {};
    const result = await handler(
      fakeGmail(
        {
          cseIdentities: [
            {
              emailAddress: 'me@example.com',
              primaryKeyPairId: 'key-1',
              signAndEncryptKeyPairs: { signingKeyPairId: 'sign', encryptionKeyPairId: 'encrypt' },
            },
          ],
          nextPageToken: 'after',
        },
        captured,
      ),
      schema.input.parse({ pageSize: 7, pageToken: 'next' }),
    );
    expect(captured.params).toEqual({ userId: 'me', pageSize: 7, pageToken: 'next' });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      cseIdentities: [
        {
          emailAddress: 'me@example.com',
          primaryKeyPairId: 'key-1',
          signAndEncryptKeyPairs: { signingKeyPairId: 'sign', encryptionKeyPairId: 'encrypt' },
        },
      ],
      nextPageToken: 'after',
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [{}, { cseIdentities: null, nextPageToken: null }]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$List } = {};
      const result = await handler(fakeGmail(data, captured), schema.input.parse({}));
      expect(captured.params).toEqual({ userId: 'me' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({ cseIdentities: [] });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
