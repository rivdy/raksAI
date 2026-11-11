'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Wind, ShieldCheck, Activity, FileText, Check, Pause, Play } from 'lucide-react';
import { Logo } from '@/components/Logo';
import AirflowBackdrop from '@/components/AirflowBackdrop';
import { useStore } from '@/lib/store';
import './landing.css';

const stages = [
  { title: 'Baca kondisi.', en: 'Read the room.', text: 'Sensor suhu, kelembapan, dan tekanan menjadi titik awal prakiraan fisika 30 menit ke depan.', english: 'Temperature, humidity, and pressure readings inform a 30-minute physics forecast.', label: '01 / SENSOR & FORECAST', value: '49.4', unit: '% RH', detail: 'Kelembapan zona A1 · ilustrasi', detailEn: 'Zone A1 humidity · illustration' },
  { title: 'Uji usulan.', en: 'Test the proposal.', text: 'Bandingkan energi kipas pada setelan awal dan usulan. Safety gate memeriksa batas kondisi sebelum QA meninjau.', english: 'Compare baseline and proposed fan energy. The safety gate checks room limits before QA review.', label: '02 / PROPOSAL & SAFETY', value: '42', unit: 'Hz', detail: 'Usulan dari 43 Hz · ilustrasi', detailEn: 'Proposed from 43 Hz · illustration' },
  { title: 'Manusia memutuskan.', en: 'People decide.', text: 'Engineering mengusulkan, QA menyetujui. Perubahan diterapkan ke simulator BMS dan dicatat dalam jejak audit lokal.', english: 'Engineering proposes, QA approves. Changes go to the BMS simulator and enter the local audit trail.', label: '03 / QA & BMS SIMULATOR', value: 'QA', unit: 'review', detail: 'Persetujuan diperlukan', detailEn: 'Approval required' },
];
export default function Home() {
  const { lang, setLang } = useStore();
  const id = lang === 'id';
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    root.current?.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const current = stages[stage];
  return <div ref={root} className={`landing ${paused ? 'motion-paused' : ''}`}>
    <header className="landing-nav">
      <Link href="/" aria-label="RUAIX home"><Logo dark={false} /></Link>
      <nav aria-label={id ? 'Navigasi utama' : 'Main navigation'}><a href="#workflow">{id ? 'Cara kerja' : 'How it works'}</a><a href="#explore">{id ? 'Jelajahi MVP' : 'Explore MVP'}</a></nav>
      <div className="nav-actions"><button className="language-toggle" onClick={() => setLang(id ? 'en' : 'id')} aria-label={id ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}>{id ? 'EN' : 'ID'}</button><Link className="nav-login" href="/login">{id ? 'Masuk' : 'Sign in'} <ArrowUpRight size={15} /></Link></div>
    </header>
    <main>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow hero-enter"><span className="status-dot" /> ENERGY INTELLIGENCE / HUMAN CONTROL</div>
          <h1 className="hero-enter delay-one">{id ? 'Energi lebih bijak.' : 'Smarter energy.'}<br /><span>{id ? 'Kendali tetap' : 'Control stays'}<br />{id ? 'di tangan Anda.' : 'in your hands.'}</span></h1>
          <p className="hero-description hero-enter delay-two">{id ? 'Temukan peluang hemat energi HVAC cleanroom. Prakirakan kondisi, uji batas keselamatan, lalu putuskan bersama QA.' : 'Explore cleanroom HVAC energy savings. Forecast conditions, check safety limits, then decide with QA.'}</p>
          <div className="hero-actions hero-enter delay-two"><Link className="landing-button primary" href="/lab">{id ? 'Buka ruang kendali' : 'Open control room'} <ArrowUpRight size={19} /></Link><a className="text-link" href="#workflow">{id ? 'Lihat cara kerja' : 'See how it works'} <ArrowRight size={17} /></a></div>
          <div className="hero-note hero-enter delay-two"><ShieldCheck size={16} /> {id ? 'MVP lokal · Simulator BMS · Persetujuan manusia' : 'Local MVP · BMS simulator · Human approval'}</div>
        </div>
        <div className="hero-visual hero-enter delay-one">
          <div className="visual-orbit" aria-hidden="true" />
          <div className="control-panel">
            <div className="panel-top"><span><span className="status-dot" /> AERO-SENTINEL AX</span><span className="demo-tag">DEMO</span></div>
            <figure className="landing-airflow">
              <AirflowBackdrop className="landing-airflow-canvas" scale={1.1} lineAlpha={0.5} particleAlpha={0.75} ink="195,214,216" accent="60,194,174" speed={stage === 1 ? 42 / 43 : 1} sway={0.22} paused={paused} />
              <figcaption>{id ? 'Ilustrasi aliran udara ? HEPA ? return' : 'Airflow illustration ? HEPA ? return'}</figcaption>
            </figure>
            <div className="panel-label">{current.label}</div>
            <div key={stage} className="panel-reading"><strong>{current.value}</strong><span>{current.unit}</span></div>
            <p className="panel-detail">{id ? current.detail : current.detailEn}</p>
            <div className="chart-caption"><span>{id ? 'Prakiraan kelembapan' : 'Humidity forecast'}</span><span>+30 MIN</span></div>
            <svg className="hero-chart" viewBox="0 0 420 150" role="img" aria-label={id ? 'Ilustrasi grafik prakiraan kelembapan; bukan data langsung' : 'Illustrative humidity forecast; not live data'}>
              <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3CC2AE" stopOpacity=".24"/><stop offset="100%" stopColor="#3CC2AE" stopOpacity="0"/></linearGradient></defs>
              {[25,65,105,145].map(y => <path key={y} d={`M0 ${y}H420`} stroke="white" strokeOpacity=".08"/>)}
              <path d="M0 99L28 92L52 104L82 66L108 78L135 62L160 77L188 53L213 66L240 50L265 59L290 43L316 55L345 48L372 59L420 45V150H0Z" fill="url(#chart-fill)"/>
              <path className="forecast-line" d="M0 99L28 92L52 104L82 66L108 78L135 62L160 77L188 53L213 66L240 50L265 59L290 43L316 55L345 48L372 59L420 45" fill="none" stroke="#3CC2AE" strokeWidth="2.5" pathLength="1"/>
              <path d="M240 0V150" stroke="#3CC2AE" strokeOpacity=".35" strokeDasharray="4 6"/>
              <circle className="chart-pulse" cx="240" cy="50" r="5" fill="#3CC2AE"/>
            </svg>
            <div className="chart-axis"><span>14:00</span><span>14:15</span><span>14:30</span></div>
            <div className="panel-bottom"><ShieldCheck size={17}/><span>{id ? 'Safety gate sebelum setiap perubahan' : 'Safety gate before every change'}</span></div>
          </div>
          <div className="floating-note"><span className="note-icon"><Check size={17}/></span><div><strong>{id ? 'Anda yang menyetujui.' : 'You give the approval.'}</strong><span>{id ? 'AI membantu keputusan.' : 'AI supports the decision.'}</span></div></div>
          <button className="motion-toggle" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? <Play size={12}/> : <Pause size={12}/>} {paused ? (id ? 'Putar animasi' : 'Play motion') : (id ? 'Jeda animasi' : 'Pause motion')}</button>
        </div>
      </section>
      <section className="fact-strip" aria-label={id ? 'Lingkup prototipe' : 'Prototype scope'}><div><strong>30<span> min</span></strong><p>{id ? 'Horizon prakiraan' : 'Forecast horizon'}</p></div><div><strong>8<span> zones</span></strong><p>{id ? 'Dalam dataset sintetis' : 'In the synthetic dataset'}</p></div><div><strong>100<span>% local</span></strong><p>{id ? 'Ollama & simulator BMS' : 'Ollama & BMS simulator'}</p></div><p className="scope-note">{id ? 'Dibangun untuk menguji ide. Data simulasi, bukan hasil penghematan pabrik.' : 'Built to test an idea. Simulated data, not measured plant savings.'}</p></section>
      <section id="workflow" className="workflow landing-section" data-reveal>
        <div className="section-heading"><div><span className="eyebrow">01 / THE DECISION LOOP</span><h2>{id ? 'Dari pembacaan sensor' : 'From sensor reading'}<br/><span>{id ? 'ke keputusan yang tercatat.' : 'to a recorded decision.'}</span></h2></div><p>{id ? 'Setiap langkah punya alasan. Setiap perubahan membutuhkan orang yang bertanggung jawab.' : 'Every step has a reason. Every change needs an accountable person.'}</p></div>
        <div className="workflow-grid">{stages.map((item, i) => <button key={item.label} aria-pressed={stage === i} onClick={() => setStage(i)} className={`workflow-step ${stage === i ? 'selected' : ''}`}><div className="step-top"><span>0{i+1}</span>{i === 0 ? <Activity/> : i === 1 ? <Wind/> : <ShieldCheck/>}</div><h3>{id ? item.title : item.en}</h3><p>{id ? item.text : item.english}</p><span className="step-status">{stage === i ? (id ? 'Ditampilkan pada panel demo' : 'Shown in the demo panel') : (id ? 'Tampilkan pada panel demo' : 'Show in the demo panel')} <ArrowUpRight size={15}/></span></button>)}</div>
      </section>
      <section id="explore" className="explore landing-section" data-reveal>
        <div className="explore-intro"><span className="eyebrow">02 / BUILT TO BE EXAMINED</span><h2>{id ? 'Jangan hanya percaya.' : 'Go beyond the claim.'}<br/><span>{id ? 'Lihat dasarnya.' : 'Examine the evidence.'}</span></h2><p>{id ? 'Baca SOP, periksa prediksi, dan telusuri keputusan. Mulai dari bagian yang paling relevan untuk Anda.' : 'Read SOPs, inspect forecasts, and trace decisions. Start with what matters to you.'}</p><Link href="/dashboard" className="text-link">{id ? 'Jelajahi dashboard' : 'Explore the dashboard'} <ArrowRight size={17}/></Link></div>
        <div className="explore-links">{[
          { icon: Activity, name: id ? 'Evaluasi prediksi' : 'Forecast evaluation', desc: id ? 'Prakiraan vs aktual sintetis, RMSE, dan coverage.' : 'Forecasts vs synthetic observations, RMSE, and coverage.', href: '/predictions' },
          { icon: FileText, name: id ? 'SOP & AI Copilot' : 'SOP & AI Copilot', desc: id ? 'Tanyakan dokumen dengan rujukan ke sumbernya.' : 'Ask questions about documents with source references.', href: '/copilot' },
          { icon: ShieldCheck, name: id ? 'Laboratorium keputusan' : 'Decision lab', desc: id ? 'Usulkan, tinjau, dan terapkan ke simulator BMS.' : 'Propose, review, and apply to the BMS simulator.', href: '/lab' },
        ].map(item => <Link href={item.href} key={item.href} className="explore-link"><item.icon size={23}/><div><h3>{item.name}</h3><p>{item.desc}</p></div><ArrowUpRight className="link-arrow" size={22}/></Link>)}</div>
      </section>
      <section className="landing-cta" data-reveal><div className="cta-grid" aria-hidden="true"/><span className="eyebrow">LESS WASTE. MORE CLARITY.</span><h2>{id ? 'Langkah kecil pada setpoint.' : 'A small setpoint change.'}<br/>{id ? 'Awal keputusan yang lebih baik.' : 'A better-informed decision.'}</h2><Link href="/lab" className="landing-button light">{id ? 'Coba simulator' : 'Try the simulator'} <ArrowUpRight size={19}/></Link><p>{id ? 'Model fisika belum divalidasi di pabrik. Estimasi energi berlaku untuk kipas dalam simulasi.' : 'Physics model not yet validated in a plant. Energy estimates cover simulated fan operation.'}</p></section>
    </main>
    <footer className="landing-footer"><Logo dark={false}/><span>RUAIX © {new Date().getFullYear()} · LOCAL MVP</span><span>{id ? 'Dirancang untuk energi yang lebih bijak.' : 'Designed for more thoughtful energy use.'}</span></footer>
  </div>;
}
