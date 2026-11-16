import { describe, expect, it, mock, spyOn } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { isInvalidGrant } from '../auth/oauth.js';
import { operation, SOURCE_META_KEY } from './operation.js';
import { callOperation, server, toolDefinitions } from './server.js';

type FakeClient = { upper: (s: string) => string };

const echo = operation({
  description: 'Uppercase a string.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/read',
  schema: { input: z.object({ text: z.string() }), output: z.object({ shouted: z.string() }) },
  handler: async (client: FakeClient, args) => ({ shouted: client.upper(args.text) }),
});

const boom = operation({
  description: 'Always throws.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/read',
  schema: { input: z.object({}), output: z.object({}) },
  handler: async (_client: FakeClient) => {
    throw new Error('kaboom');
  },
});

const danger = operation({
  description: 'Irreversible.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/delete',
  schema: { input: z.object({ id: z.string() }), output: z.object({ ok: z.boolean() }) },
  handler: async (_client: FakeClient) => ({ ok: true }),
});

const liar = operation({
  description: 'Returns a shape its own output schema rejects.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/read',
  schema: { input: z.object({}), output: z.object({ shouted: z.string() }) },
  handler: async (_client: FakeClient) => ({ shouted: 42 }) as never,
});

const send = operation({
  description: 'Irreversible and not idempotent; a retry would double the side effect.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/send',
  schema: { input: z.object({}), output: z.object({ sent: z.boolean() }) },
  handler: async (client: FakeClient) => ({ sent: client.upper('x') === 'X' }),
});

const purge = operation({
  description: 'Destructive but idempotent; a retry converges to the same state.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/delete',
  schema: { input: z.object({}), output: z.object({ gone: z.boolean() }) },
  handler: async (client: FakeClient) => ({ gone: client.upper('x') === 'X' }),
});

const impostor = operation({
  description: 'Throws a plain error whose message merely says invalid_grant.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/read',
  schema: { input: z.object({}), output: z.object({}) },
  handler: async (_client: FakeClient) => {
    throw new Error('invalid_grant');
  },
});

const operations = { echo, boom, liar };
const client: FakeClient = { upper: (s) => s.toUpperCase() };

describe('callOperation', () => {
  it('validates input, runs the handler, and returns structuredContent', async () => {
    const result = await callOperation(operations, client, 'echo', { text: 'hi' });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ shouted: 'HI' });
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });

  it('returns an error result for an unknown operation', async () => {
    const result = await callOperation(operations, client, 'nope', {});
    expect(result.isError).toBe(true);
  });

  it('treats inherited Object keys as unknown operations, not dispatch targets', async () => {
    for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      const result = await callOperation(operations, client, name, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        text: expect.stringContaining(`Unknown tool: ${name}`),
      });
    }
  });

  it('returns a prettified error result for invalid input', async () => {
    const result = await callOperation(operations, client, 'echo', { text: 42 });
    expect(result.isError).toBe(true);
    // prettifyError, not the raw ZodError JSON dump: one issue per line with a path.
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Invalid arguments for echo:');
    expect(text).toMatch(/✖ .*\n\s*→ at text/);
  });

  it('returns a prettified error result for invalid handler output', async () => {
    const result = await callOperation(operations, client, 'liar', {});
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Invalid output from liar:');
    expect(text).toMatch(/→ at shouted/);
  });

  it('returns an error result when the handler throws', async () => {
    const result = await callOperation(operations, client, 'boom', {});
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ text: expect.stringContaining('kaboom') });
  });
});

describe('toolDefinitions', () => {
  it('emits input and output JSON Schema and the declared annotations', () => {
    const defs = toolDefinitions({ echo, danger });
    const echoDef = defs.find((d) => d.name === 'echo');
    const dangerDef = defs.find((d) => d.name === 'danger');

    expect(echoDef?.inputSchema).toBeDefined();
    expect(echoDef?.outputSchema).toBeDefined();
    expect(echoDef?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(dangerDef?.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('emits the source citation under the namespaced _meta key', () => {
    const defs = toolDefinitions({ echo, danger });
    const dangerDef = defs.find((d) => d.name === 'danger');
    const echoDef = defs.find((d) => d.name === 'echo');
    expect(dangerDef?._meta).toEqual({
      [SOURCE_META_KEY]: 'https://developers.google.com/example/reference/rest/v1/things/delete',
    });
    expect(echoDef?._meta).toEqual({
      [SOURCE_META_KEY]: 'https://developers.google.com/example/reference/rest/v1/things/read',
    });
  });

  it('emits declared tool annotations verbatim', () => {
    const reader = operation({
      description: 'Reads things.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      source: 'https://developers.google.com/example/reference/rest/v1/things/read',
      schema: { input: z.object({}), output: z.object({}) },
      handler: async (_client: FakeClient) => ({}),
    });
    const defs = toolDefinitions({ reader });
    expect(defs[0]?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });
});

describe('server', () => {
  it('serves operations over a transport: lists and dispatches through the protocol', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { echo },
      client: async () => client,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const list = await mcp.listTools();
    expect(list.tools.map((t) => t.name)).toContain('echo');
    // The _meta citation must survive the SDK's wire parsing, not just the
    // pure toolDefinitions shape; an SDK that stripped it would fail here.
    expect(list.tools[0]?._meta).toEqual({
      [SOURCE_META_KEY]: 'https://developers.google.com/example/reference/rest/v1/things/read',
    });

    const res = await mcp.callTool({ name: 'echo', arguments: { text: 'hi' } });
    expect(res.structuredContent).toEqual({ shouted: 'HI' });

    await mcp.close();
  });

  it('serves identity metadata and instructions through the initialize result', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      title: 'Test (google-mcp-suite)',
      description: 'A test server.',
      instructions: 'Bound to one account; see tools/list.',
      operations: { echo },
      client: async () => client,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    expect(mcp.getServerVersion()).toMatchObject({
      name: 'test',
      title: 'Test (google-mcp-suite)',
      description: 'A test server.',
      websiteUrl: 'https://github.com/simiancraft/google-mcp-suite#readme',
    });
    expect(mcp.getInstructions()).toBe('Bound to one account; see tools/list.');

    await mcp.close();
  });

  it('runs the auth flow and exits on the `auth` subcommand', async () => {
    const argv = process.argv;
    process.argv = ['node', 'script', 'auth', 'someone@example.com'];
    const exitSpy = spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const runAuth = mock(async () => {});
    try {
      await expect(
        server({ name: 'test', operations: {}, client: async () => client, runAuth }),
      ).rejects.toThrow('exit:0');
      expect(runAuth).toHaveBeenCalledWith('someone@example.com');
    } finally {
      process.argv = argv;
      exitSpy.mockRestore();
    }
  });

  it('exits with an error when the auth subcommand has no flow configured', async () => {
    const argv = process.argv;
    process.argv = ['node', 'script', 'auth'];
    const exitSpy = spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        server({ name: 'test', operations: {}, client: async () => client }),
      ).rejects.toThrow('exit:1');
    } finally {
      process.argv = argv;
      exitSpy.mockRestore();
      errSpy.mockRestore();
    }
  });
});

describe('stale-credential healing', () => {
  const staleError = () =>
    Object.assign(new Error('invalid_grant'), { response: { data: { error: 'invalid_grant' } } });
  const stale: FakeClient = {
    upper: () => {
      throw staleError();
    },
  };

  it('rebuilds from disk and retries a read-only call once on certified stale credentials', async () => {
    const builds = [stale, client];
    const factory = mock(async () => builds.shift() ?? client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { echo },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'echo', arguments: { text: 'hi' } });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual({ shouted: 'HI' });
    expect(factory).toHaveBeenCalledTimes(2);

    await mcp.close();
  });

  it('returns the envelope after a single retry when the rebuilt client is still stale', async () => {
    const factory = mock(async () => stale);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { echo },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'echo', arguments: { text: 'hi' } });
    expect(res.isError).toBe(true);
    expect((res.content as [{ text: string }])[0].text).toContain('invalid_grant');
    expect((res.content as [{ text: string }])[0].text).toContain(
      'An AI agent can run google-mcp-doctor auth',
    );
    expect(factory).toHaveBeenCalledTimes(2);

    await mcp.close();
  });

  it('rebuilds but never re-executes a non-idempotent destructive operation', async () => {
    const upper = mock((s: string) => s.toUpperCase());
    const healed: FakeClient = { upper };
    const builds = [stale, healed];
    const factory = mock(async () => builds.shift() ?? healed);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { send },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'send', arguments: {} });
    expect(res.isError).toBe(true);
    expect((res.content as [{ text: string }])[0].text).toContain('retry send');
    expect(factory).toHaveBeenCalledTimes(2);
    expect(upper).toHaveBeenCalledTimes(0);

    await mcp.close();
  });

  it('retries a destructive operation when its annotations declare it idempotent', async () => {
    const builds = [stale, client];
    const factory = mock(async () => builds.shift() ?? client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { purge },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'purge', arguments: {} });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual({ gone: true });
    expect(factory).toHaveBeenCalledTimes(2);

    await mcp.close();
  });

  it('returns the rebuild error inside the envelope when the token cannot be reloaded', async () => {
    let first = true;
    const factory = mock(async () => {
      if (first) {
        first = false;
        return stale;
      }
      throw new Error('no token on disk for personal');
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { echo },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'echo', arguments: { text: 'hi' } });
    expect(res.isError).toBe(true);
    expect((res.content as [{ text: string }])[0].text).toContain('no token on disk');
    expect(factory).toHaveBeenCalledTimes(2);

    await mcp.close();
  });

  it('does not rebuild for errors the predicate does not certify', async () => {
    const factory = mock(async () => client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { boom },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'boom', arguments: {} });
    expect(res.isError).toBe(true);
    expect((res.content as [{ text: string }])[0].text).toContain('kaboom');
    expect(factory).toHaveBeenCalledTimes(1);

    await mcp.close();
  });

  it('does not rebuild when an error merely mentions invalid_grant in its message', async () => {
    const factory = mock(async () => client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server({
      name: 'test',
      operations: { impostor },
      client: factory,
      staleCredentials: isInvalidGrant,
      transport: serverTransport,
    });

    const mcp = new Client({ name: 'test-client', version: '0' });
    await mcp.connect(clientTransport);

    const res = await mcp.callTool({ name: 'impostor', arguments: {} });
    expect(res.isError).toBe(true);
    expect((res.content as [{ text: string }])[0].text).toContain('invalid_grant');
    expect(factory).toHaveBeenCalledTimes(1);

    await mcp.close();
  });
});
