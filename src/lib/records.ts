import { SERVICE_CATEGORIES, type RecordSummary, type SpatialRecord } from '../types';

export function summarizeRecords(records: SpatialRecord[]): RecordSummary {
  const byEcosystemMap = new Map<
    string,
    { ecosystem: string; areaHa: number; value: number; recordCount: number }
  >();
  const byService: RecordSummary['byService'] = {
    Cultural: 0,
    Provisioning: 0,
    Regulating: 0,
  };

  let areaHa = 0;
  let valuedAreaHa = 0;
  let totalValue = 0;
  let valuedRecordCount = 0;
  let partialRecordCount = 0;
  let klAreaHa = 0;
  let nonKlAreaHa = 0;
  let unknownAreaHa = 0;

  for (const record of records) {
    areaHa += record.areaHa;
    if (record.kawasanStatus === 'KL') klAreaHa += record.areaHa;
    if (record.kawasanStatus === 'NON_KL') nonKlAreaHa += record.areaHa;
    if (record.kawasanStatus === 'UNKNOWN') unknownAreaHa += record.areaHa;

    const ecosystem = byEcosystemMap.get(record.ecosystem) ?? {
      ecosystem: record.ecosystem,
      areaHa: 0,
      value: 0,
      recordCount: 0,
    };
    ecosystem.areaHa += record.areaHa;
    ecosystem.recordCount += 1;
    byEcosystemMap.set(record.ecosystem, ecosystem);

    if (record.value !== null && Number.isFinite(record.value)) {
      valuedRecordCount += 1;
      valuedAreaHa += record.areaHa;
      totalValue += record.value;
      ecosystem.value += record.value;
      if (record.partial) partialRecordCount += 1;
      for (const category of SERVICE_CATEGORIES) {
        byService[category] += record.categoryValues[category] ?? 0;
      }
    }
  }

  const knownArea = klAreaHa + nonKlAreaHa;

  return {
    recordCount: records.length,
    areaHa,
    valuedAreaHa,
    totalValue,
    valuedRecordCount,
    partialRecordCount,
    klAreaHa,
    nonKlAreaHa,
    unknownAreaHa,
    klShare: knownArea > 0 ? klAreaHa / knownArea : null,
    byEcosystem: [...byEcosystemMap.values()].sort(
      (a, b) => b.areaHa - a.areaHa || b.value - a.value || a.ecosystem.localeCompare(b.ecosystem),
    ),
    byService,
  };
}

export function summarizeRecordsByProvince(
  records: SpatialRecord[],
): Map<string, RecordSummary> {
  const grouped = new Map<string, SpatialRecord[]>();
  for (const record of records) {
    if (!record.provinceId) continue;
    const current = grouped.get(record.provinceId) ?? [];
    current.push(record);
    grouped.set(record.provinceId, current);
  }
  const result = new Map<string, RecordSummary>();
  for (const [provinceId, provinceRecords] of grouped) {
    result.set(provinceId, summarizeRecords(provinceRecords));
  }
  return result;
}

export function recordsForProvince(
  records: SpatialRecord[],
  provinceId: string | null,
): SpatialRecord[] {
  if (!provinceId) return records;
  return records.filter((record) => record.provinceId === provinceId);
}

export function dominantEcosystem(summary: RecordSummary): string | null {
  return summary.byEcosystem[0]?.ecosystem ?? null;
}

export function leadingService(
  summary: RecordSummary,
): { category: keyof RecordSummary['byService']; value: number } | null {
  if (summary.valuedRecordCount === 0) return null;
  const entries = SERVICE_CATEGORIES.map((category) => ({
    category,
    value: summary.byService[category],
  })).filter((entry) => entry.value > 0);
  if (entries.length === 0) return null;
  return entries.reduce((best, current) => (current.value > best.value ? current : best));
}
