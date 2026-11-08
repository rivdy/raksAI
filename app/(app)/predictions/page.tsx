'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Area,CartesianGrid,ComposedChart,Legend,Line,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {useData,type Meta,type Series} from '@/lib/data';
import {evaluationRows,residualCalibration,summarize,wallTime,evaluationCsv} from '@/lib/evaluation';
const fmt=(v:number|null,d=3)=>v===null?'—':v.toLocaleString('id-ID',{maximumFractionDigits:d,minimumFractionDigits:d});
export default function Predictions(){
  const {data:meta,error:e1}=useData<Meta>('meta.json'),{data:series,error:e2}=useData<Series>('series.json'),{data:system,error:e3}=useData<any>('system.json');
  const [code,setCode]=useState('A1'),[day,setDay]=useState('2026-09-29'),[mode,setMode]=useState<'replay'|'physics'>('replay');
  const zone=meta?.zones.find(z=>z.code===code),s=series?.zones[code];
  const cal=useMemo(()=>meta&&zone&&s?residualCalibration(meta,zone,s):null,[meta,zone,s]);
  const rows=useMemo(()=>meta&&zone&&s?evaluationRows(meta,zone,s,day,mode,cal??undefined):[],[meta,zone,s,day,mode,cal]);
  const stats=summarize(rows);
  const dates=useMemo(()=>meta?Array.from(new Set(Array.from({length:meta.n},(_,i)=>wallTime(meta,i).slice(0,10)))):[],[meta]);
  if(e1||e2||e3)return <p role="alert">{e1||e2||e3}</p>;
  if(!meta||!series||!zone||!cal)return <p role="status">Memuat evaluasi…</p>;
  const cutoff=wallTime(meta,meta.k_adv).slice(0,10);
  const chart=rows.map(r=>({...r,label:r.target.slice(11,16),band:r.lower!==null&&r.upper!==null?[r.lower,r.upper]:null}));
  function download(){const url=URL.createObjectURL(new Blob([evaluationCsv(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='predictions-'+code+'-'+day+'-'+mode+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className="space-y-6">
    <header><p className="text-sm font-semibold text-teal-700">RUAIX / EVALUASI PRAKIRAAN</p><h1 className="mt-2 text-3xl font-semibold">Prakiraan RH 30 menit vs aktual.</h1><p className="mt-3 max-w-3xl text-steel">Lihat kurva prakiraan, rentang 80% nominal, dan kesalahan pada pasangan waktu yang benar. Semua pengukuran aktual pada halaman ini berasal dari dataset sintetis.</p></header>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><b>{mode==='replay'?'REPLAY SINTETIS':'MODEL FISIKA MVP · HOLDOUT SINTETIS'}</b> · {mode==='replay'?'Prakiraan sudah tersedia dalam paket; ini bukan PINN yang dilatih atau dijalankan oleh aplikasi.':'Prediksi dihitung ulang dari input 30 menit sebelumnya dengan asumsi frekuensi tetap. Pada skenario ini model setara persistence; bukan PINN.'}</div>
    <section className="space-y-4 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">Sumber prediksi<select className="mt-2 block rounded border p-3" value={mode} onChange={e=>{const value=e.target.value as 'replay'|'physics';setMode(value);if(value==='physics'&&day<cutoff)setDay(cutoff);}}><option value="replay">Prakiraan replay sintetis</option><option value="physics">Model fisika MVP — baseline tetap</option></select></label>
        <label className="text-sm">Zona<select className="mt-2 block rounded border p-3" value={code} onChange={e=>setCode(e.target.value)}>{meta.zones.map(z=><option key={z.code} value={z.code}>{z.code} — {z.name_id}</option>)}</select></label>
        <label className="text-sm">Tanggal (WIB)<select className="mt-2 block rounded border p-3" value={day} onChange={e=>setDay(e.target.value)}>{dates.filter(d=>mode==='replay'||d>=cutoff).map(d=><option key={d}>{d}</option>)}</select></label>
        <button onClick={download} disabled={!rows.length} className="rounded-lg border border-line px-4 py-3 text-sm">Unduh data CSV</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[['RMSE (poin %RH)',fmt(stats.rmse)],['MAE (poin %RH)',fmt(stats.mae)],['Coverage rentang 80%',stats.coverage===null?'—':fmt(stats.coverage*100,1)+'%'],['Pasangan valid',stats.n+' / '+stats.total]].map(([label,value])=><div key={label} className="rounded-xl bg-mist p-4"><p className="text-xs text-steel">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
      </div>
      <p className="text-xs text-steel">{stats.excluded} titik dikeluarkan dari RMSE/MAE · coverage menggunakan {stats.intervalN} interval valid. Celah tidak diinterpolasi.</p>
    </section>
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-xl font-semibold">RH · {code} · {day}</h2><p className="mt-1 text-sm text-steel">Sumbu waktu menunjukkan waktu target. Prakiraan dibuat 30 menit sebelumnya.</p>
      <div className="mt-5 h-[330px]" aria-label="Grafik prakiraan RH, aktual, dan rentang prediksi">
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{top:10,right:15,left:5,bottom:10}}>
          <CartesianGrid stroke="#E3ECEC" vertical={false}/><XAxis dataKey="label" interval={11} tick={{fontSize:11}}/><YAxis domain={['auto','auto']} tick={{fontSize:11}} width={45}/>
          <Tooltip formatter={(value:any,name:string)=>[Array.isArray(value)?value.map(v=>fmt(v,2)).join(' – '):fmt(value,2),name]}/><Legend wrapperStyle={{fontSize:12}}/>
          <Area type="linear" dataKey="band" name="Rentang 80% nominal" stroke="none" fill="#3CC2AE" fillOpacity={0.25} connectNulls={false} isAnimationActive={false}/>
          <Line type="linear" dataKey="prediction" name="Prakiraan 30 menit" stroke="#3CC2AE" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive={false}/>
          <Line type="linear" dataKey="actual" name="Aktual sintetis" stroke="#0F6B70" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>
        </ComposedChart></ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm">{stats.coverage===null?'Belum ada interval valid untuk menilai coverage.':stats.coverage<0.8?'Coverage teramati di bawah 80% pada hari ini; interval perlu ditinjau.':'Coverage teramati memenuhi/melebihi 80% pada hari ini; satu hari belum membuktikan kalibrasi umum.'}</p>
    </section>
    <section className="space-y-3 rounded-xl border border-line bg-white p-5"><h2 className="text-xl font-semibold">Cara rentang dihitung</h2>
      {mode==='replay'?<p className="text-sm">Prakiraan dan simpangan baku diambil dari series.json. Rentang nominal 80% = prakiraan ± 1,28155 × simpangan baku, dengan asumsi bentuk distribusi normal. Prediksi pada indeks k sudah ditujukan untuk aktual indeks k oleh generator paket; tidak digeser kembali.</p>:<><p className="text-sm">Lebar rentang diambil dari residual absolut model zona {code} pada 14 hari pertama, lalu dibekukan sebelum holdout {cutoff}. Kalibrasi memakai {cal.n} residual; radius {fmt(cal.radius)} poin %RH. Data hari evaluasi tidak dipakai untuk memilih radius.</p><p className="text-sm">Urutan residual: ceil((n + 1) × 0,8). Ini penerapan kuantil residual dengan target nominal 80%; ketergantungan waktu dan perubahan distribusi membuat coverage aktual harus diuji, bukan dijamin. Interval ini berbeda dari margin safety gate di Lab.</p></>}
      <p className="text-sm text-steel">Data bukan GOOD atau tidak lengkap dikeluarkan. Model fisika juga mengecualikan tahap kritis dan horizon dengan perubahan frekuensi; ini evaluasi baseline, bukan validasi dampak intervensi. Hasil lintas mode/periode belum tentu menggunakan populasi sampel yang sama.</p>
      <Link className="inline-block text-sm font-semibold underline" href="/lab">Buka Lab untuk prediksi skenario perubahan frekuensi →</Link>
    </section>
    <section className="space-y-3 rounded-xl border border-line bg-white p-5"><h2 className="text-xl font-semibold">Angka registry pada dokumen contoh</h2><p className="text-sm text-steel">Nilai di bawah disalin dari registry paket (system.json), bukan hasil hitung ulang hari yang dipilih dan bukan bukti model PINN aktif. Versi/periode berbeda tidak menjadi perbandingan A/B yang terkontrol.</p>
      <div className="overflow-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-teal-700 text-white"><tr>{['Model dalam paket','n registry','RMSE RH','Coverage 80%','Asal'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{system?.models.filter((m:any)=>m.type==='PINN').map((m:any)=><tr key={m.version} className="border-b border-line"><td className="p-3">{m.name} {m.version}</td><td className="p-3">{m.metrics.online_n}</td><td className="p-3">{fmt(m.metrics.online_rmse_rh)}</td><td className="p-3">{fmt(m.metrics.online_coverage_80*100,1)}%</td><td className="p-3">Registry sintetis</td></tr>)}</tbody></table></div>
    </section>
    <details className="rounded-xl border border-line bg-white p-5"><summary className="cursor-pointer font-semibold">Periksa pasangan waktu & angka</summary><div className="mt-4 overflow-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr>{['Target WIB','Dibuat WIB','Aktual','Prakiraan','Bawah','Atas','Keterangan'].map(x=><th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.k} className="border-t border-line"><td className="p-2">{r.target.slice(11,16)}</td><td className="p-2">{r.issued?.slice(5,16).replace('T',' ')??'—'}</td><td>{fmt(r.actual,2)}</td><td>{fmt(r.prediction,2)}</td><td>{fmt(r.lower,2)}</td><td>{fmt(r.upper,2)}</td><td className="max-w-xs p-2">{r.excluded??'Valid'}</td></tr>)}</tbody></table></div></details>
  </div>;
}
