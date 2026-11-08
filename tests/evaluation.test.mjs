import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadDataset} from '../lib/copilot.ts';
import {evaluationRows,residualCalibration,summarize,evaluationCsv} from '../lib/evaluation.ts';
test('RMSE, MAE and coverage use valid pairs with separate interval denominator',()=>{
 const base={k:0,target:'x',issued:'y',excluded:null};
 const rows=[{...base,actual:1,prediction:2,lower:1,upper:3},{...base,actual:5,prediction:3,lower:2,upper:4},{...base,actual:4,prediction:4,lower:null,upper:null},{...base,actual:null,prediction:4,lower:3,upper:5}];
 const m=summarize(rows);assert.equal(m.n,3);assert.equal(m.rmse,Math.sqrt(5/3));assert.equal(m.mae,1);assert.equal(m.intervalN,2);assert.equal(m.coverage,.5);
 assert.equal(summarize([]).rmse,null);
});
test('replay prediction already aligned to target; first prediction is issued 30 minutes earlier',async()=>{
 const [meta,series]=await loadDataset(),zone=meta.zones[0],s=series.zones.A1;
 const rows=evaluationRows(meta,zone,s,'2026-09-29','replay'),r=rows.find(x=>x.prediction!==null);
 assert.equal(rows.length,96);assert.equal(r.prediction,s.pred[r.k]);assert.equal(Date.parse(r.target)-Date.parse(r.issued),1800000);
 assert.match(evaluationCsv(rows),/target_time,issued_time/);
});
test('calibration excludes holdout and new physical prediction never uses target actual',async()=>{
 const [meta,series]=await loadDataset(),zone=meta.zones[0],s=series.zones.A1;
 const cal=residualCalibration(meta,zone,s),rows=evaluationRows(meta,zone,s,'2026-09-29','physics',cal),r=rows.find(x=>x.prediction!==null);
 assert.ok(cal.n>20);assert.ok(cal.radius!==null);assert.ok(r);
 const changed=structuredClone(s);for(let k=meta.k_adv;k<meta.n;k++)changed.rh[k]+=10;
 assert.deepEqual(residualCalibration(meta,zone,changed),cal);
 const targetOnly=structuredClone(s);targetOnly.rh[r.k]+=5;
 const other=evaluationRows(meta,zone,targetOnly,'2026-09-29','physics',cal).find(x=>x.k===r.k);
 assert.equal(other.prediction,r.prediction);assert.equal(other.lower,r.lower);
 const calibrationDay=evaluationRows(meta,zone,s,'2026-09-08','physics',cal);
 assert.equal(summarize(calibrationDay).n,0);
});
test('missing sd does not create zero-width interval and bad data remains a gap',async()=>{
 const [meta,series]=await loadDataset(),zone=meta.zones[0],s=structuredClone(series.zones.A1);
 const first=evaluationRows(meta,zone,s,'2026-09-29','replay').find(x=>x.prediction!==null);
 s.sd[first.k]=null;let r=evaluationRows(meta,zone,s,'2026-09-29','replay').find(x=>x.k===first.k);
 assert.equal(r.lower,null);assert.notEqual(r.prediction,null);
 s.q[first.k]=3;r=evaluationRows(meta,zone,s,'2026-09-29','replay').find(x=>x.k===first.k);
 assert.equal(r.prediction,null);assert.equal(r.actual,null);assert.ok(r.excluded);
});
