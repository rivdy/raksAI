'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import CleanroomStory from '@/components/demo/CleanroomStory';
import { forecast } from '@/lib/physics';
import { demoRooms } from '@/lib/demo-rooms';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import './demo.css';

const steps=['Kondisi awal','Prediksi & energi','Safety gate','Tinjauan QA','Feedback & catatan','SOP & ringkasan'];
const f=(n:number)=>n.toLocaleString('id-ID',{maximumFractionDigits:2});
export default function Demo(){
 const [roomIndex,setRoomIndex]=useState(0);
 const room=demoRooms[roomIndex],zone=room.zone,initial=room.initial;
 const [step,setStep]=useState(0),[target,setTarget]=useState(42),[scenario,setScenario]=useState('normal');
 const [decision,setDecision]=useState<'pending'|'approved'|'rejected'>('pending');
 const [comment,setComment]=useState(''),[question,setQuestion]=useState(false);
 const reading={...initial,quality_code:scenario==='sensor'?1:0};
 const result=forecast(zone,reading,target),pass=result.gate.decision==='LULUS';
 const applied=pass&&decision==='approved';
 const reset=()=>{setRoomIndex(0);setStep(0);setTarget(42);setScenario('normal');setDecision('pending');setComment('');setQuestion(false);};
 const change=(value:number)=>{setTarget(value);setDecision('pending');setComment('');};
 return <div className="public-demo">
  <header className="demo-nav"><Link href="/" aria-label="Beranda RUAIX"><Logo dark={false}/></Link><span>DEMO PUBLIK / TANPA LOGIN</span><Link href="/login">Masuk aplikasi</Link></header>
  <main className="demo-main">
   <div className="demo-intro"><div><p className="demo-eyebrow">SATU KEPUTUSAN, DARI AWAL SAMPAI AKHIR</p><h1>Coba cara kerja RUAIX.</h1><p>Berperan sebagai Engineer dan QA dalam tur presentasi. Semua tindakan hanya berlangsung di browser ini.</p></div><button onClick={reset}>Ulangi demo</button></div>
   <p className="demo-disclaimer">Data sintetis, model belum dikalibrasi di pabrik. Energi hanya kipas. Persetujuan di sini adalah ilustrasi, bukan autentikasi QA atau kendali BMS nyata.</p>
   <nav className="demo-steps" aria-label="Tahap presentasi">{steps.map((label,i)=><button key={label} onClick={()=>setStep(i)} aria-current={step===i?'step':undefined}><span>{i+1}</span>{label}</button>)}</nav>
   <div className="process-tabs" role="group" aria-label="Pilih proses produksi">{demoRooms.map((r,i)=><button key={r.id} aria-pressed={roomIndex===i} onClick={()=>{setRoomIndex(i);setScenario('normal');change(42);}}><span>0{i+1}</span><strong>{r.name}</strong><small>{r.description}</small></button>)}</div>
   <CleanroomStory step={step} target={target} applied={applied} sensorBad={scenario==='sensor'} room={room} result={result}/>

   <div className="demo-layout">
    <section className="demo-card" aria-labelledby="demo-title">
     <p className="demo-eyebrow">LANGKAH {step+1} / {steps.length}</p><h2 id="demo-title">{steps[step]}</h2>
     {step===0&&<>
      <p>Bayangkan ruangan produksi obat yang harus dijaga kondisinya. Engineer memulai dari kondisi ruang {room.name}. Pilih skenario untuk menunjukkan perubahan kecil yang lolos, usulan agresif yang ditahan, atau kualitas sensor yang bermasalah.</p>
      <label>Skenario<select value={scenario} onChange={e=>{setScenario(e.target.value);change(e.target.value==='aggressive'?38:42);}}><option value="normal">Operasi normal: 43 ke 42 Hz</option><option value="aggressive">Usulan agresif: 43 ke 38 Hz</option><option value="sensor">Kualitas sensor buruk</option></select></label>
      <div className="demo-stats">{[['Suhu',f(reading.temperature_c)+' C'],['RH',f(reading.rh_pct)+'%'],['Beda tekanan',f(reading.dp_pa)+' Pa']].map(([a,b])=><div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>
      <label>Usulan frekuensi kipas: <strong>{target} Hz</strong><input type="range" min="38" max="47" step="1" value={target} onChange={e=>change(Number(e.target.value))}/></label>
      <p className="demo-small">Sumber: {room.source} Perubahan input membatalkan keputusan QA demo sebelumnya.</p>
     </>}
     {step===1&&<>
      <p>Model fisika yang sama dengan Lab menghitung lintasan 30 menit. Grafik berikut menunjukkan beda tekanan; batas ruang {room.name} pada demo adalah 10 sampai 15 Pa.</p>
      <div className="demo-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.trajectory} margin={{top:12,right:20,bottom:12,left:0}}><XAxis dataKey="minute" unit=" m"/><YAxis domain={[7,16]} unit=" Pa"/><Tooltip formatter={(v:number)=>f(v)+' Pa'}/><ReferenceLine y={10} stroke="#D2483F" strokeDasharray="4 4"/><ReferenceLine y={15} stroke="#D2483F" strokeDasharray="4 4"/><Line dataKey="dp_pa" name="Prediksi tekanan" stroke="#064783" strokeWidth={3} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
      <div className="energy-visual" aria-label="Perbandingan estimasi energi kipas"><h3>Energi kipas selama 30 menit</h3><div><span>Setelan awal</span><div className="energy-track"><i style={{width:'100%'}}/></div><strong>{f(result.energy.baselineKWh)} kWh</strong></div><div><span>Usulan</span><div className="energy-track"><i className="energy-candidate" style={{width:Math.min(100,result.energy.candidateKWh/result.energy.baselineKWh*100)+'%'}}/></div><strong>{f(result.energy.candidateKWh)} kWh</strong></div><p>{result.energy.savingsPct>=0?'Potensi selisih':'Kenaikan energi'}: {f(Math.abs(result.energy.savingsPct))}%. {pass?'Masih memerlukan tinjauan QA.':'Usulan tetap ditahan oleh gate.'}</p></div>
      <div className="demo-stats">{[['Baseline',f(result.energy.baselineKWh)+' kWh'],['Usulan',f(result.energy.candidateKWh)+' kWh'],['Selisih estimasi',f(result.energy.savingsPct)+'%']].map(([a,b])=><div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>
      <p className="demo-small">Estimasi kipas selama 30 menit. Grafik menampilkan lintasan pusat; gate juga memeriksa margin suhu, RH, dan tekanan.</p>
     </>}
     {step===2&&<>
      <div className={pass?'demo-pass':'demo-hold'}><strong>{pass?'LULUS PEMERIKSAAN SIMULASI':'TAHAN USULAN'}</strong><p>{pass?'Usulan dapat ditinjau QA. Belum ada setelan yang diubah.':'Potensi penghematan tidak cukup untuk melanjutkan usulan yang gagal pemeriksaan.'}</p></div>
      {result.gate.reasons.length>0&&<ul>{result.gate.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
      <p>Pemeriksaan mencakup kualitas sensor, tahap produksi, rentang dan besar perubahan frekuensi, serta lintasan suhu, RH, dan tekanan beserta margin.</p>
      {!pass&&<button onClick={()=>{setScenario('normal');change(42);setStep(1);}}>Coba usulan lebih kecil dengan sensor baik</button>}
     </>}
     {step===3&&<>
      <p>Dalam aplikasi utama, persetujuan membutuhkan akun QA berbeda dari pengusul. Pada tur ini, Anda mencoba alurnya sebagai ilustrasi.</p>
      <p className={pass?'demo-pass':'demo-hold'}>{pass?'Usulan lolos gate; menunggu tinjauan.':'Usulan ditahan: persetujuan dinonaktifkan.'}</p>
      <label>Alasan tinjauan<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} placeholder="Contoh: Saya sudah meninjau lintasan dan batas zona pada simulasi."/></label>
      <div className="demo-actions"><button className="demo-primary" disabled={!pass||comment.trim().length<5||decision!=='pending'} onClick={()=>{setDecision('approved');setStep(4);}}>Simulasikan persetujuan QA</button><button disabled={comment.trim().length<5||decision!=='pending'} onClick={()=>{setDecision('rejected');setStep(4);}}>Tolak usulan demo</button></div>
      <p className="demo-small">Isi alasan minimal 5 karakter. Status saat ini: {decision}.</p>
     </>}
     {step===4&&<>
      <div className={applied?'demo-pass':'demo-hold'}><strong>{applied?'FEEDBACK SIMULASI: '+target+' Hz':decision==='rejected'?'USULAN DITOLAK':'BELUM DITERAPKAN'}</strong><p>{applied?'Kondisi ditampilkan pada akhir prakiraan 30 menit.':'Kipas tetap pada kondisi awal 43 Hz.'}</p></div>
      <div className="demo-stats">{[['Suhu',f(applied?result.endpoint.temperature_c:initial.temperature_c)+' C'],['RH',f(applied?result.endpoint.rh_pct:initial.rh_pct)+'%'],['Tekanan',f(applied?result.endpoint.dp_pa:initial.dp_pa)+' Pa']].map(([a,b])=><div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>
      <h3>Ringkasan keputusan demo</h3><ol><li>Usulan: 43 ke {target} Hz.</li><li>Gate: {result.gate.decision}.</li><li>Tinjauan: {decision}{comment?' - '+comment:''}.</li><li>Feedback: {applied?'diterapkan dalam ilustrasi browser':'tidak ada perubahan'}.</li></ol>
      <p className="demo-small">Ini ringkasan sementara, bukan audit tersimpan atau bertanda tangan. Refresh halaman menghapus sesi demo.</p>
     </>}
     {step===5&&<>
      <p>Copilot pada aplikasi utama membaca dokumen dan menyertakan sumber. Untuk presentasi tanpa login, berikut contoh jawaban tetap yang tidak memerlukan Ollama.</p>
      <button onClick={()=>setQuestion(!question)} aria-expanded={question}>Apa yang diperiksa sebelum perubahan kipas?</button>
      {question&&<div className="demo-answer"><strong>Contoh jawaban - bukan inferensi AI langsung</strong><p>Periksa kualitas sensor, tahap produksi, rentang frekuensi, dan prediksi kondisi terhadap batas zona. Usulan yang lolos tetap memerlukan tinjauan QA.</p><p className="demo-small">Rujukan contoh: aturan model demo lumped-balance-v1. Ini bukan kutipan SOP pabrik.</p></div>}
      <h3>Yang sudah diperagakan</h3><p>Input kondisi, prediksi fisika, estimasi energi kipas, gate, tinjauan manusia, feedback dan ringkasan keputusan.</p>
      <p>Upload SOP, AI Ollama langsung, evaluasi historis, autentikasi peran, dan audit tersimpan tersedia melalui aplikasi dengan login.</p><Link href="/login">Masuk untuk fitur lengkap</Link>
     </>}
    </section>
    <aside className="demo-side"><div className="demo-card"><h3>Catatan presenter</h3><p>{['Mulai dari kebutuhan Engineer: apa dampak jika kipas diturunkan?','Jelaskan bahwa angka energi adalah estimasi kipas, bukan seluruh HVAC.','Tunjukkan skenario agresif: estimasi hemat lebih besar, tetapi usulan ditahan.','Jelaskan pemisahan pengusul dan pemberi persetujuan di aplikasi utama.','Perubahan hanya terjadi setelah persetujuan demo. Seluruh hasil ini sintetis.','Akhiri dengan kebutuhan pilot: data pabrik, kalibrasi, dan validasi manfaat.'][step]}</p></div></aside>
   </div>
   <footer className="demo-controls"><button disabled={step===0} onClick={()=>setStep(step-1)}>Kembali</button><span>{step+1} / {steps.length}</span>{step<5?<button className="demo-primary" onClick={()=>setStep(step+1)}>Lanjut: {steps[step+1]}</button>:<button className="demo-primary" onClick={reset}>Ulangi presentasi</button>}</footer>
  </main>
 </div>;
}
