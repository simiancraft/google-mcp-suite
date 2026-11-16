import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Create },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        cse: {
          identities: {
            create: async (
              params: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Create,
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

describe('create_cse_identity', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Create } = {};
    const result = await handler(
      fakeGmail(
        {
          emailAddress: 'me@example.com',
          primaryKeyPairId: 'key-1',
          signAndEncryptKeyPairs: { signingKeyPairId: 'sign', encryptionKeyPairId: 'encrypt' },
        },
        captured,
      ),
      schema.input.parse({ emailAddress: 'me@example.com', primaryKeyPairId: 'key-1' }),
    );
    expect(captured.params).toEqual({
      userId: 'me',
      requestBody: { primaryKeyPairId: 'key-1', emailAddress: 'me@example.com' },
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      emailAddress: 'me@example.com',
      primaryKeyPairId: 'key-1',
      signAndEncryptKeyPairs: { signingKeyPairId: 'sign', encryptionKeyPairId: 'encrypt' },
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [
      {},
      { emailAddress: null, primaryKeyPairId: null, signAndEncryptKeyPairs: null },
    ]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Create } =
        {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ emailAddress: 'me@example.com' }),
      );
      expect(captured.params).toEqual({
        userId: 'me',
        requestBody: { emailAddress: 'me@example.com' },
      });
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('accepts separate signing and encryption keys and rejects conflicting configurations', async () => {
    for (const signAndEncryptKeyPairs of [
      {},
      { signingKeyPairId: 'sign', encryptionKeyPairId: 'encrypt' },
    ]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Cse$Identities$Create } =
        {};
      const args = schema.input.parse({ emailAddress: 'me@example.com', signAndEncryptKeyPairs });
      const result = await handler(fakeGmail({}, captured), args);
      expect(captured.params?.requestBody).toEqual({
        emailAddress: 'me@example.com',
        signAndEncryptKeyPairs,
      });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
    expect(() =>
      schema.input.parse({
        emailAddress: 'me@example.com',
        primaryKeyPairId: 'key',
        signAndEncryptKeyPairs: {},
      }),
    ).toThrow('Supply only one');
  });
});
