import { NextResponse } from 'next/server';
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function fail(error: any) { return json({ error: error?.status ? error.message : 'Permintaan gagal. Periksa konfigurasi dan data lokal.' }, error?.status || 500); }
export function sameOrigin(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Permintaan lintas situs ditolak.');
  const origin = request.headers.get('origin');
  if (!origin) return; // CLI clients without Origin still require credentials/session.
  const internal = new URL(request.url);
  let expected = internal.origin;
  const host = request.headers.get('host');
  if (host) {
    let publicUrl: URL;
    try {
      publicUrl = new URL(internal.protocol + '//' + host);
      if (publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) throw new Error();
    } catch { throw new HttpError(403, 'Host tidak valid.'); }
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    const localAlias = loopback.has(internal.hostname) && loopback.has(publicUrl.hostname) && internal.port === publicUrl.port;
    // Next can reconstruct request.url as localhost while the browser uses 127.0.0.1.
    // Trust Host only for the same internal authority or a loopback alias on the same port.
    if (publicUrl.origin !== internal.origin && !localAlias) throw new HttpError(403, 'Host tidak diizinkan.');
    expected = publicUrl.origin;
  }
  if (origin !== expected) throw new HttpError(403, 'Origin tidak diizinkan.');
}

export async function body(request: Request, limit = 8192): Promise<any> {
  sameOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Gunakan application/json.');
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'Input terlalu besar.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Input kosong.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Input terlalu besar.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'JSON tidak valid.'); }
}
