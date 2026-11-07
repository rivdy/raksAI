'use client';
import Link from 'next/link';
import clsx from 'clsx';
import { CircleCheck, CirclePause, OctagonX, Fan, Users } from 'lucide-react';
import { StatusBadge, ModeChip } from './ui';
import { useStore } from '@/lib/store';
import { nf, zoneStatus, type Gates, type Meta, type Series, type Zone, type Decision } from '@/lib/data';

function Gauge({ v, lim, unit }: { v: number; lim: [number, number]; unit: string }) {
  const span = lim[1] - lim[0];
  const lo = lim[0] - span * 0.25, hi = lim[1] + span * 0.25;
  const pos = Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const a = ((lim[0] - lo) / (hi - lo)) * 100, b = ((lim[1] - lo) / (hi - lo)) * 100;
  const out = v < lim[0] || v > lim[1];
  return (
    <div className="mt-1">
      <div className="relative h-1.5 rounded-full bg-[#E3ECEC]" aria-hidden>
        <div className="absolute inset-y-0 rounded-full bg-pass/25" style={{ left: `${a}%`, width: `${b - a}%` }} />
        <div className={clsx('absolute -top-[3px] h-3 w-1.5 -translate-x-1/2 rounded-sm', out ? 'bg-hold' : 'bg-ink')} style={{ left: `${pos}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[10.5px] text-steel num"><span>{lim[0]}</span><span>{lim[1]} {unit}</span></div>
    </div>
  );
}

export function ZoneTile({ meta, z, series, gates, k }: { meta: Meta; z: Zone; series: Series; gates: Gates; k: number }) {
  const { t, lang } = useStore();
  const st = zoneStatus(z, series.zones[z.code], gates.zones[z.code], gates, k);
  const ring = st.status === 'TAHAN' ? 'ring-hold/60' : st.status === 'TINJAU' ? 'ring-review/70' : 'ring-transparent';
  return (
    <Link href={`/zones/${z.code}`} className={clsx('group block rounded-xl bg-white p-3.5 shadow-card ring-2 transition-shadow hover:shadow-pop', ring)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[18px] font-semibold leading-none">{z.code}</div>
          <div className="mt-1 text-[12.5px] text-steel">{lang === 'id' ? z.name_id : z.name_en}</div>
        </div>
        <StatusBadge s={st.status} size="sm" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><div className="text-[11.5px] text-steel">RH</div><div className="num text-[15px] font-semibold">{nf(st.rh, 1, lang)}<span className="text-[11px] font-normal text-steel">%</span></div><Gauge v={st.rh} lim={z.rh} unit="%" /></div>
        <div><div className="text-[11.5px] text-steel">ΔP</div><div className="num text-[15px] font-semibold">{nf(st.dp, 1, lang)}<span className="text-[11px] font-normal text-steel"> Pa</span></div><Gauge v={st.dp} lim={z.dp} unit="Pa" /></div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-steel">
        <span className="inline-flex items-center gap-1 num"><Fan className="h-3.5 w-3.5" />{nf(st.hz, 0)} Hz{st.hz < z.hz_b && <span className="text-teal">({nf(st.hz - z.hz_b, 0)})</span>}</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{st.occ}</span>
        {st.mode !== 'ADVISORY' && <ModeChip m={st.mode} />}
      </div>
    </Link>
  );
}

export function ZonePlan({ meta, series, gates, k }: { meta: Meta; series: Series; gates: Gates; k: number }) {
  const { lang } = useStore();
  const osd = meta.zones.filter((z) => z.building === 'OSD');
  const wq = meta.zones.filter((z) => z.building === 'WQ');
  return (
    <div className="grid gap-4 xl:grid-cols-[3fr_1fr]">
      <div className="rounded-xl border border-dashed border-line p-3">
        <div className="mb-2 text-[12px] font-medium text-steel">{lang === 'id' ? 'Gedung produksi OSD' : 'OSD production building'}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{osd.map((z) => <ZoneTile key={z.code} meta={meta} z={z} series={series} gates={gates} k={k} />)}</div>
      </div>
      <div className="rounded-xl border border-dashed border-line p-3">
        <div className="mb-2 text-[12px] font-medium text-steel">{lang === 'id' ? 'Gudang & lab QC' : 'Warehouse & QC lab'}</div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">{wq.map((z) => <ZoneTile key={z.code} meta={meta} z={z} series={series} gates={gates} k={k} />)}</div>
      </div>
    </div>
  );
}

const ICON = { ok: CircleCheck, warn: CirclePause, bad: OctagonX };
function Row({ state, title, detail }: { state: 'ok' | 'warn' | 'bad'; title: string; detail: React.ReactNode }) {
  const Icon = ICON[state];
  return (
    <li className="flex gap-3 py-2.5">
      <Icon aria-hidden className={clsx('mt-0.5 h-5 w-5 flex-none', state === 'ok' && 'text-pass', state === 'warn' && 'text-review', state === 'bad' && 'text-hold')} />
      <div className="min-w-0"><div className="text-[13.5px] font-semibold">{title}</div><div className="text-[12.5px] text-steel num">{detail}</div></div>
    </li>
  );
}

/** Explains the four deterministic checks from a gate's check_results JSON. */
export function GateChecks({ checks, decision }: { checks: any; decision: Decision }) {
  const { t, lang } = useStore();
  const inp = checks.inputs || {};
  const L = inp.limits || {};
  const dq = checks.data_quality?.status;
  const reasons: string[] = checks.all_reasons || [];
  const rules = checks.rules || {};
  const ruleFail = Object.entries(rules).filter(([, v]) => v === false).map(([k]) => k);
  const pred = checks.prediction;
  return (
    <ul className="divide-y divide-line">
      <Row state={dq === 'VALID' ? 'ok' : dq === 'SUSPECT' ? 'warn' : 'bad'} title={t('check_dq')}
        detail={dq === 'VALID' ? (lang === 'id' ? 'Segar, dalam rentang, kalibrasi berlaku' : 'Fresh, in range, calibration valid') : dq} />
      <Row state={checks.cbf ? (checks.cbf.pass ? 'ok' : 'bad') : 'bad'} title={t('check_cbf')}
        detail={checks.cbf ? <>RH {nf(inp.rh_now, 2)} % ({L.rh_min}–{L.rh_max}) · ΔP {nf(inp.dp_now, 2)} Pa ({L.dp_min}–{L.dp_max}) · h = {nf(checks.cbf.h_now, 2)}</> : '—'} />
      <Row state={pred ? (pred.h_pred_worst < 0 ? 'bad' : pred.h_pred_worst < pred.margin_tinjau ? 'warn' : 'ok') : 'bad'} title={t('check_pred')}
        detail={pred ? <>RH p90 {nf(pred.rh_p90, 2)} % · ΔP p10 {nf(pred.dp_p10, 2)} Pa · {lang === 'id' ? 'margin terburuk' : 'worst margin'} {nf(pred.h_pred_worst, 2)} ({lang === 'id' ? 'perlu' : 'need'} ≥ {pred.margin_tinjau})</> : '—'} />
      <Row state={ruleFail.length === 0 ? 'ok' : reasons.some((r) => ['INTERLOCK_ACTIVE', 'RULE_MAINTENANCE_LOCK', 'RULE_QUALIFIED_RANGE'].includes(r)) ? 'bad' : 'warn'} title={t('check_rules')}
        detail={ruleFail.length === 0 ? (lang === 'id' ? 'Interlock, envelope fan, ukuran langkah, tahap batch: OK' : 'Interlocks, fan envelope, step size, batch step: OK') : ruleFail.join(', ')} />
    </ul>
  );
}
