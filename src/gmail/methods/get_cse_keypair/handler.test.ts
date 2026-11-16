import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Get },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        cse: {
          keypairs: {
            get: async (params: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Get) => {
              captured.params = params;
              return { data };
            },
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_cse_keypair', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Get } = {};
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
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Keypairs$Get } = {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ keyPairId: 'key-1' }),
      );
      expect(captured.params).toEqual({ userId: 'me', keyPairId: 'key-1' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('narrows states and projects empty, null, and unknown private metadata', async () => {
    for (const enablementState of ['enabled', 'disabled', 'stateUnspecified', 'future']) {
      const result = await handler(
        fakeGmail(
          {
            enablementState,
            privateKeyMetadata: [
              {},
              { privateKeyMetadataId: null, kaclsKeyMetadata: null, hardwareKeyMetadata: null },
              { kaclsKeyMetadata: {}, hardwareKeyMetadata: {} },
              {
                kaclsKeyMetadata: { kaclsUri: null, kaclsData: null },
                hardwareKeyMetadata: { description: null },
                unknownSecret: 'not-returned',
              },
            ],
          },
          {},
        ),
        { keyPairId: 'key' },
      );
      expect(result.enablementState).toBe(
        enablementState === 'enabled' || enablementState === 'disabled'
          ? enablementState
          : undefined,
      );
      expect(JSON.parse(JSON.stringify(result.privateKeyMetadata))).toEqual([
        {},
        {},
        { kaclsKeyMetadata: {}, hardwareKeyMetadata: {} },
        { kaclsKeyMetadata: {}, hardwareKeyMetadata: {} },
      ]);
      expect(JSON.stringify(result)).not.toContain('not-returned');
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
