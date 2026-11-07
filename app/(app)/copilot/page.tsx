'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useData, type Meta } from '@/lib/data';

export default function CopilotPage() {
  const { replayK } = useStore();
  const { data: meta, error: dataError } = useData<Meta>('meta.json');
  const [zone, setZone] = useState('A3');
  const [question, setQuestion] = useState('Jelaskan kondisi zona ini dan pemeriksaan yang perlu dilakukan Engineering.');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const k = replayK ?? meta?.snapshot_k;
  const stale = result && (result.context.zone !== zone || result.context.k !== k);
  async function analyze(demo: boolean) {
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, k, question, demo }), signal: AbortSignal.timeout(55000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Analisis gagal.');
      setResult(body);
    } catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Permintaan melewati batas waktu. Silakan coba lagi.'); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><p className="text-sm font-semibold text-teal-700">RUAIX / AI COPILOT</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Dari data zona ke langkah pemeriksaan.</h1>
      <p className="mt-3 text-steel">Tanyakan kondisi HVAC pada waktu replay yang dipilih. Jawaban AI disertai rujukan sensor, batas zona, dan keputusan gate.</p></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      Data simulasi, bukan hasil pabrik. Copilot memberi saran pemeriksaan untuk Engineering/QA; tidak menjalankan perintah BMS.
    </div>
    <form className="space-y-4 rounded-2xl border border-line bg-white p-6" onSubmit={e => { e.preventDefault(); analyze(false); }}>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm font-medium">Zona
          <select disabled={busy || !meta} className="mt-2 block rounded-lg border border-line p-3" value={zone} onChange={e => { setZone(e.target.value); setError(''); }}>
            {(meta?.zones ?? []).map(z => <option key={z.code} value={z.code}>{z.code} — {z.name_id}</option>)}
          </select>
        </label>
        <p className="pb-3 text-sm text-steel">Snapshot replay: {k ?? 'memuat…'} · interval 15 menit</p>
      </div>
      <label className="block text-sm font-medium">Pertanyaan
        <textarea required maxLength={1200} disabled={busy} rows={3} value={question} onChange={e => setQuestion(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line p-3 font-normal" />
      </label>
      <div className="flex flex-wrap gap-2">
        {['Mengapa zona ini perlu ditinjau?', 'Apa batasan data untuk keputusan penghematan energi?', 'Buat daftar pemeriksaan untuk handover QA.'].map(q =>
          <button type="button" disabled={busy} key={q} onClick={() => setQuestion(q)} className="rounded-full border border-line px-3 py-2 text-xs hover:bg-mist">{q}</button>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !meta || !question.trim()} className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Memproses…' : 'Analisis dengan AI'}</button>
        <button type="button" disabled={busy || !meta || !question.trim()} onClick={() => analyze(true)} className="rounded-lg border border-line px-5 py-3 text-sm disabled:opacity-50">Lihat contoh demo (tanpa AI)</button>
      </div>
      <p className="text-xs text-steel">Analisis AI mengirim pertanyaan dan snapshot zona ke OpenAI. Contoh demo hanya menjalankan aturan lokal.</p>
    </form>
    {(error || dataError) && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error || dataError}</div>}
    {busy && <p role="status" className="text-sm text-steel">Menyiapkan bukti dan analisis…</p>}
    {result && <section aria-live="polite" className="space-y-5 rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded bg-mist px-3 py-2">{result.mode === 'demo' ? 'DEMO BERBASIS ATURAN · BUKAN AI' : 'OPENAI · ' + result.model}</span>
        <span className="rounded bg-amber-50 px-3 py-2">Pemeriksaan aplikasi: {result.context.assessment}</span>
      </div>
      <p className="text-xs text-steel">Zona {result.context.zone} · {new Date(result.context.at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
      {stale && <p role="status" className="rounded bg-amber-50 p-3 text-sm">Pilihan zona/waktu telah berubah. Jalankan analisis lagi untuk snapshot baru.</p>}
      <h2 className="text-xl font-semibold">Ringkasan</h2><p className="whitespace-pre-wrap">{result.answer.summary}</p>
      <h3 className="font-semibold">Temuan dan bukti</h3>
      <ul className="space-y-3">{result.answer.findings.map((f: any, i: number) => <li key={i} className="rounded-lg bg-mist p-4">
        <p>{f.text}</p><div className="mt-2 flex gap-3 text-xs">{f.source_ids.map((id: string) => <a className="underline" key={id} href={'#source-' + id}>[{id}]</a>)}</div>
      </li>)}</ul>
      <h3 className="font-semibold">Langkah pemeriksaan</h3>
      <ol className="list-decimal space-y-2 pl-5">{result.answer.checks.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
      <h3 className="font-semibold">Batasan analisis</h3>
      <ul className="list-disc space-y-2 pl-5 text-sm text-steel">{result.answer.limitations.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
      <details className="border-t border-line pt-4"><summary className="cursor-pointer font-semibold">Lihat data sumber</summary>
        {result.context.sources.map((s: any) => <div key={s.id} id={'source-' + s.id} className="mt-4">
          <p className="text-sm font-semibold">[{s.id}] {s.file} · {s.detail}</p>
          <pre className="mt-2 overflow-auto rounded-lg bg-mist p-3 text-xs">{JSON.stringify(s.data, null, 2)}</pre>
        </div>)}
      </details>
    </section>}
  </div>;
}
