import { drive, type drive_v3 } from '@googleapis/drive';
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
export const service: ServiceDefinition<drive_v3.Drive> = {
  name: 'drive',
  title: 'Google Drive (google-mcp-suite)',
  description:
    'Per-account Google Drive MCP server: files, comments, revisions, and shared drives.',
  instructions,
  operations: mergeOperations(tools, methods),
  client: async (account) => drive({ version: 'v3', auth: await authorizedClient(account) }),
  runAuth: runAuthFlow,
  staleCredentials: isInvalidGrant,
};
