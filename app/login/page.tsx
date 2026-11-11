'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import AirflowBackdrop from '@/components/AirflowBackdrop';
import './login.css';

const ROLES = [
  ['engineering', 'Membuat usulan setpoint, mengunggah SOP, memuat replay.'],
  ['qa', 'Meninjau usulan akun lain, menulis alasan, menyetujui ke simulator.'],
  ['viewer', 'Membaca data, dokumen, dan analisis. Tidak bisa mengubah apa pun.'],
];

export default function Login() {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      window.location.assign('/lab');
    } catch (e) { setError(e instanceof Error ? e.message : 'Login gagal.'); } finally { setBusy(false); }
  }
  return <div className="lg">
    {/* ruang bersih 3D: garis hijau tua, sebagian aliran udara hijau aksen */}
    <AirflowBackdrop className="lg-backdrop" center={0.7} scale={0.72} lineAlpha={0.24} ink="0,47,106" accent="60,194,174" />

    <header className="lg-top">
      <Link href="/" aria-label="RUAIX"><Logo dark={false} /></Link>
      <Link href="/" className="lg-back">← Beranda</Link>
    </header>

    <main className="lg-card">
      <div className="lg-eyebrow"><span className="lg-dot" /> Akun lokal</div>
      <h1>Masuk ke<br /><span>ruang kendali.</span></h1>

      <form onSubmit={submit} className="lg-form">
        <label>Nama pengguna
          <input name="username" required autoComplete="username" />
        </label>
        <label>Kata sandi
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p role="alert" className="lg-error">{error}</p>}
        <button disabled={busy} className="lg-submit">{busy ? 'Memeriksa…' : <>Masuk <ArrowUpRight size={18} /></>}</button>
      </form>
      <p className="lg-hint">Kata sandi dibuat saat <code>npm run setup:local</code> dan tersimpan di <code>.local/access.txt</code>.</p>

      <section className="lg-roles" aria-label="Peran akun">
        <div className="lg-eyebrow">Tiga peran</div>
        <dl>
          {ROLES.map(([role, text]) => <div key={role}><dt>{role}</dt><dd>{text}</dd></div>)}
        </dl>
        <p className="lg-note">Usulan tidak bisa disetujui oleh akun yang sama yang membuatnya. Semua perintah BMS pada prototipe ini berjalan di simulator.</p>
      </section>
    </main>

    <p className="lg-caption">Ilustrasi · aliran udara laminar dari HEPA ke grill return</p>
  </div>;
}
