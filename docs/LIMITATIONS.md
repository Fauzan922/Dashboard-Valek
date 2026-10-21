# Batasan, Asumsi, dan Status Data yang Tidak Tersedia

Bagian ini menjelaskan mengapa beberapa angka **tidak** muncul. Aplikasi tidak
mengganti data yang tidak ada dengan nol, rata-rata provinsi, atau asumsi
internal.

## Ringkasan ketersediaan

| Pertanyaan | Status | Sumber/perilaku |
|---|---|---|
| Koefisien per hektare tiap provinsi untuk sembilan ekosistem | Tersedia | Dihitung dari 62 studi workbook dan UMP 2025 |
| Nilai total provinsi tanpa luas masukan | **Tidak tersedia** | Workbook tidak memuat luas ekosistem provinsi |
| Nilai total nasional tanpa luas masukan | **Tidak tersedia** | Tidak ada luas nasional per ekosistem |
| Luas ekosistem provinsi | **Tidak tersedia** | Tidak ada dataset luas di workbook |
| Nilai untuk kawasan non-KL | **Tidak tersedia** | Tidak ada koefisien/aturan non-KL di workbook |
| Poligon kawasan lindung | **Tidak tersedia** | Workbook hanya berisi tabel identifikasi |
| Status KL dari nama tempat | **Tidak disimpulkan** | Status harus diisi pengguna |
| Padanan kabupaten/kota → provinsi | **Tidak tersedia** | Tidak ada crosswalk di workbook |
| Nilai per tahun | Tersedia untuk catatan pengguna | Koefisien Rp/ha/tahun × luas ha |
| Data tutupan lahan aktual | **Tidak tersedia** | Di luar cakupan workbook |

## 1. Tidak ada luas ekosistem provinsi

Workbook berisi koefisien benefit transfer, bukan inventaris luas. Karena itu:

- Peta mode `Koefisien/ha` dapat menampilkan seluruh 38 provinsi karena hanya
  membutuhkan koefisien.
- Peta mode `Nilai total`, `Luas tercatat`, `Kawasan lindung`, dan `Ekosistem`
  hanya terisi untuk provinsi yang memiliki catatan pengguna.
- Statistik nasional menampilkan rentang/median koefisien, bukan total rupiah,
  sampai ada catatan luas.
- Tidak ada angka nol yang dimaksudkan sebagai “tidak ada data”. Provinsi tanpa
  data diberi warna “Tanpa data” dan tooltip yang menyatakannya.

## 2. Data kawasan lindung

Workbook memuat 23 jenis kawasan dan tabel kemungkinan ekosistem, tetapi tidak
memuat geometri kawasan lindung. Aplikasi:

- meminta pengguna memilih status `KL`, `non-KL`, atau `belum diketahui`;
- tidak menebak status dari nama provinsi/kabupaten, kata “lindung”, atau
  lokasi geografis;
- tidak menggambar poligon KL;
- menyimpan catatan non-KL untuk kelengkapan luas/status, tetapi memberikan
  `value = null`;
- menghitung pangsa KL hanya dari luas yang statusnya diketahui:
  `KL ÷ (KL + non-KL)`. Status “belum diketahui” tidak dianggap KL dan tidak
  masuk penyebut.

Untuk catatan non-KL, kalkulator menampilkan “Tidak dinilai (non-KL)” dan tidak
menggunakan koefisien KL sebagai pengganti.

## 3. Kategori yang hilang

Kategori berikut kosong di workbook dan tetap `null`:

- `Danau` → `Regulating`
- `Lahan Basah` → `Cultural`, `Provisioning`

Untuk pilihan kategori yang kosong, hasilnya “Tidak tersedia untuk kategori
ini”. Untuk pilihan `Total`, kategori yang tersedia dijumlahkan dan hasilnya
ditandai **total parsial**; kategori yang hilang dicantumkan. Ini bukan nol dan
bukan cakupan penuh.

## 4. Satuan dan tahun

- Semua koefisien dinyatakan dalam **Rp per hektare per tahun** pada tingkat
  harga 2025.
- Nilai satuan 2025 sudah memuat penyesuaian majemuk workbook. Aplikasi tidak
  menginflasi ulang.
- Konversi luas yang didukung: ha, km², m².
- Tidak ada diskonto, proyeksi tahun lain, atau agregasi antarwaktu.
- Tidak ada pembulatan nilai di engine; pembulatan hanya untuk tampilan.

## 5. Cakupan studi dan transfer

- Koefisien adalah median dari studi yang tersedia untuk ekosistem dan provinsi
  target, bukan sampel acak atau survei baru.
- Perbedaan jumlah studi per kategori ditampilkan sebagai `n`.
- Beberapa kategori dapat memiliki jumlah studi berbeda; total adalah jumlah
  median kategori, sesuai workbook.
- Komponen dengan nilai per hektare yang tidak tersedia tidak dimasukkan.
- Jenis kawasan yang dipilih pengguna tidak mengubah formula; workbook tidak
  memakai kolom jenis kawasan pada perhitungan nilai.

## 6. Batas provinsi

- Dataset 38 provinsi berasal dari repositori komunitas CC BY 4.0, bukan peta
  resmi BIG.
- Jumlah provinsi dapat berbeda dari dataset resmi 34 provinsi.
- Nama provinsi di data UMP dan GeoJSON tidak selalu sama; crosswalk eksplisit
  dipakai, bukan pencocokan nama longgar.
- Geometri tidak dipakai untuk menghitung luas atau klaim yurisdiksi.
- Jika batas resmi 38 provinsi tersedia, ganti dataset dan perbarui tes; lihat
  `DATA_SOURCES.md`.

## 7. Lokasi UMP dan catatan peta

- Kalkulator dapat memilih 566 lokasi UMP, termasuk kabupaten/kota.
- Peta dan catatan spasial dibatasi ke lokasi tingkat provinsi. Untuk
  kabupaten/kota, aplikasi tidak menebak provinsi induknya karena workbook tidak
  memuat crosswalk tersebut.
- UMP target dan UMP studi adalah UMP 2025; tidak ada ekstrapolasi ke tahun lain.
- Catatan pengguna disimpan di `localStorage` peramban, bukan database server.
  Catatan dapat hilang jika data peramban dibersihkan.
- Catatan bukan data resmi; pengguna bertanggung jawab atas luas dan status yang
  dimasukkan.

## 8. Interpretasi statistik

- `Rentang antarpovinsi` adalah minimum–maksimum koefisien provinsi yang
  tersedia untuk ekosistem terpilih.
- `Median antarpovinsi` adalah median dari nilai provinsi, bukan median studi.
- `Ekosistem tertinggi` adalah ekosistem dengan koefisien total tertinggi untuk
  provinsi terpilih; nilai parsial dapat ikut dibandingkan dan ditandai.
- `Jasa tertinggi` adalah kategori dengan median tertinggi untuk ekosistem
  terpilih.
- Statistik catatan (nilai, luas, pangsa KL, ekosistem dominan) hanya merangkum
  catatan pengguna dan tidak boleh diklaim sebagai statistik resmi provinsi atau
  nasional.

## 9. Yang tidak dilakukan aplikasi

- Tidak mengambil data dari API pemerintah secara langsung.
- Tidak memakai machine learning atau interpolasi untuk mengisi provinsi kosong.
- Tidak membuat poligon kawasan lindung.
- Tidak mengubah workbook sumber; workbook tidak disertakan dalam repo.
- Tidak mengekspor laporan resmi; aplikasi ini adalah alat eksplorasi dan
  kalkulasi transparan.

## 10. Cara membaca state kosong

Pesan seperti “Belum ada catatan spasial”, “Belum ada nilai tervaluasi”, atau
“Tidak tersedia untuk kategori ini” berarti data tidak boleh diisi dengan nol.
Pesan tersebut sengaja dipertahankan agar dashboard tidak menghasilkan angka
palsu yang terlihat kredibel.
