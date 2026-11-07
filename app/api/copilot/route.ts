import { NextResponse } from 'next/server';
import { buildContext, CopilotError, demoAnswer, generateAnswer, loadDataset, validateInput } from '@/lib/copilot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
let inFlight = 0;
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new CopilotError(403, 'Origin tidak diizinkan.');
    if (!request.headers.get('content-type')?.includes('application/json')) throw new CopilotError(415, 'Gunakan application/json.');
    if (Number(request.headers.get('content-length')) > 8192) throw new CopilotError(413, 'Input terlalu besar.');
    const reader = request.body?.getReader();
    if (!reader) throw new CopilotError(400, 'Input kosong.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) { await reader.cancel(); throw new CopilotError(413, 'Input terlalu besar.'); }
      chunks.push(value);
    }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new CopilotError(400, 'JSON tidak valid.'); }
    const input = validateInput(raw);
    const context = buildContext(await loadDataset(), input.zone, input.k);
    if (input.demo) return NextResponse.json({ mode: 'demo', context, answer: demoAnswer(context) }, { headers });
    if (!process.env.OPENAI_API_KEY) throw new CopilotError(503, 'API key belum dikonfigurasi. Isi OPENAI_API_KEY di .env.local atau gunakan contoh demo.');
    if (inFlight >= 2) throw new CopilotError(429, 'Dua analisis sedang berjalan. Coba lagi sebentar.');
    inFlight++;
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const answer = await generateAnswer(context, input.question, { apiKey: process.env.OPENAI_API_KEY, model });
      return NextResponse.json({ mode: 'live', model, context, answer }, { headers });
    } finally { inFlight--; }
  } catch (error) {
    return NextResponse.json({ error: error instanceof CopilotError ? error.message : 'Analisis gagal. Periksa data aplikasi di server.' },
      { status: error instanceof CopilotError ? error.status : 500, headers });
  }
}
