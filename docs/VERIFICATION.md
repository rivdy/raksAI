# Hasil verifikasi MVP — 8 November 2026

- Unit/integration domain: **11 tes lulus** (`npm.cmd run test:ai`).
- Build produksi: **lulus**, Next.js 15.5.29.
- Dependency audit sesudah Next.js/PostCSS diperbarui: **0 kerentanan terlapor**.
- Smoke test HTTP: **lulus** (`node scripts/smoke-local.mjs`).
- Provider yang benar-benar diuji: **Ollama lokal qwen3:1.7b**, tanpa API berbayar.
- Waktu satu jawaban nyata yang disimpan: **60,137 detik**. Latensi bukan SLA; bergantung perangkat, panjang konteks dan beban.
- Pustaka lokal: **3 dokumen** (SOP contoh + 2 DOCX pengguna).
- Browser visual/interaksi belum diuji melalui browser automation; pemeriksaan UI terbatas pada kompilasi dan respons HTTP.

## Cakupan smoke test

Redirect /lab ke login untuk sesi kosong; endpoint privat mengembalikan 401; login memakai cookie HttpOnly/SameSite Strict; Viewer ditolak saat mengusulkan dan mengunggah; Engineering ditolak saat menyetujui; QA dapat menyetujui usulan akun lain; eksekusi kedua ditolak; upload DOCX terduplikasi terdeteksi; origin berbeda ditolak; kesiapan model diperiksa; RAG mengembalikan potongan SOP; inference nyata menghasilkan JSON dan ID sumber valid; logout mencabut sesi.

## Skenario BMS yang diuji

A3 snapshot replay indeks 2240: 43 → 42 Hz.
- Baseline fan 30 menit: 8,6152 kWh.
- Kandidat fan 30 menit: 8,0280 kWh.
- Selisih estimasi: 0,5872 kWh (6,8158%).
- Feedback: 42 Hz, waktu simulasi maju 30 menit; bukan perangkat fisik.

Semua angka ini berasal dari asumsi model simulasi. Bukan penghematan terukur, total HVAC, hasil pilot atau bukti keselamatan.

Jawaban dan sumber lengkap: .local/last-ai-test.json (diabaikan Git).
Evaluasi pembanding fisika sintetis: .local/physics-evaluation.json.
Akun awal: .local/access.txt — tidak dicetak dalam laporan atau log.

## Batas yang tetap berlaku

Prediksi belum dikalibrasi untuk pabrik; model tanpa perubahan setpoint setara persistence. Dokumen belum diverifikasi sebagai SOP resmi. Jawaban model perlu pemeriksaan manusia meskipun ID kutipannya valid. PDF/OCR belum didukung. Simulator hanya menyimpan dan memproyeksikan kondisi lokal, tanpa koneksi BACnet/Modbus/OPC UA. Session dan antrean mutasi mendukung satu proses lokal.
