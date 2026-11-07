'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Gauge, LineChart, SlidersHorizontal, ShieldCheck, PenLine, Server, CircleCheckBig, Lock, ShieldAlert, Fingerprint, RotateCcw, Pencil } from 'lucide-react';
import { Card, CardHead, StatusBadge, PageHead, Loading, ErrorNote, Kv, Button } from './ui';
import { GateChecks } from './zone';
import { useStore } from '@/lib/store';
import { useData, timeAt, fmtTime, fmtIso, nf, rp, type Meta, type AuditEvent } from '@/lib/data';
import { verifyEvents, type VerifyResult } from '@/lib/hash';

const STEPS = [
  { key: 'step_sensor', icon: Gauge }, { key: 'step_pred', icon: LineChart }, { key: 'step_prop', icon: SlidersHorizontal },
  { key: 'step_gate', icon: ShieldCheck }, { key: 'step_appr', icon: PenLine }, { key: 'step_cmd', icon: Server }, { key: 'step_fb', icon: CircleCheckBig },
] as const;

export default function TraceView() {
  const { t, lang, decisions } = useStore();
  const sp = useSearchParams();
  const { data: meta, error } = useData<Meta>('meta.json');
  const { data: appr } = useData<any>('approvals.json');
  const [zone, setZone] = useState<string | null>(null);
  const [k, setK] = useState<number | null>(null);
  useEffect(() => {
    if (sp.get('zone') && sp.get('k')) { setZone(sp.get('zone')); setK(Number(sp.get('k'))); return; }
    if (appr) { const r = appr.recent.find((x: any) => x.status === 'APPROVED') || appr.pending[0]; if (r) { setZone(r.zone); setK(r.k); } }
  }, [sp, appr]);
  const { data: traces, error: e2 } = useData<Record<string, any>>(zone ? `traces/${zone}.json` : null);
  const tr = traces && k != null ? traces[String(k)] : null;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [res, setRes] = useState<Record<number, VerifyResult> | null>(null);
  const [busy, setBusy] = useState(false);
  const [tampered, setTampered] = useState(false);
  useEffect(() => { setEvents(tr ? tr.audit : []); setRes(null); setTampered(false); }, [tr]);

  if (error || e2) return <ErrorNote msg={String(error || e2)} />;
  if (!meta || !traces || k == null) return <Loading />;
  if (!tr) {
    return (
      <div>
        <PageHead title={t('trace_title')} sub={t('trace_sub')} />
        <Card className="p-6 text-[14px]">{lang === 'id' ? 'Keputusan ini tidak disertakan dalam sampel jejak prototipe. Pilih keputusan dari halaman zona atau persetujuan.' : 'This decision is not in the prototype trace sample. Pick a decision from a zone or the approvals page.'}
          <div className="mt-3"><Link className="font-semibold text-teal" href={`/zones/${zone}`}>{t('open_zone')} {zone}</Link></div></Card>
      </div>
    );
  }
  const shadow = tr.k < meta.k_adv;
  const local = tr.approvals.map((a: any) => decisions[a.id]).find(Boolean);
  const approved = tr.approvals.some((a: any) => a.status === 'APPROVED') || local?.decision === 'APPROVED';
  const cmd = tr.commands[0];
  const state = [
    'done', 'done', tr.rec.setpoint.fan_hz.from !== tr.rec.setpoint.fan_hz.to ? 'done' : 'skip', tr.decision === 'LULUS' ? 'done' : tr.decision === 'TINJAU' ? 'warn' : 'bad',
    shadow ? 'skip' : tr.approvals.length ? (approved ? 'done' : 'bad') : 'skip', cmd ? (cmd.status === 'FAILED' ? 'bad' : 'done') : 'skip', cmd?.feedback?.length ? 'done' : 'skip',
  ];
  const sp_ = tr.rec.setpoint;
  const pr = tr.inference.pred, un = tr.inference.unc;
  const inp = tr.checks.inputs || {};

  const verify = async () => {
    setBusy(true);
    const r = await verifyEvents(events);
    setRes(Object.fromEntries(r.map((x) => [x.seq, x])));
    setBusy(false);
  };
  const tamper = () => {
    if (!events.length) return;
    const i = events.findIndex((e) => e.action === 'GATE_DECISION');
    const j = i >= 0 ? i : 0;
    const e = events[j];
    const fake = e.payload.includes('"LULUS"') ? e.payload.replace('"LULUS"', '"TAHAN"') : e.payload.replace(/"zone":"(\w+)"/, '"zone":"Z9"');
    setEvents(events.map((x, n) => (n === j ? { ...x, payload: fake } : x)));
    setTampered(true); setRes(null);
  };
  const allOk = res && Object.values(res).every((x) => x.hashOk && x.linkOk);

  return (
    <div>
      <PageHead title={t('trace_title')} sub={t('trace_sub')}
        right={<div className="flex items-center gap-2 text-[13px]"><Link href={`/zones/${tr.zone}`} className="font-semibold text-teal">{tr.zone}</Link><span className="text-steel num">{fmtTime(timeAt(meta, tr.k), lang, { dow: true, day: true, time: true })}</span><StatusBadge s={tr.decision} /></div>} />

      <Card className="mb-5 overflow-x-auto p-5 scrollbar-thin">
        <ol className="flex min-w-[760px] items-start">
          {STEPS.map((s, i) => {
            const Icon = s.icon; const st = state[i];
            return (
              <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
                {i < STEPS.length - 1 && <span aria-hidden className={clsx('absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-5 h-0.5', state[i + 1] === 'skip' ? 'bg-line' : 'bg-teal/60')} />}
                <a href={`#s${i}`} className={clsx('flex h-10 w-10 items-center justify-center rounded-xl ring-2',
                  st === 'done' && 'bg-teal text-white ring-teal', st === 'skip' && 'bg-white text-steel-400 ring-line', st === 'warn' && 'bg-review-bg text-review-ink ring-review', st === 'bad' && 'bg-hold-bg text-hold ring-hold')}>
                  <Icon className="h-5 w-5" /></a>
                <span className="mt-2 text-[12.5px] font-semibold">{t(s.key as any)}</span>
                <span className="text-[11px] text-steel">{st === 'skip' ? (i === 4 && shadow ? t('not_needed_shadow') : t('not_sent')) : ''}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card id="s0" className="p-5"><h3 className="mb-2 font-semibold">1 · {t('step_sensor')}</h3>
          <Kv k="RH" v={`${nf(inp.rh_now, 2)} %RH`} /><Kv k="ΔP" v={`${nf(inp.dp_now, 2)} Pa`} /><Kv k={lang === 'id' ? 'Mutu data' : 'Data quality'} v={tr.checks.data_quality?.status} />
          <Kv k={lang === 'id' ? 'Batas' : 'Limits'} v={`RH ${inp.limits?.rh_min}–${inp.limits?.rh_max} · ΔP ${inp.limits?.dp_min}–${inp.limits?.dp_max}`} />
          <p className="mt-2 break-all text-[11.5px] text-steel">{tr.snapshot_uri}</p></Card>
        <Card id="s1" className="p-5"><h3 className="mb-2 font-semibold">2 · {t('step_pred')}</h3>
          <Kv k={lang === 'id' ? 'Model' : 'Model'} v={tr.inference.model} /><Kv k="RH +15 / +30 min" v={`${nf(pr.rh['15'], 2)} / ${nf(pr.rh['30'], 2)} %`} />
          <Kv k="ΔP +15 / +30 min" v={`${nf(pr.dp['15'], 2)} / ${nf(pr.dp['30'], 2)} Pa`} /><Kv k={lang === 'id' ? 'Ketidakpastian (sd)' : 'Uncertainty (sd)'} v={`RH ${un.rh_sd} · ΔP ${un.dp_sd}`} />
          <Kv k={lang === 'id' ? 'Latensi edge' : 'Edge latency'} v={`${nf(tr.inference.latency, 1)} ms`} /></Card>
        <Card id="s2" className="p-5"><h3 className="mb-2 font-semibold">3 · {t('step_prop')}</h3>
          <Kv k={t('fan')} v={`${sp_.fan_hz.from} → ${sp_.fan_hz.to} Hz`} /><Kv k={lang === 'id' ? 'Suhu suplai' : 'Supply air temp'} v={`${sp_.sat_c.from} → ${sp_.sat_c.to} °C`} />
          <Kv k="AHU" v={sp_.ahus.join(', ')} /><Kv k={t('expected_saving')} v={`${nf(tr.rec.saving_kwh, 1)} kWh · ${rp(tr.rec.saving_kwh * meta.tariff, lang)}`} />
          <Kv k="Optimizer" v={tr.rec.optimizer} />{sp_.hold && <p className="mt-2 rounded-md bg-mist p-2 text-[12.5px]">{sp_.hold === 'critical_step' ? t('hold_critical') : t('hold_target')}</p>}</Card>
        <Card id="s3" className="p-5 lg:col-span-2"><div className="mb-1 flex items-center justify-between"><h3 className="font-semibold">4 · {t('step_gate')}</h3><span className="text-[12px] text-steel num">ruleset {tr.ruleset} · margin {nf(tr.margin, 3)}</span></div>
          <p className="mb-1 text-[13.5px]"><b>{meta.reasons[tr.reason][lang].title}.</b> {meta.reasons[tr.reason][lang].msg}</p>
          <GateChecks checks={tr.checks} decision={tr.decision} /></Card>
        <Card id="s4" className="p-5"><h3 className="mb-2 font-semibold">5 · {t('step_appr')}</h3>
          {shadow && <p className="text-[13px] text-steel">{t('not_needed_shadow')}</p>}
          {!shadow && !tr.approvals.length && <p className="text-[13px] text-steel">{tr.decision === 'TAHAN' ? (lang === 'id' ? 'Gate TAHAN: tidak ada permintaan persetujuan.' : 'Gate Hold: no approval is requested.') : (lang === 'id' ? 'Tidak ada perubahan, tidak perlu persetujuan.' : 'No change, so no approval needed.')}</p>}
          {tr.approvals.map((a: any) => {
            const l = decisions[a.id];
            const status = l ? l.decision : a.status;
            return (
              <div key={a.id} className="mb-2 rounded-lg ring-1 ring-line p-3 text-[13px]">
                <div className="flex justify-between"><b>{a.role}</b><span className={clsx('font-semibold', status === 'APPROVED' ? 'text-pass-ink' : status === 'REJECTED' ? 'text-hold' : 'text-steel')}>{status.toLowerCase()}</span></div>
                <div className="mt-1 text-steel">{l ? `${l.by} · ${fmtIso(l.at, lang)}` : a.by ? `${a.by} · ${fmtIso(a.signed_at, lang)}` : fmtIso(a.requested_at, lang)}</div>
                {(l?.comment || a.comment) && <div className="mt-1">“{l?.comment || a.comment}”</div>}
                {(l || a.esig) && <div className="mt-2 flex items-center gap-1.5 break-all text-[11.5px] text-steel"><Fingerprint className="h-3.5 w-3.5 flex-none" />e-sign {(l?.esigHash || a.esig.hash).slice(0, 24)}…</div>}
              </div>
            );
          })}</Card>
        <Card id="s5" className="p-5"><h3 className="mb-2 font-semibold">6 · {t('step_cmd')}</h3>
          {!tr.commands.length && <p className="text-[13px] text-steel">{t('not_sent')}</p>}
          {tr.commands.map((c: any) => (
            <div key={c.id} className="mb-2 text-[13px]">
              <Kv k="Status" v={<span className={c.status === 'FAILED' ? 'text-hold' : ''}>{c.status}</span>} /><Kv k={lang === 'id' ? 'Dikirim' : 'Sent'} v={fmtIso(c.sent_at, lang, true)} />
              <Kv k="ACK" v={c.ack_at ? fmtIso(c.ack_at, lang, true) : '—'} /><Kv k="Action" v={c.payload.action} />
              {c.result?.error_code && <Kv k="Error" v={c.result.error_code} />}{c.payload.retry_of && <Kv k="Retry of" v={c.payload.retry_of.slice(0, 8)} />}
            </div>
          ))}</Card>
        <Card id="s6" className="p-5"><h3 className="mb-2 font-semibold">7 · {t('step_fb')}</h3>
          {!cmd?.feedback?.length && <p className="text-[13px] text-steel">—</p>}
          {tr.commands.flatMap((c: any) => c.feedback).map((f: any, i: number) => (
            <div key={i} className="mb-2 text-[13px]"><Kv k={fmtIso(f.at, lang)} v={f.result} />{f.state?.fan_hz_mean != null && <Kv k={lang === 'id' ? 'Fan terukur' : 'Measured fan'} v={`${f.state.fan_hz_mean} Hz`} />}</div>
          ))}</Card>
      </div>

      <Card className="mt-5">
        <CardHead title={lang === 'id' ? 'Catatan audit tersegel untuk keputusan ini' : 'Sealed audit records for this decision'}
          sub={lang === 'id' ? 'Setiap segel dihitung ulang di browser Anda: SHA-256(hash sebelumnya + isi catatan).' : 'Each seal is recomputed in your browser: SHA-256(previous hash + record content).'}
          right={<div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={tamper} disabled={tampered}><Pencil className="h-4 w-4" />{t('tamper')}</Button>
            {tampered && <Button variant="ghost" onClick={() => { setEvents(tr.audit); setTampered(false); setRes(null); }}><RotateCcw className="h-4 w-4" />{t('reset')}</Button>}
            <Button onClick={verify} disabled={busy}><Lock className="h-4 w-4" />{busy ? t('verifying') : t('verify_chain')}</Button></div>} />
        {res && <div className={clsx('mx-5 mb-3 flex items-center gap-2 rounded-lg p-3 text-[13.5px] font-semibold', allOk ? 'bg-pass-bg text-pass-ink' : 'bg-hold-bg text-hold-ink')}>
          {allOk ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}{allOk ? t('verified') : t('broken')}
          <span className="font-normal">{allOk ? `· ${events.length} ${lang === 'id' ? 'catatan diverifikasi' : 'records verified'}` : `· ${t('tamper_hint')}`}</span></div>}
        <div className="overflow-x-auto px-5 pb-5 scrollbar-thin">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead><tr className="text-left text-steel"><th className="py-2 pr-3 font-medium">#</th><th className="pr-3 font-medium">{lang === 'id' ? 'Waktu' : 'Time'}</th><th className="pr-3 font-medium">{lang === 'id' ? 'Aksi' : 'Action'}</th><th className="pr-3 font-medium">{lang === 'id' ? 'Pelaku' : 'Actor'}</th><th className="pr-3 font-medium">Hash</th><th className="font-medium">Seal</th></tr></thead>
            <tbody>
              {events.map((e) => {
                const r = res?.[e.seq];
                return (
                  <tr key={e.seq} className="border-t border-line align-top">
                    <td className="py-2 pr-3 num">{e.seq}</td><td className="pr-3 num">{fmtIso(e.at, lang, true)}</td><td className="pr-3 font-medium">{e.action}</td>
                    <td className="pr-3">{e.actor || e.role}</td><td className="pr-3 text-[11.5px] text-steel num">{e.hash.slice(0, 16)}…</td>
                    <td>{r ? (r.hashOk && r.linkOk ? <span className="font-semibold text-pass-ink">OK</span> : <span className="font-semibold text-hold">{lang === 'id' ? 'Tidak cocok' : 'Mismatch'}</span>) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
