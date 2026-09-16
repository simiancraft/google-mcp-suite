import { describe, expect, it } from 'bun:test';
import pkg from '../../package.json' with { type: 'json' };
import { SCOPES } from '../auth/config.js';
import { requiredApis, requiredScopes, SERVICES, scopeRegistryDrift } from './services.js';

describe('scopeRegistryDrift', () => {
  it('is clean: the registry matches the canonical SCOPES', () => {
    const drift = scopeRegistryDrift([...SCOPES]);
    expect(drift.missing).toEqual([]);
    expect(drift.extra).toEqual([]);
  });

  it('reports scopes declared but not canonical (extra)', () => {
    const drift = scopeRegistryDrift(['https://mail.google.com/'], [...SCOPES]);
    expect(drift.missing).toEqual([]);
    expect(drift.extra.length).toBeGreaterThan(0);
  });

  it('reports canonical scopes not declared (missing)', () => {
    const drift = scopeRegistryDrift([...SCOPES, 'https://extra.example/'], []);
    expect(drift.missing).toContain('https://extra.example/');
  });
});

describe('SERVICES registration', () => {
  it('every implemented service has a live probe', () => {
    for (const service of SERVICES.filter((s) => s.implemented)) {
      expect(service.probe, `${service.name} is implemented but has no probe`).toBeDefined();
    }
  });

  it('the implemented set matches the published bins', () => {
    const implemented = SERVICES.filter((s) => s.implemented)
      .map((s) => `google-mcp-${s.name}`)
      .sort();
    // doctor, host, and the suite dispatcher (the bin named after the package)
    // are bins but not services; they have no probe.
    const bins = Object.keys(pkg.bin)
      .filter((bin) => !['google-mcp-doctor', 'google-mcp-host', pkg.name].includes(bin))
      .sort();
    expect(implemented).toEqual(bins);
  });
});

describe('requiredScopes / requiredApis', () => {
  it('requiredScopes equals the SCOPES union', () => {
    expect([...requiredScopes()].sort()).toEqual([...SCOPES].sort());
  });

  it('requiredApis are googleapis identifiers', () => {
    for (const api of requiredApis()) expect(api).toMatch(/\.googleapis\.com$/);
  });
});
