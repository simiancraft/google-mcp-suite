import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: { sendAs?: gmail_v1.Schema$SendAs[] | null },
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Sendas$List },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        sendAs: {
          list: async (params: gmail_v1.Params$Resource$Users$Settings$Sendas$List) => {
            captured.params = params;
            return { data };
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('list_send_as', () => {
  it('passes exact account parameters and projects the resource', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Sendas$List } = {};
    const data = {
      sendAsEmail: 'me@example.com',
      displayName: 'Name',
      replyToAddress: 'reply@example.com',
      signature: '<p>Hello</p>',
      isPrimary: true,
      isDefault: true,
      treatAsAlias: false,
      smtpMsa: { host: 'smtp.example.com', port: 465, securityMode: 'ssl' },
      verificationStatus: 'accepted',
    } as const;
    const result = await handler(fakeGmail({ sendAs: [data] }, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual({ sendAs: [data] });
    expect(() => schema.output.parse(result)).not.toThrow();
  });
  it('normalizes absent, null, and empty collections', async () => {
    for (const data of [{}, { sendAs: null }, { sendAs: [] }]) {
      const result = await handler(fakeGmail(data, {}));
      expect(result).toEqual({ sendAs: [] });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('drops unknown and unspecified verification enums', async () => {
    for (const verificationStatus of ['futureValue', 'verificationStatusUnspecified', 'pending']) {
      const data = { verificationStatus };
      const result = await handler(fakeGmail({ sendAs: [data] }, {}));
      const projected = result.sendAs[0];
      expect(projected?.verificationStatus).toBe(
        verificationStatus === 'pending' ? 'pending' : undefined,
      );
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('omits write-only SMTP credentials and narrows transport enums', async () => {
    for (const smtpMsa of [
      {},
      { host: null, port: null, securityMode: null },
      ...['none', 'ssl', 'starttls', 'futureValue', 'securityModeUnspecified'].map(
        (securityMode) => ({
          host: 'smtp.example.com',
          port: 25,
          securityMode,
          username: 'write-only-user',
          password: 'write-only-secret',
        }),
      ),
    ]) {
      const data = { smtpMsa };
      const result = await handler(fakeGmail({ sendAs: [data] }, {}));
      const projected = result.sendAs[0];
      expect(projected?.smtpMsa).toEqual({
        host: 'host' in smtpMsa ? (smtpMsa.host ?? undefined) : undefined,
        port: 'port' in smtpMsa ? (smtpMsa.port ?? undefined) : undefined,
        securityMode:
          'securityMode' in smtpMsa &&
          (smtpMsa.securityMode === 'none' ||
            smtpMsa.securityMode === 'ssl' ||
            smtpMsa.securityMode === 'starttls')
            ? smtpMsa.securityMode
            : undefined,
      });
      expect(JSON.stringify(result)).not.toContain('write-only');
      expect(projected?.smtpMsa).not.toHaveProperty('password');
      expect(projected?.smtpMsa).not.toHaveProperty('username');
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
