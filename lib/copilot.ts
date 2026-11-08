import { readFile } from 'node:fs/promises';
import path from 'node:path';

export class CopilotError extends Error {
  status: number; constructor(status: number, message: string) { super(message); this.status = status; }
}
export function validateInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CopilotError(400, 'Input tidak valid.');
  const v = value as Record<string, unknown>;
  if (typeof v.zone !== 'string' || !/^[AB][1-4]$/.test(v.zone)) throw new CopilotError(400, 'Pilih zona A1–B4.');
  if (typeof v.question !== 'string' || !v.question.trim() || v.question.length > 1200) throw new CopilotError(400, 'Pertanyaan wajib diisi, maksimal 1.200 karakter.');
  if (v.k !== undefined && (!Number.isInteger(v.k) || (v.k as number) < 0)) throw new CopilotError(400, 'Waktu replay tidak valid.');
  if (v.demo !== undefined && typeof v.demo !== 'boolean') throw new CopilotError(400, 'Mode demo tidak valid.');
  return { zone: v.zone, question: v.question.trim(), k: v.k as number | undefined, demo: v.demo === true };
}
let dataset: Promise<any[]> | undefined;
export async function loadDataset() {
  if (!dataset) dataset = Promise.all(['meta', 'series', 'gates'].map(async name =>
    JSON.parse(await readFile(path.join(process.cwd(), 'public', 'data', name + '.json'), 'utf8'))
  )).catch(error => { dataset = undefined; throw error; });
  return dataset;
}
export function buildContext(data: any[], zoneCode: string, index?: number) {
  const [meta, series, gates] = data;
  const k = index ?? meta.snapshot_k;
  if (!Number.isInteger(k) || k < 0 || k >= meta.n) throw new CopilotError(400, 'Waktu di luar rentang simulasi.');
  const zone = meta.zones.find((z: any) => z.code === zoneCode);
  if (!zone) throw new CopilotError(400, 'Zona tidak ditemukan.');
  const s = series.zones[zoneCode], g = gates.zones[zoneCode];
  let gi = -1;
  for (let i = 0; i < g.k.length && g.k[i] <= k; i++) gi = i;
  const reasonCode = gi < 0 ? null : gates.reasons[g.r[gi]];
  const reason = reasonCode ? meta.reasons[reasonCode]?.id : null;
  const time = (at: number) => new Date(Date.parse(meta.start + '+07:00') + at * meta.step * 60000).toISOString();
  const snapshot = { rh_pct: s.rh[k], dp_pa: s.dp[k], temperature_c: s.t[k], fan_hz: s.hz[k], quality_code: s.q[k], critical_step: s.crit[k] === 1 };
  const missing = [snapshot.rh_pct, snapshot.dp_pa, snapshot.temperature_c, snapshot.quality_code].some(v => v == null || !Number.isFinite(v));
  const outside = !missing && (s.rh[k] < zone.rh[0] || s.rh[k] > zone.rh[1] || s.dp[k] < zone.dp[0] || s.dp[k] > zone.dp[1] || s.t[k] < zone.t[0] || s.t[k] > zone.t[1]);
  const recorded = gi < 0 ? 'TIDAK_TERSEDIA' : gates.decisions[g.d[gi]];
  const assessment = missing || s.q[k] !== 0 || outside || recorded === 'TAHAN' ? 'TAHAN' : recorded !== 'LULUS' || snapshot.critical_step || s.mode[k] === 4 ? 'TINJAU' : 'LULUS';
  const sources: { id: string; file: string; detail: string; data: any }[] = [
    { id: 'zone', file: 'meta.json', detail: zoneCode + ' — batas zona simulasi', data: { name: zone.name_id, rh_pct: zone.rh, dp_pa: zone.dp, temperature_c: zone.t } },
    { id: 'sensor', file: 'series.json', detail: zoneCode + ', indeks ' + k + ', ' + time(k), data: snapshot },
    { id: 'gate', file: 'gates.json', detail: gi < 0 ? 'Belum ada keputusan' : zoneCode + ', indeks ' + g.k[gi], data: { decision: recorded, at: gi < 0 ? null : time(g.k[gi]), reason_code: reasonCode, explanation: reason, mode: ['SHADOW', 'ADVISORY', 'SEMI_AUTO', 'FULL_AUTO', 'BMS_FALLBACK'][s.mode[k]] ?? 'UNKNOWN' } }
  ];
  return { zone: zoneCode, k, at: time(k), synthetic: true, assessment, missing, outside, sources };
}
export type Context = ReturnType<typeof buildContext>;
export const answerSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, source_ids: { type: 'array', items: { type: 'string', enum: ['zone', 'sensor', 'gate'] } } }, required: ['text', 'source_ids'] } },
    checks: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } }
  }, required: ['summary', 'findings', 'checks', 'limitations']
};
export function parseAnswer(response: any, allowedIds = ['zone', 'sensor', 'gate']) {
  if (response.status !== 'completed') throw new CopilotError(502, 'Jawaban AI belum lengkap. Silakan coba lagi.');
  const content = response.output?.filter((x: any) => x.type === 'message').flatMap((x: any) => x.content ?? []) ?? [];
  if (content.some((x: any) => x.type === 'refusal')) throw new CopilotError(422, 'AI tidak dapat menjawab permintaan ini. Coba pertanyaan tentang kondisi zona.');
  let result: any;
  try { result = JSON.parse(content.filter((x: any) => x.type === 'output_text').map((x: any) => x.text).join('')); }
  catch { throw new CopilotError(502, 'Format jawaban AI tidak valid.'); }
  const strings = (x: any) => Array.isArray(x) && x.every((s: any) => typeof s === 'string');
  if (!result || typeof result.summary !== 'string' || !strings(result.checks) || !strings(result.limitations) || !Array.isArray(result.findings) ||
    !result.findings.every((f: any) => f && typeof f.text === 'string' && strings(f.source_ids) && f.source_ids.length > 0 && f.source_ids.every((id: string) => allowedIds.includes(id)))) {
    throw new CopilotError(502, 'Jawaban AI tidak memiliki rujukan yang valid.');
  }
  return result;
}
export function demoAnswer(context: Context) {
  return {
    summary: 'Contoh analisis berbasis aturan untuk zona ' + context.zone + '. Status pemeriksaan: ' + context.assessment + '. Ini bukan jawaban AI dan tidak menafsirkan pertanyaan Anda.',
    findings: [
      { text: context.missing ? 'Ada data sensor yang hilang.' : context.outside ? 'Ada pengukuran di luar batas simulasi.' : 'Pengukuran tersedia dan berada dalam batas simulasi; tetap periksa mutu sensor dan gate.', source_ids: ['sensor', 'zone'] },
      { text: 'Keputusan gate historis: ' + context.sources[2].data.decision + '. Waktu gate dapat berbeda dari snapshot sensor.', source_ids: ['gate'] }
    ],
    checks: ['Periksa timestamp, kualitas dan kalibrasi sensor.', 'Minta Engineering/QA meninjau kondisi sebelum perubahan operasional.'],
    limitations: ['Seluruh data sintetis; bukan hasil pilot.', 'Penjelasan demo memakai template aturan tanpa model bahasa; prediksi fisika dihitung terpisah jika data tersedia.']
  };
}
