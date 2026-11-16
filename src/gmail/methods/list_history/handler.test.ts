import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: object,
  captured: { params?: gmail_v1.Params$Resource$Users$History$List },
): gmail_v1.Gmail {
  return {
    users: {
      history: {
        list: async (params: gmail_v1.Params$Resource$Users$History$List) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('list_history', () => {
  it('passes exact account parameters and projects documented output', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$History$List } = {};
    const result = await handler(
      fakeGmail(
        {
          history: [
            {
              id: '123',
              messages: [{ id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] }],
              messagesAdded: [
                { message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] } },
              ],
              messagesDeleted: [
                { message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] } },
              ],
              labelsAdded: [
                {
                  message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] },
                  labelIds: ['INBOX'],
                },
              ],
              labelsRemoved: [
                {
                  message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] },
                  labelIds: ['TRASH'],
                },
              ],
            },
          ],
          nextPageToken: 'after',
          historyId: '150',
        },
        captured,
      ),
      schema.input.parse({
        startHistoryId: '100',
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
        labelId: 'INBOX',
        maxResults: 500,
        pageToken: 'next',
      }),
    );
    expect(captured.params).toEqual({
      userId: 'me',
      startHistoryId: '100',
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
      labelId: 'INBOX',
      maxResults: 500,
      pageToken: 'next',
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      history: [
        {
          id: '123',
          messages: [{ id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] }],
          messagesAdded: [
            { message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] } },
          ],
          messagesDeleted: [
            { message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] } },
          ],
          labelsAdded: [
            {
              message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] },
              labelIds: ['INBOX'],
            },
          ],
          labelsRemoved: [
            {
              message: { id: 'message-1', threadId: 'thread-1', labelIds: ['INBOX'] },
              labelIds: ['TRASH'],
            },
          ],
        },
      ],
      nextPageToken: 'after',
      historyId: '150',
    });
    expect(() => schema.output.parse(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain('write-only');
    expect(JSON.stringify(result)).not.toContain('input-only');
  });
  it('omits optional inputs and normalizes absent or null output fields', async () => {
    for (const data of [{}, { history: null, nextPageToken: null, historyId: null }]) {
      const captured: { params?: gmail_v1.Params$Resource$Users$History$List } = {};
      const result = await handler(
        fakeGmail(data, captured),
        schema.input.parse({ startHistoryId: '100' }),
      );
      expect(captured.params).toEqual({ userId: 'me', startHistoryId: '100' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({ history: [] });
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
  it('normalizes incomplete change records and stubs without extra fetches', async () => {
    const changes = [
      {},
      { message: null, labelIds: null },
      { message: {}, labelIds: [] },
      { message: { id: null, threadId: null, labelIds: null } },
    ];
    const result = await handler(
      fakeGmail(
        {
          history: [
            {},
            {
              id: null,
              messages: null,
              messagesAdded: null,
              messagesDeleted: null,
              labelsAdded: null,
              labelsRemoved: null,
            },
            {
              messages: [{}],
              messagesAdded: changes,
              messagesDeleted: changes,
              labelsAdded: changes,
              labelsRemoved: changes,
            },
          ],
        },
        {},
      ),
      { startHistoryId: '100' },
    );
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      history: [
        {},
        {},
        {
          messages: [{}],
          messagesAdded: [{}, {}, { message: {} }, { message: {} }],
          messagesDeleted: [{}, {}, { message: {} }, { message: {} }],
          labelsAdded: [{}, {}, { message: {}, labelIds: [] }, { message: {} }],
          labelsRemoved: [{}, {}, { message: {}, labelIds: [] }, { message: {} }],
        },
      ],
    });
    expect(() => schema.output.parse(result)).not.toThrow();
  });
  it('propagates an expired checkpoint 404 for the caller to perform a full sync', async () => {
    const error = Object.assign(new Error('History not found'), { code: 404 });
    const gmail = {
      users: {
        history: {
          list: async () => {
            throw error;
          },
        },
      },
    } as unknown as gmail_v1.Gmail;
    await expect(handler(gmail, { startHistoryId: 'expired' })).rejects.toBe(error);
  });
  it('rejects invalid pagination and unknown history types', () => {
    for (const extra of [
      { maxResults: 0 },
      { maxResults: 501 },
      { maxResults: 1.5 },
      { historyTypes: ['future'] },
    ]) {
      expect(() => schema.input.parse({ startHistoryId: '100', ...extra })).toThrow();
    }
    expect(() => schema.input.parse({})).toThrow();
  });
});
