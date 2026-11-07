import type { AuditEvent } from './data';

/** Canonical JSON identical to the backend (Python json.dumps(sort_keys=True, separators=(',', ':'), ensure_ascii=False)). */
export function canonical(e: AuditEvent): string {
  const s = (v: string | null) => (v == null ? 'null' : JSON.stringify(v));
  return `{"action":${s(e.action)},"actor_user_id":${s(e.actor_user_id)},"chain_seq":${e.seq},"entity_id":${s(e.entity_id)},` +
    `"entity_type":${s(e.entity_type)},"event_at":${s(e.at)},"event_payload":${e.payload},"tenant_id":${s(e.tenant_id)}}`;
}
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export interface VerifyResult { seq: number; hashOk: boolean; linkOk: boolean }
/** Recomputes each hash from its own content + prev_hash, and checks links between consecutive events in the list. */
export async function verifyEvents(events: AuditEvent[]): Promise<VerifyResult[]> {
  const out: VerifyResult[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const h = await sha256((e.prev ?? '') + canonical(e));
    const prev = events[i - 1];
    const linkOk = !prev || prev.seq !== e.seq - 1 || prev.hash === e.prev;
    out.push({ seq: e.seq, hashOk: h === e.hash, linkOk });
  }
  return out;
}
export async function sealNew(prev: AuditEvent, partial: Omit<AuditEvent, 'seq' | 'prev' | 'hash'>): Promise<AuditEvent> {
  const ev: AuditEvent = { ...partial, seq: prev.seq + 1, prev: prev.hash, hash: '' };
  ev.hash = await sha256((ev.prev ?? '') + canonical(ev));
  return ev;
}
export function sortKeysJson(o: any): string {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return `[${o.map(sortKeysJson).join(',')}]`;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${sortKeysJson(o[k])}`).join(',')}}`;
}
