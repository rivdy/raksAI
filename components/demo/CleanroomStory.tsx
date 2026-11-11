'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Fan, Thermometer, Droplets, Gauge, ShieldCheck, LockKeyhole } from 'lucide-react';
import { type DemoRoom } from '@/lib/demo-rooms';
import { forecast } from '@/lib/physics';

type Result=ReturnType<typeof forecast>;
type Props={step:number;target:number;applied:boolean;sensorBad:boolean;room:DemoRoom;result:Result};
const n=(v:number)=>v.toLocaleString('id-ID',{maximumFractionDigits:2});
function Box({className=''}:{className?:string}){return <div className={'room-box '+className}><i className="box-top"/><i className="box-front"/><i className="box-side"/></div>;}
function RoomView({room,hz,sensorBad,after,held}:{room:DemoRoom;hz:number;sensorBad:boolean;after:boolean;held:boolean}){
 return <div className={'room-stage compare-stage '+(after?'scene-after':'scene-before')} role="img" aria-label={`Ilustrasi 3D ${room.name}, ${after?'panel akhir':'panel awal'}, kipas ${hz} Hz. Bukan simulasi CFD.`}>
  <div className={'room-world auto-orbit process-'+room.id} style={{'--air-duration':(2.8*43/hz)+'s'} as CSSProperties}>
   <div className="room-floor"/><div className="room-back-wall"/><div className="room-left-wall"/><div className="room-door"><span>{room.zone.code}</span></div>
   <Box className="room-machine"/><Box className="room-table"/><Box className="room-console"/>
   {room.id==='granulation'&&<div className="process-vessel granulator"><span className="vessel-lid"/>{Array.from({length:6},(_,i)=><i key={i} style={{left:10+i*7,top:18+(i%2)*13}}/>)}</div>}
   {room.id==='mixing'&&<div className="process-vessel mixer"><span className="mixer-arm"/><span className="mixer-arm second"/><span className="mixer-center"/></div>}
   {room.id==='compression'&&<div className="process-vessel press"><span className="press-head"/><span className="press-bed"/>{Array.from({length:4},(_,i)=><i key={i} style={{left:8+i*14}}/>)}</div>}
   <div className="room-filter"><div className="filter-grille"/><span>HEPA</span></div>
   {Array.from({length:18},(_,i)=><span key={i} className="room-air" style={{left:55+(i%6)*28,top:44+Math.floor(i/6)*48,animationDelay:(-i*.31)+'s'} as CSSProperties}/>)}
   <div className={'room-sensor '+(sensorBad?'sensor-bad':'')}><span/></div>
  </div>
  <div className="scene-label label-filter">Filter udara / HEPA</div><div className="scene-label label-room">{room.name}</div>
  <div className={'scene-label label-sensor '+(held?'sensor-label-bad':'')}>{held?'Usulan ditahan':sensorBad?'Sensor bermasalah':'Aliran udara ilustratif'}</div>
  <div className="scene-fan"><Fan style={{animationDuration:(1.5*43/hz)+'s'}}/><div><strong>{hz} Hz</strong><small>Frekuensi kipas</small></div></div>
 </div>;
}
export default function CleanroomStory(p:Props){
 const [minute,setMinute]=useState(0);
 const feedback=p.step>=4;
 const showChange=!feedback||p.applied;
 const pass=p.result.gate.decision==='LULUS';
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');let timer:ReturnType<typeof setInterval>|undefined;
  const run=()=>{if(timer)clearInterval(timer);setMinute(media.matches?30:0);if(!media.matches)timer=setInterval(()=>{if(!document.hidden)setMinute(m=>m>=30?0:Math.min(30,m+1));},600);};
  run();media.addEventListener('change',run);return()=>{if(timer)clearInterval(timer);media.removeEventListener('change',run);};
 },[p.room.id,p.target,p.sensorBad,p.step,p.applied]);
 const before=p.room.initial;
 const now=showChange?p.result.trajectory[minute]:{temperature_c:before.temperature_c,rh_pct:before.rh_pct,dp_pa:before.dp_pa};
 const endpoint=showChange?p.result.endpoint:before;
 const finalHz=showChange?p.target:before.fan_hz;
 const baseline=p.result.energy.baselineKWh,candidate=showChange?p.result.energy.candidateKWh:baseline;
 const readings=[{Icon:Thermometer,label:'Suhu',key:'temperature_c' as const,unit:' C'}, {Icon:Droplets,label:'Kelembapan',key:'rh_pct' as const,unit:' %RH'}, {Icon:Gauge,label:'Beda tekanan',key:'dp_pa' as const,unit:' Pa'}];
 return <section className="process-comparison" aria-label="Perbandingan kondisi awal dan akhir">
  <header className="comparison-heading"><div><span className="story-kicker">{p.room.zone.code} / {p.room.name.toUpperCase()}</span><h2>{p.room.name}: sebelum dan sesudah.</h2><p>{p.room.description} Bandingkan kondisi awal dengan {feedback?'feedback demo':'prakiraan perubahan setelan'}.</p></div><span className={'comparison-badge '+(!pass?'held':'')}>{!pass?<LockKeyhole size={16}/>:<ShieldCheck size={16}/>} {feedback?(p.applied?'Diterapkan dalam demo':'Tidak diterapkan'):pass?'Pratinjau, belum diterapkan':'Prediksi usulan yang ditahan'}</span></header>
  <div className="room-comparison-grid">
   <article className="comparison-panel before-panel"><div className="comparison-title"><span>01 / KONDISI AWAL</span><strong>{before.fan_hz} Hz</strong></div><RoomView room={p.room} hz={before.fan_hz} sensorBad={p.sensorBad} after={false} held={false}/><div className="scene-metrics">{readings.map(({Icon,label,key,unit})=><div key={key}><Icon size={16}/><span>{label}</span><strong>{n(before[key])}{unit}</strong></div>)}</div><p className="scene-caption">Pembacaan awal tetap sebagai pembanding.</p></article>
   <article className={'comparison-panel after-panel '+(!pass?'held-panel':'')}><div className="comparison-title"><span>02 / {feedback?'FEEDBACK DEMO':'PREDIKSI AKHIR +30 MENIT'}</span><strong>{finalHz} Hz</strong></div><RoomView room={p.room} hz={finalHz} sensorBad={p.sensorBad} after={true} held={!pass}/><div className="scene-metrics">{readings.map(({Icon,label,key,unit})=><div key={key}><Icon size={16}/><span>{label}</span><strong>{n(endpoint[key])}{unit}</strong><small>{endpoint[key]-before[key]>=0?'+':''}{n(endpoint[key]-before[key])}{unit}</small></div>)}</div><p className="scene-caption">{feedback&&!p.applied?'Tidak disetujui: kondisi dan energi tetap seperti awal.':'Angka akhir berasal dari model fisika, bukan pengukuran nyata.'}</p></article>
  </div>
  <div className="prediction-playback"><div><strong>Pemutaran otomatis: menit {minute} / 30</strong><span>30 menit simulasi diputar sekitar 18 detik, lalu diulang.</span></div><div className="prediction-progress"><i style={{width:minute/30*100+'%'}}/></div><div className="playback-readings">{readings.map(({label,key,unit})=><span key={key}>{label}: <b>{n(now[key])}{unit}</b></span>)}</div></div>
  <div className="comparison-energy"><div><span>ENERGI KIPAS / 30 MENIT</span><h3>{!showChange?'Tidak ada perubahan yang diterapkan.':candidate<baseline?'Estimasi energi turun.':candidate>baseline?'Estimasi energi naik.':'Estimasi energi tetap.'}</h3><p>{!pass?'Penghematan tidak membatalkan penahanan oleh safety gate.':'Manfaat tetap perlu dibuktikan pada data pabrik.'}</p></div><div className="comparison-bars">{[['Awal',baseline],['Akhir',candidate]].map(([label,value])=><div key={label}><span>{label}</span><div><i style={{width:Number(value)/Math.max(baseline,candidate)*100+'%'}}/></div><strong>{n(Number(value))} kWh</strong></div>)}<p>Selisih: {n(baseline-candidate)} kWh ({n((1-candidate/baseline)*100)}%). {showChange?'Estimasi, bukan hasil terukur.':'Setelan tidak berubah.'}</p></div></div>
  <p className="comparison-source">{p.room.source} Bentuk alat dan gerak udara hanya ilustrasi proses, bukan desain mesin, CFD, atau simulasi mutu obat.</p>
 </section>;
}
