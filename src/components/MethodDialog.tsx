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
            <div className="eyebrow">PENJELASAN</div>
            <h2 id="method-title">Metode dan Sumber Data</h2>
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
          <h3>Rumus</h3>
          <pre>
{`nilai/ha 2025 × (UMP 2025 lokasi target ÷ UMP 2025 lokasi studi)
  → total per kategori per studi
  → median kategori non-nol = koefisien kategori
  → nilai = koefisien × luas (ha)`}
          </pre>
          <p>
            Total koefisien adalah jumlah median kategori yang tersedia, bukan median total
            per studi. Nilai dasar sudah memuat penyesuaian keseluruhan dan tidak mempertimbangkan inflasi. Nilai total = jumlah kategori × luas (ha). Nilai total dapat <code>null</code> jika semua kategori tidak tersedia.
          </p>
        </section>

        <section>
          <h3>Data referensi</h3>
          <p>
            {meta.studyCount} studi dan referensi · {meta.componentCount} komponen ·{' '}
            {meta.locationCount} lokasi UMP · {meta.kawasanCount} jenis kawasan ·{' '}
            {meta.ecosystemCount} ekosistem. Harga dan UMP tahun {meta.priceYear}
          </p>
          <p>
            Median dihitung dari data per hektar pada database. Kategori yang tidak memiliki
            data tetap <code>null</code>; aplikasi tidak menggantinya dengan nol.
          </p>
        </section>

        <section>
          <h3>HAL HAL YANG PERLU DIPERHATIKAN</h3>
          <ul>
            <li>
              Database tidak didasarkan pada  luas ekosistem provinsi. Peta nilai total hanya
              mengakumulasi nilai dari catatan pengguna.
            </li>
            <li>
              Database tidak memuat poligon kawasan lindung. Status kawasan diisi pengguna,
              bukan diambil dari data spasial sebaran kawasan.
            </li>
            <li>
              Database tidak menyediakan koefisien non-kawasan lindung. Catatan non-KL dapat
              disimpan untuk luas/status, tetapi tidak diberi nilai.
            </li>
            <li>
              Pemetaan kabupaten/kota ke provinsi tidak tersedia di database; Catatan
              dibatasi pada lokasi tingkat provinsi.
            </li>
            <li>
              Jenis kawasan tidak dipakai dalam perhitungan dan hanya digunakan sebagai identifikasi, tidak berpengaruh pada nilai jasa.
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

        <p className="method-foot">
          Dashboard ini hanyalah alat eksplorasi benefit transfer yang bersumber dari berbagai referensi valuasi ekonomi di Indonesia. Hasil tidak dapat mengganti nilai aktual,
          analisis ekologi, atau penetapan status kawasan oleh instansi berwenang.
        </p>
      </div>
    </dialog>
  );
}
