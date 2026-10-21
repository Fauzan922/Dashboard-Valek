export const SERVICE_CATEGORIES = ['Cultural', 'Provisioning', 'Regulating'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type ServiceSelection = ServiceCategory | 'Total';

export const SERVICE_LABELS: Record<ServiceSelection, string> = {
  Cultural: 'Budaya (Cultural)',
  Provisioning: 'Penyedia (Provisioning)',
  Regulating: 'Pengaturan (Regulating)',
  Total: 'Total jasa ekosistem',
};

export const SERVICE_SHORT_LABELS: Record<ServiceCategory, string> = {
  Cultural: 'Budaya',
  Provisioning: 'Penyedia',
  Regulating: 'Pengaturan',
};

export interface ReferenceComponent {
  service: ServiceCategory;
  component: string;
  method: string | null;
  unit: string | null;
  rawPerHa: number | null;
  basePerHa2025: number | null;
  totalStudyYear: number | null;
  total2025: number | null;
  total2025Formula: number | null;
}

export interface ReferenceStudy {
  id: string;
  title: string;
  ecosystem: string;
  year: number | null;
  source: string | null;
  region: string | null;
  regionLocationId: string | null;
  studyUmp: number | null;
  components: ReferenceComponent[];
}

export interface Ecosystem {
  id: string;
  name: string;
  description: string | null;
  order: number;
}

export interface Kawasan {
  id: string;
  name: string;
  ecosystems: string[];
}

export type LocationType = 'province' | 'kabupaten_kota' | 'other';

export interface Location {
  id: string;
  name: string;
  ump: number;
  type: LocationType;
}

export interface DatasetMeta {
  datasetVersion: string;
  engineVersion: string;
  sourceWorkbook: string;
  workbookSha256_16: string;
  extractedAt: string;
  sheetCount: number;
  baseYear: number;
  priceYear: number;
  interestRate: number;
  interestRateNote: string;
  umpSourceSheet: string;
  studyCount: number;
  componentCount: number;
  locationCount: number;
  kawasanCount: number;
  ecosystemCount: number;
  findings: string[];
}

export interface ReferenceDataset {
  meta: DatasetMeta;
  ecosystems: Ecosystem[];
  kawasan: Kawasan[];
  locations: Location[];
  studies: ReferenceStudy[];
}

export interface CoefficientStudyValue {
  studyId: string;
  title: string;
  region: string | null;
  year: number | null;
  value: number;
}

export interface CategoryCoefficient {
  category: ServiceCategory;
  value: number | null;
  sampleSize: number;
  studies: CoefficientStudyValue[];
  medianStudyIds: string[];
}

export interface EcosystemCoefficients {
  ecosystem: string;
  locationId: string;
  targetUmp: number;
  categories: Record<ServiceCategory, CategoryCoefficient>;
  /** Sum of available category medians. Null only when every category is unavailable. */
  total: number | null;
  missingCategories: ServiceCategory[];
  partial: boolean;
}

export const KAWASAN_STATUSES = ['KL', 'NON_KL', 'UNKNOWN'] as const;
export type KawasanStatus = (typeof KAWASAN_STATUSES)[number];

export const KAWASAN_STATUS_LABELS: Record<KawasanStatus, string> = {
  KL: 'Kawasan lindung / berfungsi lindung',
  NON_KL: 'Non-kawasan lindung',
  UNKNOWN: 'Status belum diketahui',
};

export const AREA_UNITS = ['ha', 'km2', 'm2'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  ha: 'hektare (ha)',
  km2: 'kilometer persegi (km²)',
  m2: 'meter persegi (m²)',
};

export const AREA_UNIT_FACTORS: Record<AreaUnit, number> = {
  ha: 1,
  km2: 100,
  m2: 0.0001,
};

export type MapMode = 'coefficient' | 'value' | 'area' | 'status' | 'ecosystem';

export interface SpatialRecord {
  id: string;
  label: string;
  provinceId: string | null;
  provinceName: string | null;
  locationId: string;
  locationName: string;
  ecosystem: string;
  kawasanTypeId: string | null;
  kawasanStatus: KawasanStatus;
  areaHa: number;
  value: number | null;
  categoryValues: Record<ServiceCategory, number | null>;
  partial: boolean;
  missingCategories: ServiceCategory[];
  createdAt: string;
  notes: string | null;
}

export interface RecordSummary {
  recordCount: number;
  areaHa: number;
  valuedAreaHa: number;
  totalValue: number;
  valuedRecordCount: number;
  partialRecordCount: number;
  klAreaHa: number;
  nonKlAreaHa: number;
  unknownAreaHa: number;
  klShare: number | null;
  byEcosystem: Array<{
    ecosystem: string;
    areaHa: number;
    value: number;
    recordCount: number;
  }>;
  byService: Record<ServiceCategory, number>;
}
