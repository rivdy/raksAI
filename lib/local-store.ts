import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function localPath(file: string) { return path.join(process.env.RUAIX_DATA_DIR || path.join(process.cwd(), '.local'), file); }
export type AuditRow = { id: string; at: string; actor: string; action: string; payload: any; prev: string; hash: string };
export type State = { documents: any[]; zones: Record<string, any>; proposals: any[]; audit: AuditRow[] };
const empty = (): State => ({ documents: [], zones: {}, proposals: [], audit: [] });
export async function readState(): Promise<State> {
  try { return JSON.parse(await readFile(localPath('state.json'), 'utf8')); }
  catch (e: any) { if (e.code === 'ENOENT') return empty(); throw e; }
}
const queue = globalThis as typeof globalThis & { ruaixWriteQueue?: Promise<unknown> };
export function transaction<T>(work: (state: State) => T | Promise<T>): Promise<T> {
  const result = (queue.ruaixWriteQueue ?? Promise.resolve()).then(async () => {
    const state = await readState();
    const value = await work(state);
    await mkdir(path.dirname(localPath('state.json')), { recursive: true });
    const temporary = localPath('state.' + randomUUID() + '.tmp');
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, localPath('state.json'));
    return value;
  });
  queue.ruaixWriteQueue = result.catch(() => undefined);
  return result;
}
export function appendAudit(state: State, actor: string, action: string, payload: unknown) {
  const record = { id: randomUUID(), at: new Date().toISOString(), actor, action, payload, prev: state.audit.at(-1)?.hash ?? 'GENESIS' };
  state.audit.push({ ...record, hash: createHash('sha256').update(JSON.stringify(record)).digest('hex') });
}
export function verifyAudit(rows: AuditRow[]) {
  let prev = 'GENESIS';
  for (const { hash, ...record } of rows) {
    if (record.prev !== prev || createHash('sha256').update(JSON.stringify(record)).digest('hex') !== hash) return false;
    prev = hash;
  }
  return true;
}
