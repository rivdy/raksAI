'use client';
import Link from 'next/link';
import { useState } from 'react';
import clsx from 'clsx';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Card, CardHead, PageHead, Loading, ErrorNote, Kv } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useData, fmtIso, nf, type Meta } from '@/lib/data';

export default function Quality() {
  const { t, lang } = useStore();
  const { data: meta } = useData<Meta>('meta.json');
  const { data: q, error } = useData<any>('quality.json');
  const [sel, setSel] = useState(0);
  if (error) return <ErrorNote msg={error} />;
  if (!q || !meta) return <Loading />;
  const d = q.deviations[sel];
  const SEV: Record<string, string> = { OPEN: 'bg-review-bg text-review-ink', CLOSED: 'bg-pass-bg text-pass-ink', IN_PROGRESS: 'bg-info-bg text-info', DRAFT: 'bg-review-bg text-review-ink' };
  return (
    <div>
      <PageHead title={t('quality_title')} sub={t('quality_sub')} />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="p-2">
          {q.deviations.map((x: any, i: number) => (
            <button key={x.code} onClick={() => setSel(i)} aria-pressed={i === sel} className={clsx('block w-full rounded-lg p-3 text-left', i === sel ? 'bg-mist' : 'hover:bg-mist/60')}>
              <div className="flex items-center justify-between"><span className="text-[14px] font-semibold">{x.code}</span><span className={clsx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', SEV[x.status])}>{x.status.toLowerCase()}</span></div>
              <div className="mt-1 text-[12.5px] text-steel">{lang === 'id' ? 'Zona' : 'Zone'} {x.zone} · {fmtIso(x.detected_at, lang)} · {x.severity.toLowerCase()}</div>
            </button>
          ))}
        </Card>
        <Card>
          <CardHead title={`${d.code} · ${d.type.replaceAll('_', ' ').toLowerCase()}`} sub={`${lang === 'id' ? 'Zona' : 'Zone'} ${d.zone} · ${fmtIso(d.detected_at, lang)}`}
            right={d.gate_k != null && <Link href={`/trace?zone=${d.zone}&k=${d.gate_k}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal">{t('open_trace')}<ChevronRight className="h-4 w-4" /></Link>} />
          <div className="px-5 pb-5">
            <p className="text-[14px] leading-relaxed">{lang === 'id' ? d.desc_id : d.desc_en}</p>
            <div className="mt-5 flex items-center justify-between"><h3 className="text-[15px] font-semibold">{t('capa')}</h3><span className={clsx('rounded-md px-2 py-0.5 text-[12px] font-semibold', SEV[d.capa.status])}>{d.capa.status.replace('_', ' ').toLowerCase()}</span></div>
            {d.capa.ai_draft && <p className="mt-2 flex items-center gap-2 rounded-lg bg-review-bg p-3 text-[13px] font-medium text-review-ink"><Sparkles className="h-4 w-4" />{t('ai_draft')}</p>}
            <div className="mt-3 grid gap-4 md:grid-cols-3 text-[13.5px]">
              <div><div className="mb-1 text-[12.5px] font-semibold text-steel">{t('root_cause')}</div><p>{lang === 'id' ? (d.capa.root_id.primary || d.capa.root_id.primary_hypothesis) : d.capa.en.root}</p>
                {lang === 'id' && d.capa.root_id.categories && <ul className="mt-2 space-y-1 text-[12.5px] text-steel">{Object.entries(d.capa.root_id.categories).map(([k, v]: any) => <li key={k}><b className="text-ink">{k}:</b> {v}</li>)}</ul>}</div>
              <div><div className="mb-1 text-[12.5px] font-semibold text-steel">{t('corrective')}</div><ul className="list-disc space-y-1 pl-4">{(lang === 'id' ? d.capa.ca_id.actions : d.capa.en.ca).map((a: string) => <li key={a}>{a}</li>)}</ul></div>
              <div><div className="mb-1 text-[12.5px] font-semibold text-steel">{t('preventive')}</div><ul className="list-disc space-y-1 pl-4">{(lang === 'id' ? d.capa.pa_id.actions : d.capa.en.pa).map((a: string) => <li key={a}>{a}</li>)}</ul></div>
            </div>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2"><Kv k={lang === 'id' ? 'Pemilik' : 'Owner'} v={d.capa.owner} /><Kv k={lang === 'id' ? 'Tenggat' : 'Due'} v={fmtIso(d.capa.due, lang).split(' ').slice(0, 2).join(' ')} />
              <Kv k={lang === 'id' ? 'Disetujui QA' : 'QA approval'} v={d.capa.approved_by || '—'} /><Kv k={lang === 'id' ? 'Ditutup' : 'Closed'} v={d.capa.closed_at ? fmtIso(d.capa.closed_at, lang) : '—'} /></div>
          </div>
        </Card>
      </div>
      <Card className="mt-5"><CardHead title={t('apqr')} sub={`${q.apqr_status.replaceAll('_', ' ').toLowerCase()} · ${lang === 'id' ? 'data 7–30 Sep' : 'data 7–30 Sep'} · ${lang === 'id' ? 'target Cpk ≥ 1,33' : 'target Cpk ≥ 1.33'}`} />
        <div className="overflow-x-auto px-5 pb-5 scrollbar-thin"><table className="w-full min-w-[640px] text-[13px] num">
          <thead><tr className="text-left text-steel"><th className="py-2 font-medium">{lang === 'id' ? 'Zona' : 'Zone'}</th><th className="text-right font-medium">RH mean</th><th className="text-right font-medium">RH min–max</th><th className="text-right font-medium">Cpk RH</th><th className="text-right font-medium">Cpk ΔP</th><th className="text-right font-medium">{lang === 'id' ? 'Interval di luar batas' : 'Intervals outside'}</th><th className="text-right font-medium">Hold</th></tr></thead>
          <tbody>{Object.entries(q.apqr.zones).map(([z, m]: any) => (
            <tr key={z} className="border-t border-line"><td className="py-2 font-semibold">{z}</td><td className="text-right">{nf(m.rh_mean, 2, lang)}</td><td className="text-right">{nf(m.rh_min, 1, lang)}–{nf(m.rh_max, 1, lang)}</td>
              <td className={clsx('text-right font-semibold', m.cpk_rh < 1.33 ? 'text-review-ink' : '')}>{nf(m.cpk_rh, 2, lang)}</td><td className="text-right">{nf(m.cpk_dp, 2, lang)}</td>
              <td className={clsx('text-right', m.excursion_intervals_15min ? 'font-semibold text-hold' : '')}>{m.excursion_intervals_15min}</td><td className="text-right">{m.gate_counts.TAHAN}</td></tr>))}</tbody>
        </table></div></Card>
    </div>
  );
}
