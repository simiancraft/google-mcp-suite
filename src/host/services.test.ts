import { describe, expect, it, mock } from 'bun:test';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { operation } from '../lib/operation.js';
import { services as dispatchable } from '../suite/dispatch.js';
import { factory, services } from './services.js';

describe('services', () => {
  it('serves exactly the services the suite dispatches', () => {
    expect(Object.keys(services).sort()).toEqual([...dispatchable].sort());
  });
});

describe('factory', () => {
  it('builds a Server for the account it is given, through the definition client', async () => {
    const client = mock(async (account: string | undefined) => ({ account }));
    const echo = operation({
      description: 'Echo the bound account.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      source: 'https://developers.google.com/example/reference/rest/v1/things/read',
      schema: { input: z.object({}), output: z.object({ account: z.string() }) },
      handler: async (c: { account: string | undefined }) => ({ account: c.account ?? '' }),
    });
    const build = factory({ name: 'fake', operations: { echo }, client });
    const server = await build('work');
    expect(server).toBeInstanceOf(Server);
    expect(client).toHaveBeenCalledWith('work');
  });
});
