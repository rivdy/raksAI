'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Inbox } from 'lucide-react';
import { Card, CardHead, StatusBadge, PageHead, Loading, ErrorNote, Button } from '@/components/ui';
import { GateChecks } from '@/components/zone';
import ESignDialog from '@/components/ESignDialog';
import { useStore } from '@/lib/store';
import { useData, load, fmtIso, nf, rp, type Meta, type AuditEvent } from '@/lib/data';
import { sealNew, sha256, sortKeysJson } from '@/lib/hash';

function PendingCard({ item, meta }: { item: any; meta: Meta }) {
  const { t, lang, persona, setPersona, decisions, addDecision, addAudit, localAudit, showToast } = useStore();
  const { data: traces } = useData<Record<string, any>>(`traces/${item.zone}.json`);
  const [dlg, setDlg] = useState<null | 'APPROVED' | 'REJECTED'>(null);
  const tr = traces?.[String(item.k)];
  const done = decisions[item.id];
  const canSign = persona?.role === item.role;
  const other = meta.personas.find((p) => p.role === item.role);
  const z = meta.zones.find((x) => x.code === item.zone)!;
  const sign = async (decision: 'APPROVED' | 'REJECTED', comment: string | null) => {
    const audit = await load<{ events: AuditEvent[] }>('audit.json');
    const prev = localAudit.length ? localAudit[localAudit.length - 1] : audit.events[audit.events.length - 1];
    const at = new Date().toISOString().slice(0, 19) + '+07:00';
    const esigHash = await sha256(`${persona!.user_id}|approval_requests|${item.id}|${decision}|${at}`);
    const ev = await sealNew(prev, { at, action: `APPROVAL_${decision}`, role: persona!.role, actor: persona!.full_name, actor_user_id: persona!.user_id,
      entity_type: 'approval_requests', entity_id: item.id, payload: sortKeysJson({ comment, local_demo: true, zone: item.zone }), tenant_id: prev.tenant_id, local: true });
    addAudit(ev);
    if (decision === 'APPROVED') {
      const ev2 = await sealNew(ev, { at, action: 'COMMAND_SENT', role: 'SYSTEM', actor: null, actor_user_id: null, entity_type: 'actuation_commands', entity_id: null,
        payload: sortKeysJson({ local_demo: true, zone: item.zone, fan_hz: tr?.rec.setpoint.fan_hz.to ?? null }), tenant_id: prev.tenant_id, local: true });
      addAudit(ev2);
    }
    addDecision({ approvalId: item.id, decision, comment, at, by: persona!.full_name, esigHash });
    setDlg(null); showToast(t(decision === 'APPROVED' ? 'toast_APPROVED' : 'toast_REJECTED'));
  };
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-mist px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-semibold">{item.zone}</span>
          <span className="text-[13px] text-steel">{lang === 'id' ? z.name_id : z.name_en} · {fmtIso(item.requested_at, lang)} · {item.role}</span>
        </div>
        {tr && <StatusBadge s={tr.decision} />}
      </div>
      {!tr ? <Loading /> : (
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="text-[13px] text-steel">{t('proposal')}</div>
            <div className="mt-1 num text-[22px] font-semibold">{tr.rec.setpoint.fan_hz.from === tr.rec.setpoint.fan_hz.to ? (lang === 'id' ? 'Lanjutkan setpoint hemat saat ini' : 'Keep the current energy-saving setpoint') : `${tr.rec.setpoint.fan_hz.from} → ${tr.rec.setpoint.fan_hz.to} Hz`}</div>
            <div className="mt-1 text-[13px] text-steel num">SAT {tr.rec.setpoint.sat_c.from} → {tr.rec.setpoint.sat_c.to} °C · {tr.rec.setpoint.ahus.join(', ')}</div>
            <p className="mt-4 rounded-lg bg-review-bg p-3 text-[13.5px]"><b>{meta.reasons[tr.reason][lang].title}.</b> {meta.reasons[tr.reason][lang].msg} {meta.reasons[tr.reason][lang].action}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-lg ring-1 ring-line p-3"><div className="text-steel">{lang === 'id' ? 'RH terburuk 30 mnt' : 'Worst-case RH, 30 min'}</div><div className="num text-[17px] font-semibold">{nf(tr.checks.prediction?.rh_p90, 2)} % <span className="text-[12px] font-normal text-steel">/ {z.rh[1]}</span></div></div>
              <div className="rounded-lg ring-1 ring-line p-3"><div className="text-steel">{lang === 'id' ? 'ΔP terburuk 30 mnt' : 'Worst-case ΔP, 30 min'}</div><div className="num text-[17px] font-semibold">{nf(tr.checks.prediction?.dp_p10, 2)} Pa <span className="text-[12px] font-normal text-steel">/ {z.dp[0]}</span></div></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {done ? <span className="text-[13.5px] font-semibold">{done.decision === 'APPROVED' ? '✓ ' : ''}{done.decision.toLowerCase()} · {done.by}</span> : canSign ? (
                <><Button onClick={() => setDlg('APPROVED')}>{t('approve')}</Button><Button variant="danger" onClick={() => setDlg('REJECTED')}>{t('reject')}</Button></>
              ) : (
                <><span className="text-[13px] text-steel">{t('not_your_role', { role: item.role })}.</span>{other && <Button variant="ghost" onClick={() => setPersona(other)}>{lang === 'id' ? `Beralih ke ${other.full_name.split(',')[0]}` : `Switch to ${other.full_name.split(',')[0]}`}</Button>}</>
              )}
              <Link href={`/trace?zone=${item.zone}&k=${item.k}`} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-teal">{t('open_trace')}<ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div><div className="mb-1 text-[13px] font-semibold">{t('why_decision')}</div><GateChecks checks={tr.checks} decision={tr.decision} /></div>
        </div>
      )}
      {dlg && <ESignDialog decision={dlg} title={`${item.zone} · ${tr?.rec.setpoint.fan_hz.from} → ${tr?.rec.setpoint.fan_hz.to} Hz`} onClose={() => setDlg(null)} onSigned={(c) => sign(dlg, c)} />}
    </Card>
  );
}

export default function Approvals() {
  const { t, lang } = useStore();
  const { data: meta, error } = useData<Meta>('meta.json');
  const { data: appr, error: e2 } = useData<any>('approvals.json');
  if (error || e2) return <ErrorNote msg={String(error || e2)} />;
  if (!meta || !appr) return <Loading />;
  return (
    <div>
      <PageHead title={t('approvals_title')} sub={t('approvals_sub')} />
      <h2 className="mb-3 text-[15px] font-semibold">{t('pending')}</h2>
      {appr.pending.length ? <div className="flex flex-col gap-4">{appr.pending.map((p: any) => <PendingCard key={p.id} item={p} meta={meta} />)}</div> :
        <Card className="flex items-center gap-3 p-6 text-steel"><Inbox className="h-5 w-5" />{lang === 'id' ? 'Tidak ada persetujuan menunggu. Usulan baru muncul di sini.' : 'No approvals waiting. New proposals appear here.'}</Card>}
      <Card className="mt-6">
        <CardHead title={t('decided_recent')} />
        <div className="overflow-x-auto px-5 pb-4 scrollbar-thin">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead><tr className="text-left text-steel"><th className="py-2 font-medium">{lang === 'id' ? 'Waktu' : 'Time'}</th><th className="font-medium">Zone</th><th className="font-medium">Role</th><th className="font-medium">{lang === 'id' ? 'Keputusan' : 'Decision'}</th><th className="font-medium">{lang === 'id' ? 'Oleh' : 'By'}</th><th className="font-medium">{lang === 'id' ? 'Catatan' : 'Note'}</th><th /></tr></thead>
            <tbody>{appr.recent.map((r: any) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2 num">{fmtIso(r.signed_at, lang)}</td><td className="font-semibold">{r.zone}</td><td>{r.role}</td>
                <td className={r.status === 'APPROVED' ? 'font-semibold text-pass-ink' : 'font-semibold text-hold'}>{r.status.toLowerCase()}</td>
                <td>{r.by}</td><td className="max-w-[260px] truncate text-steel">{r.comment ? (lang === 'en' ? (meta as any).comment_en?.[r.comment] ?? r.comment : r.comment) : '—'}</td>
                <td><Link className="font-semibold text-teal" href={`/trace?zone=${r.zone}&k=${r.k}`}>{lang === 'id' ? 'Jejak' : 'Trace'}</Link></td>
              </tr>))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
