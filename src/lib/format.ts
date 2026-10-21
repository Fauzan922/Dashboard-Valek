const numberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (maximumFractionDigits === 0) return numberFormatter.format(value);
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);
}

export function formatRupiah(value: number | null, maximumFractionDigits = 0): string {
  if (value === null || !Number.isFinite(value)) return 'Tidak tersedia';
  return `Rp ${formatNumber(value, maximumFractionDigits)}`;
}

export function formatCompactRupiah(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Tidak tersedia';
  const sign = value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) {
    return `${sign}Rp ${compactFormatter.format(absolute / 1_000_000_000_000)} triliun`;
  }
  if (absolute >= 1_000_000_000) {
    return `${sign}Rp ${compactFormatter.format(absolute / 1_000_000_000)} miliar`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}Rp ${compactFormatter.format(absolute / 1_000_000)} jt`;
  }
  if (absolute >= 1_000) {
    return `${sign}Rp ${compactFormatter.format(absolute / 1_000)} rb`;
  }
  return `${sign}Rp ${numberFormatter.format(absolute)}`;
}

export function formatRupiahPerHa(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Tidak tersedia';
  return `${formatCompactRupiah(value)}/ha`;
}

export function formatArea(value: number | null, maximumFractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) return 'Tidak tersedia';
  return `${formatNumber(value, maximumFractionDigits)} ha`;
}

export function formatPercent(value: number | null, maximumFractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return 'Tidak tersedia';
  return `${formatNumber(value * 100, maximumFractionDigits)}%`;
}

export function formatUmp(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Tidak tersedia';
  return `${formatRupiah(value)}/bulan`;
}

/**
 * Accepts Indonesian comma decimals and plain dot decimals. Returns null for
 * blank, non-numeric, zero, or negative values instead of silently coercing
 * invalid input to zero.
 */
function normalizeDecimalInput(value: string): string {
  const compact = value.trim().replace(/\s/g, '');
  if (compact === '') return '';
  if (compact.includes('.') && compact.includes(',')) {
    return compact.replace(/\./g, '').replace(',', '.');
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    return compact.replace(/\./g, '');
  }
  return compact.replace(',', '.');
}

export function parsePositiveNumber(value: string): number | null {
  const normalized = normalizeDecimalInput(value);
  if (normalized === '') return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function parseNonNegativeNumber(value: string): number | null {
  const normalized = normalizeDecimalInput(value);
  if (normalized === '') return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function pluralUnit(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
