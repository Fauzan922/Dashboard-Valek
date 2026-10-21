import { describe, expect, it } from 'vitest';
import {
  calculateValuation,
  coefficientsForEcosystem,
  highestCategory,
  provinceCoefficientMap,
  studiesForEcosystem,
} from '../src/lib/valuation';
import { reference } from '../src/data/reference';

const ACEH_UMP = 3_685_616;

const WORKBOOK_ACEH = {
  Hutan: { total: 22_895_003.710740454 },
  Mangrove: { total: 113_610_428.4 },
  Danau: { total: 33_850_465.68 },
  Sungai: { total: 26_657_853.02 },
  'Terumbu Karang': { total: 527_147_795.3 },
  Karst: { total: 262_308_382.2 },
  Gambut: { total: 87_836_690.29 },
  'Padang Lamun': { total: 614_064_363.5 },
  'Lahan Basah': { total: 14_270_895.48 },
};

describe('benefit-transfer engine', () => {
  it('reproduces the Hutan / Aceh workbook coefficient at full precision', () => {
    const coefficients = coefficientsForEcosystem('Hutan', ACEH_UMP, 'loc001');
    expect(coefficients.categories.Cultural.value).toBeCloseTo(14_514_491.541384194, 6);
    expect(coefficients.categories.Provisioning.value).toBeCloseTo(4_542_534.272310307, 6);
    expect(coefficients.categories.Regulating.value).toBeCloseTo(3_837_977.897045957, 6);
    expect(coefficients.total).toBeCloseTo(22_895_003.710740454, 6);
    expect(coefficients.targetUmp).toBe(ACEH_UMP);
  });

  it('reproduces the workbook 145,290 ha example within rounding tolerance', () => {
    const result = calculateValuation({
      locationId: 'loc001',
      ecosystem: 'Hutan',
      selection: 'Total',
      areaHa: 145_290,
      kawasanStatus: 'KL',
    });
    expect(result.value).toBeCloseTo(3_326_415_089_133.4805, 3);
    // Workbook cached value: 3,326,415,089,133.00
    expect(Math.abs((result.value ?? 0) - 3_326_415_089_133)).toBeLessThan(1);
  });

  it('matches all nine workbook ecosystem totals for Provinsi Aceh', () => {
    for (const [ecosystem, expected] of Object.entries(WORKBOOK_ACEH)) {
      const coefficients = coefficientsForEcosystem(ecosystem, ACEH_UMP, 'loc001');
      expect(coefficients.total, ecosystem).not.toBeNull();
      expect(
        Math.abs((coefficients.total ?? 0) - expected.total),
        `${ecosystem} total`,
      ).toBeLessThan(0.1);
    }
  });

  it('preserves unavailable categories as null instead of zero', () => {
    const danau = coefficientsForEcosystem('Danau', ACEH_UMP, 'loc001');
    expect(danau.categories.Regulating.value).toBeNull();
    expect(danau.missingCategories).toContain('Regulating');
    expect(danau.partial).toBe(true);
    expect(danau.total).toBeCloseTo(
      (danau.categories.Cultural.value ?? 0) +
        (danau.categories.Provisioning.value ?? 0),
      6,
    );

    const lahanBasah = coefficientsForEcosystem('Lahan Basah', ACEH_UMP, 'loc001');
    expect(lahanBasah.categories.Cultural.value).toBeNull();
    expect(lahanBasah.categories.Provisioning.value).toBeNull();
    expect(lahanBasah.categories.Regulating.value).not.toBeNull();
    expect(lahanBasah.total).toBeCloseTo(
      lahanBasah.categories.Regulating.value ?? 0,
      6,
    );
  });

  it('does not value non-KL or unknown status', () => {
    const base = {
      locationId: 'loc001',
      ecosystem: 'Hutan',
      selection: 'Total' as const,
      areaHa: 100,
    };
    const nonKl = calculateValuation({ ...base, kawasanStatus: 'NON_KL' });
    expect(nonKl.value).toBeNull();
    expect(nonKl.supported).toBe(false);
    expect(nonKl.reason).toContain('non-kawasan lindung');

    const unknown = calculateValuation({ ...base, kawasanStatus: 'UNKNOWN' });
    expect(unknown.value).toBeNull();
    expect(unknown.supported).toBe(false);
    expect(unknown.reason).toContain('Status kawasan');
  });

  it('rejects non-positive or non-finite area instead of returning a value', () => {
    for (const areaHa of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = calculateValuation({
        locationId: 'loc001',
        ecosystem: 'Hutan',
        selection: 'Total',
        areaHa,
        kawasanStatus: 'KL',
      });
      expect(result.value).toBeNull();
      expect(result.supported).toBe(false);
      expect(result.reason).toContain('Luas');
    }
  });

  it('returns null for a missing service category and does not substitute zero', () => {
    const result = calculateValuation({
      locationId: 'loc001',
      ecosystem: 'Lahan Basah',
      selection: 'Cultural',
      areaHa: 10,
      kawasanStatus: 'KL',
    });
    expect(result.selectedCoefficient).toBeNull();
    expect(result.value).toBeNull();
    expect(result.supported).toBe(false);
    expect(result.reason).toContain('Cultural');
  });

  it('calculates category values and identifies the highest category', () => {
    const coefficients = coefficientsForEcosystem('Hutan', ACEH_UMP, 'loc001');
    const top = highestCategory(coefficients);
    expect(top?.category).toBe('Cultural');
    expect(top?.value).toBeCloseTo(14_514_491.541384194, 6);

    const result = calculateValuation({
      locationId: 'loc001',
      ecosystem: 'Hutan',
      selection: 'Regulating',
      areaHa: 100,
      kawasanStatus: 'KL',
    });
    expect(result.value).toBeCloseTo(383_797_789.7045957, 4);
  });

  it('maps coefficients for all 38 province UMP locations', () => {
    const values = provinceCoefficientMap('Hutan');
    expect(values).toHaveLength(38);
    expect(new Set(values.map((item) => item.locationId)).size).toBe(38);
    expect(values.every((item) => item.coefficients.targetUmp === item.ump)).toBe(true);
    expect(values.every((item) => item.value !== null)).toBe(true);
  });

  it('has the expected study coverage from the workbook', () => {
    expect(reference.studies).toHaveLength(62);
    expect(studiesForEcosystem('Hutan')).toHaveLength(8);
    expect(studiesForEcosystem('Mangrove')).toHaveLength(23);
    expect(studiesForEcosystem('Lahan Basah')).toHaveLength(1);
    expect(reference.meta.interestRate).toBe(0.0475);
    expect(reference.meta.workbookSha256_16).toBe('1d30931b10ffec1e');
  });
});
