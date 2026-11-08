# RUAIX MVP lokal — AI, SOP, fisika, dan simulator BMS

## Mulai di Windows

Dari folder ruaix-prototype:

```bat
npm.cmd ci
npm.cmd run setup:local
ollama list
npm.cmd run dev -- --hostname 127.0.0.1
```

Buka http://127.0.0.1:3000/login. Ollama harus berjalan di http://127.0.0.1:11434; model default qwen3:1.7b. Pada komputer ini model sudah terpasang. Di komputer baru, jalankan `ollama pull qwen3:1.7b`. Tidak ada biaya per panggilan API; komputasi, listrik dan unduhan model memakai sumber daya sendiri.

Setup membuat tiga akun dengan password acak. Lihat **.local/access.txt** secara lokal; jangan commit, unggah, atau membagikannya. Password akun disimpan sebagai hash scrypt di .local/auth.json. Setup ulang tidak mengganti akun yang sudah ada.

- engineering: mengunggah referensi, memuat replay, membuat usulan.
- qa: kemampuan Engineering ditambah peninjauan usulan milik akun berbeda.
- viewer: membaca data, dokumen, dan analisis; tidak mengunggah atau mengubah simulator.

Session cookie HttpOnly + SameSite=Strict, berlaku delapan jam. Cookie Secure otomatis pada HTTPS. Session disimpan di memori satu proses dan berakhir saat server restart. Login dibatasi 12 percobaan per menit secara global. Pemilihan persona pada dashboard lama hanya simulasi tampilan dan **tidak mengubah izin akun**.

## Alur demo

1. Login sebagai engineering. Buka /lab.
2. Pilih A3. Pada snapshot awal, frekuensi fan 43 Hz. Usulkan 42 Hz.
3. Lihat prediksi baru 30 menit, pemeriksaan lintasan, dan estimasi energi fan.
4. Usulan LULUS menjadi PENDING; TAHAN menjadi BLOCKED dan tidak dapat disetujui.
5. Keluar lalu login sebagai qa. Buka usulan, periksa prediksi, isi alasan dan pilih Setujui & jalankan di simulator.
6. Feedback menunjukkan setpoint simulasi dan versi baru. Audit mencatat pengusul, peninjau, alasan, dan feedback.
7. Buka /copilot, pilih Simulator BMS saat ini, tanyakan “Menurut SOP demo, apa yang diperiksa sebelum usulan perubahan fan?”
8. Buka pustaka SOP untuk mengunggah DOCX/TXT/MD dan lihat kutipan bagian dokumen pada jawaban.

Usulan berlaku 15 menit waktu nyata. Persetujuan memeriksa ulang versi keadaan, gate, peran dan pengusul. Perubahan kondisi membuat usulan lama tidak berlaku. Klik ulang tidak mengirim perintah kedua. Untuk skenario gangguan, pilih waktu replay di dashboard lalu gunakan Muat waktu replay di Lab.

Tes end-to-end dapat meninggalkan A3 pada 42 Hz; gunakan replay indeks 2240 untuk kembali ke snapshot awal 43 Hz. Waktu simulator maju 30 menit setiap aktuasi sintetis; ini bukan pengukuran sensor langsung atau waktu jam nyata.

## Endpoint lokal

| Endpoint | Fungsi | Otorisasi |
|---|---|---|
| POST /api/auth | Login | Kredensial lokal |
| GET /api/auth | Identitas akun | Session |
| DELETE /api/auth | Logout/revoke | Cookie yang bersangkutan |
| GET /api/documents | Daftar referensi | Semua akun |
| POST /api/documents | Unggah JSON name + base64 | Engineering/QA |
| POST /api/copilot | zone, question, source: bms/replay, k opsional, demo opsional | Semua akun |
| GET /api/bms | Keadaan, usulan, audit | Semua akun |
| POST /api/bms | action: propose, review, replay | Pemeriksaan role server |

API model: POST http://127.0.0.1:11434/api/chat. Endpoint aplikasi tidak memanggil OpenAI atau provider berbayar. OLLAMA_BASE_URL hanya menerima HTTP loopback. Model dapat dikonfigurasi lewat OLLAMA_MODEL di .env.local. Satu inference berjalan dalam satu waktu, batas 180 detik; kegagalan tidak diam-diam diubah menjadi demo.

## RAG dokumen

LangChain RecursiveCharacterTextSplitter memotong teks (1.000 karakter, overlap 150), kemudian custom LangChain BaseRetriever memberi peringkat BM25 lokal. Tiga potongan dengan kecocokan kata tertinggi masuk konteks. Tidak perlu embeddings atau database berbayar. Ini pencarian leksikal, sehingga sinonim bisa terlewat.

Setiap sumber memuat nama, nomor bagian, dan SHA-256 teks. ID kutipan jawaban divalidasi terhadap sumber yang benar-benar diberikan ke model. Isi kutipan tetap perlu ditinjau manusia; model tidak menjamin ketepatan semantik. SOP tidak dapat mengubah gate atau instruksi sistem. Seluruh unggahan diberi status referensi belum diverifikasi.

Format: DOCX, TXT, Markdown. Maksimum 4 MB file, 120.000 karakter teks, 20 dokumen. DOCX diperiksa total ukuran isi arsip sebelum ekstraksi; hanya teks ditampilkan, bukan HTML. PDF, OCR, gambar dan DOC lama belum didukung.

Setup menyertakan SOP-DEMO-001 yang jelas ditandai contoh. Dua DOCX pengguna yang diindeks pada komputer ini disimpan di .local dan tidak ikut Git. Di komputer baru impor kembali lewat UI atau:
```bat
npm.cmd run import:docs -- "path\dokumen.docx"
```

## Model fisika & klaim penghematan

Prediksi **baru dihitung**, tidak membaca kolom prediksi historis. Model lumped memakai kondisi awal sebagai keseimbangan untuk menginferensi beban konstan, lalu menghitung respons perubahan aliran:
- suhu dan rasio kelembapan mendekati keadaan setimbang baru dengan solusi eksponensial persamaan orde satu;
- tekanan mendekati nilai awal dikali kuadrat rasio frekuensi;
- daya fan mendekati daya awal dikali pangkat tiga rasio frekuensi.

Baseline dan usulan memakai kondisi awal dan horizon 30 menit yang sama. Baseline 7,5 kW per AHU pada frekuensi nominal adalah **asumsi demo**, bukan data nameplate/meter. Parameter suhu suplai, RH suplai, konstanta waktu, dan margin terlihat di UI dan lib/physics.ts. Tidak ada pelatihan model.

Gate memeriksa setiap menit termasuk titik awal: suhu ±0,5 °C, RH ±2 poin persen, tekanan ±0,5 Pa terhadap batas contoh. Margin adalah skenario konservatif, bukan confidence interval statistik. Mode selain Advisory, gate replay non-LULUS, kualitas sensor buruk, tahap kritis, lock, dan offline menahan aktuasi simulator.

Kalimat yang boleh digunakan: “Pada skenario simulasi ini, model memperkirakan pengurangan energi **fan** sebesar X kWh dalam 30 menit dibanding baseline yang ditampilkan.”
Jangan mengubahnya menjadi penghematan total HVAC, bukti pilot, jaminan mutu atau klaim kepatuhan. Penghematan terukur belum tersedia: membutuhkan meter, baseline tervalidasi, penyesuaian beban, dan data lapangan. Model belum dikalibrasi atau diuji akurasinya terhadap fasilitas nyata.

## Penyimpanan dan batas operasional

.local/state.json menyimpan dokumen, keadaan simulator, usulan dan audit. Mutasi diserialkan dalam satu proses dan ditulis lewat file sementara lalu rename. Gunakan **satu instance server lokal**. Belum ada database multi-instance, MFA, manajemen akun lewat UI, integrasi tenant, atau deployment publik.

Audit memiliki hash chain untuk mendeteksi perubahan lokal, tetapi administrator yang menguasai file dapat menulis ulang rantainya. Bukan audit tersertifikasi atau immutable log. Asset replay public/data tetap sintetis dan dapat diakses publik; dokumen unggahan hanya lewat API berautentikasi.

Simulator tidak mempunyai adapter BACnet/Modbus/OPC UA dan tidak mengirim ke perangkat pabrik. Approval lama di /approvals menggunakan persona/PIN simulasi; **hanya /lab** memakai autentikasi akun dan aktuasi simulator baru.

## Pengujian

```bat
npm.cmd run test:ai
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1
node scripts/smoke-local.mjs
```

Tes unit memakai storage sementara terpisah; smoke test memakai akun lokal dan mengubah simulator A3. Smoke mencakup login, 401/403, persetujuan QA, penolakan ganda, RAG, jawaban nyata Ollama, dan logout. Bukti jawaban tersimpan di .local/last-ai-test.json tanpa cookie/password. Pemeriksaan HTTP bukan pengujian visual browser.

## Referensi implementasi

- Ollama Chat API: https://docs.ollama.com/api/chat
- LangChain text splitter: https://docs.langchain.com/oss/javascript/integrations/splitters/recursive_text_splitter
- LangChain retriever interface: https://reference.langchain.com/javascript/langchain-core/retrievers/BaseRetriever
- Mammoth DOCX raw text: https://github.com/mwilliamson/mammoth.js
- Fan laws (NRCan; efek sistem nyata dapat berbeda): https://natural-resources.canada.ca/energy-efficiency/energy-star/variable-frequency-drives

Evaluasi fisika sintetis dapat diulang dengan `npx tsx scripts/evaluate-physics.ts`. Pada 1.120 interval dengan frekuensi tetap, MAE 30 menit: suhu 0,104 °C; RH 0,278 poin persen; delta P 0,306 Pa. Karena skenario tanpa perubahan pada model ini setara persistence, angka ini **tidak** membuktikan keunggulan prediksi, akurasi intervensi atau keselamatan pabrik. Hasil rinci tersimpan di .local/physics-evaluation.json.

GET /api/copilot (berautentikasi) memeriksa kesiapan koneksi Ollama dan model. Tombol analisis AI menunggu model tersedia; mode contoh tetap dilabeli tanpa AI.

## Evaluasi prakiraan seperti contoh pitch

Buka /predictions setelah login, atau klik Evaluasi prediksi. Pilih zona, tanggal dan sumber model. Grafik menampilkan aktual sintetis, prakiraan RH 30 menit, dan rentang nominal 80%. Kartu menampilkan RMSE, MAE, coverage dan jumlah pasangan; tabel rinci serta CSV memperlihatkan waktu terbit/target.

Replay: series.pred[k] sudah berasal dari inference pada k-2 (lihat gen_assets.py pada ZIP, sim_files). Interval memakai prediksi ± 1,2815516 × sd. Jangan geser seri prediksi lagi. Nilai registry 0,558/0,479 dan 80,3%/76,7% ditampilkan terpisah sebagai metadata sintetis paket, bukan akurasi PINN yang dijalankan aplikasi.

Model fisika: kondisi awal 30 menit sebelumnya, frekuensi konstan, tanpa melihat RH target. Karena initial equilibrium, baseline ini setara persistence. Horizon dengan perubahan Hz/tahap kritis dikecualikan. Radius interval dipilih dari residual per zona selama 14 hari pertama dan dibekukan untuk holdout 14 hari berikutnya. Tidak ada pelatihan jaringan saraf. Ketergantungan deret waktu membuat target 80% bukan jaminan coverage. Ini interval evaluasi, bukan safety envelope simulator.

Contoh hitung ulang A1, 29 September 2026:
- Replay: n=96, RMSE 0,470698 poin %RH, MAE 0,37125, coverage 78,125%.
- Fisika baseline: n=89, RMSE 0,455000 poin %RH, MAE 0,347865, coverage 73,0337%.
- Kalibrasi fisika: 1.342 residual, radius 0,45 poin %RH.

Populasi kedua mode berbeda; selisih RMSE bukan bukti keunggulan model. Coverage fisika hari tersebut berada di bawah nominal dan perlu ditinjau. Evaluasi ini tidak menunjukkan performa intervensi atau pabrik nyata.

Referensi batas asumsi coverage: Barber et al., Conformal prediction beyond exchangeability, https://arxiv.org/abs/2202.13415. Implementasi MVP hanya memakai kuantil residual sederhana, bukan metode weighted/adaptive dalam paper tersebut.

Pengujian terbaru: 15 tes lulus, termasuk penyelarasan horizon, denominasi coverage, larangan data holdout masuk kalibrasi, dan interval/data hilang.
