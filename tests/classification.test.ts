import { describe, expect, it } from 'vitest';
import {
  compatibleEcosystems,
  identifyEcosystem,
  kawasanForEcosystem,
} from '../src/lib/classification';
import { ecosystems, kawasanList } from '../src/data/reference';

describe('kawasan classification table', () => {
  it('contains the workbook 23 kawasan and 9 ecosystems', () => {
    expect(kawasanList).toHaveLength(23);
    expect(ecosystems).toHaveLength(9);
    expect(new Set(kawasanList.map((kawasan) => kawasan.id)).size).toBe(23);
  });

  it('reproduces the Hutan Lindung mapping', () => {
    expect(compatibleEcosystems('kl01')).toEqual(['Hutan', 'Lahan Basah']);
    expect(identifyEcosystem('kl01', 'Hutan').status).toBe('supported');
    expect(identifyEcosystem('kl01', 'Mangrove').status).toBe('incompatible');
    expect(identifyEcosystem('kl01', null).status).toBe('unsupported');
  });

  it('maps all nine ecosystems to at least one kawasan', () => {
    for (const ecosystem of ecosystems) {
      expect(kawasanForEcosystem(ecosystem.name).length, ecosystem.name).toBeGreaterThan(0);
    }
  });

  it('does not claim a status or spatial rule for an unknown kawasan', () => {
    const result = identifyEcosystem('not-a-kawasan', 'Hutan');
    expect(result.status).toBe('unsupported');
    expect(result.kawasan).toBeNull();
    expect(result.message).toContain('tidak ditemukan');
  });
});
