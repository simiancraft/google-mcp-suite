import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { MAX_DOWNLOAD_BYTES } from '../../../lib/limits.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$Messages$Import },
): gmail_v1.Gmail {
  return {
    users: {
      messages: {
        import: async (params: gmail_v1.Params$Resource$Users$Messages$Import) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('import_message', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Messages$Import } = {};
    const result = await handler(
      fakeGmail(
        {
          id: 'message-1',
          snippet: 'hello',
          raw: 'do-not-return',
          payload: { headers: [{ name: 'Subject', value: 'Imported' }] },
        },
        captured,
      ),
      schema.input.parse({
        raw: 'RnJvbTogbWVAZXhhbXBsZS5jb20NCg0KaGVsbG8',
        labelIds: ['INBOX'],
        internalDateSource: 'dateHeader',
        deleted: true,
        neverMarkSpam: true,
        processForCalendar: true,
      }),
    );
    expect(captured.params).toEqual({
      userId: 'me',
      internalDateSource: 'dateHeader',
      deleted: true,
      neverMarkSpam: true,
      processForCalendar: true,
      requestBody: { raw: 'RnJvbTogbWVAZXhhbXBsZS5jb20NCg0KaGVsbG8', labelIds: ['INBOX'] },
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      id: 'message-1',
      snippet: 'hello',
      subject: 'Imported',
      toRecipients: [],
      ccRecipients: [],
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [{}, { id: null, snippet: null, raw: null, payload: null }]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$Messages$Import } = {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ raw: 'RnJvbTogbWVAZXhhbXBsZS5jb20NCg0KaGVsbG8' }),
      );
      expect(captured.params).toEqual({
        userId: 'me',
        requestBody: { raw: 'RnJvbTogbWVAZXhhbXBsZS5jb20NCg0KaGVsbG8' },
      });
      expect(JSON.parse(JSON.stringify(result))).toEqual({
        id: '',
        toRecipients: [],
        ccRecipients: [],
      });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('enforces the decoded transfer cap before calling Gmail, allowing the boundary', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Messages$Import } = {};
    const gmail = fakeGmail({ id: 'message' }, captured);
    const raw = Buffer.alloc(MAX_DOWNLOAD_BYTES).toString('base64url');
    const result = await handler(gmail, { raw });
    expect(captured.params?.requestBody?.raw).toBe(raw);
    expect(() => schema.output.parse(result)).not.toThrow();
    delete captured.params;
    await expect(
      handler(gmail, { raw: Buffer.alloc(MAX_DOWNLOAD_BYTES + 1).toString('base64url') }),
    ).rejects.toThrow('caps decoded message transfers');
    expect(captured.params).toBeUndefined();
  });
  it('validates raw base64url, date sources, and optional false flags', async () => {
    for (const raw of ['', 'a', 'ab+c', 'ab/c', 'ab c', 'abcd===']) {
      expect(() => schema.input.parse({ raw })).toThrow();
    }
    for (const raw of ['YQ', 'YQ==', 'YWI', 'YWI=', 'YWJj', '-_8']) {
      expect(schema.input.parse({ raw }).raw).toBe(raw);
    }
    expect(() => schema.input.parse({ raw: 'YQ', internalDateSource: 'unspecified' })).toThrow();
    const captured: { params?: gmail_v1.Params$Resource$Users$Messages$Import } = {};
    const result = await handler(
      fakeGmail({}, captured),
      schema.input.parse({
        raw: 'YQ',
        internalDateSource: 'receivedTime',
        deleted: false,
        neverMarkSpam: false,
        processForCalendar: false,
      }),
    );
    expect(captured.params).toEqual({
      userId: 'me',
      internalDateSource: 'receivedTime',
      deleted: false,
      neverMarkSpam: false,
      processForCalendar: false,
      requestBody: { raw: 'YQ' },
    });
    expect(() => schema.output.parse(result)).not.toThrow();
  });
});
