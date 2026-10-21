# Dashboard Spasial Valuasi Ekosistem Indonesia

Aplikasi mandiri berbasis React + TypeScript + Vite untuk membaca valuasi jasa
ekosistem Indonesia dari workbook benefit transfer 2025. Peta provinsi menjadi
tampilan utama; statistik dan kalkulator memakai keadaan aplikasi yang sama.

Folder ini adalah proyek lengkap dan mandiri. Semua source code, data referensi,
GeoJSON, font, tes, dan konfigurasi deployment berada di dalam folder ini. Tidak
diperlukan proyek induk, server API, atau workbook Excel saat aplikasi berjalan.

## Apa yang dilakukan aplikasi

- Menampilkan peta 38 provinsi dengan lima mode: koefisien per hektare, nilai
  total catatan, luas tercatat, pangsa kawasan lindung, dan ekosistem dominan.
- Menghitung koefisien benefit transfer dari data studi yang dibundel, memakai
  UMP 2025 lokasi target dibanding UMP 2025 lokasi studi.
- Menyediakan kalkulator luas (ha/km²/m²) dan status kawasan. Catatan pengguna
  dapat ditambahkan ke peta dan disimpan di `localStorage`.
- Menampilkan statistik nasional/provinsi, kategori jasa, dan status data yang
  tidak tersedia secara eksplisit.
- Tidak mengambil data dari API saat runtime. Seluruh data operasional dibundel
  di dalam aplikasi.

## Prasyarat

- Node.js **20.19+** atau Node.js 22 LTS.
- npm 10+.
- Tidak perlu GDAL, `ogr2ogr`, PostGIS, GeoServer, atau tile server.

## Menjalankan secara lokal

Dari direktori ini:

```bash
npm ci
npm run dev
```

Buka URL yang dicetak Vite (biasanya `http://localhost:5173`).

`npm ci` memakai `package-lock.json` yang sudah disertakan. Gunakan `npm install`
hanya jika memang ingin memperbarui dependency dan lockfile.

Pada Windows dengan PowerShell yang memblokir `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run dev
```

## Build dan preview produksi

```bash
npm run build
npm run preview
```

`npm run build` menjalankan TypeScript check lalu menghasilkan situs statis di
`dist/`. `npm run preview` menyajikan hasil build tersebut secara lokal.

Konfigurasi Vite memakai `base: './'`, sehingga URL asset bersifat relatif dan
tidak bergantung pada nama repository. Build dapat diletakkan di root domain
atau di subdirektori seperti `https://username.github.io/nama-repository/`.

## Pemeriksaan

```bash
npm test
npm run typecheck
npm run build
```

Tidak ada script lint terpisah. Pemeriksaan tipe dijalankan oleh `typecheck` dan
juga oleh `build`.

## Struktur proyek

```text
.
├─ .github/
│  └─ workflows/
│     └─ deploy.yml       # build + deploy GitHub Pages
├─ docs/
│  ├─ DATA_SOURCES.md     # provenans data dan lisensi
│  ├─ LIMITATIONS.md      # batasan interpretasi dan data yang tidak tersedia
│  └─ METHODOLOGY.md      # formula dan audit valuasi
├─ src/
│  ├─ components/         # peta, statistik, kalkulator, header, dialog metode
│  ├─ data/               # reference.json + GeoJSON 38 provinsi
│  ├─ hooks/              # persistensi catatan pengguna
│  ├─ lib/                # engine valuasi, geo, format, klasifikasi, agregasi
│  ├─ App.tsx             # keadaan bersama peta-statistik-kalkulator
│  ├─ main.tsx
│  ├─ types.ts
│  └─ index.css
├─ tests/                 # regresi workbook, geo, agregasi, klasifikasi
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ .gitignore
├─ NOTICE.md
└─ README.md
```

## Data dan metodologi

Workbook menghitung benefit transfer sebagai berikut:

```text
nilai/ha 2025 (kolom M, sudah termasuk penyesuaian majemuk)
  × (UMP 2025 lokasi target ÷ UMP 2025 lokasi studi)
  → total per kategori per studi
  → median kategori non-nol = koefisien kategori
  → koefisien × luas (ha) = nilai tahunan
```

Total koefisien adalah **jumlah median kategori yang tersedia**, bukan median
dari total per studi. Nilai dasar tidak diinflasi ulang. Kategori yang tidak
tersedia tetap `null`; aplikasi tidak menggantinya dengan nol.

Data referensi diimpor saat build dari file JSON lokal:

- `src/data/reference.json` — ekstraksi terstruktur workbook: studi, komponen,
  UMP, ekosistem, dan jenis kawasan.
- `src/data/indonesia-38-provinces.json` — batas 38 provinsi untuk visualisasi.

Tidak ada impor runtime dari API atau file di luar folder ini. Workbook asli
`Perhitungan Valuasi Ekonomi Lingkungan Hidup.xlsx` **tidak disertakan** di repo;
hanya data turunan yang diperlukan untuk perhitungan yang dibundel. Detail ada
di [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) dan
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

Aplikasi tidak menyediakan ekspor laporan resmi atau impor berkas pengguna.
Catatan pengguna tersimpan di `localStorage` peramban dengan kunci
`spatial-valuation-dashboard.records.v1`. Ekspor statis untuk hosting adalah
folder `dist/` yang dihasilkan oleh `npm run build`.

## Deploy ke GitHub Pages

### 1. Siapkan repository baru

Buat repository kosong di GitHub. Salin **isi** folder ini ke root repository,
bukan foldernya. Pastikan folder tersembunyi `.github/` ikut tersalin.

```bash
git init
git add .
git commit -m "Initial spatial valuation dashboard"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repository>.git
git push -u origin main
```

Jangan mengunggah `node_modules/` atau `dist/`; keduanya sudah diabaikan oleh
`.gitignore`. Folder `.github/workflows/deploy.yml` harus berada di root
repository agar GitHub Actions menemukannya.

### 2. Aktifkan GitHub Pages

Di repository GitHub:

1. Buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Tidak perlu mengatur branch `gh-pages` atau URL manual.

### 3. Jalankan deployment

Workflow berjalan otomatis saat push ke `main` atau `master`, dan juga dapat
dijalankan manual dari tab **Actions → Deploy to GitHub Pages → Run workflow**.

Workflow:

- memakai Node.js 22;
- menjalankan `npm ci` dari lockfile;
- menjalankan `npm run build`;
- mengunggah `dist/` sebagai artifact GitHub Pages;
- mendeploy dengan permission `pages: write` dan `id-token: write`.

Workflow tidak berisi username, nama repository, atau URL deployment yang
di-hardcode. URL halaman diambil dari output action GitHub Pages.

Setelah workflow selesai, URL tersedia di environment `github-pages` dan di tab
**Actions**. URL biasanya berbentuk:

```text
https://<username>.github.io/<nama-repository>/
```

Karena `base: './'`, nama repository tidak perlu dimasukkan ke konfigurasi Vite.
Aplikasi tidak memakai client-side router, jadi refresh pada halaman utama aman.
Tidak ada secret atau API key yang perlu ditambahkan; workflow memakai
`GITHUB_TOKEN` bawaan GitHub Actions.

## Memperbarui dashboard atau data referensi

- **Data workbook**: perbarui `src/data/reference.json` dengan skema yang sama,
  lalu jalankan `npm test` dan `npm run build`. Jangan mengganti nilai dengan
  angka yang tidak berasal dari workbook.
- **Batas provinsi**: ganti `src/data/indonesia-38-provinces.json`, sesuaikan
  crosswalk nama di `src/lib/geo.ts` bila perlu, dan jalankan `npm test`.
  Pertahankan atribusi CC BY 4.0 di `NOTICE.md` dan `docs/DATA_SOURCES.md`.
- **Logika valuasi**: ubah `src/lib/valuation.ts` hanya bersama fixture regresi
  di `tests/valuation.test.ts`; perbarui `docs/METHODOLOGY.md`.
- **Dependency**: setelah mengubah `package.json`, perbarui lockfile dengan
  `npm install`, lalu commit `package-lock.json` agar `npm ci` di Actions tetap
  konsisten.
- **Deployment**: setelah perubahan, push ke `main`/`master` atau jalankan
  workflow secara manual.

## Batasan dan dependensi eksternal

- Batas 38 provinsi berasal dari dataset komunitas berlisensi CC BY 4.0; bukan
  peta resmi Badan Informasi Geospasial (BIG). Geometri hanya untuk visualisasi
  dan pemilihan, bukan klaim yurisdiksi atau pengukuran luas resmi.
- Workbook tidak memuat luas ekosistem provinsi, poligon kawasan lindung,
  padanan kabupaten/kota ke provinsi, atau aturan valuasi non-KL. Nilai yang
  tidak dapat dihitung ditampilkan sebagai tidak tersedia, bukan nol.
- Aplikasi adalah situs statis. Tidak ada backend, database, autentikasi, atau
  sinkronisasi antarperangkat. Catatan pengguna hanya tersimpan di peramban
  yang dipakai.
- Tidak ada API runtime, tile server, atau CDN. Font Inter dibundel melalui
  `@fontsource-variable/inter`. URL GitHub/CC yang tampil di atribusi hanya
  tautan dokumentasi, bukan resource yang dimuat halaman.
- Tidak ada client-side routing; aplikasi hanya memiliki satu halaman utama.
- Browser modern yang mendukung ES2022 dan CSS `color-mix()` diperlukan.

## Privasi dan keamanan

- Tidak ada API key, credential, token, file `.env`, atau data rahasia di repo.
- Workbook asli tidak disertakan; hanya data turunan yang diperlukan untuk
  kalkulasi yang dipublikasikan.
- Catatan pengguna tidak dikirim ke server mana pun.
- Workflow deployment tidak membutuhkan secret tambahan.

## Atribusi dan lisensi

- Batas provinsi: “Indonesia GeoJSON & TopoJSON Maps (38 Provinces)” oleh
  denyherianto, CC BY 4.0. Lihat [`NOTICE.md`](NOTICE.md).
- Font Inter: SIL Open Font License 1.1 melalui paket
  `@fontsource-variable/inter`.
- Kode aplikasi ini belum memiliki lisensi terpisah. Tambahkan lisensi yang
  sesuai sebelum distribusi publik jika diperlukan.
