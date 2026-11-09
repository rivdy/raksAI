'use client';
import { useCallback,useEffect,useState } from 'react';
import { ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,ReferenceLine } from 'recharts';
import { useStore } from '@/lib/store';
import AirflowBackdrop from '@/components/AirflowBackdrop';
import ProcessOverlay from '@/components/lab/ProcessOverlay';
import RoomSimulator from '@/components/lab/RoomSimulator';
import { proposeSteps,proposeHz,approveSteps,approveHz,MINT,RED } from '@/components/lab/steps';
const n=(x:any,d=2)=>typeof x==='number'?x.toLocaleString('id-ID',{maximumFractionDigits:d}):'—';
export default function Lab(){
  const [data,setData]=useState<any>(null),[user,setUser]=useState<any>(null),[zone,setZone]=useState('A3'),[target,setTarget]=useState(42);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState<any>(null),[comments,setComments]=useState<Record<string,string>>({});
  const {replayK}=useStore();
  // proses berjalan: animasi langkah demi langkah sebelum hasil ditampilkan
  const [run,setRun]=useState<any>(null),[minute,setMinute]=useState(0);
  const onMinute=useCallback((m:number)=>setMinute(Math.floor(m)),[]);
  async function post(payload:any){
    const response=await fetch('/api/bms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const result=await response.json();if(!response.ok)throw new Error(result.error);return result;
  }
  async function propose(){
    if(!z)return;
    setBusy(true);setError('');setNotice('');
    setRun({kind:'propose',zone,reading:z.reading,limits:z.zone,target,result:null});
    try{const result=await post({action:'propose',zone,targetHz:target});setRun((r:any)=>r&&{...r,result});}
    catch(e){setRun(null);setBusy(false);setError(e instanceof Error?e.message:'Permintaan gagal.');}
  }
  async function approve(item:any){
    setBusy(true);setError('');setNotice('');
    setRun({kind:'approve',item,result:null});
    try{const result=await post({action:'review',id:item.id,decision:'approve',comment:comments[item.id]});setRun((r:any)=>r&&{...r,result});}
    catch(e){setRun(null);setBusy(false);setError(e instanceof Error?e.message:'Permintaan gagal.');}
  }
  async function finishRun(){
    const r=run;setRun(null);
    if(r?.kind==='propose'){setSelected(r.result);setNotice(r.result.status==='BLOCKED'?'Usulan ditahan oleh gate.':'Usulan tersimpan; menunggu akun QA yang berbeda.');}
    else if(r?.kind==='approve'){setSelected(r.result);setNotice('Persetujuan dan feedback simulator tercatat.');}
    try{await refresh();}catch(e){setError(e instanceof Error?e.message:'Gagal memuat ulang.');}finally{setBusy(false);}
  }
  async function refresh(){
    const [a,b]=await Promise.all([fetch('/api/bms'),fetch('/api/auth')]);
    const result=await a.json();if(!a.ok)throw new Error(result.error);
    setData(result);setUser((await b.json()).user);
  }
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  useEffect(()=>{if(data?.zones[zone])setTarget(Math.max(data.zones[zone].zone.hz_min,data.zones[zone].reading.fan_hz-1));},[zone,data?.zones[zone]?.version]);
  async function act(payload:any){
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/bms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      if(payload.action==='propose'){setSelected(result);setNotice(result.status==='BLOCKED'?'Usulan ditahan oleh gate.':'Usulan tersimpan; menunggu akun QA yang berbeda.');}
      else if(payload.action==='review'){setSelected(result);setNotice(result.status==='APPLIED_SIMULATED'?'Persetujuan dan feedback simulator tercatat.':'Usulan ditolak.');}
      else{setSelected(null);setNotice('Snapshot replay dimuat ke simulator; usulan lama menjadi tidak berlaku.');}
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Permintaan gagal.');}finally{setBusy(false);}
  }
  const z=data?.zones[zone],p=selected,r=p?.result,canPropose=user&&user.role!=='VIEWER';
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-teal-700">RUAIX / ENERGY LAB</p><h1 className="mt-2 text-3xl font-semibold">Uji penghematan. Tinjau sebelum mengubah.</h1>
      <p className="mt-3 max-w-3xl text-steel">Model fisika menghitung lintasan 30 menit dari kondisi simulator saat ini. Engineering mengusulkan, QA meninjau, lalu simulator mengembalikan feedback.</p></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">SIMULATOR BMS · tidak terhubung ke perangkat pabrik. Prediksi belum dikalibrasi; estimasi energi hanya untuk fan, bukan total HVAC atau hasil penghematan terukur.</div>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-teal-50 p-4">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">Kondisi simulator</h2>
          <button className="ml-auto text-sm underline" disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Segarkan</button></div>
        <label className="block text-sm">Zona<select disabled={busy} value={zone} onChange={e=>{setZone(e.target.value);setSelected(null);}} className="ml-3 rounded border p-2">
          {Object.values(data?.zones??{}).map((v:any)=><option key={v.zone.code} value={v.zone.code}>{v.zone.code} — {v.zone.name_id}</option>)}
        </select></label>
        {z&&<>
          <div className="relative h-52 overflow-hidden rounded-lg bg-ink">
            <AirflowBackdrop className="absolute inset-0 h-full w-full" scale={0.62} lineAlpha={0.3} particleAlpha={0.42} ink="227,241,241" accent={MINT} speed={z.reading.fan_hz/z.zone.hz_b} sway={0.4}/>
            <div className="pointer-events-none absolute left-4 top-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-mint">Simulator · zona {zone} · live</div>
            <div className="pointer-events-none absolute bottom-3 left-4 text-white num"><span className="text-[26px] font-medium">{n(z.reading.fan_hz,1)}</span> <span className="text-sm text-[#9DB7BA]">Hz</span></div>
            <div className="pointer-events-none absolute bottom-3 right-4 text-right text-[11px] text-[#9DB7BA]">aliran udara HEPA → grill return<br/>kecepatan mengikuti frekuensi fan</div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[['Suhu',n(z.reading.temperature_c)+' °C'],['Kelembapan',n(z.reading.rh_pct)+' % RH'],['Beda tekanan',n(z.reading.dp_pa)+' Pa'],['Fan',n(z.reading.fan_hz)+' Hz']].map(([label,value])=><div key={label} className="rounded-lg bg-mist p-3"><dt className="text-xs text-steel">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}
          </dl>
          <p className="text-xs text-steel">Waktu simulasi: {new Date(z.at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB · versi {z.version} · {z.mode} · gate awal {z.recordedAssessment}</p>
          <button disabled={busy||!canPropose||replayK==null} className="rounded border px-3 py-2 text-sm disabled:opacity-40" onClick={()=>act({action:'replay',zone,k:replayK})}>Muat waktu replay dashboard {replayK??'(belum dipilih)'}</button>
        </>}
      </section>
      <form className="space-y-4 rounded-xl border border-line bg-white p-5" onSubmit={e=>{e.preventDefault();propose();}}>
        <h2 className="text-xl font-semibold">Usulan frekuensi fan</h2>
        <p className="text-sm text-steel">Horizon 30 menit. Batas langkah ±3 Hz; seluruh lintasan diperiksa dengan margin suhu, RH, dan tekanan.</p>
        <label className="block">Target Hz<input type="number" min="1" max="60" step="0.1" required value={target} onChange={e=>setTarget(Number(e.target.value))} className="ml-3 w-28 rounded border p-3"/></label>
        {z&&<p className="text-sm">Rentang simulasi: {z.zone.hz_min}–{z.zone.hz_b} Hz.</p>}
        <button disabled={busy||!z||!canPropose} className="rounded-lg bg-ink px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'Memproses…':'Hitung prediksi & buat usulan'}</button>
        <p className="text-xs text-steel">Tombol ini belum mengubah simulator. Viewer hanya dapat melihat; pengusul tidak dapat menyetujui usulannya sendiri.</p>
      </form>
    </div>
    {r&&<section className="space-y-5 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap gap-3"><h2 className="text-xl font-semibold">Prediksi zona {p.zone}</h2><span className="rounded bg-mist px-3 py-1">{r.gate.decision} · {p.status}</span></div>
      <ul className="list-disc pl-5 text-sm text-red-800">{r.gate.reasons.map((reason:string)=><li key={reason}>{reason}</li>)}</ul>
      <RoomSimulator result={r} limits={data.zones[p.zone].zone} status={p.status} onMinute={onMinute}/>
      <p className="text-sm">Total 30 menit: fan baseline {n(r.energy.baselineKWh)} kWh · fan usulan {n(r.energy.candidateKWh)} kWh · selisih estimasi {n(r.energy.savedKWh)} kWh ({n(r.energy.savingsPct)}%).</p>
      <p className="text-sm">{r.energy.claim}. {r.gate.decision==='TAHAN'?'Estimasi ini tidak boleh diterapkan karena gate menahan usulan.':'Belum diterapkan; lihat status persetujuan.'}</p>
      <div className="grid gap-5 lg:grid-cols-3">
        {([['temperature_c','Suhu (°C)','t'],['rh_pct','RH (%)','rh'],['dp_pa','Tekanan (Pa)','dp']] as const).map(([key,label,limit])=><div key={key}><h3 className="text-sm font-semibold">{label} <span className="font-normal text-steel">· menit {minute}</span></h3>
          <div className="mt-2 h-44"><ResponsiveContainer width="100%" height="100%"><LineChart data={r.trajectory} margin={{left:0,right:12,top:10,bottom:0}}>
            <XAxis dataKey="minute" tick={{fontSize:10}}/><YAxis domain={['auto','auto']} tick={{fontSize:10}} width={42}/><Tooltip formatter={(v:number)=>n(v)}/>
            <ReferenceLine x={minute} stroke="#3CC2AE" strokeWidth={2}/><ReferenceLine y={data.zones[p.zone].zone[limit][0]} stroke="#dc2626" strokeDasharray="3 3"/><ReferenceLine y={data.zones[p.zone].zone[limit][1]} stroke="#dc2626" strokeDasharray="3 3"/>
            <Line dataKey={key} stroke="#0f766e" dot={false} isAnimationActive={false}/>
          </LineChart></ResponsiveContainer></div></div>)}
      </div>
      <details><summary className="cursor-pointer font-semibold">Asumsi, rumus, dan angka prediksi</summary>
        <p className="my-3 text-sm">Neraca lumped suhu/uap air dengan beban tetap; tekanan mendekati kuadrat rasio frekuensi; daya fan mendekati pangkat tiga rasio frekuensi. Margin skenario bukan interval kepercayaan statistik.</p>
        <pre className="overflow-auto rounded bg-mist p-3 text-xs">{JSON.stringify(r.assumptions,null,2)}</pre>
        <div className="overflow-auto"><table className="mt-3 w-full text-sm"><caption className="text-left">Lintasan tiap 5 menit</caption><thead><tr>{['Menit','°C','RH %','Pa'].map(x=><th className="p-2 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{r.trajectory.filter((x:any)=>x.minute%5===0).map((x:any)=><tr key={x.minute}><td className="p-2">{x.minute}</td><td>{n(x.temperature_c)}</td><td>{n(x.rh_pct)}</td><td>{n(x.dp_pa)}</td></tr>)}</tbody></table></div>
      </details>
    </section>}
    <section className="space-y-4 rounded-xl border border-line bg-white p-5"><h2 className="text-xl font-semibold">Tinjauan QA & feedback</h2>
      {!data?.proposals.length&&<p className="text-steel">Belum ada usulan. Buat satu usulan sebagai Engineering.</p>}
      {data?.proposals.map((item:any)=><div key={item.id} className="space-y-3 rounded-lg border border-line p-4">
        <div className="flex flex-wrap gap-3"><button className="font-semibold underline" onClick={()=>setSelected(item)}>{item.zone} → {item.targetHz} Hz</button><span>{item.status}</span><span className="text-sm text-steel">oleh {item.createdBy}</span></div>
        <p className="text-xs text-steel">ID {item.id} · berlaku sampai {new Date(item.expiresAt).toLocaleTimeString('id-ID')}</p>
        {item.status==='PENDING'&&user?.role==='QA'&&item.createdBy!==user.username&&<div className="space-y-2">
          <label className="block text-sm">Alasan tinjauan<input maxLength={1000} value={comments[item.id]??''} onChange={e=>setComments({...comments,[item.id]:e.target.value})} className="mt-1 w-full rounded border p-2"/></label>
          <div className="flex gap-3"><button disabled={busy||(comments[item.id]??'').trim().length<5} className="rounded bg-ink px-3 py-2 text-sm text-white disabled:opacity-40" onClick={()=>approve(item)}>Setujui & jalankan di simulator</button>
          <button disabled={busy||(comments[item.id]??'').trim().length<5} className="rounded border px-3 py-2 text-sm disabled:opacity-40" onClick={()=>act({action:'review',id:item.id,decision:'reject',comment:comments[item.id]})}>Tolak</button></div></div>}
        {item.feedback&&<p className="rounded bg-teal-50 p-3 text-sm">Feedback simulator: {item.feedback.fan_hz} Hz · versi {item.feedback.version} · {item.feedback.at}</p>}
        {item.comment&&<p className="text-sm">Catatan {item.reviewedBy}: {item.comment}</p>}
      </div>)}
    </section>
    {run?.kind==='propose'&&<ProcessOverlay title="Menghitung prediksi & menyusun usulan" subtitle={'Simulator BMS · zona '+run.zone}
      steps={proposeSteps(run.zone,run.reading,run.limits,run.target,run.result)} ready={!!run.result}
      hzAt={proposeHz(run.reading.fan_hz,run.target)} hzNominal={run.limits.hz_b}
      accentAt={(i)=>i>=3&&run.result?.gate.decision==='TAHAN'?RED:MINT} onDone={finishRun}/>}
    {run?.kind==='approve'&&<ProcessOverlay title="Menjalankan persetujuan di simulator" subtitle={'Simulator BMS · zona '+run.item.zone}
      steps={approveSteps(run.item,user?.username??'qa',run.result)} ready={!!run.result}
      hzAt={approveHz(run.item.result.initial.fan_hz,run.item.targetHz)} hzNominal={data.zones[run.item.zone].zone.hz_b} onDone={finishRun}/>}
    <details className="rounded-xl border border-line bg-white p-5"><summary className="cursor-pointer font-semibold">Audit lokal · rantai hash {data?.auditValid?'valid':'belum diperiksa'}</summary>
      <p className="mt-3 text-xs text-steel">Deteksi perubahan lokal; bukan audit tersertifikasi. Penyimpanan lokal dapat diubah administrator.</p>
      <ul className="mt-3 space-y-2 text-xs">{data?.audit.map((a:any)=><li key={a.id} className="break-words rounded bg-mist p-3">{a.at} · {a.actor} · {a.action}<br/>{JSON.stringify(a.payload)}</li>)}</ul>
    </details>
  </div>;
}
