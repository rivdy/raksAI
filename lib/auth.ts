import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { localPath } from './local-store';
import { HttpError, sameOrigin } from './http';

export const COOKIE = 'ruaix_session';
export type Role = 'ENGINEERING' | 'QA' | 'VIEWER';
export type User = { username: string; role: Role };
type AuthFile = { users: (User & { salt: string; hash: string })[] };
type Session = { user: User; expires: number };
const runtime = globalThis as typeof globalThis & { ruaixSessions?: Map<string, Session>; ruaixAttempts?: { count: number; until: number } };
const sessions = () => runtime.ruaixSessions ??= new Map();
export function hashPassword(password: string, salt: string) { return scryptSync(password, salt, 64).toString('hex'); }
export async function setupAuth() {
  await mkdir(path.dirname(localPath('auth.json')), { recursive: true });
  try { await readFile(localPath('auth.json')); return false; } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
  const entries = (['ENGINEERING', 'QA', 'VIEWER'] as Role[]).map(role => {
    const password = randomBytes(15).toString('base64url'), salt = randomBytes(16).toString('hex');
    return { username: role.toLowerCase(), role, password, salt, hash: hashPassword(password, salt) };
  });
  await writeFile(localPath('auth.json'), JSON.stringify({ users: entries.map(({ password, ...entry }) => entry) }), { mode: 0o600, flag: 'wx' });
  await writeFile(localPath('access.txt'), entries.map(x => x.username + ': ' + x.password).join('\n') + '\nPassword awal lokal. Jangan commit atau bagikan file ini.\n', { mode: 0o600, flag: 'wx' });
  return true;
}
export async function login(username: unknown, password: unknown) {
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 64 || password.length > 200) throw new HttpError(400, 'Input login tidak valid.');
  const now = Date.now();
  if (!runtime.ruaixAttempts || runtime.ruaixAttempts.until < now) runtime.ruaixAttempts = { count: 0, until: now + 60000 };
  if (++runtime.ruaixAttempts.count > 12) throw new HttpError(429, 'Terlalu banyak percobaan login. Tunggu satu menit.');
  let auth: AuthFile;
  try { auth = JSON.parse(await readFile(localPath('auth.json'), 'utf8')); }
  catch { throw new HttpError(503, 'Jalankan npm run setup:local terlebih dahulu.'); }
  const account = auth.users.find(u => u.username === username);
  const calculated = Buffer.from(hashPassword(password, account?.salt ?? 'invalid-account-salt'), 'hex');
  if (!account || !timingSafeEqual(calculated, Buffer.from(account.hash, 'hex'))) throw new HttpError(401, 'Nama pengguna atau password salah.');
  for (const [key, session] of sessions()) if (session.expires < now) sessions().delete(key);
  const token = randomBytes(32).toString('base64url');
  const user = { username: account.username, role: account.role };
  sessions().set(createHash('sha256').update(token).digest('hex'), { user, expires: now + 8 * 3600000 });
  return { user, token };
}
export function userFromToken(token: string | undefined): User | null {
  if (!token || token.length > 100) return null;
  const key = createHash('sha256').update(token).digest('hex'), session = sessions().get(key);
  if (!session) return null;
  if (session.expires < Date.now()) { sessions().delete(key); return null; }
  return session.user;
}
export function tokenFromRequest(request: Request) {
  return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
}
export function requireUser(request: Request, roles?: Role[]) {
  sameOrigin(request);
  const user = userFromToken(tokenFromRequest(request));
  if (!user) throw new HttpError(401, 'Silakan login terlebih dahulu.');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, 'Peran akun tidak diizinkan untuk tindakan ini.');
  return user;
}
export function logout(request: Request) {
  sameOrigin(request);
  const token = tokenFromRequest(request);
  if (token) sessions().delete(createHash('sha256').update(token).digest('hex'));
}
