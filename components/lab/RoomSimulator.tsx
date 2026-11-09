'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import AirflowBackdrop from '@/components/AirflowBackdrop';

const n = (x: number, d = 2) => x.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });

type Point = { minute: number; temperature_c: number; rh_pct: number; dp_pa: number };
type Limits = { t: [number, number]; rh: [number, number]; dp: [number, number]; hz_b: number };

const PLAY_MS = 9000; // 30 menit simulasi diputar dalam 9 detik

/** nilai lintasan pada menit pecahan (interpolasi linear) */
function at(tr: Point[], m: number): Point {
  const i = Math.min(tr.length - 2, Math.floor(m)), f = m - i, a = tr[i], b = tr[i + 1];
  const mix = (k: keyof Point) => a[k] + (b[k] - a[k]) * f;
  return { minute: m, temperature_c: mix('temperature_c'), rh_pct: mix('rh_pct'), dp_pa: mix('dp_pa') };
}

/**
 * Simulator hasil prediksi: ruang 3D berjalan pada frekuensi usulan,
 * pembacaan suhu/RH/tekanan diputar menit demi menit terhadap batas zona.
 */
export default function RoomSimulator({ result, limits, status, onMinute }: {
  result: any; limits: Limits; status: string; onMinute?: (m: number) => void;
}) {
  const tr: Point[] = result.trajectory;
  const a = result.assumptions;
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(true);
  const mRef = useRef(0);

  // putar ulang otomatis setiap kali hasil baru datang
  useEffect(() => { mRef.current = 0; setMinute(0); setPlaying(true); }, [result]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      mRef.current = Math.min(30, mRef.current + ((t - last) / PLAY_MS) * 30); last = t;
      setMinute(mRef.current);
      if (mRef.current >= 30) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => { onMinute?.(minute); }, [minute, onMinute]);

  const cur = at(tr, minute);
  const held = result.gate.decision === 'TAHAN';
  const frac = minute / 30;
  const e = result.energy;
  const gauges = [
    { label: 'Suhu', unit: '°C', v: cur.temperature_c, lim: limits.t, margin: a.temperature_margin_c, start: tr[0].temperature_c },
    { label: 'Kelembapan', unit: '% RH', v: cur.rh_pct, lim: limits.rh, margin: a.rh_margin_pct, start: tr[0].rh_pct },
    { label: 'Beda tekanan', unit: 'Pa', v: cur.dp_pa, lim: limits.dp, margin: a.dp_margin_pa, start: tr[0].dp_pa },
  ];

  return <div className="overflow-hidden rounded-xl bg-ink text-white">
    <div className="grid lg:grid-cols-[1.25fr_1fr]">
      {/* ruang 3D */}
      <div className="relative h-[300px] border-b border-white/10 lg:h-auto lg:min-h-[380px] lg:border-b-0 lg:border-r">
        <AirflowBackdrop className="absolute inset-0 h-full w-full" center={0.5} scale={0.66} lineAlpha={0.3} particleAlpha={0.42}
          ink="227,241,241" accent={held ? '210,72,63' : '60,194,174'} speed={result.targetHz / limits.hz_b} sway={0.4} />
        <div className="pointer-events-none absolute left-5 top-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mint">Simulator BMS · putar ulang prediksi</div>
          <div className="mt-2 flex items-baseline gap-1.5 num"><span className="text-[38px] font-medium leading-none tracking-[-0.03em]">{n(result.targetHz, 1)}</span><span className="text-[14px] text-[#9DB7BA]">Hz</span></div>
          <div className="mt-1 text-[11.5px] text-[#9DB7BA]">dari {n(result.initial.fan_hz, 1)} Hz · aliran udara melambat {n((1 - result.targetHz / result.initial.fan_hz) * 100, 1)}%</div>
        </div>
        <div className={`pointer-events-none absolute right-5 top-5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${held ? 'bg-hold/90 text-white' : 'bg-mint text-ink'}`}>
          Gate {result.gate.decision} · {status}
        </div>
        {/* jam simulasi */}
        <div className="pointer-events-none absolute bottom-5 left-5 num">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#9DB7BA]">waktu simulasi</div>
          <div className="text-[22px] font-medium">+{String(Math.floor(minute)).padStart(2, '0')}:{String(Math.floor((minute % 1) * 60)).padStart(2, '0')} <span className="text-[12px] text-[#9DB7BA]">/ 30:00</span></div>
        </div>
      </div>

      {/* pembacaan */}
      <div className="flex flex-col gap-4 p-5">
        {gauges.map(g => {
          const lo = g.lim[0], hi = g.lim[1], span = hi - lo;
          const pad = span * 0.15, min = lo - pad, max = hi + pad;
          const pos = (x: number) => `${Math.min(100, Math.max(0, ((x - min) / (max - min)) * 100))}%`;
          const ok = g.v - g.margin >= lo && g.v + g.margin <= hi;
          const delta = g.v - g.start;
          return <div key={g.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#9DB7BA]">{g.label}</span>
              <span className="num"><span className="text-[20px] font-medium">{n(g.v)}</span> <span className="text-[11px] text-[#9DB7BA]">{g.unit}</span>
                <span className={`ml-2 text-[11px] ${Math.abs(delta) < 0.005 ? 'text-[#9DB7BA]' : 'text-mint'}`}>{delta >= 0 ? '+' : ''}{n(delta)}</span></span>
            </div>
            {/* batas zona (hijau), margin (lebih gelap), posisi saat ini */}
            <div className="relative mt-2 h-2 rounded-full bg-white/10">
              <div className="absolute inset-y-0 rounded-full bg-mint/25" style={{ left: pos(lo), right: `calc(100% - ${pos(hi)})` }} />
              <div className="absolute inset-y-0 rounded-full bg-mint/40" style={{ left: pos(lo + g.margin), right: `calc(100% - ${pos(hi - g.margin)})` }} />
              <div className={`absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${ok ? 'bg-white' : 'bg-hold'}`} style={{ left: pos(g.v) }} />
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] text-[#7B8D94] num"><span>{n(lo, 1)}</span><span>{ok ? 'dalam batas + margin' : 'melewati batas + margin'}</span><span>{n(hi, 1)}</span></div>
          </div>;
        })}

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 num">
          {[['Fan baseline', e.baselineKWh * frac, 'text-white'], ['Fan usulan', e.candidateKWh * frac, 'text-white'], ['Selisih', e.savedKWh * frac, held ? 'text-[#F2A59E]' : 'text-mint']].map(([l, v, c]) =>
            <div key={l as string}><div className="text-[10.5px] text-[#9DB7BA]">{l}</div><div className={`text-[16px] font-medium ${c}`}>{n(v as number, 3)}</div><div className="text-[10px] text-[#7B8D94]">kWh</div></div>)}
        </div>
        {held && <p className="text-[11.5px] text-[#F2A59E]">Gate menahan usulan ini; selisih energi hanya untuk perbandingan dan tidak boleh diterapkan.</p>}
      </div>
    </div>

    {/* kontrol waktu */}
    <div className="flex items-center gap-3 border-t border-white/10 px-5 py-3">
      <button type="button" aria-label={playing ? 'Jeda' : 'Putar'} onClick={() => { if (mRef.current >= 30) { mRef.current = 0; setMinute(0); } setPlaying(!playing); }}
        className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
      <button type="button" aria-label="Ulang dari awal" onClick={() => { mRef.current = 0; setMinute(0); setPlaying(true); }}
        className="grid h-8 w-8 place-items-center rounded-full text-[#9DB7BA] hover:bg-white/10 hover:text-white"><RotateCcw className="h-4 w-4" /></button>
      <input type="range" min={0} max={30} step={0.1} value={minute} aria-label="Menit simulasi"
        onChange={ev => { setPlaying(false); mRef.current = Number(ev.target.value); setMinute(mRef.current); }}
        className="replay h-1 flex-1" />
      <span className="w-16 text-right text-[12px] text-[#9DB7BA] num">menit {Math.floor(minute)}</span>
    </div>
  </div>;
}
