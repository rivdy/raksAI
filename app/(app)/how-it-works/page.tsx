'use client';
import Link from 'next/link';
import { Gauge, LineChart, ShieldCheck, ClipboardCheck, Eye, Hand, Cpu, Workflow } from 'lucide-react';
import { Card, PageHead } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useData, type Meta } from '@/lib/data';

const C = {
  en: {
    sub: 'Four steps, two safety principles and one rule: nothing changes in the plant without proof and a signature.',
    steps: [['Read', 'Cleanroom sensors and HVAC points are read every minute through a read-only gateway in the plant.'],
      ['Forecast', 'A physics-informed model forecasts humidity and pressure 30 minutes ahead, with an uncertainty band.'],
      ['Check', 'A deterministic safety gate checks data health, the safety margin, the worst case and plant rules. Result: Pass, Review or Hold.'],
      ['Approve & record', 'In Advisory mode a person signs every change. Each step is sealed into an append-only, hash-chained record.']],
    modesH: 'Autonomy rises one step at a time',
    modes: [['Shadow', 'The AI only watches and forecasts. 30 days, read-only.'], ['Advisory', 'The AI proposes; Engineering or QA signs every change.'], ['Semi-auto', 'Small changes inside the qualified range run automatically.'], ['Full-auto', 'Only after PQ and written QA acceptance.']],
    safeH: 'Built to fail safe',
    safe: ['The AI never writes to the PLC; only a restricted adapter at the edge can, after approval.', 'Any fault, lost link or quarantined sensor sends the zone back to the qualified static BMS settings.', 'Models are frozen per version (GAMP 5 category 5 component) and replaced only through change control.', 'Zone limits and fan ranges come from the site URS and qualification, approved by QA.'],
    scenH: 'What is in this 28-day replay', open: 'Open the command center',
  },
  id: {
    sub: 'Empat langkah, dua prinsip keselamatan, dan satu aturan: tidak ada yang berubah di pabrik tanpa bukti dan tanda tangan.',
    steps: [['Baca', 'Sensor cleanroom dan titik HVAC dibaca tiap menit lewat gateway read-only di pabrik.'],
      ['Ramal', 'Model berbasis fisika meramal kelembapan dan tekanan 30 menit ke depan, lengkap dengan rentang ketidakpastian.'],
      ['Periksa', 'Safety gate deterministik memeriksa kesehatan data, margin keselamatan, skenario terburuk, dan aturan pabrik. Hasil: LULUS, TINJAU, atau TAHAN.'],
      ['Setujui & catat', 'Di mode Advisory, setiap perubahan ditandatangani manusia. Setiap langkah disegel dalam catatan append-only berantai hash.']],
    modesH: 'Otonomi naik satu langkah demi satu',
    modes: [['Shadow', 'AI hanya mengamati dan meramal. 30 hari, read-only.'], ['Advisory', 'AI mengusulkan; Engineering atau QA menandatangani setiap perubahan.'], ['Semi-auto', 'Perubahan kecil di dalam rentang terkualifikasi berjalan otomatis.'], ['Full-auto', 'Hanya setelah PQ dan penerimaan tertulis QA.']],
    safeH: 'Dirancang gagal dengan aman',
    safe: ['AI tidak pernah menulis ke PLC; hanya adapter terbatas di edge yang boleh, setelah disetujui.', 'Setiap gangguan, koneksi putus, atau sensor dikarantina mengembalikan zona ke setelan BMS statis yang terkualifikasi.', 'Model dibekukan per versi (komponen GAMP 5 kategori 5) dan hanya diganti lewat change control.', 'Batas zona dan rentang fan berasal dari URS dan kualifikasi site, disetujui QA.'],
    scenH: 'Isi replay 28 hari ini', open: 'Buka command center',
  },
};
const IC = [Gauge, LineChart, ShieldCheck, ClipboardCheck];
const MIC = [Eye, Hand, Cpu, Workflow];

export default function How() {
  const { t, lang } = useStore();
  const { data: meta } = useData<Meta>('meta.json');
  const c = C[lang];
  return (
    <div>
      <PageHead title={t('how_title')} sub={c.sub} right={<Link href="/dashboard" className="rounded-lg bg-teal px-4 py-2 text-[13.5px] font-semibold text-white">{c.open}</Link>} />
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {c.steps.map(([h, p], i) => { const Icon = IC[i]; return (
          <li key={h}><Card className="h-full p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-white"><Icon className="h-5 w-5" /></span><span className="text-[12px] text-steel">{i + 1}/4</span></div>
            <h2 className="mt-3 text-[17px] font-semibold">{h}</h2><p className="mt-1 text-[13.5px] leading-relaxed text-steel">{p}</p></Card></li>); })}
      </ol>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5"><h2 className="text-[16px] font-semibold">{c.modesH}</h2>
          <ol className="mt-3 flex flex-col gap-2">{c.modes.map(([h, p], i) => { const Icon = MIC[i]; return (
            <li key={h} className="flex gap-3 rounded-lg p-3" style={{ background: ['#EEF4F4', '#E3F1F1', '#E8EFF6', '#E6EEF0'][i], marginLeft: i * 14 }}><Icon className="mt-0.5 h-5 w-5 flex-none text-teal" /><div><b>{h}</b><p className="text-[13px] text-steel">{p}</p></div></li>); })}</ol></Card>
        <Card className="p-5"><h2 className="text-[16px] font-semibold">{c.safeH}</h2>
          <ul className="mt-3 space-y-3">{c.safe.map((s) => <li key={s} className="flex gap-3 text-[13.5px]"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-teal" />{s}</li>)}</ul></Card>
      </div>
      {meta && <Card className="mt-5 p-5"><h2 className="text-[16px] font-semibold">{c.scenH}</h2>
        <ul className="mt-3 grid gap-x-8 md:grid-cols-2">{meta.scenarios.map((s: any) => (
          <li key={s.scenario_id} className="border-t border-line py-2.5 text-[13px]"><b>{s.scenario_id}</b> · {lang === 'en' ? s.title_en : s.title}<div className="text-steel">{lang === 'en' ? s.behavior_en : s.expected_system_behavior}</div></li>))}</ul>
</Card>}
    </div>
  );
}
