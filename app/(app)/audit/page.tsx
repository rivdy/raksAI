'use client';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Download, Lock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card, PageHead, Loading, ErrorNote, Button } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useData, fmtIso, type AuditEvent } from '@/lib/data';
import { verifyEvents } from '@/lib/hash';

export default function Audit() {
  const { t, lang, localAudit } = useStore();
  const { data, error } = useData<{ events: AuditEvent[] }>('audit.json');
  const [filter, setFilter] = useState('ALL'); const [res, setRes] = useState<null | { ok: boolean; n: number; bad: number[] }>(null); const [busy, setBusy] = useState(false);
  const all = useMemo(() => (data ? [...data.events, ...localAudit] : []), [data, localAudit]);
  const actions = useMemo(() => ['ALL', ...Array.from(new Set(all.map((e) => e.action))).sort()], [all]);
  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;
  const rows = all.filter((e) => filter === 'ALL' || e.action === filter).slice().reverse();
  const verify = async () => {
    setBusy(true); const r = await verifyEvents(all); const bad = r.filter((x) => !x.hashOk || !x.linkOk).map((x) => x.seq);
    setRes({ ok: bad.length === 0, n: r.length, bad }); setBusy(false);
  };
  const exportCsv = () => {
    const head = 'chain_seq,event_at,action,actor,entity_type,entity_id,prev_hash,event_hash,event_payload\n';
    const body = all.map((e) => [e.seq, e.at, e.action, e.actor || e.role, e.entity_type, e.entity_id || '', e.prev || '', e.hash, `"${e.payload.replaceAll('"', '""')}"`].join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ruaix_audit_export.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      <PageHead title={t('audit_title')} sub={t('audit_sub')} right={<div className="flex gap-2"><Button variant="ghost" onClick={exportCsv}><Download className="h-4 w-4" />{t('export_csv')}</Button><Button onClick={verify} disabled={busy}><Lock className="h-4 w-4" />{busy ? t('verifying') : t('verify_chain')}</Button></div>} />
      {res && <div className={clsx('mb-4 flex items-center gap-2 rounded-lg p-3 text-[13.5px] font-semibold', res.ok ? 'bg-pass-bg text-pass-ink' : 'bg-hold-bg text-hold-ink')}>
        {res.ok ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}{res.ok ? t('verified') : t('broken')}<span className="font-normal">· {res.n} {lang === 'id' ? 'catatan berurutan diverifikasi di browser' : 'consecutive records verified in your browser'}{localAudit.length ? (lang === 'id' ? `, termasuk ${localAudit.length} catatan dari tanda tangan Anda` : `, including ${localAudit.length} from your signatures`) : ''}</span></div>}
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 text-[13px]">
          <label htmlFor="flt" className="text-steel">{lang === 'id' ? 'Filter aksi' : 'Filter by action'}</label>
          <select id="flt" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-line px-2 py-1">{actions.map((a) => <option key={a}>{a}</option>)}</select>
          <span className="ml-auto text-steel">{rows.length} / {all.length}</span>
        </div>
        <div className="max-h-[640px] overflow-auto scrollbar-thin">
          <table className="w-full min-w-[860px] text-[12.5px]">
            <thead className="sticky top-0 bg-white"><tr className="text-left text-steel"><th className="px-5 py-2 font-medium">#</th><th className="font-medium">{lang === 'id' ? 'Waktu' : 'Time'}</th><th className="font-medium">{lang === 'id' ? 'Aksi' : 'Action'}</th><th className="font-medium">{lang === 'id' ? 'Pelaku' : 'Actor'}</th><th className="font-medium">{lang === 'id' ? 'Entitas' : 'Entity'}</th><th className="font-medium">Hash · prev</th></tr></thead>
            <tbody>{rows.map((e) => (
              <tr key={e.seq} className={clsx('border-t border-line', e.local && 'bg-teal-50', res?.bad.includes(e.seq) && 'bg-hold-bg')}>
                <td className="px-5 py-2 num">{e.seq}</td><td className="num">{fmtIso(e.at, lang, true)}</td><td className="font-medium">{e.action}{e.local && <span className="ml-1 rounded bg-teal px-1 text-[10.5px] text-white">{lang === 'id' ? 'baru' : 'new'}</span>}</td>
                <td>{e.actor || e.role}</td><td className="text-steel">{e.entity_type}</td>
                <td className="text-[11.5px] text-steel num">{e.hash.slice(0, 12)}… · {e.prev ? e.prev.slice(0, 8) + '…' : '—'}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
