import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: Omit<gmail_v1.Schema$SendAs, 'smtpMsa'> & { smtpMsa?: gmail_v1.Schema$SmtpMsa | null },
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Sendas$Update },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        sendAs: {
          update: async (params: gmail_v1.Params$Resource$Users$Settings$Sendas$Update) => {
            captured.params = params;
            return { data };
          },
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('update_send_as', () => {
  it('passes exact account parameters and projects the resource', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Sendas$Update } = {};
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
    const result = await handler(
      fakeGmail(data, captured),
      schema.input.parse({
        sendAsEmail: 'me@example.com',
        displayName: 'Name',
        replyToAddress: 'reply@example.com',
        signature: '<p>Hello</p>',
        isDefault: true,
      }),
    );
    expect(captured.params).toEqual({
      userId: 'me',
      sendAsEmail: 'me@example.com',
      requestBody: {
        displayName: 'Name',
        replyToAddress: 'reply@example.com',
        signature: '<p>Hello</p>',
        isDefault: true,
      },
    });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });
  it('drops null and absent resource fields', async () => {
    for (const data of [
      {},
      {
        sendAsEmail: null,
        displayName: null,
        replyToAddress: null,
        signature: null,
        isPrimary: null,
        isDefault: null,
        treatAsAlias: null,
        smtpMsa: null,
        verificationStatus: null,
      },
    ]) {
      const result = await handler(
        fakeGmail(data, {}),
        schema.input.parse({
          sendAsEmail: 'me@example.com',
          displayName: 'Name',
          replyToAddress: 'reply@example.com',
          signature: '<p>Hello</p>',
          isDefault: true,
        }),
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
        schema.input.parse({
          sendAsEmail: 'me@example.com',
          displayName: 'Name',
          replyToAddress: 'reply@example.com',
          signature: '<p>Hello</p>',
          isDefault: true,
        }),
      );
      const projected = result;
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
      const result = await handler(
        fakeGmail(data, {}),
        schema.input.parse({
          sendAsEmail: 'me@example.com',
          displayName: 'Name',
          replyToAddress: 'reply@example.com',
          signature: '<p>Hello</p>',
          isDefault: true,
        }),
      );
      const projected = result;
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
  it('sends only supplied writable fields and keeps the path out of the body', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Sendas$Update } = {};
    const result = await handler(fakeGmail({}, captured), {
      sendAsEmail: 'me@example.com',
      signature: '',
    });
    expect(captured.params).toEqual({
      userId: 'me',
      sendAsEmail: 'me@example.com',
      requestBody: { signature: '' },
    });
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('rejects read-only fields, custom alias settings, and false isDefault', () => {
    for (const fields of [
      { smtpMsa: { password: 'write-only-secret' } },
      { treatAsAlias: true },
      { isPrimary: true },
      { verificationStatus: 'accepted' },
      { isDefault: false },
      { unknown: true },
    ]) {
      expect(() => schema.input.parse({ sendAsEmail: 'me@example.com', ...fields })).toThrow();
    }
  });
});
