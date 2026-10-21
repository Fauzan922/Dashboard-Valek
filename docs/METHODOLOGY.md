# Metodologi dan Audit Valuasi

Dokumen ini menjelaskan perhitungan yang direproduksi oleh
`src/lib/valuation.ts`. Sumbernya adalah workbook
`Perhitungan Valuasi Ekonomi Lingkungan Hidup.xlsx` (46 sheet, SHA-256 diawali
`1d30931b10ffec1e`). Workbook tidak disertakan dalam repo dan tidak diubah oleh
aplikasi ini.

## 1. Rantai formula workbook

Workbook adalah kalkulator **benefit transfer**, bukan inventaris luas
provinsi. Formula yang dipakai adalah:

```text
NILAI SATUAN 2025 (RUMUS) per komponen
  × (UMP 2025 lokasi target ÷ UMP 2025 lokasi studi)
  = nilai komponen per hektare pada tingkat harga lokasi target
```

Untuk setiap studi dan setiap kategori jasa (`Cultural`, `Provisioning`,
`Regulating`), komponen per hektare dijumlahkan. Total kategori per studi yang
bernilai nol tidak dipakai. Koefisien kategori adalah **median** dari total
kategori studi yang tidak nol.

```text
koefisien kategori = MEDIAN(total kategori per studi, total ≠ 0)
koefisien total    = jumlah median kategori yang tersedia
nilai              = koefisien × luas (ha)
```

Total **bukan** median dari total per studi. Ini penting karena workbook
menjumlahkan tiga median kategori secara terpisah.

## 2. Tahun harga dan UMP

- Tahun harga: 2025.
- Nilai per hektare diambil dari kolom `NILAI SATUAN 2025 (RUMUS)`.
- Kolom tersebut sudah memuat penyesuaian majemuk workbook (suku bunga
  4,75%); aplikasi **tidak** menginflasi ulang.
- Rasio transfer memakai UMP 2025 lokasi target dibagi UMP 2025 lokasi studi.
- UMP bulanan dipakai sebagai rasio; hasil valuasi disajikan per tahun karena
  nilai satuan workbook adalah nilai tahunan per hektare.

## 3. Kategori yang tidak tersedia

Kategori tanpa data tetap `null`. Aplikasi tidak menggantinya dengan nol.
Konsekuensinya:

- `Danau` tidak memiliki `Regulating`.
- `Lahan Basah` tidak memiliki `Cultural` dan `Provisioning`.
- Untuk kategori yang hilang, kalkulator menampilkan **tidak tersedia** dan
  tidak menghitung nilai kategori tersebut.
- Untuk pilihan `Total`, nilai dihitung dari kategori yang tersedia dan diberi
  label **total parsial**. Daftar kategori yang hilang ditampilkan.

Ini mempertahankan perilaku workbook yang menjumlahkan median kategori yang
ada, tanpa mengklaim cakupan penuh.

## 4. Contoh validasi Hutan / Provinsi Aceh

UMP Provinsi Aceh 2025: `Rp3.685.616` per bulan.

Median kategori yang dihitung engine:

| Kategori | Median (Rp/ha/tahun) |
|---|---:|
| Cultural | 14.514.491,541384194 |
| Provisioning | 4.542.534,272310307 |
| Regulating | 3.837.977,897045957 |
| **Total** | **22.895.003,710740454** |

Untuk luas 145.290 ha:

```text
22.895.003,710740454 × 145.290
= 3.326.415.089.133,4805
```

Workbook menampilkan `Rp3.326.415.089.133,00`. Perbedaan `Rp0,48` berasal dari
pembulatan cache workbook (sekitar `1,4 × 10⁻¹³` relatif).

Tes juga memeriksa total sembilan ekosistem untuk Provinsi Aceh terhadap nilai
workbook:

| Ekosistem | Total per ha (Rp) |
|---|---:|
| Hutan | 22.895.003,71 |
| Mangrove | 113.610.428,40 |
| Danau | 33.850.465,68 |
| Sungai | 26.657.853,02 |
| Terumbu Karang | 527.147.795,30 |
| Karst | 262.308.382,20 |
| Gambut | 87.836.690,29 |
| Padang Lamun | 614.064.363,50 |
| Lahan Basah | 14.270.895,48 |

## 5. Satuan luas

Workbook memakai hektare. Kalkulator menerima:

| Satuan | Faktor ke ha |
|---|---:|
| ha | 1 |
| km² | 100 |
| m² | 0,0001 |

Nilai akhir selalu `koefisien (Rp/ha/tahun) × luas (ha)`.

## 6. Kawasan lindung dan klasifikasi

Workbook memiliki 23 jenis kawasan lindung/berfungsi lindung dan tabel
kemungkinan ekosistem. Tabel ini hanya alat identifikasi; formula kalkulator
tidak memakai jenis kawasan.

- Status kawasan diisi pengguna: KL, non-KL, atau belum diketahui.
- Status **tidak** disimpulkan dari nama provinsi, kabupaten, atau koordinat.
- Workbook tidak memuat aturan/koefisien non-KL. Catatan non-KL dapat disimpan
  untuk luas dan status, tetapi `value` tetap `null`.
- Untuk status belum diketahui, nilai juga tidak dihitung.
- Jenis kawasan yang dipilih pengguna tidak mengubah koefisien; peringatan
  ditampilkan jika ekosistem tidak tercantum pada jenis kawasan tersebut.

## 7. Perilaku yang sengaja dipertahankan dari workbook

- Daftar validasi `D8` di workbook sudah usang dan hanya memuat Hutan/Lahan
  Basah. Aplikasi memakai sembilan ekosistem yang benar-benar ada di data.
- `D7` (jenis kawasan) tidak memengaruhi valuasi `D16`.
- Komponen dengan unit non-per-hektare tidak dimasukkan ke koefisien per
  hektare; engine hanya memakai `basePerHa2025` yang tersedia.
- Total adalah jumlah median kategori, bukan median total studi.
- Nilai 2025 tidak diinflasi ulang.

## 8. Batas interpretasi

- Hasil adalah estimasi benefit transfer per tahun, bukan penilaian tapak.
- Tidak ada penyesuaian kondisi ekologis, tutupan aktual, kemiringan, akses,
  atau kualitas ekosistem selain yang sudah ada di nilai satuan workbook.
- Tidak ada luas ekosistem provinsi dalam workbook. Peta nilai total hanya
  mengagregasi catatan pengguna.
- Tidak ada poligon kawasan lindung dalam workbook. Aplikasi tidak membuat
  poligon tersebut.
- Tidak ada padanan kabupaten/kota ke provinsi dalam workbook. Catatan peta
  dibatasi ke lokasi UMP tingkat provinsi.

## 9. Cara memperbarui data

`src/data/reference.json` harus mempertahankan bentuk data yang sama:
`meta`, `ecosystems`, `kawasan`, `locations`, dan `studies` beserta komponen.
Setelah mengganti data:

1. Jalankan `npm test` untuk memeriksa fixture workbook dan pemetaan 38
   provinsi.
2. Periksa kembali nama provinsi pada GeoJSON dan alias di `src/lib/geo.ts`.
3. Jalankan `npm run typecheck` dan `npm run build`.

Batas provinsi dapat diganti dengan geometri resmi tanpa mengubah engine
valuasi; lihat `DATA_SOURCES.md`.
