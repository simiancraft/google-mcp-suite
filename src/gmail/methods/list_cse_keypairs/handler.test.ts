import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$List },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        cse: {
          keypairs: {
            list: async (params: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$List) => {
              captured.params = params;
              return { data };
            },
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('list_cse_keypairs', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$List } = {};
    const result = await handler(
      fakeGmail(
        {
          cseKeyPairs: [
            {
              keyPairId: 'key-1',
              pem: 'PUBLIC CHAIN',
              subjectEmailAddresses: ['me@example.com'],
              enablementState: 'enabled',
              disableTime: '2026-08-01T00:00:00Z',
              privateKeyMetadata: [
                {
                  privateKeyMetadataId: 'meta-1',
                  kaclsKeyMetadata: { kaclsUri: 'https://keys.example.com', kaclsData: 'opaque' },
                },
                {
                  privateKeyMetadataId: 'meta-2',
                  hardwareKeyMetadata: { description: 'Smart card' },
                },
              ],
              pkcs7: 'input-only-chain',
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
      cseKeyPairs: [
        {
          keyPairId: 'key-1',
          pem: 'PUBLIC CHAIN',
          subjectEmailAddresses: ['me@example.com'],
          enablementState: 'enabled',
          disableTime: '2026-08-01T00:00:00Z',
          privateKeyMetadata: [
            {
              privateKeyMetadataId: 'meta-1',
              kaclsKeyMetadata: { kaclsUri: 'https://keys.example.com', kaclsData: 'opaque' },
            },
            { privateKeyMetadataId: 'meta-2', hardwareKeyMetadata: { description: 'Smart card' } },
          ],
        },
      ],
      nextPageToken: 'after',
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [{}, { cseKeyPairs: null, nextPageToken: null }]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$List } = {};
      const result = await handler(fakeGmail(data, captured), schema.input.parse({}));
      expect(captured.params).toEqual({ userId: 'me' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({ cseKeyPairs: [] });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
