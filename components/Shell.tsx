'use client';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
export { Logo } from '@/components/Logo';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { LayoutDashboard, Map, ClipboardCheck, Route, Zap, ShieldCheck, ScrollText, Activity, BookOpen, Menu, X, FlaskConical, Clock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useData, timeAt, fmtTime, type Meta } from '@/lib/data';

const NAV = [
  { href: '/dashboard', key: 'nav_dashboard', icon: LayoutDashboard },
  { href: '/zones/A1', key: 'nav_zones', icon: Map, match: '/zones' },
  { href: '/approvals', key: 'nav_approvals', icon: ClipboardCheck },
  { href: '/trace', key: 'nav_trace', icon: Route },
  { href: '/energy', key: 'nav_energy', icon: Zap },
  { href: '/quality', key: 'nav_quality', icon: ShieldCheck },
  { href: '/audit', key: 'nav_audit', icon: ScrollText },
  { href: '/system', key: 'nav_system', icon: Activity },
  { href: '/how-it-works', key: 'nav_how', icon: BookOpen },
] as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, persona, setPersona, replayK, setReplayK, toast, decisions } = useStore();
  const { data: meta } = useData<Meta>('meta.json');
  const { data: appr } = useData<any>('approvals.json');
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (meta && !persona) setPersona(meta.personas.find((p) => p.role === 'QA') || meta.personas[0]); }, [meta, persona, setPersona]);
  useEffect(() => setOpen(false), [path]);
  const pendingCount = useMemo(() => (appr ? appr.pending.filter((p: any) => !decisions[p.id]).length : 0), [appr, decisions]);
  const k = meta ? replayK ?? meta.snapshot_k : 0;
  const nowLabel = meta ? fmtTime(timeAt(meta, meta.snapshot_k), lang, { dow: true, day: true, time: true }).replace(/(\d\d):00$/, '$1:10') : '';

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3"><Link href="/copilot" className="mb-2 rounded-lg bg-white/10 px-3 py-3 text-sm font-semibold text-white">AI Copilot</Link>
      {NAV.map(({ href, key, icon: Icon, ...r }) => {
        const active = path === href || (('match' in r) && path.startsWith((r as any).match));
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={clsx('group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
              active ? 'bg-white/10 font-semibold text-white' : 'text-[#C3D6D8] hover:bg-white/5 hover:text-white')}>
            <Icon aria-hidden className={clsx('h-[18px] w-[18px]', active ? 'text-mint' : 'text-[#8FB0B4]')} />
            <span className="flex-1">{t(key as any)}</span>
            {href === '/approvals' && pendingCount > 0 && <span className="rounded-full bg-review px-1.5 text-[11px] font-bold text-ink">{pendingCount}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink py-5 lg:flex">
        <Link href="/" className="mb-6 px-6"><Logo /></Link>
        {nav}
        <div className="mt-auto px-6 text-[11.5px] leading-relaxed text-[#8FB0B4]">
          <div className="flex items-center gap-1.5 font-medium text-[#C3D6D8]"><FlaskConical className="h-3.5 w-3.5" />{t('sim_badge')}</div>
          28-day pilot replay · 8 zones · 20 AHUs. Fictional plant; not real plant results.
        </div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] bg-ink py-5">
            <div className="mb-6 flex items-center justify-between px-6"><Logo /><button aria-label="Close menu" onClick={() => setOpen(false)} className="text-white"><X /></button></div>
            {nav}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-semibold">{t('site')}</span>
            <span className="hidden text-steel sm:inline">PT Farmasi Nusantara Sehat</span>
          </div>
          <div className={clsx('flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] num', replayK != null ? 'bg-review-bg text-review-ink' : 'bg-mist text-ink')}>
            <Clock className="h-3.5 w-3.5" />
            {replayK != null && meta ? <>{t('replay')}: {fmtTime(timeAt(meta, k), lang, { dow: true, day: true, time: true })}
              <button onClick={() => setReplayK(null)} className="ml-1 underline underline-offset-2">{t('back_to_now')}</button></> : <>{t('now')}: {nowLabel}</>}
          </div>
          <span className="hidden items-center gap-1 rounded-md bg-info-bg px-2 py-1 text-[12px] font-medium text-info sm:inline-flex"><FlaskConical className="h-3.5 w-3.5" />{t('sim_badge')}</span>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-[12.5px] text-steel">
              <span className="hidden md:inline">Persona demo</span>
              <select value={persona?.user_id ?? ''} onChange={(e) => meta && setPersona(meta.personas.find((p) => p.user_id === e.target.value)!)}
                className="max-w-[220px] rounded-lg border border-line bg-white px-2 py-1.5 text-[13px] text-ink">
                {meta?.personas.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name.replace(/, S\.Farm\./, '')} · {p.role === 'ENGINEERING' ? 'Engineering' : p.role === 'PLANT_MANAGER' ? 'Plant manager' : p.role}</option>)}
              </select>
            </label>
            <div className="flex overflow-hidden rounded-lg ring-1 ring-line" role="group" aria-label="Language">
              {(['en', 'id'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={clsx('px-2.5 py-1.5 text-[12px] font-semibold', lang === l ? 'bg-ink text-white' : 'bg-white text-steel hover:bg-mist')}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">{children}</main>
      {toast && <div role="status" className="rise fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-[13.5px] text-white shadow-pop">{toast}</div>}
    </div>
  );
}
