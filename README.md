# RUAIX — Local AI & Energy MVP

Alat bantu keputusan HVAC farmasi untuk demo hackathon. Menggunakan Ollama lokal (qwen3:1.7b), RAG SOP dengan LangChain, prediksi fisika 30 menit, dan simulator BMS dengan persetujuan QA.

**Mulai dari [AI_MVP.md](AI_MVP.md)** untuk setup, akun lokal, alur demo, endpoint, asumsi model, dan pengujian.

```bat
npm.cmd ci
npm.cmd run setup:local
npm.cmd run dev -- --hostname 127.0.0.1
```

Buka http://127.0.0.1:3000/login. Kredensial awal ada di .local/access.txt, diabaikan Git. Ollama harus berjalan dan memiliki model qwen3:1.7b (`ollama list`).

- /lab: prediksi baru, estimasi energi fan, usulan, QA approval, feedback simulator, audit.
- /copilot: jawaban model lokal dengan sumber sensor, prediksi dan kutipan SOP.
- Dashboard, zona, energi dan trace lama: replay dataset sintetis 28 hari.
- /approvals lama: simulasi persona/PIN; gunakan /lab untuk autentikasi dan alur BMS baru.

Semua data dan aktuasi adalah simulasi. Estimasi penghematan fan bukan hasil pilot atau total HVAC. Tidak ada koneksi ke perangkat pabrik. PDF/OCR belum didukung; unggahan menerima DOCX/TXT/MD.

Node.js 22.18+ / 24; Next.js 15.5.29. Jalankan `npm.cmd run test:ai` dan `npm.cmd run build`. Tes lengkap melalui endpoint lokal: `node scripts/smoke-local.mjs` setelah server hidup.

Proyek ini ditujukan untuk satu proses lokal. Penyimpanan, dokumen pribadi dan akun berada di .local/. Jangan publikasikan folder itu. Tidak ada panggilan API berbayar dari endpoint Copilot.
