import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { buildRawMessage, plainTextToHtml, projectDraft, projectMessage } from './message.js';

const decode = (raw: string) => Buffer.from(raw, 'base64url').toString('utf8');
const b64 = (s: string) => Buffer.from(s).toString('base64url');

describe('plainTextToHtml', () => {
  it.each([
    ['', ''],
    ['a\n\nb', '<p>a</p><p>b</p>'],
    ['a\nb', '<p>a<br>b</p>'],
    ['\n\na\n\n\nb\n\n', '<p>a</p><p>b</p>'],
    ['a\r\nb\r\n\r\nc', '<p>a<br>b</p><p>c</p>'],
    ['a\n \t\nb', '<p>a</p><p>b</p>'],
    [' \t\r\n \n', ''],
    [`<&"'> &amp;`, '<p>&lt;&amp;&quot;&#39;&gt; &amp;amp;</p>'],
  ])('converts %j to %j', (body, html) => {
    expect(plainTextToHtml(body)).toBe(html);
  });
});

describe('buildRawMessage', () => {
  const from = 'me@example.com';

  it('derives an HTML alternative from body, with From and To', () => {
    const out = decode(buildRawMessage({ from, to: ['a@b.com'], subject: 'S', body: 'a\n\nb' }));
    expect(out).toContain('From: <me@example.com>');
    expect(out).toContain('a@b.com');
    expect(out).toContain('Content-Type: text/plain');
    expect(out).toContain('Content-Type: multipart/alternative');
    expect(out).toContain('Content-Type: text/html');
    expect(out).toContain('\r\na\n\nb\r\n');
    expect(out).toContain('<p>a</p><p>b</p>');
  });

  it('keeps an omitted body as a single empty plain-text part', () => {
    const out = decode(buildRawMessage({ from, to: ['a@b.com'] }));
    expect(out).toContain('Content-Type: text/plain');
    expect(out).not.toContain('text/html');
    expect(out).not.toContain('multipart/');
  });

  it.each([
    '',
    '<p title="a & b">  Hello &amp; goodbye\n</p>',
  ])('preserves supplied HTML byte-for-byte: %j', (htmlBody) => {
    const out = decode(buildRawMessage({ from, to: ['a@b.com'], body: 'plain', htmlBody }));
    const html = out.match(/Content-Type: text\/html.*?\r\n\r\n(.*?)\r\n\r\n--/s);
    expect(html?.[1]).toBe(htmlBody);
    expect(out).not.toContain('<p>plain</p>');
  });

  it('adds an HTML alternative for an explicitly empty body', () => {
    const out = decode(buildRawMessage({ from, to: ['a@b.com'], body: '' }));
    expect(out).toContain('Content-Type: multipart/alternative');
    expect(out).toContain('Content-Type: text/plain');
    expect(out).toContain('Content-Type: text/html');
  });

  it('HTML only', () => {
    const out = decode(buildRawMessage({ from, to: ['a@b.com'], htmlBody: '<b>hi</b>' }));
    expect(out).toContain('Content-Type: text/html');
    expect(out).toContain('<b>hi</b>');
  });

  it('multipart/alternative when both bodies given, with cc/bcc and reply headers', () => {
    const out = decode(
      buildRawMessage({
        from,
        to: ['a@b.com'],
        cc: ['c@b.com'],
        bcc: ['d@b.com'],
        body: 'plain',
        htmlBody: '<b>hi</b>',
        inReplyTo: '<x@y>',
      }),
    );
    expect(out).toContain('Content-Type: multipart/alternative');
    expect(out).toContain('c@b.com');
    expect(out).toContain('d@b.com');
    expect(out).toContain('In-Reply-To: <x@y>');
    expect(out).toContain('References: <x@y>');
    expect(out).toContain('plain');
    expect(out).toContain('<b>hi</b>');
  });

  it('RFC 2047-encodes a non-ASCII subject (the hand-rolled builder could not)', () => {
    const out = decode(buildRawMessage({ from, to: ['a@b.com'], subject: '🚀 Launch', body: 'x' }));
    expect(out).toMatch(/Subject: =\?utf-8\?B\?/i);
    expect(out).not.toContain('Subject: 🚀 Launch');
  });

  it('multipart/mixed with an attachment part, bodies intact', () => {
    const data = Buffer.from('pdf bytes').toString('base64');
    const out = decode(
      buildRawMessage({
        from,
        to: ['a@b.com'],
        body: 'plain',
        htmlBody: '<b>hi</b>',
        attachments: [{ filename: 'packet.pdf', contentType: 'application/pdf', data }],
      }),
    );
    expect(out).toContain('Content-Type: multipart/mixed');
    expect(out).toContain('Content-Type: application/pdf; name="packet.pdf"');
    expect(out).toContain('Content-Disposition: attachment; filename="packet.pdf"');
    expect(out).toContain('Content-Transfer-Encoding: base64');
    expect(out).toContain(data);
    expect(out).toContain('plain');
    expect(out).toContain('<b>hi</b>');
  });

  it('wraps the derived alternative in multipart/mixed with attachments', () => {
    const data = Buffer.from('pdf bytes').toString('base64');
    const out = decode(
      buildRawMessage({
        from,
        to: ['a@b.com'],
        body: 'a\n\nb',
        attachments: [{ filename: 'packet.pdf', contentType: 'application/pdf', data }],
      }),
    );
    const mixed = out.match(/Content-Type: multipart\/mixed; boundary=(\w+)/);
    const alternative = out.match(/Content-Type: multipart\/alternative; boundary=(\w+)/);
    expect(mixed).not.toBeNull();
    expect(alternative).not.toBeNull();
    expect(out).toContain(`--${mixed?.[1]}\r\nContent-Type: multipart/alternative`);
    expect(out).toContain(`--${alternative?.[1]}\r\nContent-Type: text/plain`);
    expect(out).toContain(`--${alternative?.[1]}\r\nContent-Type: text/html`);
    expect(out).toContain('\r\na\n\nb\r\n');
    expect(out).toContain('<p>a</p><p>b</p>');
    expect(out).toContain(
      `--${alternative?.[1]}--\r\n--${mixed?.[1]}\r\nContent-Type: application/pdf`,
    );
    expect(out).toContain('Content-Disposition: attachment; filename="packet.pdf"');
    expect(out).toContain(data);
  });

  it('strips CR/LF from header fields to block header injection', () => {
    const out = decode(
      buildRawMessage({
        from,
        to: ['"V" <v@x.com>\r\nBcc: attacker@evil.com'],
        subject: 'hi\r\nX-Evil: yes',
        body: 'b',
      }),
    );
    expect(out).not.toMatch(/^Bcc:/im);
    expect(out).not.toMatch(/^X-Evil:/im);
  });
});

describe('projectMessage', () => {
  it('walks nested parts for both bodies and collects attachment ids', () => {
    const message: gmail_v1.Schema$Message = {
      id: 'M1',
      payload: {
        mimeType: 'multipart/mixed',
        headers: [{ name: 'From', value: 'a@b.com' }],
        parts: [
          {
            mimeType: 'multipart/alternative',
            parts: [
              { mimeType: 'text/plain', body: { data: b64('plain') } },
              { mimeType: 'text/html', body: { data: b64('<p>html</p>') } },
            ],
          },
          { mimeType: 'application/pdf', body: { attachmentId: 'ATT1' } },
        ],
      },
    };
    const result = projectMessage(message);
    expect(result).toMatchObject({
      id: 'M1',
      sender: { address: 'a@b.com' },
      plaintextBody: 'plain',
      htmlBody: '<p>html</p>',
      attachmentIds: ['ATT1'],
    });
  });
});

describe('projectMessage body extraction', () => {
  const withPayload = (payload: gmail_v1.Schema$MessagePart): gmail_v1.Schema$Message => ({
    id: 'M1',
    payload,
  });

  it('extracts an html-only message with no plaintext part', () => {
    const result = projectMessage(
      withPayload({ mimeType: 'text/html', body: { data: b64('<p>only html</p>') } }),
    );
    expect(result.htmlBody).toBe('<p>only html</p>');
    expect(result.plaintextBody).toBeUndefined();
  });

  it('collects attachment ids with no text body present', () => {
    const result = projectMessage(
      withPayload({
        mimeType: 'multipart/mixed',
        parts: [{ mimeType: 'application/pdf', body: { attachmentId: 'ATT1' } }],
      }),
    );
    expect(result.attachmentIds).toEqual(['ATT1']);
    expect(result.plaintextBody).toBeUndefined();
    expect(result.htmlBody).toBeUndefined();
  });

  it('treats an empty body as no body', () => {
    const result = projectMessage(withPayload({ mimeType: 'text/plain', body: { data: b64('') } }));
    expect(result.plaintextBody).toBeUndefined();
  });

  it('ignores a part whose mimeType is absent', () => {
    const result = projectMessage(withPayload({ body: { data: b64('orphan') } }));
    expect(result.plaintextBody).toBeUndefined();
    expect(result.htmlBody).toBeUndefined();
  });

  it('finds a text/plain part nested several levels deep', () => {
    const result = projectMessage(
      withPayload({
        mimeType: 'multipart/mixed',
        parts: [
          {
            mimeType: 'multipart/related',
            parts: [
              {
                mimeType: 'multipart/alternative',
                parts: [{ mimeType: 'text/plain', body: { data: b64('deep') } }],
              },
            ],
          },
        ],
      }),
    );
    expect(result.plaintextBody).toBe('deep');
  });

  it('round-trips a non-ASCII body through base64url decoding', () => {
    const body = 'café ☕ 日本語';
    const result = projectMessage(
      withPayload({ mimeType: 'text/plain', body: { data: b64(body) } }),
    );
    expect(result.plaintextBody).toBe(body);
  });

  it('handles a message with no payload', () => {
    const result = projectMessage({ id: 'M1' });
    expect(result.attachmentIds).toBeUndefined();
    expect(result.plaintextBody).toBeUndefined();
    expect(result.toRecipients).toEqual([]);
    expect(result.sender).toBeUndefined();
  });
});

describe('projectMessage hostile-input guards', () => {
  it('bounds an oversized address header instead of parsing all of it', () => {
    const value = 'a@b.com,'.repeat(20_000); // ~160KB, over the 100KB cap
    const result = projectMessage({ id: 'M1', payload: { headers: [{ name: 'To', value }] } });
    expect(result.toRecipients?.length).toBeLessThan(20_000); // truncated before parse
    expect(result.toRecipients?.[0]).toEqual({ address: 'a@b.com' });
  });

  it('stops flattening pathologically nested address groups', () => {
    const value = `${'g:'.repeat(200)}a@b.com${';'.repeat(200)}`;
    const result = projectMessage({ id: 'M1', payload: { headers: [{ name: 'To', value }] } });
    expect(result.toRecipients).toEqual([]); // leaf is past the group-depth cap
  });

  it('stops walking a pathologically deep MIME tree', () => {
    let part: gmail_v1.Schema$MessagePart = {
      mimeType: 'application/pdf',
      body: { attachmentId: 'DEEP' },
    };
    for (let i = 0; i < 150; i += 1) {
      part = { mimeType: 'multipart/mixed', parts: [part] };
    }
    const result = projectMessage({ id: 'M1', payload: part });
    expect(result.attachmentIds).toBeUndefined(); // leaf is past the depth cap
  });
});

describe('projectMessage address parsing', () => {
  const withHeaders = (headers: { name: string; value: string }[]): gmail_v1.Schema$Message => ({
    id: 'M1',
    payload: { headers },
  });

  it('keeps a comma in a quoted display name as one address', () => {
    const result = projectMessage(
      withHeaders([{ name: 'To', value: '"Doe, John" <john@x.com>, jane@y.com' }]),
    );
    expect(result.toRecipients).toEqual([
      { name: 'Doe, John', address: 'john@x.com' },
      { address: 'jane@y.com' },
    ]);
  });

  it('keeps the sender display name alongside the address', () => {
    const result = projectMessage(withHeaders([{ name: 'From', value: 'Jane Roe <jane@y.com>' }]));
    expect(result.sender).toEqual({ name: 'Jane Roe', address: 'jane@y.com' });
  });

  it('flattens an RFC 5322 group into its member addresses', () => {
    const result = projectMessage(withHeaders([{ name: 'Cc', value: 'Team: a@x.com, b@y.com;' }]));
    expect(result.ccRecipients).toEqual([{ address: 'a@x.com' }, { address: 'b@y.com' }]);
  });

  it('yields empty recipient lists for absent headers', () => {
    const result = projectMessage(withHeaders([]));
    expect(result.toRecipients).toEqual([]);
    expect(result.ccRecipients).toEqual([]);
    expect(result.sender).toBeUndefined();
  });
});

describe('projectDraft', () => {
  it('handles a missing message gracefully', () => {
    expect(projectDraft({ id: 'D1' })).toMatchObject({
      id: 'D1',
      toRecipients: [],
      ccRecipients: [],
      bccRecipients: [],
    });
  });
});
