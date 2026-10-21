import { kawasanById, kawasanList } from '../data/reference';
import type { Kawasan } from '../types';

export function getKawasanById(id: string): Kawasan | undefined {
  return kawasanById.get(id);
}

export function compatibleEcosystems(kawasanId: string): string[] {
  return getKawasanById(kawasanId)?.ecosystems ?? [];
}

export function kawasanForEcosystem(ecosystem: string): Kawasan[] {
  return kawasanList.filter((kawasan) => kawasan.ecosystems.includes(ecosystem));
}

export type IdentificationStatus = 'supported' | 'incompatible' | 'unsupported';

export interface IdentificationResult {
  status: IdentificationStatus;
  kawasan: Kawasan | null;
  compatible: string[];
  message: string;
}

export function identifyEcosystem(
  kawasanId: string,
  ecosystem: string | null,
): IdentificationResult {
  const kawasan = getKawasanById(kawasanId);
  if (!kawasan) {
    return {
      status: 'unsupported',
      kawasan: null,
      compatible: [],
      message: 'Jenis kawasan tidak ditemukan pada tabel referensi.',
    };
  }
  if (!ecosystem) {
    return {
      status: 'unsupported',
      kawasan,
      compatible: kawasan.ecosystems,
      message: 'Pilih jenis ekosistem yang teramati di lapangan.',
    };
  }
  if (kawasan.ecosystems.includes(ecosystem)) {
    return {
      status: 'supported',
      kawasan,
      compatible: kawasan.ecosystems,
      message: `${ecosystem} tercantum sebagai ekosistem yang dapat berada pada ${kawasan.name}.`,
    };
  }
  return {
    status: 'incompatible',
    kawasan,
    compatible: kawasan.ecosystems,
    message: `${ecosystem} tidak tercantum untuk ${kawasan.name} pada tabel workbook.`,
  };
}

export const CLASSIFICATION_LIMITATIONS = [
  'Workbook tidak memuat batas spasial atau operasi GIS. Status kawasan tidak disimpulkan dari nama provinsi, kabupaten, atau koordinat.',
  'Jenis kawasan lindung/berfungsi lindung diisi oleh pengguna berdasarkan data kawasan yang berwenang.',
  'Workbook tidak memuat aturan untuk non-kawasan lindung. Aplikasi tidak mengarang aturan tersebut.',
  'Tabel hanya menyatakan kemungkinan ekosistem pada suatu jenis kawasan; tabel tidak memvalidasi kondisi lapangan.',
];
