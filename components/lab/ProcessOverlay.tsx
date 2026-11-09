'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, FastForward } from 'lucide-react';
import AirflowBackdrop from '@/components/AirflowBackdrop';

export type ProcessStep = {
  title: string;
  /** durasi tahap dalam milidetik */
  ms: number;
  /** isi tahap; p = kemajuan tahap 0–1 */
  body?: (p: number) => React.ReactNode;
};

type Props = {
  title: string;
  subtitle: string;
  steps: ProcessStep[];
  /** false selama data dari server belum datang; animasi ditahan di tahap pertama */
  ready: boolean;
  /** frekuensi fan yang ditampilkan di ruang 3D untuk tahap & kemajuan tertentu */
  hzAt: (step: number, p: number) => number;
  hzNominal: number;
  /** warna aksen aliran udara, "r,g,b" */
  accentAt?: (step: number, p: number) => string;
  onDone: () => void;
};

/**
 * Jendela "ruang kendali" yang memperlihatkan langkah-langkah perhitungan satu per satu
 * sebelum hasil ditampilkan. Hanya tampilan: angka yang ditunjukkan berasal dari hasil server.
 */
export default function ProcessOverlay({ title, subtitle, steps, ready, hzAt, hzNominal, accentAt, onDone }: Props) {
  const total = steps.reduce((s, x) => s + x.ms, 0);
  const [elapsed, setElapsed] = useState(0);
  const readyRef = useRef(ready); readyRef.current = ready;
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone); onDoneRef.current = onDone;
  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDoneRef.current(); } };

  useEffect(() => {
    let raf = 0, last = performance.now(), e = 0;
    const hold = steps[0].ms * 0.9; // tunggu data di sini bila server belum menjawab
    const tick = (t: number) => {
      e += t - last; last = t;
      if (!readyRef.current) e = Math.min(e, hold);
      setElapsed(e);
      if (e >= total) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tahap aktif & kemajuannya
  let acc = 0, idx = 0, p = 0;
  for (let i = 0; i < steps.length; i++) {
    if (elapsed < acc + steps[i].ms || i === steps.length - 1) { idx = i; p = Math.min(1, Math.max(0, (elapsed - acc) / steps[i].ms)); break; }
    acc += steps[i].ms;
  }
  const hz = hzAt(idx, p);
  const overall = Math.min(1, elapsed / total);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label={title}>
    <div className="rise grid w-full max-w-[980px] overflow-hidden rounded-2xl bg-ink text-white shadow-pop md:grid-cols-[1.15fr_1fr]">
      {/* ruang 3D */}
      <div className="relative h-[240px] border-b border-white/10 md:h-auto md:min-h-[440px] md:border-b-0 md:border-r">
        <AirflowBackdrop className="absolute inset-0 h-full w-full" center={0.5} scale={0.62} lineAlpha={0.32} particleAlpha={0.45}
          ink="227,241,241" accent={accentAt ? accentAt(idx, p) : '60,194,174'} speed={hz / hzNominal} sway={0.35} />
        <div className="pointer-events-none absolute left-5 top-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mint">{subtitle}</div>
          <div className="mt-2 flex items-baseline gap-1.5 num"><span className="text-[44px] font-medium leading-none tracking-[-0.03em]">{hz.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span><span className="text-[15px] text-[#9DB7BA]">Hz</span></div>
          <div className="mt-1 text-[11.5px] text-[#9DB7BA]">frekuensi fan AHU</div>
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <div className="mb-1.5 flex justify-between text-[11px] text-[#9DB7BA] num"><span>{steps[idx].title}</span><span>{Math.round(overall * 100)}%</span></div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-mint" style={{ width: `${overall * 100}%` }} /></div>
        </div>
      </div>

      {/* langkah */}
      <div className="flex flex-col p-6">
        <div className="text-[18px] font-semibold">{title}</div>
        <ol className="mt-5 flex-1 space-y-1">
          {steps.map((s, i) => {
            const state = i < idx || overall >= 1 ? 'done' : i === idx ? 'active' : 'todo';
            return <li key={s.title} className={`rounded-lg px-3 py-2.5 transition-colors ${state === 'active' ? 'bg-white/[0.06]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${state === 'done' ? 'bg-mint text-ink' : state === 'active' ? 'border border-mint text-mint' : 'border border-white/20 text-white/40'}`}>
                  {state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-[14px] ${state === 'todo' ? 'text-white/40' : 'text-white'}`}>{s.title}</span>
                {state === 'active' && !ready && i === 0 && <span className="ml-auto text-[11px] text-[#9DB7BA]">menunggu server…</span>}
              </div>
              {state === 'active' && s.body && <div className="ml-9 mt-2 text-[12.5px] leading-relaxed text-[#C3D6D8]">{s.body(p)}</div>}
            </li>;
          })}
        </ol>
        <button type="button" onClick={finish} disabled={!ready} className="mt-4 inline-flex items-center gap-1.5 self-end text-[12px] text-[#9DB7BA] hover:text-white disabled:opacity-40">
          <FastForward className="h-3.5 w-3.5" /> Lewati animasi
        </button>
      </div>
    </div>
  </div>;
}
