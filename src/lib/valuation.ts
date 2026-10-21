import {
  reference,
  locationsById,
  provinceLocations,
} from '../data/reference';
import {
  SERVICE_CATEGORIES,
  type CategoryCoefficient,
  type CoefficientStudyValue,
  type EcosystemCoefficients,
  type KawasanStatus,
  type Location,
  type ReferenceStudy,
  type ServiceCategory,
  type ServiceSelection,
} from '../types';

/**
 * Benefit-transfer engine for the 2025 workbook.
 *
 * Reproduced chain:
 *   base per-ha 2025 (workbook column M)
 *     x (UMP target 2025 / UMP study 2025)
 *     -> sum components within each service category per study
 *     -> median of non-zero study totals = category coefficient
 *     -> category coefficient x area = category value
 *     -> total coefficient = sum of available category medians
 *
 * The base value already contains the workbook's compound adjustment. It is
 * never re-inflated here.
 */

const coefficientCache = new Map<string, EcosystemCoefficients>();
const provinceMapCache = new Map<string, ProvinceCoefficient[]>();
const nationalCache = new Map<string, NationalCoefficientSummary>();

export function getLocation(locationId: string): Location | undefined {
  return locationsById.get(locationId);
}

export function getProvinceLocations(): Location[] {
  return provinceLocations;
}

export function studiesForEcosystem(ecosystem: string): ReferenceStudy[] {
  return reference.studies.filter((study) => study.ecosystem === ecosystem);
}

export function median(values: number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) return null;
  const sorted = [...usable].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  if (lower === undefined || upper === undefined) return null;
  return (lower + upper) / 2;
}

/**
 * Category total for one study at the target location's 2025 UMP level.
 * Returns null when the study has no usable component for that category.
 */
export function studyCategoryTotal(
  study: ReferenceStudy,
  targetUmp: number,
): Record<ServiceCategory, number | null> {
  const result: Record<ServiceCategory, number | null> = {
    Cultural: null,
    Provisioning: null,
    Regulating: null,
  };
  if (!study.studyUmp || study.studyUmp <= 0 || targetUmp <= 0) return result;

  const ratio = targetUmp / study.studyUmp;
  for (const category of SERVICE_CATEGORIES) {
    const components = study.components.filter(
      (component) =>
        component.service === category &&
        component.basePerHa2025 !== null &&
        Number.isFinite(component.basePerHa2025),
    );
    if (components.length === 0) continue;
    result[category] = components.reduce(
      (sum, component) => sum + (component.basePerHa2025 ?? 0) * ratio,
      0,
    );
  }
  return result;
}

export function coefficientsForEcosystem(
  ecosystem: string,
  targetUmp: number,
  locationId = '',
): EcosystemCoefficients {
  const cacheKey = `${ecosystem}|${targetUmp}|${locationId}`;
  const cached = coefficientCache.get(cacheKey);
  if (cached) return cached;

  const studies = studiesForEcosystem(ecosystem);
  const categories = {} as Record<ServiceCategory, CategoryCoefficient>;

  for (const category of SERVICE_CATEGORIES) {
    const studyValues: CoefficientStudyValue[] = [];
    for (const study of studies) {
      const totals = studyCategoryTotal(study, targetUmp);
      const value = totals[category];
      if (value === null || value === 0 || !Number.isFinite(value)) continue;
      studyValues.push({
        studyId: study.id,
        title: study.title,
        region: study.region,
        year: study.year,
        value,
      });
    }
    studyValues.sort((a, b) => a.value - b.value);
    const values = studyValues.map((item) => item.value);
    const value = median(values);
    let medianStudyIds: string[] = [];
    if (studyValues.length > 0) {
      const middle = Math.floor(studyValues.length / 2);
      medianStudyIds =
        studyValues.length % 2 === 1
          ? [studyValues[middle]?.studyId ?? '']
          : [studyValues[middle - 1]?.studyId ?? '', studyValues[middle]?.studyId ?? ''];
      medianStudyIds = medianStudyIds.filter(Boolean);
    }
    categories[category] = {
      category,
      value,
      sampleSize: values.length,
      studies: studyValues,
      medianStudyIds,
    };
  }

  const missingCategories = SERVICE_CATEGORIES.filter(
    (category) => categories[category].value === null,
  );
  const available = SERVICE_CATEGORIES.map((category) => categories[category].value).filter(
    (value): value is number => value !== null,
  );
  const total = available.length > 0 ? available.reduce((sum, value) => sum + value, 0) : null;

  const result: EcosystemCoefficients = {
    ecosystem,
    locationId,
    targetUmp,
    categories,
    total,
    missingCategories,
    partial: missingCategories.length > 0 && total !== null,
  };
  coefficientCache.set(cacheKey, result);
  return result;
}

export function coefficientForSelection(
  ecosystem: string,
  targetUmp: number,
  selection: ServiceSelection,
  locationId = '',
): number | null {
  const coefficients = coefficientsForEcosystem(ecosystem, targetUmp, locationId);
  if (selection === 'Total') return coefficients.total;
  return coefficients.categories[selection].value;
}

export function categoryValueForArea(
  coefficients: EcosystemCoefficients,
  selection: ServiceCategory,
  areaHa: number,
): number | null {
  const value = coefficients.categories[selection].value;
  if (value === null) return null;
  return value * areaHa;
}

export function valueForArea(
  coefficients: EcosystemCoefficients,
  selection: ServiceSelection,
  areaHa: number,
): number | null {
  const value =
    selection === 'Total' ? coefficients.total : coefficients.categories[selection].value;
  if (value === null) return null;
  return value * areaHa;
}

export interface ProvinceCoefficient {
  locationId: string;
  provinceName: string;
  displayName: string;
  ump: number;
  value: number | null;
  partial: boolean;
  missingCategories: ServiceCategory[];
  coefficients: EcosystemCoefficients;
}

function displayProvinceName(name: string): string {
  return name.replace(/^Provinsi\s+/i, '');
}

export function provinceCoefficientMap(ecosystem: string): ProvinceCoefficient[] {
  const cached = provinceMapCache.get(ecosystem);
  if (cached) return cached;
  const values = provinceLocations.map((location) => {
    const coefficients = coefficientsForEcosystem(ecosystem, location.ump, location.id);
    return {
      locationId: location.id,
      provinceName: location.name,
      displayName: displayProvinceName(location.name),
      ump: location.ump,
      value: coefficients.total,
      partial: coefficients.partial,
      missingCategories: coefficients.missingCategories,
      coefficients,
    };
  });
  provinceMapCache.set(ecosystem, values);
  return values;
}

export interface NationalCoefficientSummary {
  ecosystem: string;
  values: ProvinceCoefficient[];
  min: ProvinceCoefficient | null;
  max: ProvinceCoefficient | null;
  medianValue: number | null;
  studyCount: number;
  provinceCount: number;
}

export function nationalCoefficientSummary(ecosystem: string): NationalCoefficientSummary {
  const cached = nationalCache.get(ecosystem);
  if (cached) return cached;

  const values = provinceCoefficientMap(ecosystem)
    .filter((item) => item.value !== null)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  const result: NationalCoefficientSummary = {
    ecosystem,
    values,
    min: values[0] ?? null,
    max: values[values.length - 1] ?? null,
    medianValue: median(values.map((item) => item.value).filter((value): value is number => value !== null)),
    studyCount: studiesForEcosystem(ecosystem).length,
    provinceCount: values.length,
  };
  nationalCache.set(ecosystem, result);
  return result;
}

export interface HighestCategory {
  category: ServiceCategory;
  value: number;
}

export function highestCategory(coefficients: EcosystemCoefficients): HighestCategory | null {
  const entries = SERVICE_CATEGORIES.map((category) => ({
    category,
    value: coefficients.categories[category].value,
  })).filter((entry): entry is HighestCategory => entry.value !== null);
  if (entries.length === 0) return null;
  return entries.reduce((best, current) => (current.value > best.value ? current : best));
}

export interface HighestEcosystem {
  ecosystem: string;
  value: number;
  partial: boolean;
}

export function highestEcosystemForProvince(location: Location): HighestEcosystem | null {
  const candidates = reference.ecosystems
    .map((ecosystem) => {
      const coefficients = coefficientsForEcosystem(ecosystem.name, location.ump, location.id);
      return coefficients.total === null
        ? null
        : {
            ecosystem: ecosystem.name,
            value: coefficients.total,
            partial: coefficients.partial,
          };
    })
    .filter((item): item is HighestEcosystem => item !== null);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => (current.value > best.value ? current : best));
}

export interface ValuationInput {
  locationId: string;
  ecosystem: string;
  selection: ServiceSelection;
  areaHa: number;
  kawasanStatus: KawasanStatus;
}

export interface ValuationResult {
  input: ValuationInput;
  location: Location | null;
  coefficients: EcosystemCoefficients | null;
  selectedCoefficient: number | null;
  value: number | null;
  supported: boolean;
  reason: string | null;
  partial: boolean;
  missingCategories: ServiceCategory[];
}

/**
 * Full valuation result used by the UI and tests. Non-KL records are never
 * assigned a value: the workbook has no non-KL coefficient or rule.
 */
export function calculateValuation(input: ValuationInput): ValuationResult {
  const location = getLocation(input.locationId);
  if (!location) {
    return {
      input,
      location: null,
      coefficients: null,
      selectedCoefficient: null,
      value: null,
      supported: false,
      reason: 'Lokasi UMP tidak ditemukan pada tabel referensi.',
      partial: false,
      missingCategories: [],
    };
  }

  if (!Number.isFinite(input.areaHa) || input.areaHa <= 0) {
    return {
      input,
      location,
      coefficients: null,
      selectedCoefficient: null,
      value: null,
      supported: false,
      reason: 'Luas harus berupa angka lebih besar dari 0.',
      partial: false,
      missingCategories: [],
    };
  }

  const coefficients = coefficientsForEcosystem(
    input.ecosystem,
    location.ump,
    location.id,
  );
  const selectedCoefficient = coefficientForSelection(
    input.ecosystem,
    location.ump,
    input.selection,
    location.id,
  );
  const missingCategories = coefficients.missingCategories;
  const partial = coefficients.partial && input.selection === 'Total';

  if (input.kawasanStatus !== 'KL') {
    return {
      input,
      location,
      coefficients,
      selectedCoefficient,
      value: null,
      supported: false,
      reason:
        input.kawasanStatus === 'NON_KL'
          ? 'Workbook tidak menyediakan koefisien untuk non-kawasan lindung.'
          : 'Status kawasan belum diketahui; nilai tidak dihitung.',
      partial,
      missingCategories,
    };
  }

  if (selectedCoefficient === null) {
    return {
      input,
      location,
      coefficients,
      selectedCoefficient,
      value: null,
      supported: false,
      reason:
        input.selection === 'Total'
          ? 'Tidak ada koefisien jasa ekosistem untuk ekosistem ini.'
          : `Koefisien ${input.selection} tidak tersedia untuk ekosistem ini.`,
      partial,
      missingCategories,
    };
  }

  const value = selectedCoefficient * input.areaHa;
  return {
    input,
    location,
    coefficients,
    selectedCoefficient,
    value,
    supported: true,
    reason: null,
    partial,
    missingCategories,
  };
}

export function displayNameForLocation(location: Location): string {
  return location.name.replace(/^Provinsi\s+/i, '');
}
