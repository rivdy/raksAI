'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Gauge, LineChart, SlidersHorizontal, ShieldCheck, PenLine, Server, Lock, FlaskConical, ClipboardCheck, HardHat, Wallet, Search } from 'lucide-react';
import { Logo } from '@/components/Shell';
import { useStore } from '@/lib/store';
import { useData, type Meta } from '@/lib/data';

const COPY = {
  en: {
    h1: 'Save cleanroom energy without putting a batch at risk.',
    lead: 'RUAIX forecasts humidity and pressure 30 minutes ahead and proposes leaner HVAC settings. A deterministic safety gate checks each proposal, and nothing reaches the BMS without a signed approval. Every step is sealed for the auditor.',
    cta2: 'See how it works',
    chain: ['Sensors', 'Forecast', 'Proposal', 'Safety gate', 'Signed approval', 'BMS', 'Sealed record'],
    chainNote: 'One decision, end to end. Open any decision in the prototype to see this chain with real values and hashes.',
    who: 'Start where your work starts',
    personas: {
      QA: ['QA pharmacist', 'Review held decisions, sign or reject proposals, and close CAPA.', '/approvals'],
      ENGINEERING: ['HVAC engineer', 'See forecasts per zone and approve energy-saving setpoints.', '/dashboard'],
      CFO: ['CFO', 'See verified savings, the energy share, and the payback for a plant.', '/energy'],
      AUDITOR: ['Auditor', 'Verify the hash-sealed record and trace any decision to its source.', '/audit'],
    } as Record<string, [string, string, string]>,
    painH: 'What blocks plants today, and what changes',
    pains: [
      ['QA vetoes every energy change, because nobody can prove it is safe.', 'Each proposal passes four deterministic checks and needs a signed approval. Pass, Review or Hold, with the reason in plain words.'],
      ['Deviations take weeks to investigate, from paper and BMS exports.', 'Every reading, forecast, decision and command is linked. CAPA starts from an AI draft that QA must review.'],
      ['Energy claims are not trusted by finance.', 'Savings are measured against an IPMVP baseline adjusted for weather and production, then verified weekly.'],
      ['AI in a GMP plant feels like a black box.', 'Models are frozen and versioned under change control, autonomy rises one mode at a time, and any fault falls back to the BMS.'],
    ],
    foot: 'Prototype with a simulated 28-day pilot (fictional plant, 8 zones, 20 AHUs). Numbers are illustrative, not plant results.',
  },
  id: {
    h1: 'Hemat energi cleanroom tanpa mempertaruhkan satu batch pun.',
    lead: 'RUAIX meramal kelembapan dan tekanan 30 menit ke depan lalu mengusulkan setelan HVAC yang lebih hemat. Safety gate deterministik memeriksa setiap usulan, dan tidak ada yang sampai ke BMS tanpa persetujuan bertanda tangan. Setiap langkah disegel untuk auditor.',
    cta2: 'Lihat cara kerjanya',
    chain: ['Sensor', 'Prakiraan', 'Usulan', 'Safety gate', 'Persetujuan', 'BMS', 'Catatan tersegel'],
    chainNote: 'Satu keputusan dari ujung ke ujung. Buka keputusan mana pun di prototipe untuk melihat rantai ini dengan nilai dan hash nyata.',
    who: 'Mulai dari pekerjaan Anda',
    personas: {
      QA: ['Apoteker QA', 'Tinjau keputusan TAHAN, setujui atau tolak usulan, dan tutup CAPA.', '/approvals'],
      ENGINEERING: ['Engineer HVAC', 'Lihat prakiraan per zona dan setujui setpoint hemat energi.', '/dashboard'],
      CFO: ['CFO', 'Lihat penghematan terverifikasi, bagi hasil, dan balik modal per pabrik.', '/energy'],
      AUDITOR: ['Auditor', 'Verifikasi catatan bersegel hash dan telusuri keputusan sampai sumbernya.', '/audit'],
    } as Record<string, [string, string, string]>,
    painH: 'Penghambat pabrik hari ini, dan apa yang berubah',
    pains: [
      ['QA memveto setiap perubahan energi karena tidak ada yang bisa membuktikan aman.', 'Setiap usulan melewati empat pemeriksaan deterministik dan butuh persetujuan bertanda tangan. LULUS, TINJAU, atau TAHAN, dengan alasan yang mudah dipahami.'],
      ['Investigasi deviasi makan berminggu-minggu dari kertas dan ekspor BMS.', 'Setiap pembacaan, prakiraan, keputusan, dan perintah saling tertaut. CAPA dimulai dari draf AI yang wajib ditinjau QA.'],
      ['Klaim penghematan tidak dipercaya bagian keuangan.', 'Penghematan diukur terhadap baseline IPMVP yang disesuaikan cuaca dan produksi, lalu diverifikasi mingguan.'],
      ['AI di pabrik CPOB terasa seperti kotak hitam.', 'Model dibekukan dan berversi lewat change control, otonomi naik satu mode demi satu, dan setiap gangguan kembali ke BMS.'],
    ],
    foot: 'Prototipe dengan pilot simulasi 28 hari (pabrik fiktif, 8 zona, 20 AHU). Angka bersifat ilustrasi, bukan hasil pabrik.',
  },
};
const CHAIN_ICONS = [Gauge, LineChart, SlidersHorizontal, ShieldCheck, PenLine, Server, Lock];
const P_ICONS: Record<string, any> = { QA: ClipboardCheck, ENGINEERING: HardHat, CFO: Wallet, AUDITOR: Search };

export default function Home() {
  const { lang, setLang, setPersona, t } = useStore();
  const { data: meta } = useData<Meta>('meta.json');
  const router = useRouter();
  const c = COPY[lang];
  const start = (role: string) => {
    const p = meta?.personas.find((x) => x.role === role);
    if (p) setPersona(p);
    router.push(c.personas[role][2]);
  };
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5">
        <Logo dark={false} />
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 rounded-md bg-info-bg px-2 py-1 text-[12px] font-medium text-info sm:inline-flex"><FlaskConical className="h-3.5 w-3.5" />{t('sim_badge')}</span>
          <div className="flex overflow-hidden rounded-lg ring-1 ring-line">
            {(['en', 'id'] as const).map((l) => <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={clsx('px-2.5 py-1.5 text-[12px] font-semibold', lang === l ? 'bg-ink text-white' : 'text-steel')}>{l.toUpperCase()}</button>)}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-6 pb-12 pt-8">
        <h1 className="max-w-[17ch] text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[52px]">{c.h1}</h1>
        <p className="mt-5 max-w-[66ch] text-[16.5px] leading-relaxed text-steel">{c.lead}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-lg bg-teal px-5 py-3 text-[15px] font-semibold text-white hover:bg-teal-600">{t('home_cta')}</Link>
          <Link href="/how-it-works" className="rounded-lg px-5 py-3 text-[15px] font-semibold text-ink ring-1 ring-line hover:bg-mist">{c.cta2}</Link>
        </div>

        <figure className="mt-12 rounded-2xl bg-ink p-5 text-white sm:p-7">
          <ol className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
            {c.chain.map((s, i) => {
              const Icon = CHAIN_ICONS[i];
              return (
                <li key={s} className="relative flex flex-col items-center text-center">
                  {i < c.chain.length - 1 && <span aria-hidden className="absolute left-[calc(50%+26px)] right-[calc(-50%+26px)] top-[22px] hidden h-px bg-mint/50 lg:block" />}
                  <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', i === 3 ? 'bg-mint text-ink' : 'bg-white/10 text-mint')}><Icon className="h-5 w-5" /></span>
                  <span className="mt-2 text-[13px] font-medium">{s}</span>
                  <span className="mt-0.5 text-[11px] text-[#8FB0B4] num">{['RH 49.4 %', '+30 min', '47 → 43 Hz', 'Pass', 'e-sign', 'ACK 2.1 s', 'sha-256'][i]}</span>
                </li>
              );
            })}
          </ol>
          <figcaption className="mt-6 border-t border-white/10 pt-4 text-[13px] text-[#C3D6D8]">{c.chainNote}</figcaption>
        </figure>
      </section>

      <section className="border-y border-line bg-mist">
        <div className="mx-auto max-w-[1180px] px-6 py-12">
          <h2 className="text-[22px] font-semibold">{c.who}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(c.personas).map(([role, [title, job]]) => {
              const Icon = P_ICONS[role];
              const p = meta?.personas.find((x) => x.role === role);
              return (
                <button key={role} onClick={() => start(role)} className="group rounded-xl bg-white p-5 text-left shadow-card transition-shadow hover:shadow-pop">
                  <Icon className="h-6 w-6 text-teal" />
                  <div className="mt-3 text-[16px] font-semibold">{title}</div>
                  <div className="mt-1 text-[13.5px] leading-relaxed text-steel">{job}</div>
                  {p && <div className="mt-4 text-[12px] text-steel-400">{p.full_name}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <h2 className="text-[22px] font-semibold">{c.painH}</h2>
        <div className="mt-5 divide-y divide-line rounded-xl ring-1 ring-line">
          {c.pains.map(([p, a]) => (
            <div key={p} className="grid gap-2 p-5 md:grid-cols-2 md:gap-8">
              <p className="text-[15px] text-steel">{p}</p>
              <p className="text-[15px] font-medium">{a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[12.5px] text-steel">{c.foot}</p>
      </section>
    </div>
  );
}
