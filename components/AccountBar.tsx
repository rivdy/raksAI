'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
export default function AccountBar() {
  const [user,setUser]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{fetch('/api/auth').then(r=>r.json()).then(x=>setUser(x.user));},[]);
  async function exit() {
    try { const r=await fetch('/api/auth',{method:'DELETE'}); if(!r.ok)throw new Error(); window.location.assign('/login'); }
    catch {setError('Logout gagal. Coba lagi.');}
  }
  return <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm">
    <Link className="font-semibold underline" href="/lab">Lab fisika & BMS</Link><Link className="underline" href="/copilot">AI & SOP</Link><Link className="underline" href="/predictions">Evaluasi prediksi</Link>
    <span className="ml-auto">Akun: {user?.username ?? '…'} · {user?.role ?? '…'}</span><button className="underline" onClick={exit}>Keluar</button>
    {error&&<span role="alert">{error}</span>}
  </div>;
}
