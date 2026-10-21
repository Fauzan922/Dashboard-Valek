import { describe, expect, it } from 'vitest';
import {
  dominantEcosystem,
  leadingService,
  recordsForProvince,
  summarizeRecords,
  summarizeRecordsByProvince,
} from '../src/lib/records';
import { AREA_UNIT_FACTORS, type SpatialRecord } from '../src/types';
import { parsePositiveNumber } from '../src/lib/format';

function record(overrides: Partial<SpatialRecord>): SpatialRecord {
  return {
    id: 'r1',
    label: 'Catatan',
    provinceId: 'loc001',
    provinceName: 'Provinsi Aceh',
    locationId: 'loc001',
    locationName: 'Provinsi Aceh',
    ecosystem: 'Hutan',
    kawasanTypeId: 'kl01',
    kawasanStatus: 'KL',
    areaHa: 100,
    value: 2_000,
    categoryValues: { Cultural: 1_200, Provisioning: 500, Regulating: 300 },
    partial: false,
    missingCategories: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    notes: null,
    ...overrides,
  };
}

describe('record aggregation', () => {
  it('separates valued, non-KL, and unknown-status area', () => {
    const records = [
      record({ id: 'r1' }),
      record({
        id: 'r2',
        ecosystem: 'Mangrove',
        kawasanStatus: 'NON_KL',
        areaHa: 50,
        value: null,
        categoryValues: { Cultural: null, Provisioning: null, Regulating: null },
      }),
      record({
        id: 'r3',
        ecosystem: 'Danau',
        kawasanStatus: 'UNKNOWN',
        areaHa: 25,
        value: null,
        categoryValues: { Cultural: null, Provisioning: null, Regulating: null },
      }),
    ];
    const summary = summarizeRecords(records);
    expect(summary.recordCount).toBe(3);
    expect(summary.areaHa).toBe(175);
    expect(summary.valuedRecordCount).toBe(1);
    expect(summary.valuedAreaHa).toBe(100);
    expect(summary.totalValue).toBe(2_000);
    expect(summary.klAreaHa).toBe(100);
    expect(summary.nonKlAreaHa).toBe(50);
    expect(summary.unknownAreaHa).toBe(25);
    expect(summary.klShare).toBeCloseTo(100 / 150, 8);
    expect(summary.byService).toEqual({
      Cultural: 1_200,
      Provisioning: 500,
      Regulating: 300,
    });
    expect(dominantEcosystem(summary)).toBe('Hutan');
    expect(leadingService(summary)?.category).toBe('Cultural');
  });

  it('returns unavailable KL share when no known-status area exists', () => {
    const summary = summarizeRecords([
      record({
        kawasanStatus: 'UNKNOWN',
        value: null,
        categoryValues: { Cultural: null, Provisioning: null, Regulating: null },
      }),
    ]);
    expect(summary.klShare).toBeNull();
    expect(summary.totalValue).toBe(0);
    expect(summary.valuedRecordCount).toBe(0);
  });

  it('groups records by province and filters correctly', () => {
    const records = [
      record({ id: 'r1' }),
      record({ id: 'r2', provinceId: 'loc002', provinceName: 'Provinsi Sumatera Utara' }),
      record({ id: 'r3', provinceId: null, provinceName: null, locationId: 'loc500' }),
    ];
    const grouped = summarizeRecordsByProvince(records);
    expect(grouped.get('loc001')?.recordCount).toBe(1);
    expect(grouped.get('loc002')?.recordCount).toBe(1);
    expect(grouped.has('loc500')).toBe(false);
    expect(recordsForProvince(records, 'loc001')).toHaveLength(1);
    expect(recordsForProvince(records, null)).toHaveLength(3);
  });

  it('converts supported area units to hectares', () => {
    expect(AREA_UNIT_FACTORS.ha).toBe(1);
    expect(AREA_UNIT_FACTORS.km2).toBe(100);
    expect(AREA_UNIT_FACTORS.m2).toBe(0.0001);
    expect(100 * AREA_UNIT_FACTORS.km2).toBe(10_000);
  });

  it('rejects blank, zero, negative, and non-numeric area input', () => {
    expect(parsePositiveNumber('')).toBeNull();
    expect(parsePositiveNumber('0')).toBeNull();
    expect(parsePositiveNumber('-4')).toBeNull();
    expect(parsePositiveNumber('abc')).toBeNull();
    expect(parsePositiveNumber('1.250,5')).toBe(1250.5);
    expect(parsePositiveNumber('1.250')).toBe(1250);
    expect(parsePositiveNumber('1250,5')).toBe(1250.5);
    expect(parsePositiveNumber('1250.5')).toBe(1250.5);
  });
});
