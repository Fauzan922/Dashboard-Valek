import { useEffect, useRef } from 'react';
import { meta } from '../data/reference';
import { BOUNDARY_SOURCE } from '../lib/geo';

interface MethodDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MethodDialog({ open, onClose }: MethodDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="method-dialog"
      aria-labelledby="method-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="method-content">
        <div className="method-head">
          <div>
            <div className="eyebrow">Transparansi</div>
            <h2 id="method-title">Metode, data, dan batas</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Tutup metode dan sumber"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </div>

        <section>
          <h3>Rumus yang direproduksi</h3>
          <pre>
{`nilai/ha 2025 (kolom M)
  × (UMP 2025 lokasi target ÷ UMP 2025 lokasi studi)
  → total per kategori per studi
  → median kategori non-nol = koefisien kategori
  → nilai = koefisien × luas (ha)`}
          </pre>
          <p>
            Total koefisien adalah jumlah median kategori yang tersedia, bukan median total
            per studi. Nilai dasar sudah memuat penyesuaian majemuk workbook; tidak
            diinflasi ulang.
          </p>
        </section>

        <section>
          <h3>Data referensi</h3>
          <p>
            {meta.studyCount} studi · {meta.componentCount} komponen ·{' '}
            {meta.locationCount} lokasi UMP · {meta.kawasanCount} jenis kawasan ·{' '}
            {meta.ecosystemCount} ekosistem. Harga dan UMP tahun {meta.priceYear}. Sumber
            workbook: <code>{meta.sourceWorkbook}</code> (SHA-256 diawali{' '}
            <code>{meta.workbookSha256_16}</code>).
          </p>
          <p>
            Median dihitung dari data per hektare pada workbook. Kategori yang tidak memiliki
            data tetap <code>null</code>; aplikasi tidak menggantinya dengan nol.
          </p>
        </section>

        <section>
          <h3>Yang tidak diklaim</h3>
          <ul>
            <li>
              Workbook tidak memuat luas ekosistem provinsi. Peta nilai total hanya
              mengagregasi catatan pengguna.
            </li>
            <li>
              Workbook tidak memuat poligon kawasan lindung. Status kawasan diisi pengguna,
              bukan disimpulkan dari nama provinsi atau kabupaten.
            </li>
            <li>
              Workbook tidak menyediakan koefisien non-kawasan lindung. Catatan non-KL dapat
              disimpan untuk luas/status, tetapi tidak diberi nilai.
            </li>
            <li>
              Pemetaan kabupaten/kota ke provinsi tidak tersedia di workbook; catatan peta
              dibatasi pada lokasi tingkat provinsi.
            </li>
            <li>
              Jenis kawasan (D7) tidak dipakai formula D16; tabel ekosistem hanyalah alat
              identifikasi, bukan pembatas kalkulator.
            </li>
          </ul>
        </section>

        <section>
          <h3>Batas provinsi</h3>
          <p>
            “{BOUNDARY_SOURCE.name}” oleh {BOUNDARY_SOURCE.author},{' '}
            {BOUNDARY_SOURCE.license}. {BOUNDARY_SOURCE.changes} {BOUNDARY_SOURCE.caveat}{' '}
            <a href={BOUNDARY_SOURCE.repository} target="_blank" rel="noreferrer">
              Sumber batas
            </a>{' '}
            ·{' '}
            <a href={BOUNDARY_SOURCE.licenseUrl} target="_blank" rel="noreferrer">
              Lisensi CC BY 4.0
            </a>
            .
          </p>
        </section>

        <section>
          <h3>Validasi</h3>
          <p>
            Kasus Hutan/Provinsi Aceh, 145.290 ha: engine{' '}
            <code>Rp3.326.415.089.133,48</code>; workbook{' '}
            <code>Rp3.326.415.089.133,00</code>. Selisih Rp0,48 berasal dari pembulatan
            cache workbook. Total sembilan ekosistem diuji terhadap workbook; kategori
            Hutan/Aceh diuji pada presisi penuh.
          </p>
        </section>

        <p className="method-foot">
          Aplikasi ini alat eksplorasi benefit transfer. Hasil bukan pengganti penilaian tapak,
          analisis ekologi, atau penetapan status kawasan oleh instansi berwenang.
        </p>
      </div>
    </dialog>
  );
}
