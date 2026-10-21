import { useMemo } from 'react';
import {
  KAWASAN_STATUS_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_SHORT_LABELS,
  type RecordSummary,
  type SpatialRecord,
} from '../types';
import { locationsById, meta } from '../data/reference';
import {
  coefficientsForEcosystem,
  highestCategory,
  highestEcosystemForProvince,
  nationalCoefficientSummary,
  studiesForEcosystem,
} from '../lib/valuation';
import {
  dominantEcosystem,
  leadingService,
  recordsForProvince,
  summarizeRecords,
} from '../lib/records';
import {
  formatArea,
  formatCompactRupiah,
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahPerHa,
  formatUmp,
} from '../lib/format';

interface StatsPanelProps {
  records: SpatialRecord[];
  selectedProvinceId: string | null;
  ecosystem: string;
  onDeleteRecord: (recordId: string) => void;
  onClearRecords: () => void;
  onFocusCalculator: () => void;
}

interface StatProps {
  label: string;
  value: string;
  note: string;
  title?: string;
}

function Stat({ label, value, note, title }: StatProps) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value" title={title}>
        {value}
      </strong>
      <span className="stat-note">{note}</span>
    </div>
  );
}

function categoryLabel(category: keyof RecordSummary['byService']): string {
  return SERVICE_SHORT_LABELS[category];
}

function recordValueLabel(record: SpatialRecord): string {
  if (record.value === null) {
    return record.kawasanStatus === 'NON_KL'
      ? 'Tidak dinilai (non-KL)'
      : 'Tidak dinilai';
  }
  return `${formatCompactRupiah(record.value)}${record.partial ? ' · parsial' : ''}`;
}

export function StatsPanel({
  records,
  selectedProvinceId,
  ecosystem,
  onDeleteRecord,
  onClearRecords,
  onFocusCalculator,
}: StatsPanelProps) {
  const selectedLocation = selectedProvinceId
    ? locationsById.get(selectedProvinceId) ?? null
    : null;
  const provinceRecords = useMemo(
    () => recordsForProvince(records, selectedProvinceId),
    [records, selectedProvinceId],
  );
  const recordSummary = useMemo(() => summarizeRecords(provinceRecords), [provinceRecords]);
  const national = useMemo(() => nationalCoefficientSummary(ecosystem), [ecosystem]);
  const coefficients = useMemo(
    () =>
      selectedLocation
        ? coefficientsForEcosystem(ecosystem, selectedLocation.ump, selectedLocation.id)
        : null,
    [ecosystem, selectedLocation],
  );
  const highest = useMemo(
    () => (selectedLocation ? highestEcosystemForProvince(selectedLocation) : null),
    [selectedLocation],
  );
  const topService = useMemo(
    () => (coefficients ? highestCategory(coefficients) : null),
    [coefficients],
  );
  const dominant = dominantEcosystem(recordSummary);
  const leading = leadingService(recordSummary);
  const studyCount = useMemo(() => studiesForEcosystem(ecosystem).length, [ecosystem]);

  const displayName = selectedLocation
    ? selectedLocation.name.replace(/^Provinsi\s+/i, '')
    : 'Nasional';
  const coveredProvinces = useMemo(() => {
    return new Set(records.map((record) => record.provinceId).filter(Boolean)).size;
  }, [records]);

  const recordValue =
    recordSummary.recordCount === 0
      ? 'Belum ada catatan'
      : recordSummary.valuedRecordCount === 0
        ? 'Tidak dapat dinilai'
        : `${formatCompactRupiah(recordSummary.totalValue)}/tahun`;
  const recordValueNote =
    recordSummary.recordCount === 0
      ? 'Tambahkan hasil kalkulator untuk mengisi peta'
      : recordSummary.valuedRecordCount === 0
        ? 'Tidak ada catatan kawasan lindung yang dapat dinilai'
        : `${formatNumber(recordSummary.valuedRecordCount)} dari ${formatNumber(
            recordSummary.recordCount,
          )} catatan dinilai${
            recordSummary.partialRecordCount > 0
              ? ` · ${formatNumber(recordSummary.partialRecordCount)} parsial`
              : ''
          }`;

  const categoryMax = coefficients
    ? Math.max(
        1,
        ...SERVICE_CATEGORIES.map(
          (category) => coefficients.categories[category].value ?? 0,
        ),
      )
    : 1;

  return (
    <section className="stats-panel" aria-labelledby="stats-title">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Statistik</div>
          <h2 id="stats-title">{displayName}</h2>
        </div>
        <span className="scope-badge">{selectedLocation ? 'Provinsi' : '38 provinsi'}</span>
      </div>
      <p className="panel-sub">
        {selectedLocation
          ? `${selectedLocation.name} · UMP 2025 ${formatUmp(selectedLocation.ump)}`
          : 'Gambaran umum dari seluruh provinsi, pilih provinsi pada peta untuk mendapatkan data yang lebih rinci.'}
      </p>

      <div className="stat-section">
        <div className="section-kicker">
          <span>Koefisien</span>
          <span className="kicker-detail">{ecosystem}</span>
        </div>

        {selectedLocation && coefficients ? (
          <>
            <div className="stat-grid">
              <Stat
                label="Total per hektar"
                value={formatRupiahPerHa(coefficients.total)}
                note={
                  coefficients.partial
                    ? 'Jumlah kategori tersedia · total parsial'
                    : 'Rp/ha/tahun · 2025'
                }
                title={coefficients.total !== null ? formatRupiah(coefficients.total) : undefined}
              />
              <Stat
                label="Jasa ekosistem tertinggi"
                value={topService ? categoryLabel(topService.category) : 'Tidak tersedia'}
                note={
                  topService
                    ? `${formatRupiahPerHa(topService.value)} · Nilai Median`
                    : 'Tidak ada kategori bernilai'
                }
              />
              <Stat
                label="Ekosistem dominan"
                value={highest?.ecosystem ?? 'Tidak tersedia'}
                note={
                  highest
                    ? `${formatRupiahPerHa(highest.value)}${highest.partial ? ' · parsial' : ''}`
                    : 'Tidak ada koefisien'
                }
              />
              <Stat
                label="sumber pustaka"
                value={`${formatNumber(studyCount)} studi`}
                note={`${formatNumber(recordSummary.recordCount)} catatan di provinsi ini`}
              />
            </div>

            <div className="category-breakdown" aria-label="Rincian kategori jasa ekosistem">
              {SERVICE_CATEGORIES.map((category) => {
                const item = coefficients.categories[category];
                return (
                  <div className="category-row" key={category}>
                    <span className="category-name">{categoryLabel(category)}</span>
                    <span className="category-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${item.value === null ? 0 : Math.max(2, (item.value / categoryMax) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="category-value">
                      {item.value === null
                        ? 'Tidak tersedia'
                        : formatRupiahPerHa(item.value)}
                    </span>
                    <span className="category-sample">n={item.sampleSize}</span>
                  </div>
                );
              })}
            </div>
            {coefficients.missingCategories.length > 0 && (
              <p className="inline-note">
                Kategori tidak tersedia:{' '}
                {coefficients.missingCategories.map(categoryLabel).join(', ')}. Nilai tidak
                diisi nol; total hanya menjumlahkan kategori yang tersedia.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="stat-grid">
              <Stat
                label="Rentang antar povinsi"
                value={
                  national.min && national.max
                    ? `${formatRupiahPerHa(national.min.value)} – ${formatRupiahPerHa(
                        national.max.value,
                      )}`
                    : 'Tidak tersedia'
                }
                note="Antara Nilai Tertinggi dan Terendah"
              />
              <Stat
                label="Provinsi tertinggi"
                value={national.max?.displayName ?? 'Tidak tersedia'}
                note={national.max ? formatRupiahPerHa(national.max.value) : 'Tidak tersedia'}
              />
              <Stat
                label="Provinsi terendah"
                value={national.min?.displayName ?? 'Tidak tersedia'}
                note={national.min ? formatRupiahPerHa(national.min.value) : 'Tidak tersedia'}
              />
              <Stat
                label="Studi sumber"
                value={`${formatNumber(studyCount)} studi`}
                note={`${formatNumber(national.provinceCount)} provinsi berkoefisien`}
              />
            </div>
            <p className="mini-note">
              Nilai median antarpovinsi{' '}
              <strong>{formatRupiahPerHa(national.medianValue)}</strong>. Statistik ini
              deskriptif dan dihitung dari 38 provinsi berdasarkan benefit transfer.
            </p>
          </>
        )}
      </div>

      <div className="section-divider" />

      <div className="stat-section">
        <div className="section-kicker">
          <span>Catatan Valuasi</span>
          <span className="kicker-detail">
            {formatNumber(recordSummary.recordCount)} catatan
          </span>
        </div>

        {recordSummary.recordCount === 0 ? (
          <div className="empty-state">
            <strong>Belum ada catatan.</strong>
            <p>
              Sumber data tidak memiliki data luas ekosistem. Nilai total hanya akan muncul setelah
              pengguna menambahkan luas yang diisi melalui kalkulator.
            </p>
            <button type="button" className="inline-button" onClick={onFocusCalculator}>
              Buka kalkulator
            </button>
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <Stat
                label="Nilai tervaluasi"
                value={recordValue}
                note={recordValueNote}
                title={
                  recordSummary.valuedRecordCount > 0
                    ? formatRupiah(recordSummary.totalValue)
                    : undefined
                }
              />
              <Stat
                label="Luas tercatat"
                value={formatArea(recordSummary.areaHa)}
                note={`${formatNumber(recordSummary.recordCount)} catatan · seluruh ekosistem`}
              />
              <Stat
                label="Pangsa kawasan lindung"
                value={formatPercent(recordSummary.klShare, 0)}
                note={`KL ${formatArea(recordSummary.klAreaHa)} · non-KL ${formatArea(
                  recordSummary.nonKlAreaHa,
                )}`}
              />
              <Stat
                label="Ekosistem dominan"
                value={dominant ?? 'Tidak tersedia'}
                note={
                  dominant
                    ? `${formatArea(
                        recordSummary.byEcosystem.find((item) => item.ecosystem === dominant)
                          ?.areaHa ?? null,
                      )} tercatat`
                    : 'Belum ada luas tercatat'
                }
              />
            </div>

            {recordSummary.unknownAreaHa > 0 && (
              <p className="inline-note">
                {formatArea(recordSummary.unknownAreaHa)} memiliki status kawasan belum
                diketahui dan tidak dihitung sebagai KL atau non-KL.
              </p>
            )}

            {leading && (
              <p className="mini-note">
                Jasa dengan nilai tervaluasi terbesar:{' '}
                <strong>{categoryLabel(leading.category)}</strong> ·{' '}
                {formatCompactRupiah(leading.value)}.
              </p>
            )}

            <ul className="record-list" aria-label="Catatan spasial terbaru">
              {provinceRecords.slice(0, 4).map((record) => (
                <li key={record.id}>
                  <div className="record-main">
                    <strong>{record.label}</strong>
                    <span>
                      {record.ecosystem} · {formatArea(record.areaHa)} ·{' '}
                      {KAWASAN_STATUS_LABELS[record.kawasanStatus]}
                    </span>
                  </div>
                  <div className="record-side">
                    <span>{recordValueLabel(record)}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Hapus catatan ${record.label}`}
                      onClick={() => onDeleteRecord(record.id)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {provinceRecords.length > 4 && (
              <p className="mini-note">
                {formatNumber(provinceRecords.length - 4)} catatan lain tidak ditampilkan.
              </p>
            )}
            <div className="record-actions">
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  if (window.confirm('Hapus semua catatan spasial dari peramban ini?')) {
                    onClearRecords();
                  }
                }}
              >
                Hapus semua catatan
              </button>
            </div>
          </>
        )}
      </div>

      <p className="stats-footnote">
        Koefisien: {formatNumber(meta.studyCount)} studi,{' '}
        {formatNumber(meta.componentCount)} komponen, median kategori non-nol, UMP{' '}
        {meta.priceYear}. Nilai total provinsi memerlukan luas ekosistem yang tidak tersedia
        pada basis data.
        {selectedLocation
          ? ''
          : ` ${formatNumber(coveredProvinces)} provinsi memiliki catatan pengguna.`}
      </p>
      <span className="sr-only" aria-live="polite">
        {selectedLocation
          ? `Provinsi terpilih: ${displayName}.`
          : 'Tampilan nasional.'}
      </span>
    </section>
  );
}
