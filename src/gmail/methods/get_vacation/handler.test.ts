import { describe, expect, it } from 'bun:test';
import type { gmail_v1 } from '@googleapis/gmail';
import { handler } from './handler.js';
import { schema } from './schema.js';

function fakeGmail(
  data: gmail_v1.Schema$VacationSettings,
  captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getvacation },
): gmail_v1.Gmail {
  return {
    users: {
      settings: {
        getVacation: async (params: gmail_v1.Params$Resource$Users$Settings$Getvacation) => {
          captured.params = params;
          return { data };
        },
      },
    },
  } as unknown as gmail_v1.Gmail;
}

describe('get_vacation', () => {
  it('passes the account parameters and projects the settings', async () => {
    const captured: { params?: gmail_v1.Params$Resource$Users$Settings$Getvacation } = {};
    const data = {
      enableAutoReply: true,
      responseSubject: 'Away',
      responseBodyPlainText: 'Back soon',
      responseBodyHtml: '<p>Back soon</p>',
      restrictToContacts: false,
      restrictToDomain: false,
      startTime: '1800000000000',
      endTime: '1800600000000',
    } as const;
    const result = await handler(fakeGmail(data, captured));
    expect(captured.params).toEqual({ userId: 'me' });
    expect(result).toEqual(data);
    expect(() => schema.output.parse(result)).not.toThrow();
  });

  it('drops null and absent fields', async () => {
    for (const data of [
      {},
      {
        enableAutoReply: null,
        responseSubject: null,
        responseBodyPlainText: null,
        responseBodyHtml: null,
        restrictToContacts: null,
        restrictToDomain: null,
        startTime: null,
        endTime: null,
      },
    ]) {
      const result = await handler(fakeGmail(data, {}));
      expect(JSON.parse(JSON.stringify(result))).toEqual({});
      expect(() => schema.output.parse(result)).not.toThrow();
    }
  });
});
