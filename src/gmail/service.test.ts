import { describe, expect, it } from 'bun:test';
import { fakeCredentials } from '../lib/testing/fake-credentials.js';
import { service } from './service.js';

describe('gmail service definition', () => {
  it('names the service and carries its merged operations and instructions', () => {
    expect(service.name).toBe('gmail');
    expect(Object.keys(service.operations).length).toBeGreaterThan(0);
    expect(service.instructions).toBeTruthy();
    expect(service.runAuth).toBeDefined();
    expect(service.staleCredentials).toBeDefined();
  });

  it('builds the Gmail client for an account from its stored token', async () => {
    const restore = fakeCredentials('someone');
    try {
      const client = await service.client('someone');
      expect(client.users).toBeDefined();
    } finally {
      restore();
    }
  });
});
