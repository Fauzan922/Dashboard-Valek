import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import raw from '../data/indonesia-38-provinces.json';
import { provinceLocations } from '../data/reference';
import type { Location } from '../types';

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 560;

interface ProvinceGeoProperties {
  PROVINSI: string;
  KODE_PROV: string;
  id?: string;
}

export interface MapProvince {
  geoName: string;
  code: string;
  location: Location;
  displayName: string;
  path: string;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
}

/**
 * The workbook uses "Bangka Belitung" and "DI. Yogyakarta"; the CC BY 4.0
 * boundary file uses the fuller official names. This alias table is the only
 * name normalization applied. A test asserts that all 38 features and all 38
 * UMP provinces match exactly once.
 */
const GEO_NAME_ALIASES: Record<string, string> = {
  'Daerah Istimewa Yogyakarta': 'DI. Yogyakarta',
  'Kepulauan Bangka Belitung': 'Bangka Belitung',
};

function normalizeName(value: string): string {
  return value
    .replace(/^provinsi\s+/i, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const rawCollection = raw as unknown as FeatureCollection<Geometry, ProvinceGeoProperties>;

function ringSignedArea(ring: number[][]): number {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const first = ring[index];
    const second = ring[index + 1];
    if (!first || !second) continue;
    area += (first[0] ?? 0) * (second[1] ?? 0) - (second[0] ?? 0) * (first[1] ?? 0);
  }
  return area / 2;
}

function rewindRing(ring: number[][], clockwise: boolean): number[][] {
  const normalized = ring.map((point) => [point[0] ?? 0, point[1] ?? 0]);
  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    normalized.push([...(first ?? [0, 0])]);
  }
  const isClockwise = ringSignedArea(normalized) < 0;
  return isClockwise === clockwise ? normalized : [...normalized].reverse();
}

/**
 * The boundary download uses RFC 7946 ring winding, which d3-geo interprets
 * as the complement of the intended polygon. Rewind exterior rings clockwise
 * and holes counterclockwise before projecting; otherwise every province path
 * covers the whole map extent.
 */
function rewindGeometry(geometry: Geometry): Geometry {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring, index) =>
        rewindRing(ring as number[][], index === 0),
      ),
    };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring, index) => rewindRing(ring as number[][], index === 0)),
      ),
    };
  }
  return geometry;
}

const geoCollection: FeatureCollection<Geometry, ProvinceGeoProperties> = {
  ...rawCollection,
  features: rawCollection.features.map((feature) => ({
    ...feature,
    geometry: rewindGeometry(feature.geometry),
  })),
};

export const projection = geoMercator().fitExtent(
  [
    [26, 30],
    [MAP_WIDTH - 26, MAP_HEIGHT - 34],
  ],
  geoCollection,
);

const pathGenerator = geoPath(projection);

const locationByName = new Map(
  provinceLocations.map((location) => [normalizeName(location.name), location]),
);

function resolveLocation(geoName: string): Location {
  const aliased = GEO_NAME_ALIASES[geoName] ?? geoName;
  const location = locationByName.get(normalizeName(aliased));
  if (!location) {
    throw new Error(`Tidak ada padanan UMP untuk provinsi peta: ${geoName}`);
  }
  return location;
}

export const mapProvinces: MapProvince[] = geoCollection.features.map((feature) => {
  const geoName = feature.properties.PROVINSI.trim();
  const location = resolveLocation(geoName);
  return {
    geoName,
    code: feature.properties.KODE_PROV,
    location,
    displayName: location.name.replace(/^Provinsi\s+/i, ''),
    path: pathGenerator(feature) ?? '',
    centroid: pathGenerator.centroid(feature) as [number, number],
    bounds: pathGenerator.bounds(feature) as [[number, number], [number, number]],
  };
});

export const provinceByLocationId = new Map(
  mapProvinces.map((province) => [province.location.id, province]),
);

export const provinceByGeoName = new Map(
  mapProvinces.map((province) => [province.geoName, province]),
);

export const provinceByCode = new Map(
  mapProvinces.map((province) => [province.code, province]),
);

export const islandLabels = [
  { name: 'SUMATERA', coordinates: [102.2, -1.2] as [number, number] },
  { name: 'JAWA', coordinates: [110.2, -7.55] as [number, number] },
  { name: 'KALIMANTAN', coordinates: [113.9, 0.1] as [number, number] },
  { name: 'SULAWESI', coordinates: [120.8, -2.1] as [number, number] },
  { name: 'MALUKU', coordinates: [128.7, -3.1] as [number, number] },
  { name: 'PAPUA', coordinates: [137.3, -4.2] as [number, number] },
  { name: 'BALI & NUSA TENGGARA', coordinates: [119.4, -8.8] as [number, number] },
].map((label) => ({
  ...label,
  point: projection(label.coordinates) ?? [0, 0],
}));

export function centroidForProvince(province: MapProvince): [number, number] {
  return province.centroid;
}

export function featureBoundsForProvince(province: MapProvince): [[number, number], [number, number]] {
  return province.bounds;
}

export type ProvinceFeature = Feature<Geometry, ProvinceGeoProperties>;

/**
 * Source note retained in code so the map cannot silently be replaced by a
 * hand-drawn boundary in a future edit.
 */
export const BOUNDARY_SOURCE = {
  name: 'Indonesia GeoJSON & TopoJSON Maps (38 Provinces)',
  author: 'denyherianto',
  repository:
    'https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces',
  license: 'CC BY 4.0 (data), MIT (code)',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  year: 2024,
  changes:
    'Ekstensi berkas diubah dari .geojson ke .json; orientasi ring dinormalisasi saat runtime untuk d3-geo.',
  caveat:
    'Batas administratif komunitas, WGS84, 38 provinsi; bukan peta resmi Badan Informasi Geospasial (BIG).',
};
