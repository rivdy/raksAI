import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, buildContext, loadDataset, generateAnswer, parseAnswer, demoAnswer } from '../lib/copilot.ts';
test('input rejects unsupported zone, invalid time and oversized questions', () => {
  for (const v of [{zone:'../../x',question:'x'}, {zone:'A1',question:''}, {zone:'A1',question:'x',k:-1}, {zone:'A1',question:'x'.repeat(1201)}, {zone:'A1',question:'x',demo:'yes'}]) assert.throws(() => validateInput(v));
});
test('real fixture snapshot and latest past gate stay scoped to selected zone/time', async () => {
  const data = await loadDataset();
  const c = buildContext(data, 'A3', 2240);
  assert.equal(c.sources[1].data.rh_pct, 50.12);
  assert.ok(c.sources[2].data.at <= c.at);
  assert.equal(c.at, '2026-09-30T01:00:00.000Z');
  assert.throws(() => buildContext(data, 'A3', 2688));
});
test('bad quality and missing sensor cannot produce LULUS', async () => {
  const data = structuredClone(await loadDataset());
  data[1].zones.A1.q[2240] = 2;
  assert.equal(buildContext(data,'A1',2240).assessment,'TAHAN');
  data[1].zones.A1.q[2240] = 0;
  data[1].zones.A1.rh[2240] = null;
  assert.equal(buildContext(data,'A1',2240).assessment,'TAHAN');
});
const output = {summary:'Ringkasan',findings:[{text:'Data simulasi',source_ids:['sensor']}],checks:['Periksa sensor'],limitations:['Sintetis']};
const response = answer => ({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(answer)}]}]});
test('provider receives bounded trusted context and structured output; no storage', async () => {
  const context = buildContext(await loadDataset(),'A3');
  const answer = await generateAnswer(context, 'Jelaskan', {apiKey:'test',model:'test',fetcher:async(url, init) => {
    assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(init.body);
    assert.equal(body.store,false);
    assert.equal(body.text.format.strict,true);
    assert.equal(JSON.parse(body.input).context.zone,'A3');
    return new Response(JSON.stringify(response(output)));
  }});
  assert.deepEqual(answer,output);
});
test('refusal, truncated output, invalid references, rate limits and network failure handled', async () => {
  assert.throws(() => parseAnswer({status:'incomplete'}));
  assert.throws(() => parseAnswer({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}));
  assert.throws(() => parseAnswer(response({...output,findings:[{text:'x',source_ids:['invented']}]})));
  const context=buildContext(await loadDataset(),'A1');
  await assert.rejects(generateAnswer(context,'x',{apiKey:'test',model:'test',fetcher:async()=>new Response('',{status:429})}), e=>e.status===429);
  await assert.rejects(generateAnswer(context,'x',{apiKey:'test',model:'test',fetcher:async()=>{throw new Error('secret');}}), e=>e.status===504 && !e.message.includes('secret'));
  assert.match(demoAnswer(context).summary,/bukan jawaban AI/);
});
