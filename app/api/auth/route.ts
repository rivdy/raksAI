import { COOKIE, login, logout, requireUser } from '@/lib/auth';
import { body, fail, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try { return json({ user: requireUser(request) }); } catch (e) { return fail(e); } }
export async function POST(request: Request) {
  try {
    const input = await body(request);
    const { user, token } = await login(input?.username, input?.password);
    const result = json({ user });
    result.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 8 * 3600 });
    return result;
  } catch (e) { return fail(e); }
}
export async function DELETE(request: Request) {
  try { logout(request); const result = json({ ok: true }); result.cookies.set(COOKIE, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 }); return result; }
  catch (e) { return fail(e); }
}
