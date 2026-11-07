'use client';
import { useEffect, useState } from 'react';

export type Decision = 'LULUS' | 'TINJAU' | 'TAHAN';
export const MODES = ['SHADOW', 'ADVISORY', 'SEMI_AUTO', 'FULL_AUTO', 'BMS_FALLBACK'] as const;
export type Mode = (typeof MODES)[number];

export interface Zone {
  code: string; name_en: string; name_id: string; cls: string; iso: string; rh: [number, number]; dp: [number, number]; t: [number, number];
  ahus: string[]; hz_b: number; hz_min: number; row: number; col: number; sched: string; building: 'OSD' | 'WQ';
}
export interface ReasonText { title: string; msg: string; action: string }
export interface Reason { decision: Decision; cat: string; order: number; sev: string; en: ReasonText; id: ReasonText }
export interface Persona { user_id: string; full_name: string; email: string; role: string; title: string; nav: string[]; permissions: string[] }
export interface Meta {
  start: string; step: number; n: number; k_adv: number; snapshot_k: number; snapshot_label: string; zones: Zone[];
  reasons: Record<string, Reason>; personas: Persona[]; scenarios: any[]; tariff: number; ef: number; users: Record<string, { name: string; role: string }>;
}
export interface ZoneSeries { rh: number[]; dp: number[]; t: number[]; hz: number[]; sat: number[]; mode: number[]; occ: number[]; pred: (number | null)[]; sd: (number | null)[]; dpp: (number | null)[]; q: number[]; crit: number[] }
export interface Series { zones: Record<string, ZoneSeries>; plant: Record<string, number[]>; missing: number[] }
export interface ZoneGates { k: number[]; d: number[]; r: number[]; m: (number | null)[]; s: number[]; f: number[]; to: number[]; e: number[] }
export interface Gates { rec_status: string[]; decisions: Decision[]; reasons: string[]; zones: Record<string, ZoneGates> }
export interface AuditEvent {
  seq: number; at: string; action: string; role: string; actor: string | null; actor_user_id: string | null; entity_type: string; entity_id: string | null;
  payload: string; prev: string | null; hash: string; tenant_id: string; local?: boolean;
}

const cache = new Map<string, Promise<any>>();
export function load<T = any>(name: string): Promise<T> {
  if (!cache.has(name)) cache.set(name, fetch(`/data/${name}`).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${name} (${r.status})`);
    return r.json();
  }));
  return cache.get(name)!;
}
export function useData<T = any>(name: string | null): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    let alive = true;
    load<T>(name).then((d) => alive && setData(d)).catch((e) => alive && setError(String(e.message || e)));
    return () => { alive = false; };
  }, [name]);
  return { data, error };
}

// ---------- time helpers (all times are plant local time, UTC+7)
export function timeAt(meta: Meta, k: number): Date {
  const [d, t] = meta.start.split('T');
  const [Y, M, D] = d.split('-').map(Number);
  const [h, m] = t.split(':').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, h, m) + k * meta.step * 60000);
}
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
const DOW = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] };
export function fmtTime(d: Date, lang: 'en' | 'id', opts: { day?: boolean; time?: boolean; dow?: boolean } = { day: true, time: true }) {
  const p = (n: number) => String(n).padStart(2, '0');
  const parts: string[] = [];
  if (opts.dow) parts.push(DOW[lang][d.getUTCDay()]);
  if (opts.day !== false) parts.push(`${d.getUTCDate()} ${MON[lang][d.getUTCMonth()]}`);
  if (opts.time !== false) parts.push(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`);
  return parts.join(' ');
}
export function fmtIso(s: string | null | undefined, lang: 'en' | 'id', withSec = false) {
  if (!s) return '—';
  const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16), +s.slice(17, 19)));
  const base = fmtTime(d, lang);
  return withSec ? `${base}:${s.slice(17, 19)}` : base;
}
export const nf = (v: number | null | undefined, d = 1, lang: 'en' | 'id' = 'en') =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const rp = (v: number, lang: 'en' | 'id' = 'en') => {
  const a = Math.abs(v);
  if (a >= 1e9) return `Rp${nf(v / 1e9, 2, lang)} ${lang === 'id' ? 'M' : 'B'}`;
  if (a >= 1e6) return `Rp${nf(v / 1e6, 1, lang)} ${lang === 'id' ? 'jt' : 'M'}`;
  return `Rp${nf(v, 0, lang)}`;
};

// ---------- status at a moment
export function lastGateIndex(g: ZoneGates, k: number) {
  let lo = 0, hi = g.k.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (g.k[mid] <= k) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
export function zoneStatus(z: Zone, s: ZoneSeries, g: ZoneGates, gates: Gates, k: number) {
  const i = lastGateIndex(g, k);
  const dec: Decision = i >= 0 ? gates.decisions[g.d[i]] : 'LULUS';
  const reason = i >= 0 ? gates.reasons[g.r[i]] : 'ALL_CHECKS_PASSED';
  const rh = s.rh[k], dp = s.dp[k];
  const outside = rh != null && dp != null && (rh > z.rh[1] || rh < z.rh[0] || dp < z.dp[0] || dp > z.dp[1]) && s.q[k] === 0;
  const mode = MODES[s.mode[k]] as Mode;
  let status: Decision = 'LULUS';
  if (outside || dec === 'TAHAN' || s.q[k] === 3) status = 'TAHAN';
  else if (dec === 'TINJAU' || mode === 'BMS_FALLBACK' || s.q[k] === 1) status = 'TINJAU';
  return { status, dec, reason, gi: i, outside, mode, rh, dp, t: s.t[k], hz: s.hz[k], occ: s.occ[k], quality: s.q[k] };
}
