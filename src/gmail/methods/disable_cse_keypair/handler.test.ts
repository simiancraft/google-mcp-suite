import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Disable },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        cse: {
          keypairs: {
            disable: async (
              params: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Disable,
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

describe('disable_cse_keypair', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Disable } = {};
    const result = await handler(
      fakeGmail(
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
          pkcs7: 'input-only-chain',
        },
        captured,
      ),
      schema.input.parse({ keyPairId: 'key-1' }),
    );
    expect(captured.params).toEqual({ userId: 'me', keyPairId: 'key-1' });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
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
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [
      {},
      {
        keyPairId: null,
        pem: null,
        subjectEmailAddresses: null,
        enablementState: null,
        disableTime: null,
        privateKeyMetadata: null,
        pkcs7: null,
      },
    ]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Disable } =
        {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ keyPairId: 'key-1' }),
      );
      expect(captured.params).toEqual({ userId: 'me', keyPairId: 'key-1' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
