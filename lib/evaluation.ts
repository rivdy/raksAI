import {forecast} from './physics';
import type {Meta,Zone,ZoneSeries} from './data';
export type EvaluationRow={k:number;target:string;issued:string|null;actual:number|null;prediction:number|null;lower:number|null;upper:number|null;excluded:string|null};
const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function wallTime(meta:Meta,k:number){return new Date(Date.parse(meta.start+'Z')+k*meta.step*60000).toISOString().slice(0,19)+'+07:00';}
function originOffset(meta:Meta){const offset=30/meta.step;if(!Number.isInteger(offset)||offset<1)throw new Error('Resolusi tidak mendukung horizon 30 menit.');return offset;}
export function physicalPrediction(meta:Meta,zone:Zone,s:ZoneSeries,k:number){
  const origin=k-originOffset(meta);
  if(origin<0)return {value:null,reason:'Belum ada input 30 menit sebelumnya.'};
  for(let i=origin;i<=k;i++){
    if(s.q[i]!==0||!valid(s.rh[i])||!valid(s.hz[i]))return {value:null,reason:'Mutu data buruk atau data hilang.'};
    if(s.crit[i]!==0)return {value:null,reason:'Tahap kritis dikeluarkan dari evaluasi baseline.'};
    if(s.hz[i]!==s.hz[origin])return {value:null,reason:'Frekuensi berubah selama horizon baseline.'};
  }
  if(![s.t[origin],s.dp[origin]].every(valid))return {value:null,reason:'Input fisika tidak lengkap.'};
  const result=forecast(zone,{temperature_c:s.t[origin],rh_pct:s.rh[origin],dp_pa:s.dp[origin],fan_hz:s.hz[origin],quality_code:0,critical_step:false},s.hz[origin]);
  return {value:result.endpoint.rh_pct,reason:null};
}
export function residualCalibration(meta:Meta,zone:Zone,s:ZoneSeries){
  const errors:number[]=[];
  for(let k=originOffset(meta);k<meta.k_adv;k++){
    const p=physicalPrediction(meta,zone,s,k);
    if(valid(p.value)&&valid(s.rh[k]))errors.push(Math.abs(s.rh[k]-p.value));
  }
  errors.sort((a,b)=>a-b);
  const rank=Math.ceil((errors.length+1)*0.8);
  return {n:errors.length,radius:errors.length>=20&&rank<=errors.length?errors[rank-1]:null,endExclusive:meta.k_adv,nominal:0.8};
}
export function evaluationRows(meta:Meta,zone:Zone,s:ZoneSeries,day:string,mode:'replay'|'physics',calibration?:ReturnType<typeof residualCalibration>):EvaluationRow[]{
  const offset=originOffset(meta),cal=calibration??(mode==='physics'?residualCalibration(meta,zone,s):null);
  const rows:EvaluationRow[]=[];
  for(let k=0;k<meta.n;k++){
    const target=wallTime(meta,k);if(!target.startsWith(day))continue;
    const origin=k-offset;
    const row:EvaluationRow={k,target,issued:origin>=0?wallTime(meta,origin):null,actual:valid(s.rh[k])&&s.q[k]===0?s.rh[k]:null,prediction:null,lower:null,upper:null,excluded:null};
    if(mode==='replay'){
      if(origin<0||s.q[k]!==0||s.q[origin]!==0||!valid(s.pred[k])||!valid(s.rh[k]))row.excluded='Input/aktual/prakiraan tidak tersedia atau kualitas bukan GOOD.';
      else{
        // gen_assets.py stores prediction issued at k-2 at target index k. Do not shift it again.
        row.prediction=s.pred[k];
        if(valid(s.sd[k])&&s.sd[k]>=0){const width=1.281551565545*s.sd[k];row.lower=row.prediction-width;row.upper=row.prediction+width;}
      }
    }else if(k<meta.k_adv)row.excluded='Periode kalibrasi; tidak termasuk holdout.';
    else{
      const p=physicalPrediction(meta,zone,s,k);row.prediction=p.value;row.excluded=p.reason;
      if(valid(p.value)&&cal&&valid(cal.radius)){row.lower=p.value-cal.radius;row.upper=p.value+cal.radius;}
    }
    rows.push(row);
  }
  return rows;
}
export function summarize(rows:EvaluationRow[]){
  const paired=rows.filter(r=>valid(r.actual)&&valid(r.prediction));
  const interval=paired.filter(r=>valid(r.lower)&&valid(r.upper));
  const n=paired.length;
  return {n,total:rows.length,excluded:rows.length-n,rmse:n?Math.sqrt(paired.reduce((sum,r)=>sum+(r.prediction!-r.actual!)**2,0)/n):null,
    mae:n?paired.reduce((sum,r)=>sum+Math.abs(r.prediction!-r.actual!),0)/n:null,
    intervalN:interval.length,coverage:interval.length?interval.filter(r=>r.actual!>=r.lower!&&r.actual!<=r.upper!).length/interval.length:null};
}
export function evaluationCsv(rows:EvaluationRow[]){
  return ['target_time,issued_time,actual_rh,predicted_rh,lower_rh,upper_rh,excluded_reason',...rows.map(r=>[r.target,r.issued,r.actual,r.prediction,r.lower,r.upper,r.excluded].map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\r\n');
}
