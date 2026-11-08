import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, buildContext, loadDataset, parseAnswer, demoAnswer } from '../lib/copilot.ts';
test('input rejects unsupported zone, invalid time and oversized questions', () => {
  for (const v of [{zone:'../../x',question:'x'}, {zone:'A1',question:''}, {zone:'A1',question:'x',k:-1}, {zone:'A1',question:'x'.repeat(1201)}, {zone:'A1',question:'x',demo:'yes'}]) assert.throws(() => validateInput(v));
});
test('real fixture snapshot and latest past gate stay scoped to selected zone/time', async () => {
  const data = await loadDataset(),c = buildContext(data, 'A3', 2240);
  assert.equal(c.sources[1].data.rh_pct, 50.12);assert.ok(c.sources[2].data.at <= c.at);
  assert.equal(c.at, '2026-09-30T01:00:00.000Z');assert.throws(() => buildContext(data, 'A3', 2688));
});
test('bad quality and missing sensor cannot produce LULUS', async () => {
  const data = structuredClone(await loadDataset());data[1].zones.A1.q[2240] = 2;
  assert.equal(buildContext(data,'A1',2240).assessment,'TAHAN');
  data[1].zones.A1.q[2240] = 0;data[1].zones.A1.rh[2240] = null;
  assert.equal(buildContext(data,'A1',2240).assessment,'TAHAN');
});
test('refusal, truncated output and invented references are rejected; demo is explicit',async()=>{
  assert.throws(()=>parseAnswer({status:'incomplete'}));
  assert.throws(()=>parseAnswer({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}));
  assert.throws(()=>parseAnswer({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'x',findings:[{text:'x',source_ids:['invented']}],checks:[],limitations:[]})}]}]}));
  assert.match(demoAnswer(buildContext(await loadDataset(),'A1')).summary,/bukan jawaban AI/);
});
