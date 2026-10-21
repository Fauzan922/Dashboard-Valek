import { useEffect, useMemo, useState } from 'react';
import {
  AREA_UNITS,
  AREA_UNIT_FACTORS,
  KAWASAN_STATUSES,
  KAWASAN_STATUS_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_LABELS,
  SERVICE_SHORT_LABELS,
  type AreaUnit,
  type KawasanStatus,
  type ServiceCategory,
  type ServiceSelection,
  type SpatialRecord,
} from '../types';
import {
  ecosystems,
  kabupatenLocations,
  kawasanList,
  locationsById,
  otherLocations,
  provinceLocations,
} from '../data/reference';
import { identifyEcosystem } from '../lib/classification';
import {
  coefficientForSelection,
  coefficientsForEcosystem,
  displayNameForLocation,
} from '../lib/valuation';
import {
  formatArea,
  formatNumber,
  formatRupiah,
  parsePositiveNumber,
} from '../lib/format';

interface CalculatorPanelProps {
  selectedProvinceId: string | null;
  ecosystem: string;
  onEcosystemChange: (ecosystem: string) => void;
  onSelectProvince: (provinceId: string) => void;
  onAddRecord: (record: SpatialRecord) => void;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function categoryLabel(category: ServiceCategory): string {
  return SERVICE_SHORT_LABELS[category];
}

export function CalculatorPanel({
  selectedProvinceId,
  ecosystem,
  onEcosystemChange,
  onSelectProvince,
  onAddRecord,
}: CalculatorPanelProps) {
  const [locationId, setLocationId] = useState(selectedProvinceId ?? 'loc001');
  const [kawasanTypeId, setKawasanTypeId] = useState('');
  const [status, setStatus] = useState<KawasanStatus>('UNKNOWN');
  const [service, setService] = useState<ServiceSelection>('Total');
  const [areaInput, setAreaInput] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('ha');
  const [label, setLabel] = useState('');
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProvinceId) {
      setLocationId(selectedProvinceId);
      setAddedMessage(null);
    }
  }, [selectedProvinceId]);

  const location = locationsById.get(locationId) ?? null;
  const parsedArea = parsePositiveNumber(areaInput);
  const areaHa = parsedArea !== null ? parsedArea * AREA_UNIT_FACTORS[areaUnit] : null;
  const coefficients = useMemo(
    () =>
      location
        ? coefficientsForEcosystem(ecosystem, location.ump, location.id)
        : null,
    [ecosystem, location],
  );
  const selectedCoefficient = useMemo(
    () =>
      location
        ? coefficientForSelection(ecosystem, location.ump, service, location.id)
        : null,
    [ecosystem, location, service],
  );
  const identification = kawasanTypeId
    ? identifyEcosystem(kawasanTypeId, ecosystem)
    : null;
  const canAddToMap = location?.type === 'province' && areaHa !== null;
  const canAddValue =
    canAddToMap &&
    status === 'KL' &&
    coefficients !== null &&
    coefficients.total !== null &&
    areaHa !== null;
  const calculatedValue =
    status === 'KL' && selectedCoefficient !== null && areaHa !== null
      ? selectedCoefficient * areaHa
      : null;
  const totalRecordValue =
    status === 'KL' && coefficients?.total !== null && coefficients?.total !== undefined && areaHa !== null
      ? coefficients.total * areaHa
      : null;
  const areaError = areaInput.trim() !== '' && parsedArea === null;
  const selectedCategory =
    service === 'Total' ? null : coefficients?.categories[service] ?? null;
  const missingCategory = selectedCategory !== null && selectedCategory.value === null;
  const unitSymbol = areaUnit === 'km2' ? 'km²' : areaUnit === 'm2' ? 'm²' : 'ha';

  function handleLocationChange(nextId: string) {
    setLocationId(nextId);
    setAddedMessage(null);
    const nextLocation = locationsById.get(nextId);
    if (nextLocation?.type === 'province') onSelectProvince(nextId);
  }

  function handleAdd() {
    if (!location || areaHa === null || !canAddToMap) return;
    const categoryValues = Object.fromEntries(
      SERVICE_CATEGORIES.map((category) => {
        const categoryValue = coefficients?.categories[category].value ?? null;
        return [category, categoryValue === null ? null : categoryValue * areaHa];
      }),
    ) as Record<ServiceCategory, number | null>;

    const record: SpatialRecord = {
      id: makeId(),
      label: label.trim() || `${ecosystem} — ${displayNameForLocation(location)}`,
      provinceId: location.type === 'province' ? location.id : null,
      provinceName: location.type === 'province' ? location.name : null,
      locationId: location.id,
      locationName: location.name,
      ecosystem,
      kawasanTypeId: kawasanTypeId || null,
      kawasanStatus: status,
      areaHa,
      value: canAddValue ? totalRecordValue : null,
      categoryValues: canAddValue
        ? categoryValues
        : { Cultural: null, Provisioning: null, Regulating: null },
      partial: canAddValue ? Boolean(coefficients?.partial) : false,
      missingCategories: canAddValue ? coefficients?.missingCategories ?? [] : [],
      createdAt: new Date().toISOString(),
      notes: null,
    };
    onAddRecord(record);
    setAddedMessage(
      canAddValue
        ? `Catatan ditambahkan${coefficients?.partial ? ' dengan nilai parsial' : ''}. Peta beralih ke nilai total.`
        : 'Luas ditambahkan tanpa nilai. Peta beralih ke luas tercatat.',
    );
    setLabel('');
  }

  return (
    <section className="calculator-panel" aria-labelledby="calculator-title">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Kalkulator valuasi</div>
          <h2 id="calculator-title">Estimasi nilai jasa ekosistem</h2>
        </div>
        <span className="scope-badge">2025</span>
      </div>
      <p className="panel-sub">
        Benefit transfer per hektare · hasil tahunan · bukan penilaian tapak.
      </p>

      <div className="calculator-form">
        <label className="field field-wide">
          <span>Lokasi UMP</span>
          <select
            value={locationId}
            onChange={(event) => handleLocationChange(event.target.value)}
          >
            <optgroup label="Provinsi (38)">
              {provinceLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Kabupaten / kota">
              {kabupatenLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
            {otherLocations.length > 0 && (
              <optgroup label="Lokasi lain pada tabel UMP">
                {otherLocations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <small>
            {location
              ? `UMP 2025 ${formatRupiah(location.ump)}/bulan`
              : 'Lokasi tidak ditemukan.'}
          </small>
        </label>

        <label className="field">
          <span>Ekosistem</span>
          <select
            value={ecosystem}
            onChange={(event) => {
              onEcosystemChange(event.target.value);
              setAddedMessage(null);
            }}
          >
            {ecosystems.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Jenis kawasan</span>
          <select
            value={kawasanTypeId}
            onChange={(event) => {
              setKawasanTypeId(event.target.value);
              setAddedMessage(null);
            }}
          >
            <option value="">Tidak dipilih</option>
            {kawasanList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <small>Untuk tabel identifikasi; tidak mengubah koefisien D16.</small>
        </label>

        <label className="field">
          <span>Status kawasan</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as KawasanStatus);
              setAddedMessage(null);
            }}
          >
            {KAWASAN_STATUSES.map((item) => (
              <option key={item} value={item}>
                {KAWASAN_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
          <small>Ditentukan pengguna, bukan dari nama lokasi.</small>
        </label>

        <label className="field">
          <span>Jasa ekosistem</span>
          <select
            value={service}
            onChange={(event) => {
              setService(event.target.value as ServiceSelection);
              setAddedMessage(null);
            }}
          >
            {(['Total', ...SERVICE_CATEGORIES] as ServiceSelection[]).map((item) => (
              <option key={item} value={item}>
                {SERVICE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <div className="field field-wide">
          <label htmlFor="calc-area">Luas</label>
          <div className="area-input-row">
            <input
              id="calc-area"
              type="text"
              inputMode="decimal"
              value={areaInput}
              onChange={(event) => {
                setAreaInput(event.target.value);
                setAddedMessage(null);
              }}
              placeholder="mis. 1.250"
              aria-invalid={areaError}
              aria-describedby={areaError ? 'area-error' : undefined}
            />
            <select
              aria-label="Satuan luas"
              value={areaUnit}
              onChange={(event) => setAreaUnit(event.target.value as AreaUnit)}
            >
              {AREA_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit === 'km2' ? 'km²' : unit === 'm2' ? 'm²' : 'ha'}
                </option>
              ))}
            </select>
          </div>
          <small>
            {areaHa !== null
              ? `${formatNumber(parsedArea ?? 0, 2)} ${unitSymbol} = ${formatArea(areaHa)}`
              : 'Masukkan luas aktual; tidak ada nilai default.'}
          </small>
          {areaError && (
            <span className="field-error" id="area-error" role="alert">
              Luas harus berupa angka lebih besar dari 0.
            </span>
          )}
        </div>

        <label className="field field-wide">
          <span>Label catatan (opsional)</span>
          <input
            type="text"
            value={label}
            maxLength={90}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={
              location ? `${ecosystem} — ${displayNameForLocation(location)}` : undefined
            }
          />
        </label>
      </div>

      {identification && (
        <p
          className={`compat-note${
            identification.status === 'incompatible' ? ' is-warning' : ''
          }`}
        >
          {identification.message}
          {identification.status === 'incompatible' &&
            ' Kalkulator tetap memakai koefisien ekosistem karena formula D16 tidak memakai jenis kawasan.'}
        </p>
      )}

      <div className="calculation-box">
        <div className="calc-heading">
          <span>Perhitungan</span>
          <span className="calc-unit">Rp/tahun · 2025</span>
        </div>

        <div className="calc-step">
          <span>
            Koefisien {service === 'Total' ? 'total' : SERVICE_LABELS[service]}
          </span>
          <strong>
            {selectedCoefficient !== null
              ? `${formatRupiah(selectedCoefficient)}/ha`
              : 'Tidak tersedia'}
          </strong>
        </div>

        <div className="calc-step">
          <span>Luas</span>
          <strong>{areaHa !== null ? formatArea(areaHa) : 'Belum diisi'}</strong>
        </div>

        <div className="calc-formula">
          {selectedCoefficient !== null && areaHa !== null
            ? `${formatNumber(selectedCoefficient)} × ${formatNumber(areaHa, 2)} ha`
            : 'Koefisien × luas'}
        </div>

        <div className="calc-total" aria-live="polite">
          <span>Estimasi nilai</span>
          <strong>
            {calculatedValue !== null
              ? `${formatRupiah(calculatedValue)}/tahun`
              : 'Tidak dihitung'}
          </strong>
        </div>

        {status !== 'KL' && (
          <p className="calc-reason">
            {status === 'NON_KL'
              ? 'Workbook tidak menyediakan koefisien non-kawasan lindung. Nilai tidak diisi nol.'
              : 'Status kawasan belum diketahui. Pilih status berdasarkan data kawasan yang berwenang; nilai tidak dihitung.'}
          </p>
        )}
        {status === 'KL' && selectedCoefficient === null && (
          <p className="calc-reason">
            Koefisien kategori ini tidak tersedia pada workbook. Tidak ada substitusi nol.
          </p>
        )}
        {status === 'KL' && missingCategory && (
          <p className="calc-reason">
            Kategori {SERVICE_LABELS[service]} tidak memiliki median pada workbook.
          </p>
        )}
        {service === 'Total' && coefficients?.partial && (
          <p className="calc-reason">
            Total parsial:{' '}
            {coefficients.missingCategories.map((category) => SERVICE_SHORT_LABELS[category]).join(', ')}{' '}
            tidak tersedia. Nilai
            hanya menjumlahkan kategori yang ada.
          </p>
        )}

        {status === 'KL' && areaHa !== null && coefficients && (
          <div className="calc-breakdown" aria-label="Rincian kategori">
            {SERVICE_CATEGORIES.map((category) => {
              const item = coefficients.categories[category];
              return (
                <div key={category} className="calc-breakdown-row">
                  <span>
                    {categoryLabel(category)}
                    <small> n={item.sampleSize}</small>
                  </span>
                  <span>
                    {item.value === null
                      ? 'Tidak tersedia'
                      : `${formatNumber(item.value)}/ha × ${formatNumber(areaHa, 2)} = ${formatRupiah(
                          item.value * areaHa,
                        )}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="calc-source">
          Koefisien = median total kategori per studi × (UMP 2025 lokasi / UMP 2025 studi).
          Nilai dasar sudah disesuaikan ke 2025 dan tidak diinflasi ulang.
        </p>
      </div>

      <div className="calculator-actions">
        <button
          type="button"
          className="primary-button"
          disabled={!canAddToMap}
          onClick={handleAdd}
        >
          {canAddValue
            ? coefficients?.partial
              ? 'Tambah nilai parsial ke peta'
              : 'Tambah nilai ke peta'
            : 'Tambah luas tanpa nilai'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setAreaInput('');
            setLabel('');
            setAddedMessage(null);
          }}
        >
          Kosongkan luas
        </button>
      </div>

      {!canAddToMap && (
        <p className="inline-note">
          Peta mengagregasi catatan tingkat provinsi. Workbook tidak memetakan kabupaten/kota
          ke provinsi, sehingga lokasi kabupaten/kota tetap dapat dihitung tetapi tidak
          ditambahkan ke peta tanpa padanan wilayah yang terverifikasi.
        </p>
      )}
      {canAddToMap && !canAddValue && status === 'KL' && (
        <p className="inline-note">
          Total ekosistem tidak tersedia untuk catatan ini; luas dapat disimpan tanpa nilai.
        </p>
      )}
      {canAddValue && service !== 'Total' && (
        <p className="inline-note">
          Catatan peta menyimpan total ekosistem, bukan hanya kategori jasa yang dipilih.
        </p>
      )}
      {addedMessage && (
        <p className="success-note" role="status">
          {addedMessage}
        </p>
      )}
    </section>
  );
}
