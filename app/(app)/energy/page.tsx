'use client';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Card, CardHead, Stat, PageHead, Loading, ErrorNote, Kv } from '@/components/ui';
import { EnergyDailyChart } from '@/components/charts';
import { useStore } from '@/lib/store';
import { useData, nf, rp, type Meta } from '@/lib/data';

function roi(ahu: number, tariff: number, pct: number, oosOn: boolean) {
  const f = ahu / 20;
  const kwh = 4.59e6 * f, save = kwh * pct * tariff, share = 0.15 * save, saas = 144e6, kal = 42e6 * f, hw = 21.6e6 * f, oos = oosOn ? 440e6 * f : 0;
  const gross = save + oos, cost = saas + share + kal + hw, net = gross - cost;
  const upfront = 250e6 + 185e6 * f;
  const full = (save * 0.85 + oos - saas - kal) / 12, adv = (save * 0.5 * 0.85 + oos * 0.5 - saas - kal) / 12;
  let cum = -upfront, m = 0;
  while (cum < 0 && m < 60) { m++; cum += m === 1 ? 0 : m <= 4 ? adv : full; }
  return { save, gross, cost, net, mult: gross / cost, payback: cum >= 0 ? m : null, co2: (kwh * pct * 0.85) / 1000, upfront };
}

export default function Energy() {
  const { t, lang } = useStore();
  const { data: meta } = useData<Meta>('meta.json');
  const { data: e, error } = useData<any>('energy.json');
  const [ahu, setAhu] = useState(20); const [tariff, setTariff] = useState(1056); const [pct, setPct] = useState(34.8); const [oos, setOos] = useState(true);
  const r = useMemo(() => roi(ahu, tariff, pct / 100, oos), [ahu, tariff, pct, oos]);
  if (error) return <ErrorNote msg={error} />;
  if (!e || !meta) return <Loading />;
  const adv = e.daily.filter((d: any) => d.mode === 'ADVISORY'), sh = e.daily.filter((d: any) => d.mode === 'SHADOW');
  const avg = (a: any[], k: string) => a.reduce((s, x) => s + x[k], 0) / a.length;
  const ver = e.weekly.find((w: any) => w.verification_status === 'VERIFIED');
  const co2adv = adv.reduce((s: number, x: any) => s + x.co2_avoided_kg, 0) / 1000;
  const ST: Record<string, string> = { BASELINE_CHECK: lang === 'id' ? 'Cek baseline' : 'Baseline check', VERIFIED: lang === 'id' ? 'Terverifikasi' : 'Verified', PENDING: lang === 'id' ? 'Menunggu' : 'Pending' };
  return (
    <div>
      <PageHead title={t('energy_title')} sub={t('energy_sub')} />
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><Stat label={t('verified_week')} tone="teal" value={rp(ver.savings_value, lang)} sub={`${nf(ver.savings_kwh / 1000, 1, lang)} MWh · ${nf((ver.savings_kwh / ver.adjusted_baseline_kwh) * 100, 1, lang)} %`} /></Card>
        <Card className="p-4"><Stat label={t('advisory_avg')} value={nf(avg(adv, 'savings_pct'), 1, lang)} unit="%" sub={lang === 'id' ? '14 hari, simulasi' : '14 days, simulated'} /></Card>
        <Card className="p-4"><Stat label={t('shadow_check')} value={nf(avg(sh, 'savings_pct'), 2, lang)} unit="%" sub={lang === 'id' ? 'Mendekati 0 %: baseline akurat' : 'Close to 0 %: baseline is accurate'} /></Card>
        <Card className="p-4"><Stat label={`${t('co2')} (Advisory)`} value={nf(co2adv, 1, lang)} unit="t" sub={`${meta.ef} kg/kWh`} /></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card><CardHead title={lang === 'id' ? 'Energi HVAC harian vs baseline M&V' : 'Daily HVAC energy vs. M&V baseline'} sub={lang === 'id' ? 'Area teal = mode Advisory' : 'Shaded area = Advisory mode'} />
          <div className="px-3 pb-4"><EnergyDailyChart rows={e.daily} kAdvDate="2026-09-21" /></div></Card>
        <Card><CardHead title={lang === 'id' ? 'Model baseline (IPMVP Option C)' : 'Baseline model (IPMVP Option C)'} />
          <div className="px-5 pb-5 text-[13px]">
            <p className="mb-3 rounded-lg bg-mist p-3 num">kWh/day = {nf(e.baseline.adj.a, 0)} + {nf(e.baseline.adj.b, 2)} × h<sub>out</sub> + {nf(e.baseline.adj.c, 1)} × {lang === 'id' ? 'jam produksi' : 'production hours'}</p>
            <Kv k="R²" v={nf(e.baseline.adj.r2, 3)} /><Kv k="CV(RMSE)" v={`${nf(e.baseline.adj.cv_rmse * 100, 2)} % (ASHRAE 14 ≤ 25 %)`} />
            <Kv k={lang === 'id' ? 'Tarif' : 'Tariff'} v={`Rp${nf(meta.tariff, 0, lang)}/kWh`} /><Kv k={lang === 'id' ? 'Faktor emisi' : 'Emission factor'} v={`${meta.ef} kg CO₂e/kWh`} />
            <p className="mt-3 text-[12px] text-steel">{lang === 'id' ? 'Tarif dan faktor emisi adalah asumsi; ganti dengan data resmi pabrik.' : 'Tariff and emission factor are assumptions; replace them with official plant data.'}</p>
          </div></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card><CardHead title={t('weekly_mv')} />
          <div className="overflow-x-auto px-5 pb-4 scrollbar-thin"><table className="w-full min-w-[560px] text-[13px] num">
            <thead><tr className="text-left text-steel"><th className="py-2 font-medium">{lang === 'id' ? 'Minggu' : 'Week'}</th><th className="text-right font-medium">Baseline</th><th className="text-right font-medium">{t('actual')}</th><th className="text-right font-medium">{lang === 'id' ? 'Hemat' : 'Saving'}</th><th className="text-right font-medium">Rp</th><th className="pl-4 font-medium">Status</th></tr></thead>
            <tbody>{e.weekly.map((w: any) => (
              <tr key={w.id} className="border-t border-line"><td className="py-2">{+w.period_start.slice(8)} {w.period_start.slice(5, 7) === '09' ? 'Sep' : (lang === 'id' ? 'Okt' : 'Oct')} – {+w.period_end.slice(8)} {w.period_end.slice(5, 7) === '09' ? 'Sep' : (lang === 'id' ? 'Okt' : 'Oct')}</td>
                <td className="text-right">{nf(w.adjusted_baseline_kwh / 1000, 1, lang)} MWh</td><td className="text-right">{nf(w.actual_kwh / 1000, 1, lang)} MWh</td>
                <td className="text-right font-semibold">{nf((w.savings_kwh / w.adjusted_baseline_kwh) * 100, 1, lang)} %</td><td className="text-right">{rp(w.savings_value, lang)}</td>
                <td className="pl-4"><span className={clsx('rounded-md px-2 py-0.5 text-[12px] font-medium', w.verification_status === 'VERIFIED' ? 'bg-pass-bg text-pass-ink' : w.verification_status === 'PENDING' ? 'bg-review-bg text-review-ink' : 'bg-mist text-steel')}>{ST[w.verification_status]}</span></td></tr>))}</tbody>
          </table></div></Card>
        <Card><CardHead title={t('share_stmt')} sub={t('indicative')} />
          <div className="px-5 pb-5">{e.share.map((s: any) => (<div key={s.id}><Kv k={lang === 'id' ? 'Nilai hemat terverifikasi' : 'Verified saving value'} v={rp(s.savings_value, lang)} /><Kv k={lang === 'id' ? 'Porsi' : 'Share'} v={`${nf(s.share_pct, 0)} %`} /><Kv k={lang === 'id' ? 'Jumlah' : 'Amount'} v={<b>{rp(s.amount, lang)}</b>} /></div>))}
            <p className="mt-2 text-[12px] text-steel">{lang === 'id' ? 'Pelanggan hanya membayar dari penghematan yang terverifikasi.' : 'The customer only pays out of verified savings.'}</p></div></Card>
      </div>
      <Card className="mt-5"><CardHead title={t('roi_title')} sub={t('roi_sub')} />
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-4 text-[13px]">
            <label className="flex flex-col gap-1"><span className="flex justify-between"><span>{t('ahu_count')}</span><b className="num">{ahu}</b></span><input type="range" className="replay" min={5} max={60} value={ahu} onChange={(x) => setAhu(+x.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="flex justify-between"><span>{t('saving_pct')}</span><b className="num">{nf(pct, 1, lang)} %</b></span><input type="range" className="replay" min={10} max={40} step={0.5} value={pct} onChange={(x) => setPct(+x.target.value)} />
              <span className="text-[12px] text-steel">{lang === 'id' ? 'Simulasi 34,8 % · target pilot konservatif ≥ 15 %' : 'Simulation 34.8 % · conservative pilot target ≥ 15 %'}</span></label>
            <label className="flex items-center justify-between gap-2"><span>{t('tariff')}</span><input type="number" value={tariff} onChange={(x) => setTariff(+x.target.value || 0)} className="w-[110px] rounded-lg border border-line px-2 py-1 text-right num" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={oos} onChange={(x) => setOos(x.target.checked)} className="accent-teal" />{t('include_oos')} <span className="text-steel">(Rp440 jt / 20 AHU)</span></label>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-ink p-5 text-white">
            <div><div className="text-[12.5px] text-[#9DB7BA]">{t('net_benefit')}</div><div className="num text-[28px] font-semibold text-mint">{rp(r.net, lang)}</div></div>
            <div><div className="text-[12.5px] text-[#9DB7BA]">{t('payback')}</div><div className="num text-[28px] font-semibold">{r.payback ?? '> 60'} <span className="text-[14px] font-normal">{t('months')}</span></div></div>
            <div><div className="text-[12.5px] text-[#9DB7BA]">{t('value_x')}</div><div className="num text-[20px] font-semibold">{nf(r.mult, 1, lang)}×</div></div>
            <div><div className="text-[12.5px] text-[#9DB7BA]">{t('co2')}</div><div className="num text-[20px] font-semibold">{nf(r.co2, 0, lang)} t/{lang === 'id' ? 'thn' : 'yr'}</div></div>
            <p className="col-span-2 text-[12px] text-[#9DB7BA]">{lang === 'id' ? `Biaya awal ${rp(r.upfront, lang)} (paket CSV, pilot, hardware). Payback memperhitungkan 1 bulan Shadow + 3 bulan Advisory.` : `Up-front ${rp(r.upfront, lang)} (CSV package, pilot, hardware). Payback includes 1 month of Shadow and 3 months of Advisory.`}</p>
          </div>
        </div></Card>
    </div>
  );
}
