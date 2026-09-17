import { sheets, type sheets_v4 } from '@googleapis/sheets';
import { authorizedClient, isInvalidGrant, runAuthFlow } from '../auth/oauth.js';
import { mergeOperations } from '../lib/operation.js';
import type { ServiceDefinition } from '../lib/server.js';
import { instructions } from './instructions.js';
import { methods } from './methods/registry.js';

// Cloning this for a new service? Add that service's OAuth scopes to `SCOPES` in
// src/auth/config.ts BEFORE the first auth. The scope union is front-loaded so each
// account consents once, and Google only re-issues a refresh token on a fresh grant;
// adding a scope later forces re-consent of every account. Nothing in this file
// references scopes, which is exactly why it is easy to miss.
//
// Sheets is methods-only: Google publishes no MCP toolset for Sheets (its
// MCP-supported products are Gmail, Drive, Calendar, Chat, and People), so there
// is no tools/ folder and the REST-sourced methods are the whole surface.
export const service: ServiceDefinition<sheets_v4.Sheets> = {
  name: 'sheets',
  title: 'Google Sheets (google-mcp-suite)',
  description:
    'Per-account Google Sheets MCP server: spreadsheets, values, batch and data-filter reads and writes, and developer metadata.',
  instructions,
  operations: mergeOperations(methods),
  client: async (account) => sheets({ version: 'v4', auth: await authorizedClient(account) }),
  runAuth: runAuthFlow,
  staleCredentials: isInvalidGrant,
};
