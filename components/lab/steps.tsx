'use client';
import type { ProcessStep } from './ProcessOverlay';

const n = (x: any, d = 2) => typeof x === 'number' ? x.toLocaleString('id-ID', { maximumFractionDigits: d }) : '—';
const ease = (p: number) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

export const MINT = '60,194,174', RED = '210,72,63';

type Limits = { t: [number, number]; rh: [number, number]; dp: [number, number] };

/** Apakah satu titik lintasan masih dalam batas zona setelah ditambah margin. */
export function pointPasses(pt: any, L: Limits, a: any) {
  return ([['temperature_c', L.t, a.temperature_margin_c], ['rh_pct', L.rh, a.rh_margin_pct], ['dp_pa', L.dp, a.dp_margin_pa]] as const)
    .every(([f, l, m]) => pt[f] - m >= l[0] && pt[f] + m <= l[1]);
}

/** nama field teknis dari server → bahasa biasa */
const readable = (x: string) => x.replace('temperature_c', 'suhu').replace('rh_pct', 'kelembapan').replace('dp_pa', 'beda tekanan');

const Pending = () => <span className="text-[#9DB7BA]">menghitung…</span>;

/** Tahap-tahap "Hitung prediksi & buat usulan" (total 5 detik). */
export function proposeSteps(zone: string, reading: any, limits: Limits, target: number, result: any): ProcessStep[] {
  const r = result;
  return [
    {
      title: `Membaca kondisi zona ${zone}`, ms: 900,
      body: p => {
        const items = [['Suhu', n(reading.temperature_c) + ' °C'], ['RH', n(reading.rh_pct) + ' %'], ['Beda tekanan', n(reading.dp_pa) + ' Pa'], ['Fan', n(reading.fan_hz) + ' Hz']];
        return <div className="grid grid-cols-2 gap-x-4 gap-y-1 num">
          {items.map(([k, v], i) => <div key={k} className="flex justify-between transition-opacity" style={{ opacity: p * 4 > i ? 1 : 0.15 }}><span>{k}</span><span className="text-white">{v}</span></div>)}
        </div>;
      },
    },
    {
      title: 'Menerapkan hukum fan', ms: 1000,
      body: p => {
        if (!r) return <Pending />;
        const ratio = target / reading.fan_hz;
        const lines = [
          <>Rasio frekuensi r = {n(target, 1)} / {n(reading.fan_hz, 1)} = <b className="text-white">{n(ratio, 3)}</b></>,
          <>Tekanan ≈ ΔP₀ × r² → <b className="text-white">{n(reading.dp_pa * ratio * ratio)} Pa</b></>,
          <>Daya fan ≈ P₀ × r³ → <b className="text-white">{n(r.energy.proposedKW)} kW</b> (dari {n(r.energy.baselineKW)} kW)</>,
        ];
        return <div className="space-y-1 num">{lines.map((l, i) => <div key={i} style={{ opacity: p * 3 > i ? 1 : 0.15 }}>{l}</div>)}</div>;
      },
    },
    {
      title: 'Mensimulasikan 30 menit ke depan', ms: 1300,
      body: p => {
        if (!r) return <Pending />;
        const tr = r.trajectory, m = Math.min(30, Math.round(ease(p) * 30)), pt = tr[m];
        // sketsa RH: batas zona sebagai pita, lintasan digambar sampai menit m
        const lo = Math.min(limits.rh[0], ...tr.map((x: any) => x.rh_pct)) - 1, hi = Math.max(limits.rh[1], ...tr.map((x: any) => x.rh_pct)) + 1;
        const y = (v: number) => 56 - ((v - lo) / (hi - lo)) * 52;
        const path = tr.slice(0, m + 1).map((x: any, i: number) => `${i ? 'L' : 'M'}${(x.minute / 30) * 236 + 2} ${y(x.rh_pct)}`).join(' ');
        return <div>
          <div className="num">Menit <b className="text-white">{m}</b>/30 · Suhu {n(pt.temperature_c)} °C · RH {n(pt.rh_pct)} % · ΔP {n(pt.dp_pa)} Pa</div>
          <svg viewBox="0 0 240 60" className="mt-2 h-14 w-full" aria-hidden>
            <rect x="2" y={y(limits.rh[1])} width="236" height={y(limits.rh[0]) - y(limits.rh[1])} fill="rgb(60,194,174)" opacity=".12" />
            <path d={path} fill="none" stroke="rgb(60,194,174)" strokeWidth="2" />
          </svg>
          <div className="text-[11px] text-[#7B8D94]">RH terhadap batas zona {n(limits.rh[0], 0)}–{n(limits.rh[1], 0)} %</div>
        </div>;
      },
    },
    {
      title: 'Memeriksa gate di 31 titik', ms: 1100,
      body: p => {
        if (!r) return <Pending />;
        const shown = Math.ceil(p * 31);
        const passes = r.trajectory.map((pt: any) => pointPasses(pt, limits, r.assumptions));
        const ok = passes.slice(0, shown).filter(Boolean).length;
        return <div>
          <div className="flex flex-wrap gap-[3px]">
            {passes.map((pass: boolean, i: number) => <span key={i} className="h-3 w-3 rounded-[2px] transition-colors"
              style={{ background: i < shown ? (pass ? 'rgb(60,194,174)' : 'rgb(210,72,63)') : 'rgba(255,255,255,.1)' }} />)}
          </div>
          <div className="mt-2 num"><b className="text-white">{ok}</b>/{shown} titik dalam batas + margin (±{n(r.assumptions.temperature_margin_c, 1)} °C, ±{n(r.assumptions.rh_margin_pct, 0)} % RH, ±{n(r.assumptions.dp_margin_pa, 1)} Pa)</div>
        </div>;
      },
    },
    {
      title: 'Menyusun usulan', ms: 700,
      body: () => {
        if (!r) return <Pending />;
        return r.gate.decision === 'LULUS'
          ? <div><b className="text-mint">Gate LULUS</b> → status PENDING. Usulan menunggu akun QA yang berbeda. Simulator belum diubah.</div>
          : <div><b className="text-[#F2A59E]">Gate TAHAN</b> → status BLOCKED, tidak bisa disetujui.
              <ul className="mt-1 list-disc pl-4">{r.gate.reasons.map((x: string) => <li key={x}>{readable(x)}</li>)}</ul></div>;
      },
    },
  ];
}

export function proposeHz(from: number, to: number) {
  return (step: number, p: number) => step === 0 ? from : step === 1 ? from + (to - from) * ease(p) : to;
}

/** Tahap-tahap "Setujui & jalankan di simulator" (±3,6 detik). */
export function approveSteps(item: any, reviewer: string, result: any): ProcessStep[] {
  const from = item.result.initial.fan_hz, to = item.targetHz;
  return [
    {
      title: 'Memeriksa ulang versi, gate, dan peran', ms: 800,
      body: () => <div className="num">Versi keadaan {item.baseVersion} · gate {item.result.gate.decision} · peninjau <b className="text-white">{reviewer}</b> ≠ pengusul {item.createdBy}</div>,
    },
    {
      title: 'Mengirim setpoint ke simulator BMS', ms: 900,
      body: p => <div className="font-mono text-[12px]">
        <div>WRITE {item.zone}/AHU fan_hz := {n(to, 1)} Hz</div>
        <div style={{ opacity: p > 0.6 ? 1 : 0.15 }} className="text-mint">ACK simulator</div>
      </div>,
    },
    {
      title: 'Fan menyesuaikan', ms: 1100,
      body: p => <div className="num">Kipas {n(from, 1)} → <b className="text-white">{n(from + (to - from) * ease(p), 1)} Hz</b>. Tekanan ruang mengikuti dalam beberapa menit (τ tekanan {n(item.result.assumptions.pressure_tau_minutes, 0)} menit).</div>,
    },
    {
      title: 'Menerima feedback & mencatat audit', ms: 800,
      body: () => result
        ? <div className="num">Feedback: <b className="text-white">{n(result.feedback?.fan_hz, 1)} Hz</b> · versi {result.feedback?.version ?? '—'}. Entri audit ditambahkan ke rantai hash.</div>
        : <Pending />,
    },
  ];
}

export function approveHz(from: number, to: number) {
  return (step: number, p: number) => step < 2 ? from : step === 2 ? from + (to - from) * ease(p) : to;
}
