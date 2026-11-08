'use client';
import { useState } from 'react';
export default function Login() {
  const [error,setError]=useState(''), [busy,setBusy]=useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fields.get('username'),password:fields.get('password')})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error);
      window.location.assign('/lab');
    } catch(e) {setError(e instanceof Error?e.message:'Login gagal.');} finally {setBusy(false);}
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
    <p className="font-semibold text-teal-700">RUAIX · LOCAL MVP</p><h1 className="mt-3 text-3xl font-semibold">Masuk ke ruang kendali.</h1>
    <p className="my-4 text-steel">Engineering membuat usulan. QA meninjau dan menyetujui perubahan pada simulator BMS.</p>
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <label className="block">Nama pengguna<input name="username" required autoComplete="username" className="mt-2 w-full rounded border p-3"/></label>
      <label className="block">Password<input name="password" type="password" required autoComplete="current-password" className="mt-2 w-full rounded border p-3"/></label>
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-ink p-3 font-semibold text-white disabled:opacity-50">{busy?'Memeriksa…':'Masuk'}</button>
    </form>
    <p className="mt-4 text-sm text-steel">Gunakan akun lokal hasil setup. Semua koneksi BMS pada MVP ini adalah simulasi.</p>
  </main>;
}
