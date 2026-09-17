#!/usr/bin/env node
import { server } from '../lib/server.js';
import { service } from './service.js';

// The stdio bin: one process bound to GOOGLE_MCP_ACCOUNT. The definition lives
// in service.ts so the shared HTTP host (src/host) can serve the same surface.
await server(service);
