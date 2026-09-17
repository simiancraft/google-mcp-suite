import { describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
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

describe('dependency direction', () => {
  it('limits host imports to service definitions, auth, lib, and the dispatch drift test', () => {
    const root = resolve(import.meta.dir, '..');
    const transpiler = new Bun.Transpiler({ loader: 'ts' });
    for (const file of new Bun.Glob('host/*.ts').scanSync(root)) {
      for (const imported of transpiler.scanImports(
        readFileSync(resolve(root, file), 'utf8').replace(/^#![^\n]*\n/, ''),
      )) {
        if (!imported.path.startsWith('.')) continue;
        const target = relative(root, resolve(root, dirname(file), imported.path));
        const allowed =
          target.startsWith('host/') ||
          target.startsWith('auth/') ||
          target.startsWith('lib/') ||
          Object.keys(services).some((name) => target === `${name}/service.js`) ||
          (file === 'host/services.test.ts' && target === 'suite/dispatch.js');
        expect({ file, target, allowed }).toEqual({ file, target, allowed: true });
      }
    }
  });

  it('prevents services from importing host', () => {
    const root = resolve(import.meta.dir, '..');
    const transpiler = new Bun.Transpiler({ loader: 'ts' });
    for (const name of Object.keys(services)) {
      for (const file of new Bun.Glob(`${name}/**/*.ts`).scanSync(root)) {
        for (const imported of transpiler.scanImports(
          readFileSync(resolve(root, file), 'utf8').replace(/^#![^\n]*\n/, ''),
        )) {
          if (!imported.path.startsWith('.')) continue;
          const target = relative(root, resolve(root, dirname(file), imported.path));
          expect({ file, importsHost: target.startsWith('host/') }).toEqual({
            file,
            importsHost: false,
          });
        }
      }
    }
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
