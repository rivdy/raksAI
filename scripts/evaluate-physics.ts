import {writeFile} from 'node:fs/promises';
import {loadDataset} from '../lib/copilot';
import {forecast} from '../lib/physics';
async function main(){
  const [meta,series]=await loadDataset();
  let count=0;const total={temperature_c:0,rh_pct:0,dp_pa:0};
  for(const zone of meta.zones){
    const s=series.zones[zone.code];
    for(let k=meta.k_adv;k<meta.n-2;k+=8){
      if([k,k+1,k+2].some(i=>s.q[i]!==0||s.crit[i]!==0||s.hz[i]!==s.hz[k]||[s.t[i],s.rh[i],s.dp[i],s.hz[i]].some(v=>typeof v!=='number'||!Number.isFinite(v))))continue;
      const initial={temperature_c:s.t[k],rh_pct:s.rh[k],dp_pa:s.dp[k],fan_hz:s.hz[k],quality_code:0,critical_step:false};
      const p=forecast(zone,initial,s.hz[k]).endpoint;
      total.temperature_c+=Math.abs(p.temperature_c-s.t[k+2]);total.rh_pct+=Math.abs(p.rh_pct-s.rh[k+2]);total.dp_pa+=Math.abs(p.dp_pa-s.dp[k+2]);count++;
    }
  }
  const report={scope:'Synthetic replay no-setpoint-change comparison, not validation of interventions or a real facility',samples:count,horizonMinutes:30,mae:{temperature_c:total.temperature_c/count,rh_percentage_points:total.rh_pct/count,dp_pa:total.dp_pa/count},limitation:'This model assumes initial equilibrium, so no-change trajectory equals persistence. This comparison does not establish forecast skill beyond persistence or safe actuation.'};
  await writeFile('.local/physics-evaluation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
