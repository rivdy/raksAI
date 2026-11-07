'use client';
import clsx from 'clsx';
import { Card, CardHead, PageHead, Loading, ErrorNote } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useData, fmtIso, nf, type Meta } from '@/lib/data';

export default function System() {
  const { t, lang } = useStore();
  const { data: s, error } = useData<any>('system.json');
  const { data: meta } = useData<Meta & { conn_en: Record<string, string> }>('meta.json');
  if (error) return <ErrorNote msg={error} />;
  if (!s) return <Loading />;
  const lat = s.latency_daily.map((d: any) => d.inference_latency_p95_ms);
  const SEV: Record<string, string> = { HIGH: 'bg-hold-bg text-hold-ink', MEDIUM: 'bg-review-bg text-review-ink', LOW: 'bg-mist text-steel' };
  return (
    <div>
      <PageHead title={t('system_title')} sub={t('system_sub')} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHead title={t('connections')} sub={lang === 'id' ? 'Cloud tidak punya jalur tulis ke PLC. Rahasia hanya disimpan di Vault.' : 'The cloud has no write path to the PLC. Secrets live only in Vault.'} />
          <ul className="px-5 pb-4">{s.connections.map((c: any) => (
            <li key={c.connection_name} className="flex items-center gap-3 border-t border-line py-2.5 text-[13px] first:border-0">
              <span className="h-2 w-2 rounded-full bg-pass" aria-hidden /><span className="flex-1 font-medium">{lang === 'en' && meta ? meta.conn_en[c.connection_name] ?? c.connection_name : c.connection_name}</span>
              <span className="rounded-md bg-mist px-2 py-0.5 text-[11.5px]">{c.protocol.replace('_', ' ')}</span>
              <span className={clsx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', c.direction === 'WRITE_RESTRICTED' ? 'bg-review-bg text-review-ink' : 'bg-teal-50 text-teal')}>{c.direction.replace('_', ' ').toLowerCase()}</span>
            </li>))}</ul></Card>
        <Card><CardHead title={t('models')} sub={lang === 'id' ? 'Model dibekukan per versi dan hanya diganti lewat change control.' : 'Models are frozen per version and replaced only through change control.'} />
          <div className="overflow-x-auto px-5 pb-4 scrollbar-thin"><table className="w-full min-w-[520px] text-[13px]">
            <thead><tr className="text-left text-steel"><th className="py-2 font-medium">Model</th><th className="font-medium">Status</th><th className="font-medium">{lang === 'id' ? 'Metrik' : 'Metrics'}</th><th className="font-medium">CC</th></tr></thead>
            <tbody>{s.models.map((m: any) => (
              <tr key={m.name + m.version} className="border-t border-line align-top"><td className="py-2"><b>{m.name}</b> {m.version}</td><td className="text-[12px]">{m.status.replaceAll('_', ' ').toLowerCase()}</td>
                <td className="text-[12px] text-steel num">{m.type === 'PINN' ? `RMSE RH ${m.metrics.online_rmse_rh} · coverage ${m.metrics.online_coverage_80}` : m.metrics.policy}</td><td className="text-[12px]">{m.cc}</td></tr>))}</tbody>
          </table></div></Card>
        <Card><CardHead title={t('sensors')} />
          <div className="max-h-[360px] overflow-auto px-5 pb-4 scrollbar-thin"><table className="w-full min-w-[480px] text-[13px]">
            <thead className="sticky top-0 bg-white"><tr className="text-left text-steel"><th className="py-2 font-medium">Sensor</th><th className="font-medium">Zone</th><th className="font-medium">{lang === 'id' ? 'Kalibrasi' : 'Calibrated'}</th><th className="font-medium">{lang === 'id' ? 'Jatuh tempo' : 'Due'}</th><th className="font-medium">{lang === 'id' ? 'Hasil' : 'Result'}</th></tr></thead>
            <tbody>{s.sensors.map((c: any) => (
              <tr key={c.code} className={clsx('border-t border-line', c.result.startsWith('ADJUSTED') && 'bg-review-bg/60')}><td className="py-1.5 font-medium">{c.code}</td><td>{c.zone || '—'}</td><td className="num">{fmtIso(c.calibrated_at, lang).split(' ').slice(0, 2).join(' ')}</td>
                <td className="num">{fmtIso(c.due_at, lang).split(' ').slice(0, 2).join(' ')}</td><td className="text-[12px]">{c.result.split(' (')[0].toLowerCase()}</td></tr>))}</tbody>
          </table></div></Card>
        <Card><CardHead title={t('latency')} sub={`${t('target')} < 50 ms`} />
          <div className="px-5 pb-5">
            <div className="flex h-[120px] items-end gap-1" aria-label="latency per day">{lat.map((v: number, i: number) => (
              <div key={i} title={`${s.latency_daily[i].date}: ${v} ms`} className={clsx('flex-1 rounded-t', v > 50 ? 'bg-review' : 'bg-teal')} style={{ height: `${(v / 70) * 100}%` }} />))}</div>
            <p className="mt-2 text-[12.5px] text-steel">{lang === 'id' ? `p95 harian ${nf(Math.min(...lat), 1)}–${nf(Math.max(...lat), 1)} ms; batang kuning melewati target. Diukur di perangkat edge (simulasi).` : `Daily p95 ${nf(Math.min(...lat), 1)}–${nf(Math.max(...lat), 1)} ms; amber bars exceed the target. Measured on the edge device (simulated).`}</p>
          </div></Card>
      </div>
      <Card className="mt-5"><CardHead title={t('dq_events')} sub={lang === 'id' ? 'Data buruk dikarantina dan tidak pernah dipakai untuk usulan. Celah tidak diimputasi.' : 'Bad data is quarantined and never used for proposals. Gaps are not imputed.'} />
        <ul className="px-5 pb-4">{s.dq.filter((d: any) => d.check !== 'spike').concat(s.dq.filter((d: any) => d.check === 'spike').slice(0, 2)).map((d: any, i: number) => (
          <li key={i} className="grid gap-1 border-t border-line py-2.5 text-[13px] first:border-0 md:grid-cols-[150px_110px_90px_1fr]">
            <span className="num text-steel">{fmtIso(d.at, lang)}</span><span className="font-semibold">{d.check}</span>
            <span><span className={clsx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', SEV[d.severity])}>{d.severity.toLowerCase()}</span></span><span className="text-steel">{lang === 'en' ? d.resolution_en : d.resolution}</span>
          </li>))}</ul></Card>
    </div>
  );
}
