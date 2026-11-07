'use client';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight, Fan, Thermometer, Users, Wind } from 'lucide-react';
import { Card, CardHead, StatusBadge, ModeChip, PageHead, Loading, ErrorNote, Kv } from './ui';
import { ZoneChart } from './charts';
import { GateChecks } from './zone';
import { useStore } from '@/lib/store';
import { useData, zoneStatus, timeAt, fmtTime, nf, lastGateIndex, type Meta, type Series, type Gates } from '@/lib/data';

export default function ZoneView({ code }: { code: string }) {
  const { t, lang, replayK } = useStore();
  const { data: meta, error: e1 } = useData<Meta>('meta.json');
  const { data: series, error: e2 } = useData<Series>('series.json');
  const { data: gates, error: e3 } = useData<Gates>('gates.json');
  const { data: traces } = useData<Record<string, any>>(`traces/${code}.json`);
  if (e1 || e2 || e3) return <ErrorNote msg={String(e1 || e2 || e3)} />;
  if (!meta || !series || !gates) return <Loading />;
  const z = meta.zones.find((x) => x.code === code)!;
  const k = replayK ?? meta.snapshot_k;
  const s = series.zones[code], g = gates.zones[code];
  const st = zoneStatus(z, s, g, gates, k);
  const gi = lastGateIndex(g, k);
  const tr = traces && gi >= 0 ? traces[String(g.k[gi])] : null;
  const recent = [] as number[];
  for (let i = gi; i >= 0 && recent.length < 12; i--) recent.push(i);
  const reason = gi >= 0 ? meta.reasons[gates.reasons[g.r[gi]]] : null;
  const from = g.f[gi], to = g.to[gi];
  const recStatus = gates.rec_status[g.s[gi]];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label={t('nav_zones')}>
        {meta.zones.map((zz) => {
          const s2 = zoneStatus(zz, series.zones[zz.code], gates.zones[zz.code], gates, k).status;
          return (
            <Link key={zz.code} href={`/zones/${zz.code}`} role="tab" aria-selected={zz.code === code}
              className={clsx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold ring-1', zz.code === code ? 'bg-ink text-white ring-ink' : 'bg-white ring-line hover:bg-mist')}>
              <span className={clsx('h-2 w-2 rounded-full', s2 === 'LULUS' ? 'bg-pass' : s2 === 'TINJAU' ? 'bg-review' : 'bg-hold')} aria-hidden />{zz.code}
            </Link>
          );
        })}
      </div>
      <PageHead title={`${z.code} · ${lang === 'id' ? z.name_id : z.name_en}`} sub={`${z.cls} (${z.iso}) · RH ${z.rh[0]}–${z.rh[1]} % · ΔP ${z.dp[0]}–${z.dp[1]} Pa · ${z.ahus.join(', ')}`}
        right={<div className="flex items-center gap-2"><ModeChip m={st.mode} /><StatusBadge s={st.status} size="lg" /></div>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHead title={t('rh')} sub={`${fmtTime(timeAt(meta, k), lang, { day: true, time: true })} · ${nf(st.rh, 2, lang)} %RH${st.quality === 3 ? (lang === 'id' ? ' · sensor dikarantina' : ' · sensor quarantined') : ''}`} />
          <div className="px-2 pb-3"><ZoneChart meta={meta} z={z} s={s} k={k} kind="rh" /></div></Card>
        <Card><CardHead title={t('dp')} sub={`${nf(st.dp, 2, lang)} Pa`} />
          <div className="px-2 pb-3"><ZoneChart meta={meta} z={z} s={s} k={k} kind="dp" /></div></Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHead title={t('why_decision')} sub={gi >= 0 ? `${fmtTime(timeAt(meta, g.k[gi]), lang)} · ${reason?.[lang].title}` : ''}
            right={gi >= 0 && <StatusBadge s={gates.decisions[g.d[gi]]} />} />
          <div className="px-5 pb-5">
            {reason && <p className="mb-2 rounded-lg bg-mist p-3 text-[13.5px]">{reason[lang].msg} <span className="text-steel">{reason[lang].action}</span></p>}
            {tr ? <GateChecks checks={tr.checks} decision={tr.decision} /> : <p className="py-3 text-[13px] text-steel">{lang === 'id' ? 'Detail pemeriksaan tersedia di jejak keputusan.' : 'Check details are available in the decision trace.'}</p>}
            <div className="mt-3 grid gap-3 rounded-lg ring-1 ring-line p-3 sm:grid-cols-3">
              <div><div className="text-[12px] text-steel">{t('proposal')}</div><div className="num text-[15px] font-semibold">{from === to ? t('no_change') : `${nf(from, 0)} → ${nf(to, 0)} Hz`}</div></div>
              <div><div className="text-[12px] text-steel">{t('expected_saving')}</div><div className="num text-[15px] font-semibold">{nf(g.e[gi], 1, lang)} kWh</div></div>
              <div><div className="text-[12px] text-steel">Status</div><div className="text-[13px] font-semibold">{recStatus.replace('_', ' ').toLowerCase()}</div></div>
            </div>
            {gi >= 0 && <Link href={`/trace?zone=${code}&k=${g.k[gi]}`} className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-teal">{t('open_trace')}<ChevronRight className="h-4 w-4" /></Link>}
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2"><Fan className="mt-0.5 h-4 w-4 text-teal" /><div><div className="text-[12px] text-steel">{t('fan')}</div><div className="num font-semibold">{nf(st.hz, 0)} Hz <span className="font-normal text-steel">/ BMS {z.hz_b}</span></div></div></div>
              <div className="flex gap-2"><Wind className="mt-0.5 h-4 w-4 text-teal" /><div><div className="text-[12px] text-steel">{lang === 'id' ? 'Suhu suplai (SAT)' : 'Supply air (SAT)'}</div><div className="num font-semibold">{nf(s.sat[k], 1)} °C</div></div></div>
              <div className="flex gap-2"><Thermometer className="mt-0.5 h-4 w-4 text-teal" /><div><div className="text-[12px] text-steel">{t('temp')}</div><div className="num font-semibold">{nf(st.t, 1)} °C</div></div></div>
              <div className="flex gap-2"><Users className="mt-0.5 h-4 w-4 text-teal" /><div><div className="text-[12px] text-steel">{t('occupancy')}</div><div className="num font-semibold">{st.occ}{s.crit[k] ? <span className="ml-1 text-[12px] text-review-ink">· {lang === 'id' ? 'tahap kritis' : 'critical step'}</span> : null}</div></div></div>
            </div>
          </Card>
          <Card>
            <CardHead title={t('last_decisions')} />
            <ul className="max-h-[360px] overflow-auto px-3 pb-3 scrollbar-thin">
              {recent.map((i) => {
                const rr = meta.reasons[gates.reasons[g.r[i]]];
                return (
                  <li key={i}>
                    <Link href={`/trace?zone=${code}&k=${g.k[i]}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-mist">
                      <span className="num w-[86px] text-[12.5px] text-steel">{fmtTime(timeAt(meta, g.k[i]), lang)}</span>
                      <StatusBadge s={gates.decisions[g.d[i]]} size="sm" />
                      <span className="flex-1 truncate text-[13px]">{rr[lang].title}</span>
                      <span className="num text-[12px] text-steel">{g.f[i] !== g.to[i] ? `${g.f[i]}→${g.to[i]} Hz` : ''}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
