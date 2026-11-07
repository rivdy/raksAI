# RUAIX AI Copilot — MVP hackathon

Fitur utama: pilih zona dan waktu replay → tanya kondisi → OpenAI menjelaskan snapshot dengan referensi sensor, batas zona, dan gate. Tidak ada model yang dilatih. Tidak ada aktuasi HVAC. Data sintetis dari prototipe dalam ZIP pengguna.

## Menjalankan (PowerShell)

1. Node.js 22.18+ atau 24 direkomendasikan untuk menjalankan tes TypeScript.
2. Jalankan `npm.cmd ci`.
3. Salin `.env.example` menjadi `.env.local`, lalu isi OPENAI_API_KEY sendiri. Jangan kirim key di chat.
4. Model default `gpt-4o-mini`; ubah OPENAI_MODEL jika akun menggunakan model lain yang mendukung Responses + Structured Outputs.
5. `npm.cmd run dev -- --hostname 127.0.0.1`
6. Buka http://localhost:3000/copilot. Tidak perlu login.
7. Tanpa key, tombol contoh demo tetap bekerja dan jelas diberi label BUKAN AI. Tombol AI mengembalikan pesan konfigurasi; tidak diam-diam beralih ke demo.

## Demo 3 menit

- Pilih A3, klik Analisis dengan AI.
- Baca ringkasan, temuan dengan rujukan, dan daftar pemeriksaan QA.
- Buka data sumber untuk membandingkan angka.
- Di dashboard, pilih peristiwa gangguan sensor lalu kembali ke Copilot. Analisis mengikuti waktu replay.
- Tanyakan penghematan energi: konteks ini tidak cukup untuk menghitung penghematan, sehingga AI diminta menyatakan batasan.

## Arsitektur

`/copilot → POST /api/copilot → validasi → snapshot server → OpenAI Responses → validasi jawaban → UI`.

API key hanya di server. Client hanya mengirim zone, k, question, demo; client tidak menentukan bukti sensor.
Pembacaan tiga JSON terstruktur menggunakan selector deterministik, bukan pencarian dokumen/RAG atau memori percakapan, sehingga LangChain/LlamaIndex belum diperlukan. Bila lingkup berkembang ke pencarian SOP, gunakan salah satu framework tersebut dengan kutipan dokumen.

OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
Jawaban skematis tetap dapat salah; ID sumber divalidasi, kebenaran semantik harus ditinjau manusia. Status pemeriksaan aplikasi dihitung terpisah dari LLM, secara konservatif menahan kualitas data nonzero, data hilang, dan ekskursi. Status ini bukan safety gate tervalidasi.

## Pengujian

- `npm.cmd run test:ai`: validasi, fixture, data buruk/hilang, kontrak provider dengan mock, refusal, jawaban tidak lengkap, rujukan invalid, kegagalan jaringan dan kuota.
- `npm.cmd run build`: kompilasi Next.js dan pemeriksaan TypeScript.
- Tes provider memakai mock; panggilan nyata memerlukan key dan kuota pengguna.

## Batas MVP

Untuk demo lokal. Tidak ada autentikasi sesuai lingkup MVP. Jangan mengekspos endpoint berbayar ke publik sebelum menambahkan autentikasi, kuota/rate limit terdistribusi dan kontrol anggaran. Batas dua request bersamaan hanya berlaku per proses, bukan rate limit produksi. Origin diperiksa tetapi bukan pengganti autentikasi.
Tidak membaca SOP/DOCX, tidak memprediksi fisika baru, tidak mengklaim penghematan, tidak terhubung ke BMS. Fitur simulasi prototipe lain tetap merupakan demo.
