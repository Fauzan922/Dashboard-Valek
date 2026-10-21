import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoPath } from 'd3-geo';
import {
  BOUNDARY_SOURCE,
  MAP_HEIGHT,
  MAP_WIDTH,
  islandLabels,
  mapProvinces,
  projection,
  type MapProvince,
} from '../lib/geo';
import {
  coefficientsForEcosystem,
  studiesForEcosystem,
} from '../lib/valuation';
import { summarizeRecordsByProvince } from '../lib/records';
import { formatArea, formatCompactRupiah, formatNumber, formatPercent, formatRupiah } from '../lib/format';
import type { MapMode, SpatialRecord } from '../types';
import { ecosystems, meta } from '../data/reference';

interface MapPanelProps {
  records: SpatialRecord[];
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string) => void;
  onReset: () => void;
  ecosystem: string;
  onEcosystemChange: (ecosystem: string) => void;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onFocusCalculator: () => void;
}

type MetricValue = number | string | null;

interface ProvinceMetric {
  province: MapProvince;
  value: MetricValue;
  label: string;
  detail: string;
}

interface NumericScale {
  min: number;
  max: number;
  breaks: number[];
  colors: string[];
  valueFor: (value: number) => number;
}

// BPDLH-inspired data palette. The reference identity is built around
// #01a24a / #034721 with supporting teals, earth tones and #ed9f28.
// SVG fills live here because they are data encodings, not CSS chrome.
const RAMP = ['#dcf0e3', '#b0ddc0', '#74c795', '#01a24a', '#034721'];
const NO_DATA = '#d5ddd8';
const STATUS_BREAKS = [0.2, 0.4, 0.6, 0.8];
// Teal sequence keeps KL share visually distinct from green value ramps.
const STATUS_COLORS = ['#e0f2f1', '#b0ddda', '#6cc3bd', '#0092a5', '#006572'];

const ECOSYSTEM_COLORS: Record<string, string> = {
  Hutan: '#1f6b3a',
  Mangrove: '#0f766e',
  Danau: '#017180',
  Sungai: '#4f8f8a',
  'Terumbu Karang': '#ce683c',
  Gambut: '#7a5a38',
  Karst: '#8b8660',
  'Padang Lamun': '#6cb745',
  'Lahan Basah': '#539139',
};

const MODE_LABELS: Record<MapMode, string> = {
  coefficient: 'Koefisien/ha',
  value: 'Nilai total',
  area: 'Luas tercatat',
  status: 'Kawasan lindung',
  ecosystem: 'Ekosistem',
};

const MODE_TITLES: Record<MapMode, string> = {
  coefficient: 'Koefisien jasa ekosistem per hektare',
  value: 'Nilai total tervaluasi',
  area: 'Luas ekosistem tercatat',
  status: 'Pangsa kawasan lindung',
  ecosystem: 'Ekosistem dominan',
};

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (position - lower);
}

function buildNumericScale(values: number[]): NumericScale | null {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) return null;
  const sorted = [...usable].sort((a, b) => a - b);
  const unique = [...new Set(sorted)];
  if (unique.length === 1) {
    return {
      min: sorted[0] ?? 0,
      max: sorted[0] ?? 0,
      breaks: [],
      colors: [RAMP[2] ?? RAMP[0]],
      valueFor: () => 0,
    };
  }
  const breaks: number[] = [];
  for (let index = 1; index < 5; index += 1) {
    const candidate = quantile(sorted, index / 5);
    if (
      candidate > (breaks[breaks.length - 1] ?? sorted[0] ?? candidate) &&
      candidate < (sorted[sorted.length - 1] ?? candidate)
    ) {
      breaks.push(candidate);
    }
  }
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    breaks,
    colors: RAMP.slice(0, breaks.length + 1),
    valueFor: (value: number) => {
      let index = 0;
      for (const breakpoint of breaks) {
        if (value > breakpoint) index += 1;
      }
      return index;
    },
  };
}

function statusScale(): NumericScale {
  return {
    min: 0,
    max: 1,
    breaks: STATUS_BREAKS,
    colors: STATUS_COLORS,
    valueFor: (value: number) => {
      let index = 0;
      for (const breakpoint of STATUS_BREAKS) {
        if (value > breakpoint) index += 1;
      }
      return index;
    },
  };
}

function metricLabel(mode: MapMode): string {
  if (mode === 'coefficient') return 'Koefisien total';
  if (mode === 'value') return 'Nilai tervaluasi';
  if (mode === 'area') return 'Luas tercatat';
  if (mode === 'status') return 'Pangsa KL';
  return 'Ekosistem dominan';
}

function metricText(mode: MapMode, value: MetricValue): string {
  if (value === null) return 'Tidak tersedia';
  if (mode === 'ecosystem') return String(value);
  if (mode === 'status') return formatPercent(Number(value), 0);
  if (mode === 'area') return formatArea(Number(value), 2);
  if (mode === 'coefficient') return `${formatCompactRupiah(Number(value))}/ha`;
  return formatCompactRupiah(Number(value));
}

function legendText(mode: MapMode, value: number): string {
  if (mode === 'status') return formatPercent(value, 0);
  if (mode === 'area') return formatArea(value, 2);
  if (mode === 'coefficient') return `${formatCompactRupiah(value)}/ha`;
  return formatCompactRupiah(value);
}

function pointerToViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
  const offsetX = (rect.width - MAP_WIDTH * scale) / 2;
  const offsetY = (rect.height - MAP_HEIGHT * scale) / 2;
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function zoomAt(
  view: { x: number; y: number; k: number },
  point: { x: number; y: number },
  factor: number,
): { x: number; y: number; k: number } {
  const nextK = clamp(view.k * factor, 1, 9);
  if (nextK === 1) return { x: 0, y: 0, k: 1 };
  const ratio = nextK / view.k;
  return {
    k: nextK,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  };
}

export function MapPanel({
  records,
  selectedProvinceId,
  onSelectProvince,
  onReset,
  ecosystem,
  onEcosystemChange,
  mapMode,
  onMapModeChange,
  onFocusCalculator,
}: MapPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hovered, setHovered] = useState<{
    provinceId: string;
    x: number;
    y: number;
  } | null>(null);

  const recordsByProvince = useMemo(() => summarizeRecordsByProvince(records), [records]);

  const metrics = useMemo<ProvinceMetric[]>(() => {
    return mapProvinces.map((province) => {
      const summary = recordsByProvince.get(province.location.id);
      if (mapMode === 'coefficient') {
        const coefficients = coefficientsForEcosystem(
          ecosystem,
          province.location.ump,
          province.location.id,
        );
        const studies = studiesForEcosystem(ecosystem).length;
        return {
          province,
          value: coefficients.total,
          label: 'Koefisien total',
          detail: `${studies} studi · UMP ${formatRupiah(province.location.ump)}/bulan${
            coefficients.partial ? ' · total parsial' : ''
          }`,
        };
      }
      if (mapMode === 'value') {
        const value =
          summary && summary.valuedRecordCount > 0 ? summary.totalValue : null;
        return {
          province,
          value,
          label: 'Nilai tervaluasi',
          detail:
            summary && summary.valuedRecordCount > 0
              ? `${formatNumber(summary.valuedRecordCount)} dari ${formatNumber(
                  summary.recordCount,
                )} catatan dinilai${
                  summary.partialRecordCount > 0
                    ? ` · ${formatNumber(summary.partialRecordCount)} parsial`
                    : ''
                }`
              : summary
                ? 'Catatan ada, tetapi tidak ada nilai yang dapat dihitung'
                : 'Belum ada catatan',
        };
      }
      if (mapMode === 'area') {
        return {
          province,
          value: summary?.areaHa ?? null,
          label: 'Luas tercatat',
          detail: summary
            ? `${formatNumber(summary.recordCount)} catatan · ${formatArea(summary.areaHa)}`
            : 'Belum ada catatan',
        };
      }
      if (mapMode === 'status') {
        return {
          province,
          value: summary?.klShare ?? null,
          label: 'Pangsa KL',
          detail: summary
            ? `KL ${formatArea(summary.klAreaHa)} · non-KL ${formatArea(
                summary.nonKlAreaHa,
              )} · status belum diketahui ${formatArea(summary.unknownAreaHa)}`
            : 'Belum ada catatan',
        };
      }
      const dominant = summary?.byEcosystem[0]?.ecosystem ?? null;
      return {
        province,
        value: dominant,
        label: 'Ekosistem dominan',
        detail: summary
          ? `${formatArea(summary.areaHa)} tercatat · ${formatNumber(
              summary.recordCount,
            )} catatan`
          : 'Belum ada catatan',
      };
    });
  }, [ecosystem, mapMode, recordsByProvince]);

  const metricById = useMemo(
    () => new Map(metrics.map((metric) => [metric.province.location.id, metric])),
    [metrics],
  );

  const numericValues = useMemo(
    () =>
      metrics
        .map((metric) => metric.value)
        .filter((value): value is number => typeof value === 'number'),
    [metrics],
  );

  const scale = useMemo(() => {
    if (mapMode === 'status') return statusScale();
    if (mapMode === 'ecosystem') return null;
    return buildNumericScale(numericValues);
  }, [mapMode, numericValues]);

  const hasAnyData = useMemo(
    () => metrics.some((metric) => metric.value !== null),
    [metrics],
  );

  const emptyTitle =
    records.length === 0
      ? 'Belum ada catatan spasial.'
      : mapMode === 'value'
        ? 'Belum ada nilai tervaluasi.'
        : mapMode === 'status'
          ? 'Status kawasan belum cukup.'
          : 'Belum ada data pada mode ini.';
  const emptyBody =
    records.length === 0
      ? 'Hasil kalkulator dapat ditambahkan ke peta. Tanpa luas yang diverifikasi, nilai provinsi tidak diisi.'
      : mapMode === 'value'
        ? 'Catatan tersedia, tetapi belum ada nilai. Hanya catatan kawasan lindung (KL) yang dapat dinilai; non-KL dan status belum diketahui tidak diisi.'
        : mapMode === 'status'
          ? 'Catatan tersedia, tetapi belum ada luas berstatus KL atau non-KL; status yang belum diketahui tidak dianggap KL.'
          : 'Tambahkan catatan dengan provinsi dan luas untuk mengisi mode ini.';

  const selectedProvince = selectedProvinceId
    ? metrics.find((metric) => metric.province.location.id === selectedProvinceId)
    : null;

  const hoveredMetric = hovered ? metricById.get(hovered.provinceId) ?? null : null;

  const graticulePath = useMemo(() => geoPath(projection)(geoGraticule10()) ?? '', []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = pointerToViewBox(svg, event.clientX, event.clientY);
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => zoomAt(current, point, factor));
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  function pointerTooltip(provinceId: string, clientX: number, clientY: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    setHovered({
      provinceId,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  function focusTooltip(province: MapProvince) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const scaleFactor = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
    const offsetX = (rect.width - MAP_WIDTH * scaleFactor) / 2;
    const offsetY = (rect.height - MAP_HEIGHT * scaleFactor) / 2;
    const [pointX, pointY] = province.centroid;
    setHovered({
      provinceId: province.location.id,
      x: offsetX + (view.x + view.k * pointX) * scaleFactor,
      y: offsetY + (view.y + view.k * pointY) * scaleFactor,
    });
  }

  function selectProvince(provinceId: string) {
    if (suppressClickRef.current) return;
    onSelectProvince(provinceId);
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const point = pointerToViewBox(event.currentTarget, event.clientX, event.clientY);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      originX: view.x,
      originY: view.y,
      moved: false,
    };
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerToViewBox(event.currentTarget, event.clientX, event.clientY);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (!drag.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      drag.moved = true;
      suppressClickRef.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    setView((current) => ({ ...current, x: drag.originX + dx, y: drag.originY + dy }));
  }

  function endPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
  }

  function leavePointer() {
    if (dragRef.current && !dragRef.current.moved) dragRef.current = null;
    setHovered(null);
  }

  function resetView() {
    setView({ x: 0, y: 0, k: 1 });
    setHovered(null);
  }

  function handleProvinceSelect(value: string) {
    if (!value) {
      onReset();
      resetView();
      return;
    }
    onSelectProvince(value);
    const province = mapProvinces.find((item) => item.location.id === value);
    if (!province) return;
    const [[x0, y0], [x1, y1]] = province.bounds;
    const width = Math.max(x1 - x0, 1);
    const height = Math.max(y1 - y0, 1);
    const nextK = clamp(Math.min((MAP_WIDTH - 130) / width, (MAP_HEIGHT - 130) / height), 1, 6);
    setView({
      k: nextK,
      x: MAP_WIDTH / 2 - nextK * (x0 + width / 2),
      y: MAP_HEIGHT / 2 - nextK * (y0 + height / 2),
    });
  }

  function fillFor(metric: ProvinceMetric): string {
    if (mapMode === 'ecosystem') {
      return typeof metric.value === 'string'
        ? ECOSYSTEM_COLORS[metric.value] ?? RAMP[3]
        : NO_DATA;
    }
    if (typeof metric.value !== 'number' || !scale) return NO_DATA;
    return scale.colors[scale.valueFor(metric.value)] ?? RAMP[2];
  }

  const tooltipWidth = 248;
  const tooltipStyle = hovered
    ? {
        left: `${clamp(hovered.x + 14, 8, Math.max(8, (frameRef.current?.clientWidth ?? 600) - tooltipWidth - 8))}px`,
        top: `${clamp(hovered.y + 14, 8, Math.max(8, (frameRef.current?.clientHeight ?? 400) - 150))}px`,
      }
    : undefined;

  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="map-toolbar">
        <div className="map-heading">
          <div className="eyebrow">Peta provinsi · 38 batas</div>
          <h2 id="map-title">{MODE_TITLES[mapMode]}</h2>
          <p>
            {mapMode === 'coefficient'
              ? `Ekosistem ${ecosystem} · Rp/ha/tahun · tingkat harga 2025`
              : 'Agregasi catatan pengguna · seluruh ekosistem · bukan data provinsi dari workbook'}
          </p>
        </div>
        <div className="map-controls">
          <label className="compact-field">
            <span>Provinsi</span>
            <select
              value={selectedProvinceId ?? ''}
              onChange={(event) => handleProvinceSelect(event.target.value)}
            >
              <option value="">Nasional — 38 provinsi</option>
              {mapProvinces.map((province) => (
                <option key={province.location.id} value={province.location.id}>
                  {province.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            <span>Ekosistem acuan</span>
            <select
              value={ecosystem}
              onChange={(event) => onEcosystemChange(event.target.value)}
            >
              {ecosystems.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="text-button map-reset" onClick={() => {
            onReset();
            resetView();
          }}>
            Nasional
          </button>
        </div>
      </div>

      <div className="mode-bar" role="group" aria-label="Mode tampilan peta">
        {(Object.keys(MODE_LABELS) as MapMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`mode-button${mapMode === mode ? ' is-active' : ''}`}
            aria-pressed={mapMode === mode}
            onClick={() => onMapModeChange(mode)}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="map-frame" ref={frameRef}>
        <svg
          ref={svgRef}
          className="map-svg"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="group"
          aria-label={`Peta Indonesia, ${MODE_TITLES[mapMode]}. Pilih provinsi dengan Tab lalu Enter.`}
          aria-describedby="map-instructions"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={leavePointer}
        >
          <title>Peta provinsi Indonesia</title>
          <desc id="map-instructions">
            Gunakan Tab untuk berpindah antarpovinsi dan Enter atau Spasi untuk memilih.
            Gulir untuk memperbesar, seret untuk menggeser. Tombol zoom tersedia di kanan bawah.
          </desc>
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="map-sea" />
          <path d={graticulePath} className="graticule" aria-hidden="true" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {mapProvinces.map((province) => {
              const metric = metricById.get(province.location.id);
              const selected = selectedProvinceId === province.location.id;
              return (
                <path
                  key={province.location.id}
                  d={province.path}
                  className={`province${selected ? ' is-selected' : ''}`}
                  fill={metric ? fillFor(metric) : NO_DATA}
                  role="button"
                  tabIndex={0}
                  aria-label={`${province.displayName}: ${
                    metric ? metricText(mapMode, metric.value) : 'Tidak tersedia'
                  }`}
                  aria-pressed={selected}
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={(event) =>
                    pointerTooltip(province.location.id, event.clientX, event.clientY)
                  }
                  onMouseMove={(event) =>
                    pointerTooltip(province.location.id, event.clientX, event.clientY)
                  }
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => focusTooltip(province)}
                  onBlur={() => setHovered(null)}
                  onClick={() => selectProvince(province.location.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectProvince(province.location.id);
                    }
                  }}
                />
              );
            })}
            <g aria-hidden="true" className="island-labels">
              {islandLabels.map((label) => (
                <text
                  key={label.name}
                  x={label.point[0]}
                  y={label.point[1]}
                  textAnchor="middle"
                >
                  {label.name}
                </text>
              ))}
            </g>
          </g>
        </svg>

        <div className="map-zoom" role="group" aria-label="Kontrol zoom peta">
          <button
            type="button"
            aria-label="Perbesar peta"
            onClick={() => setView((current) => zoomAt(current, { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, 1.35))}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Perkecil peta"
            onClick={() => setView((current) => zoomAt(current, { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, 1 / 1.35))}
          >
            −
          </button>
          <button type="button" aria-label="Kembalikan tampilan peta" onClick={resetView}>
            ⤢
          </button>
        </div>

        {!hasAnyData && mapMode !== 'coefficient' && (
          <div className="map-empty">
            <strong>{emptyTitle}</strong>
            <span>{emptyBody}</span>
            <button type="button" className="inline-button" onClick={onFocusCalculator}>
              Buka kalkulator
            </button>
          </div>
        )}

        {hoveredMetric && hovered && (
          <div className="map-tooltip" style={tooltipStyle} role="status">
            <div className="tooltip-title">{hoveredMetric.province.displayName}</div>
            <div className="tooltip-metric">
              <span>{metricLabel(mapMode)}</span>
              <strong>{metricText(mapMode, hoveredMetric.value)}</strong>
            </div>
            <p>{hoveredMetric.detail}</p>
            {selectedProvince?.province.location.id === hoveredMetric.province.location.id && (
              <div className="tooltip-selected">Provinsi terpilih</div>
            )}
          </div>
        )}
      </div>

      <div className="map-footer">
        <div className="map-legend" aria-label="Legenda peta">
          <div className="legend-title">Legenda</div>
          {mapMode === 'ecosystem' ? (
            <div className="legend-categories">
              {ecosystems
                .filter((item) => metrics.some((metric) => metric.value === item.name))
                .map((item) => (
                  <span key={item.id} className="legend-category">
                    <i style={{ background: ECOSYSTEM_COLORS[item.name] ?? RAMP[3] }} />
                    {item.name}
                  </span>
                ))}
              <span className="legend-category">
                <i style={{ background: NO_DATA }} />
                Tanpa catatan
              </span>
            </div>
          ) : scale ? (
            <div className="legend-scale">
              {scale.colors.map((color, index) => {
                const lower = index === 0 ? scale.min : scale.breaks[index - 1] ?? scale.min;
                const upper =
                  index === scale.colors.length - 1
                    ? scale.max
                    : scale.breaks[index] ?? scale.max;
                return (
                  <span key={`${color}-${index}`} className="legend-step">
                    <i style={{ background: color }} />
                    <span>
                      {scale.breaks.length === 0
                        ? legendText(mapMode, lower)
                        : `${legendText(mapMode, lower)} – ${legendText(mapMode, upper)}`}
                    </span>
                  </span>
                );
              })}
              <span className="legend-step">
                <i style={{ background: NO_DATA }} />
                <span>Tanpa data</span>
              </span>
            </div>
          ) : (
            <span className="legend-unavailable">Belum ada sebaran data</span>
          )}
        </div>
        <div className="map-source">
          <span>
            {mapMode === 'coefficient'
              ? `Koefisien per hektare dihitung dari ${formatNumber(
                  meta.studyCount,
                )} studi benefit transfer; perbedaan antarpovinsi berasal dari UMP 2025.`
              : 'Nilai/luas provinsi hanya berasal dari catatan yang ditambahkan pengguna. Workbook tidak memuat luas ekosistem provinsi.'}
          </span>
          <span>
            Batas: {BOUNDARY_SOURCE.name} · {BOUNDARY_SOURCE.license}. Bukan peta resmi BIG.
          </span>
        </div>
      </div>
    </section>
  );
}
