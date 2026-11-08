# SOP-DEMO-001 — Pemeriksaan usulan penghematan fan
Status: CONTOH UNTUK HACKATHON. Bukan SOP resmi atau dokumen kualifikasi pabrik.
Versi: 1.0. Tanggal: 2026-11-08.

## Sensor dan kondisi ruang
Sebelum meninjau usulan, periksa timestamp, kualitas sensor, kalibrasi, suhu, kelembapan relatif RH dan beda tekanan delta P. Sensor berkualitas buruk atau data hilang menyebabkan usulan ditahan. Nilai batas zona pada demo adalah contoh sintetis.

## Prediksi dan batas
Periksa seluruh lintasan prediksi 30 menit beserta margin skenario, bukan hanya titik akhir. Model fisika demo belum dikalibrasi. Tahap produksi kritis, mode Shadow, maintenance lock dan simulator offline menahan aktuasi.

## Persetujuan dan BMS
Engineering membuat usulan. QA yang berbeda dari pengusul meninjau alasan dan hasil gate. Usulan kedaluwarsa setelah 15 menit waktu nyata atau tidak berlaku jika versi kondisi simulator berubah. Persetujuan QA memicu perubahan pada simulator BMS saja. Catat feedback dan identitas peninjau. Tidak ada sambungan ke perangkat pabrik.

## Penghematan energi
Prediksi daya fan memakai pendekatan pangkat tiga rasio frekuensi. Penghematan yang ditampilkan adalah estimasi fan untuk horizon 30 menit, bukan total HVAC atau hasil pilot nyata. Klaim penghematan terukur membutuhkan meter energi, baseline sebanding, penyesuaian beban, dan verifikasi di lapangan.
