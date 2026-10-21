# Sumber Data dan Provenans

Dokumen ini mencatat asal setiap dataset yang dipakai aplikasi, lisensi,
pemeriksaan yang sudah dilakukan, dan hal yang belum tersedia.

## 1. Workbook valuasi

| Atribut | Nilai |
|---|---|
| Berkas sumber | `Perhitungan Valuasi Ekonomi Lingkungan Hidup.xlsx` (tidak disertakan dalam repo) |
| SHA-256 | `1D30931B10FFEC1E51D6EA541CBF1363D7F9E9574A8FCBE30D0A6877DFC40F61` |
| Jumlah sheet | 46 |
| Studi | 62 |
| Komponen studi | 475 |
| Lokasi UMP | 566 |
| Jenis kawasan | 23 |
| Ekosistem | 9 |
| Tahun harga | 2025 |

Workbook adalah sumber otoritatif untuk koefisien, UMP, klasifikasi, dan
contoh validasi. Aplikasi tidak membaca `.xlsx` saat runtime dan tidak menulis
ke workbook tersebut.

Data yang dibundel di `src/data/reference.json`
(SHA-256 `EEC0DBD6671178EC06F3522A1A8CEB112CAC7B60329371A94BD81BC368EDEC0D`)
adalah ekstraksi terstruktur dari workbook:

- `meta` — jumlah studi/komponen/lokasi, tahun harga, hash workbook;
- `ecosystems` — sembilan ekosistem;
- `kawasan` — 23 jenis kawasan beserta kemungkinan ekosistem;
- `locations` — UMP 2025 per provinsi/kabupaten/kota;
- `studies` — studi, lokasi, ekosistem, dan komponen per hektare.

Nilai yang disimpan adalah nilai presisi penuh yang tersedia di workbook, bukan
nilai tampilan yang sudah dibulatkan. Detail formula ada di
[`METHODOLOGY.md`](METHODOLOGY.md).

## 2. Batas provinsi 38

| Atribut | Nilai |
|---|---|
| Repositori | `denyherianto/indonesia-geojson-topojson-maps-with-38-provinces` |
| Berkas upstream | `GeoJSON/indonesia-38-provinces.geojson` |
| Berkas lokal | `src/data/indonesia-38-provinces.json` |
| Ukuran | 253.643 byte |
| SHA-256 lokal | `97F23F738C7AA66836B971D76381C009A34C6AAEFE9C982E85F060E678402027` |
| SHA-256 upstream | `97F23F738C7AA66836B971D76381C009A34C6AAEFE9C982E85F060E678402027` |
| Lisensi data | CC BY 4.0 (`DATA_LICENSE.md` di repositori) |
| Lisensi kode repositori | MIT (`LICENSE`) |
| Properti | `PROVINSI`, `KODE_PROV`; `id` sama dengan kode provinsi |
| Jumlah fitur | 38 |

Berkas lokal **identik byte-per-byte** dengan berkas upstream. Ekstensi diubah
dari `.geojson` menjadi `.json` hanya agar Vite/Vitest dapat mengimpornya
sebagai modul JSON. Tidak ada penyuntingan geometri yang disimpan; orientasi
ring diperbaiki saat runtime di `src/lib/geo.ts` (lihat bagian 4).

### Atribusi yang ditampilkan

Aplikasi mencantumkan atribusi berikut pada dialog “Metode & sumber”:

> Batas provinsi: “Indonesia GeoJSON & TopoJSON Maps (38 Provinces)” oleh
> denyherianto, CC BY 4.0. Berkas data diubah ekstensinya dan ring-nya
> dinormalisasi saat runtime. Bukan peta resmi BIG.

Atribusi dan lisensi juga tersedia di [`../NOTICE.md`](../NOTICE.md).

### Kaveat provenans

- Ini adalah dataset komunitas, **bukan** peta resmi Badan Informasi Geospasial
  (BIG) dan bukan produk batas resmi pemerintah.
- Repositori menyatakan bahwa batas dapat berasal dari atau dipengaruhi sumber
  pihak ketiga. Repositori tidak menyediakan `SOURCE.md` yang dirujuk pada
  `DATA_LICENSE.md` saat diperiksa, sehingga provenans hulu tidak dapat
  diverifikasi sepenuhnya.
- Nama dan jumlah provinsi dapat berbeda antar sumber dan waktu. Dataset ini
  memakai 38 provinsi, termasuk provinsi Papua hasil pemekaran.
- Geometri digunakan untuk visualisasi dan pemilihan; geometri tidak dipakai
  untuk klaim yurisdiksi, pengukuran luas, atau analisis spasial resmi.
- Aplikasi tidak menghitung luas provinsi dari geometri. Luas yang dipakai
  dalam valuasi hanya luas yang dimasukkan pengguna.

### Mengapa bukan data 38 provinsi resmi?

Sumber resmi yang diperiksa (BIG/Ina-Geoportal dan turunannya) menyediakan
batas tingkat provinsi dalam konfigurasi 34 provinsi, bukan 38. Tidak ditemukan
dataset batas 38 provinsi resmi yang dapat dipakai langsung pada saat
implementasi. Karena itu dataset komunitas dipakai dengan kaveat di atas;
aplikasi tidak mengarang batas atau memecah geometri provinsi lama secara
manual.

## 3. Pemeriksaan yang sudah dilakukan

- Berkas GeoJSON memiliki tepat 38 fitur.
- Setiap `PROVINSI` dipetakan ke satu lokasi UMP tingkat provinsi; tidak ada
  nama yang hilang atau ganda. Tes ada di `tests/geo.test.ts`.
- Proyeksi memakai `d3-geo` dengan `fitExtent` pada seluruh Indonesia.
- Orientasi ring diverifikasi: ring luar searah jarum jam, lubang berlawanan.
  Tanpa ini, setiap path dapat mengambil bounding box seluruh peta.
- Nama provinsi pada dataset dan tabel UMP tidak selalu identik (misalnya
  `DI Yogyakarta`, `DKI Jakarta`, `Papua Barat Daya`). Crosswalk eksplisit ada
  di `src/lib/geo.ts`; tidak ada pencocokan berdasarkan nama ibu kota atau
  tebakan.

## 4. Perubahan yang dilakukan saat runtime

- **Ring rewinding**: GeoJSON RFC 7946 memakai orientasi berlawanan untuk ring
  luar. `d3-geo` mengharapkan orientasi sebaliknya. `src/lib/geo.ts`
  membalik ring luar dan lubang sebelum proyeksi. Berkas sumber tidak diubah.
- **Proyeksi**: `geoMercator().fitExtent(...)` dengan padding; tidak ada
  transformasi koordinat yang mengubah posisi relatif provinsi.
- **Tidak ada generalisasi/simplifikasi** yang dilakukan aplikasi.

## 5. Dependensi GIS dan data yang tidak tersedia

### Runtime

Tidak diperlukan GDAL, `ogr2ogr`, PostGIS, GeoServer, atau layanan tile.
Geometri dibundel sebagai JSON dan diproyeksikan di peramban dengan
`d3-geo`.

### Untuk memperluas analisis

Hal berikut tidak ada dalam workbook maupun repositori ini:

- luas ekosistem per provinsi (hutan, mangrove, gambut, dan seterusnya);
- poligon kawasan lindung/berfungsi lindung;
- padanan kabupaten/kota ke provinsi untuk agregasi peta;
- koefisien atau aturan valuasi non-kawasan lindung;
- data tutupan lahan aktual, kondisi ekosistem, atau perubahan antarwaktu.

Untuk menambahkannya diperlukan sumber GIS resmi dan pipeline baru (misalnya
batas administrasi resmi, tutupan lahan, dan atribut luas). Aplikasi tidak
mengisi celah tersebut dengan angka sintetis.

## 6. Mengganti batas provinsi

Jika dataset resmi 38 provinsi tersedia:

1. Ganti `src/data/indonesia-38-provinces.json` dengan GeoJSON yang memiliki
   satu fitur per provinsi dan properti nama yang dapat dipetakan.
2. Perbarui crosswalk di `src/lib/geo.ts` bila nama berbeda.
3. Pastikan `tests/geo.test.ts` masih menemukan 38 fitur dan 38 provinsi UMP.
4. Periksa ulang orientasi ring dan jalankan `npm run build`; jika path menjadi
   seluruh peta, ring perlu di-rewind.
5. Perbarui atribusi, lisensi, dan kaveat di dokumen ini serta `NOTICE.md`.

## 7. Lisensi dan penggunaan

- Data batas: CC BY 4.0; atribusi wajib dipertahankan.
- Kode repositori batas: MIT.
- Kode aplikasi ini belum memiliki lisensi terpisah; tambahkan lisensi
  sebelum distribusi publik.
- Workbook tidak didistribusikan ulang di dalam folder aplikasi; hanya data
  turunan yang diperlukan untuk perhitungan.
