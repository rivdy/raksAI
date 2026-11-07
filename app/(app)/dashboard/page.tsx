'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import clsx from 'clsx';
import { History, ChevronRight } from 'lucide-react';
import { Card, CardHead, Stat, StatusBadge, PageHead, Loading, ErrorNote } from '@/components/ui';
import { ZonePlan } from '@/components/zone';
import { PlantLoadChart } from '@/components/charts';
import { useStore } from '@/lib/store';
import { useData, zoneStatus, timeAt, fmtTime, nf, rp, type Meta, type Series, type Gates } from '@/lib/data';

const JUMPS = [
  { at: '2026-09-15T15:30', en: 'A3 humidity excursion in rain', id: 'Ekskursi RH A3 saat hujan' },
  { at: '2026-09-22T13:30', en: 'Advisory, normal production day', id: 'Advisory, hari produksi normal' },
  { at: '2026-09-26T02:30', en: 'Edge–BMS link lost', id: 'Koneksi edge–BMS putus' },
  { at: '2026-09-29T15:00', en: 'Sensor B3 quarantined', id: 'Sensor B3 dikarantina' },
  { at: '2026-10-02T10:30', en: 'Airlock interlock failure', id: 'Interlock airlock gagal' },
];

export default function Dashboard() {
  const { t, lang, replayK, setReplayK, persona } = useStore();
  const { data: meta, error: e1 } = useData<Meta>('meta.json');
  const { data: series, error: e2 } = useData<Series>('series.json');
  const { data: gates, error: e3 } = useData<Gates>('gates.json');
  const { data: energy } = useData<any>('energy.json');
  const { data: appr } = useData<any>('approvals.json');
  const { decisions } = useStore();
  const k = meta ? replayK ?? meta.snapshot_k : 0;
  const isNow = meta && (replayK == null || replayK === meta.snapshot_k);

  const view = useMemo(() => {
    if (!meta || !series || !gates) return null;
    const st = meta.zones.map((z) => ({ z, ...zoneStatus(z, series.zones[z.code], gates.zones[z.code], gates, k) }));
    const cnt = { LULUS: 0, TINJAU: 0, TAHAN: 0 } as Record<string, number>;
    let exc = 0;
    for (const z of meta.zones) {
      const g = gates.zones[z.code], s = series.zones[z.code];
      for (let i = 0; i < g.k.length; i++) if (g.k[i] > k - 96 && g.k[i] <= k) cnt[gates.decisions[g.d[i]]]++;
      for (let j = Math.max(0, k - 95); j <= k; j++) if (s.q[j] === 0 && (s.rh[j] > z.rh[1] || s.rh[j] < z.rh[0] || s.dp[j] < z.dp[0] || s.dp[j] > z.dp[1])) exc++;
    }
    const sensorsAttn = st.filter((x) => x.quality !== 0).length + (series.missing.includes(k) ? meta.zones.length : 0);
    const win = series.plant.actual.slice(Math.max(0, k - 191), k + 1), bwin = series.plant.baseline.slice(Math.max(0, k - 191), k + 1);
    const save48 = 1 - win.reduce((a, b) => a + b, 0) / bwin.reduce((a, b) => a + b, 0);
    return { st, cnt, exc, sensorsAttn, save48 };
  }, [meta, series, gates, k]);

  if (e1 || e2 || e3) return <ErrorNote msg={String(e1 || e2 || e3)} />;
  if (!meta || !series || !gates || !view) return <Loading />;
  const day = timeAt(meta, k);
  const yday = new Date(day.getTime() - 86400000).toISOString().slice(0, 10);
  const ydRow = energy?.daily.find((r: any) => r.date === yday);
  const modes = new Set(view.st.map((x) => x.mode));
  const banner = modes.has('SHADOW') ? t('modebanner_SHADOW') : modes.has('BMS_FALLBACK') ? t('modebanner_MIXED') : t('modebanner_ADVISORY');
  const attn = view.st.filter((x) => x.status !== 'LULUS');
  const pending = isNow && appr ? appr.pending.filter((p: any) => !decisions[p.id]) : [];
  const myPending = pending.filter((p: any) => p.role === persona?.role);

  return (
    <div>
      <PageHead title={t('nav_dashboard')} sub={banner} />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <History className="h-4 w-4 text-teal" />
          <span className="text-[13px] font-semibold">{t('replay')}</span>
          <input aria-label={t('replay')} type="range" className="replay min-w-[220px] flex-1" min={0} max={meta.n - 1} step={1} value={k}
            onChange={(e) => setReplayK(Number(e.target.value))} />
          <span className="num w-[150px] text-[13px] text-steel">{fmtTime(day, lang, { dow: true, day: true, time: true })}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {JUMPS.map((j) => {
            const kk = Math.round((Date.parse(j.at + ':00Z') - Date.parse(meta.start + 'Z')) / (meta.step * 60000));
            return <button key={j.at} onClick={() => setReplayK(kk)} className={clsx('rounded-full px-3 py-1 text-[12px] ring-1', kk === k ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:bg-mist')}>{j[lang]}</button>;
          })}
          <button onClick={() => setReplayK(null)} className={clsx('rounded-full px-3 py-1 text-[12px] font-semibold ring-1', isNow ? 'bg-teal text-white ring-teal' : 'bg-white text-teal ring-teal/40')}>{t('now')}</button>
        </div>
      </Card>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="text-[12.5px] text-steel">{t('gate_24h')}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 num">
            <StatusBadge s="LULUS" size="sm" /><b className="text-[18px]">{view.cnt.LULUS}</b>
            <StatusBadge s="TINJAU" size="sm" /><b className="text-[18px]">{view.cnt.TINJAU}</b>
            <StatusBadge s="TAHAN" size="sm" /><b className="text-[18px]">{view.cnt.TAHAN}</b>
          </div>
        </Card>
        <Card className="p-4"><Stat label={t('saved_yesterday')} tone="teal" value={ydRow ? nf(ydRow.savings_pct, 1, lang) : '—'} unit="%" sub={ydRow ? `${rp(ydRow.savings_idr, lang)} · ${nf(ydRow.savings_kwh / 1000, 1, lang)} MWh ${t('vs_baseline')}` : ''} /></Card>
        <Card className="p-4"><Stat label={t('excursions_24h')} tone={view.exc ? 'hold' : undefined} value={view.exc} sub={view.exc ? `${view.exc * 15} min · ${t('intervals')}` : t('none')} /></Card>
        <Card className="p-4"><Stat label={t('sensors_attention')} tone={view.sensorsAttn ? 'review' : undefined} value={view.sensorsAttn} sub={view.st.filter((x) => x.quality === 3).map((x) => `${x.z.code}: ${lang === 'id' ? 'dikarantina' : 'quarantined'}`).join(', ') || t('none')} /></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHead title={t('zone_plan')} sub={t('zone_plan_hint')} />
          <div className="px-4 pb-4"><ZonePlan meta={meta} series={series} gates={gates} k={k} /></div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHead title={t('attention')} />
            <ul className="px-5 pb-4">
              {myPending.map((p: any) => (
                <li key={p.id} className="mb-2 rounded-lg bg-review-bg p-3">
                  <div className="text-[13px] font-semibold">{lang === 'id' ? `Persetujuan ${p.role} menunggu · zona ${p.zone}` : `${p.role} approval waiting · zone ${p.zone}`}</div>
                  <Link href="/approvals" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal">{t('review_now')}<ChevronRight className="h-3.5 w-3.5" /></Link>
                </li>
              ))}
              {attn.map((x) => {
                const r = meta.reasons[x.quality === 3 ? 'DQ_SENSOR_QUARANTINED' : x.reason];
                return (
                  <li key={x.z.code} className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
                    <StatusBadge s={x.status} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{x.z.code} · {lang === 'id' ? x.z.name_id : x.z.name_en}</div>
                      <div className="text-[12.5px] text-steel">{x.outside ? (lang === 'id' ? 'Saat ini di luar batas zona.' : 'Currently outside zone limits.') : r?.[lang].msg}</div>
                      <Link href={`/zones/${x.z.code}`} className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal">{t('open_zone')}<ChevronRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  </li>
                );
              })}
              {!attn.length && !myPending.length && <li className="py-2 text-[13px] text-steel">{t('attention_none')}</li>}
            </ul>
          </Card>
          <Card>
            <CardHead title={lang === 'id' ? 'Beban HVAC, 48 jam' : 'HVAC load, last 48 h'} sub={`${lang === 'id' ? 'Hemat' : 'Saving'} ${nf(view.save48 * 100, 1, lang)}% ${lang === 'id' ? 'vs BMS statis (simulasi)' : 'vs static BMS (simulated)'}`} />
            <div className="px-2 pb-3"><PlantLoadChart meta={meta} plant={series.plant} k={k} /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
