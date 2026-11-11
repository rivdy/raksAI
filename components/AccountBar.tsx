'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function AccountBar() {
  const pathname=usePathname();
  const [user,setUser]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{fetch('/api/auth').then(r=>r.json()).then(x=>setUser(x.user));},[]);
  async function exit() {
    try { const r=await fetch('/api/auth',{method:'DELETE'}); if(!r.ok)throw new Error(); window.location.assign('/login'); }
    catch {setError('Logout gagal. Coba lagi.');}
  }
  return <div className="workspace-nav">
    <Link aria-current={pathname==='/lab'?'page':undefined} href="/lab">Lab fisika & BMS</Link><Link aria-current={pathname==='/copilot'?'page':undefined} href="/copilot">AI & SOP</Link><Link aria-current={pathname==='/predictions'?'page':undefined} href="/predictions">Evaluasi prediksi</Link>
    <span className="workspace-account">Akun: {user?.username ?? '…'} · {user?.role ?? '…'}</span><button onClick={exit}>Keluar</button>
    {error&&<span role="alert">{error}</span>}
  </div>;
}
