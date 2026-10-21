import { describe, expect, it } from 'vitest';
import {
  BOUNDARY_SOURCE,
  MAP_HEIGHT,
  MAP_WIDTH,
  mapProvinces,
  provinceByLocationId,
} from '../src/lib/geo';
import { provinceLocations } from '../src/data/reference';

describe('province boundary integration', () => {
  it('loads exactly 38 province features', () => {
    expect(mapProvinces).toHaveLength(38);
  });

  it('maps every boundary feature to exactly one UMP province', () => {
    expect(provinceByLocationId.size).toBe(38);
    expect(new Set(mapProvinces.map((province) => province.location.id)).size).toBe(38);
    for (const location of provinceLocations) {
      expect(provinceByLocationId.has(location.id), location.name).toBe(true);
    }
  });

  it('contains paths, finite centroids, and plausible bounds', () => {
    for (const province of mapProvinces) {
      expect(province.path.length, province.displayName).toBeGreaterThan(10);
      expect(Number.isFinite(province.centroid[0])).toBe(true);
      expect(Number.isFinite(province.centroid[1])).toBe(true);
      const [[x0, y0], [x1, y1]] = province.bounds;
      expect(x1).toBeGreaterThan(x0);
      expect(y1).toBeGreaterThan(y0);
      expect(x0).toBeGreaterThanOrEqual(-1);
      expect(x1).toBeLessThanOrEqual(MAP_WIDTH + 1);
      expect(y0).toBeGreaterThanOrEqual(-1);
      expect(y1).toBeLessThanOrEqual(MAP_HEIGHT + 1);
    }
  });

  it('carries an explicit boundary source and caveat', () => {
    expect(BOUNDARY_SOURCE.license).toContain('CC BY 4.0');
    expect(BOUNDARY_SOURCE.caveat).toContain('bukan peta resmi');
  });
});
