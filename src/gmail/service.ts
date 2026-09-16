import { gmail, type gmail_v1 } from '@googleapis/gmail';
import { authorizedClient, isInvalidGrant, runAuthFlow } from '../auth/oauth.js';
import { mergeOperations } from '../lib/operation.js';
import type { ServiceDefinition } from '../lib/server.js';
import { instructions } from './instructions.js';
import { methods } from './methods/registry.js';
import { tools } from './tools/registry.js';

// Cloning this for a new service? Add that service's OAuth scopes to `SCOPES` in
// src/auth/config.ts BEFORE the first auth. The scope union is front-loaded so each
// account consents once, and Google only re-issues a refresh token on a fresh grant;
// adding a scope later forces re-consent of every account. Nothing in this file
// references scopes, which is exactly why it is easy to miss.
export const service: ServiceDefinition<gmail_v1.Gmail> = {
  name: 'gmail',
  title: 'Gmail (google-mcp-suite)',
  description:
    'Per-account Gmail MCP server: threads, messages, drafts, labels, filters, and attachments.',
  instructions,
  operations: mergeOperations(tools, methods),
  client: async (account) => gmail({ version: 'v1', auth: await authorizedClient(account) }),
  runAuth: runAuthFlow,
  staleCredentials: isInvalidGrant,
};
