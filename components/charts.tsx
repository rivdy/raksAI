'use client';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { fmtTime, nf, timeAt, type Meta, type ZoneSeries, type Zone } from '@/lib/data';

const C = { ink: '#0E2A32', teal: '#0F6B70', mint: '#3CC2AE', limit: '#2F9E62', grid: '#E3ECEC', steel: '#51636B', base: '#9DB7BA', hold: '#D2483F' };
const tick = { fontSize: 11.5, fill: C.steel, fontFamily: 'IBM Plex Sans' };

function Tip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-[12.5px] shadow-pop ring-1 ring-line">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.filter((p: any) => p.value != null && !Array.isArray(p.value)).map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 num"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}: <b>{nf(p.value, 2)}</b> {unit}</div>
      ))}
    </div>
  );
}

export function ZoneChart({ meta, z, s, k, kind }: { meta: Meta; z: Zone; s: ZoneSeries; k: number; kind: 'rh' | 'dp' }) {
  const { t, lang } = useStore();
  const from = Math.max(0, k - 95);
  const data = [];
  for (let i = from; i <= k; i++) {
    const v = kind === 'rh' ? s.rh[i] : s.dp[i];
    const p = kind === 'rh' ? s.pred[i] : s.dpp[i];
    const sd = kind === 'rh' ? (s.sd[i] ?? 0) * 1.2816 : 0.3;
    data.push({ label: fmtTime(timeAt(meta, i), lang, { day: false, time: true }), v, p, band: p != null ? [p - sd, p + sd] : null, q: s.q[i] });
  }
  const lim = kind === 'rh' ? z.rh : z.dp;
  const vals = data.flatMap((d) => [d.v, ...(d.band ?? [])]).filter((x) => x != null) as number[];
  const lo = Math.floor(Math.min(lim[0] - 1, ...vals)), hi = Math.ceil(Math.max(lim[1] + 1, ...vals));
  const unit = kind === 'rh' ? '%RH' : 'Pa';
  const quarantined = data.findIndex((d) => d.q === 3);
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={tick} interval={15} tickLine={false} axisLine={{ stroke: C.grid }} />
          <YAxis domain={[lo, hi]} tick={tick} tickLine={false} axisLine={false} width={44} />
          <ReferenceArea y1={lim[0]} y2={lim[1]} fill="#E6F4EC" fillOpacity={0.55} />
          {quarantined >= 0 && <ReferenceArea x1={data[quarantined].label} x2={data[data.length - 1].label} fill="#FBE7E5" fillOpacity={0.6} />}
          <ReferenceLine y={lim[1]} stroke={C.limit} strokeDasharray="5 4" label={{ value: `${lim[1]}`, position: 'insideTopRight', fontSize: 11, fill: C.limit }} />
          <ReferenceLine y={lim[0]} stroke={C.limit} strokeDasharray="5 4" label={{ value: `${lim[0]}`, position: 'insideBottomRight', fontSize: 11, fill: C.limit }} />
          {kind === 'rh' && <Area dataKey="band" name={t('band')} stroke="none" fill={C.mint} fillOpacity={0.22} isAnimationActive={false} />}
          <Line dataKey="p" name={t('forecast_30')} stroke={C.mint} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey="v" name={kind === 'rh' ? t('rh') : t('dp')} stroke={C.teal} strokeWidth={2.4} dot={false} isAnimationActive={false} />
          <Tooltip content={<Tip unit={unit} />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EnergyDailyChart({ rows, kAdvDate, height = 280, showOpt = false }: { rows: any[]; kAdvDate: string; height?: number; showOpt?: boolean }) {
  const { t, lang } = useStore();
  const data = rows.map((r) => ({ ...r, label: `${+r.date.slice(8, 10)}/${+r.date.slice(5, 7)}`, base: r.hvac_kwh_baseline_mv / 1000, act: r.hvac_kwh_actual / 1000 }));
  const adv = data.find((d) => d.date >= kAdvDate)?.label;
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} barCategoryGap="22%">
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: C.grid }} interval={data.length > 16 ? 2 : 0} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={40} unit="" domain={[0, 16]} />
          {adv && <ReferenceArea x1={adv} x2={data[data.length - 1].label} fill="#E3F1F1" fillOpacity={0.6} label={{ value: t('mode_ADVISORY'), position: 'insideTopLeft', fontSize: 11, fill: C.teal }} />}
          <Bar dataKey="act" name={`${t('actual')} (MWh)`} fill={C.teal} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Line dataKey="base" name={`${t('baseline')} (MWh)`} stroke={C.ink} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          <Tooltip content={<Tip unit="MWh" />} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlantLoadChart({ meta, plant, k, hours = 48 }: { meta: Meta; plant: Record<string, number[]>; k: number; hours?: number }) {
  const { t, lang } = useStore();
  const from = Math.max(0, k - hours * 4 + 1);
  const data = [];
  for (let i = from; i <= k; i++) data.push({ label: fmtTime(timeAt(meta, i), lang, { day: true, time: true }), a: plant.actual[i], b: plant.baseline[i] });
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={tick} interval={47} tickLine={false} axisLine={{ stroke: C.grid }} tickFormatter={(v: string) => v.split(' ').slice(0, 2).join(' ')} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={42} domain={[200, 750]} />
          <Line dataKey="b" name={`${t('baseline')} (kW)`} stroke={C.base} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="a" name={`${t('actual')} (kW)`} stroke={C.teal} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          <Tooltip content={<Tip unit="kW" />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
