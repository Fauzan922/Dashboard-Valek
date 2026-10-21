import raw from './reference.json';
import type { ReferenceDataset } from '../types';

/**
 * Reference data extracted from the authoritative 2025 benefit-transfer
 * workbook. The file is bundled locally; the dashboard has no runtime API.
 *
 * Source workbook: Perhitungan Valuasi Ekonomi Lingkungan Hidup.xlsx
 * (not redistributed). Regeneration and audit details:
 * docs/METHODOLOGY.md and docs/DATA_SOURCES.md.
 */
export const reference = raw as unknown as ReferenceDataset;

export const ecosystems = reference.ecosystems;
export const kawasanList = reference.kawasan;
export const locations = reference.locations;
export const studies = reference.studies;
export const meta = reference.meta;

export const locationsById = new Map(locations.map((location) => [location.id, location]));
export const ecosystemsByName = new Map(ecosystems.map((ecosystem) => [ecosystem.name, ecosystem]));
export const kawasanById = new Map(kawasanList.map((kawasan) => [kawasan.id, kawasan]));

export const provinceLocations = locations.filter((location) => location.type === 'province');
export const kabupatenLocations = locations.filter(
  (location) => location.type === 'kabupaten_kota',
);
export const otherLocations = locations.filter((location) => location.type === 'other');
