import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {forecast,humidityRatio,relativeHumidity} from '../lib/physics.ts';
import {setupAuth,login,userFromToken,logout,requireUser} from '../lib/auth.ts';
import {addDocument,retrieveSops,extractDocument} from '../lib/documents.ts';
import {bmsSnapshot,createProposal,reviewProposal,loadReplay} from '../lib/bms.ts';
import {readState,transaction,verifyAudit} from '../lib/local-store.ts';
import {localAnswer} from '../lib/ollama.ts';
import {buildContext,loadDataset} from '../lib/copilot.ts';
process.env.RUAIX_DATA_DIR=await mkdtemp(path.join(os.tmpdir(),'ruaix-test-'));
const engineer={username:'engineering',role:'ENGINEERING'},qa={username:'qa',role:'QA'},viewer={username:'viewer',role:'VIEWER'};
test('psychrometric conversion roundtrip and no-change equilibrium conserve state',async()=>{
  const [meta,series]=await loadDataset(),zone=meta.zones[0],k=meta.snapshot_k,s=series.zones.A1;
  const initial={temperature_c:s.t[k],rh_pct:s.rh[k],dp_pa:s.dp[k],fan_hz:s.hz[k],quality_code:0,critical_step:false};
  assert.ok(Math.abs(relativeHumidity(22,humidityRatio(22,50))-50)<1e-9);
  const r=forecast(zone,initial,initial.fan_hz);
  assert.ok(Math.abs(r.endpoint.temperature_c-initial.temperature_c)<1e-9);
  assert.ok(Math.abs(r.endpoint.rh_pct-initial.rh_pct)<1e-9);
  assert.equal(r.energy.savedKWh,0);assert.equal(r.energy.measured,false);
  const reduced=forecast(zone,initial,initial.fan_hz-1);
  assert.ok(reduced.energy.savedKWh>0);assert.ok(reduced.endpoint.dp_pa<initial.dp_pa);
  assert.equal(forecast(zone,{...initial,quality_code:2},initial.fan_hz).gate.decision,'TAHAN');
  assert.equal(forecast(zone,{...initial,critical_step:true},initial.fan_hz).gate.decision,'TAHAN');
  assert.equal(forecast(zone,initial,initial.fan_hz-4).gate.decision,'TAHAN');
  assert.throws(()=>forecast(zone,{...initial,rh_pct:null},initial.fan_hz));
});
test('auth random credentials, tampering, permissions, logout and hashed storage',async()=>{
  await setupAuth();const credentials=await readFile(path.join(process.env.RUAIX_DATA_DIR,'access.txt'),'utf8');
  const password=credentials.split('\n').find(l=>l.startsWith('engineering: ')).split(': ')[1];
  await assert.rejects(login('engineering','incorrect'),e=>e.status===401);
  const session=await login('engineering',password);assert.equal(userFromToken(session.token).role,'ENGINEERING');
  assert.equal(userFromToken(session.token+'x'),null);
  const req=new Request('http://localhost/api/bms',{headers:{cookie:'ruaix_session='+session.token}});
  assert.throws(()=>requireUser(req,['QA']),e=>e.status===403);
  assert.ok(!(await readFile(path.join(process.env.RUAIX_DATA_DIR,'auth.json'),'utf8')).includes(password));
  logout(req);assert.equal(userFromToken(session.token),null);
});
test('LangChain retrieves evidence, deduplicates documents and does not invent matches',async()=>{
  const text=Buffer.from('SOP demo: sensor RH dikarantina jika kualitas buruk. Periksa kalibrasi kelembapan sebelum usulan penghematan energi.');
  const first=await addDocument('sample.md',text,'qa'),second=await addDocument('sample.md',text,'qa');
  assert.equal(first.id,second.id);assert.equal(second.duplicate,true);
  const docs=await retrieveSops('karantina sensor RH kalibrasi');assert.ok(docs.length>0);assert.match(docs[0].data.excerpt,/kalibrasi/);
  assert.equal((await retrieveSops('xylophoneunrelated')).length,0);
  await assert.rejects(extractDocument('x.pdf',Buffer.from('bad')),e=>e.status===415);
  await assert.rejects(extractDocument('x.docx',Buffer.from('bad')),e=>e.status===400);
});
test('BMS requires QA, rejects stale and duplicate actuation, persists feedback and audit',async()=>{
  const state=await bmsSnapshot(),z=state.zones.A3;
  const proposal=await createProposal(engineer,'A3',z.reading.fan_hz-1);
  assert.equal(proposal.status,'PENDING');
  await assert.rejects(reviewProposal(engineer,proposal.id,'approve','Checked'),e=>e.status===403);
  await assert.rejects(createProposal(viewer,'A3',42),e=>e.status===403);
  const applied=await reviewProposal(qa,proposal.id,'approve','Reviewed demo assumptions');
  assert.equal(applied.status,'APPLIED_SIMULATED');
  await assert.rejects(reviewProposal(qa,proposal.id,'approve','Again'),e=>e.status===409);
  const snapshot=await bmsSnapshot();assert.equal(snapshot.zones.A3.reading.fan_hz,proposal.targetHz);assert.equal(snapshot.auditValid,true);
  const stale=await createProposal(engineer,'A3',snapshot.zones.A3.reading.fan_hz);
  await loadReplay(engineer,'A3',2240);
  await assert.rejects(reviewProposal(qa,stale.id,'approve','Reviewed'),e=>e.status===409);
  const own=await createProposal(qa,'A3',43);
  await assert.rejects(reviewProposal(qa,own.id,'approve','Reviewed'),e=>e.status===403);
  const blocked=await createProposal(engineer,'A3',10);assert.equal(blocked.status,'BLOCKED');
  await assert.rejects(reviewProposal(qa,blocked.id,'approve','Reviewed'),e=>e.status===409);
  const rows=(await readState()).audit;rows[0].action='tampered';assert.equal(verifyAudit(rows),false);
});
test('BMS rejects shadow mode, expired proposals and validates before command',async()=>{
  await loadReplay(engineer,'A3',100);
  const shadow=await createProposal(engineer,'A3',43);assert.equal(shadow.status,'BLOCKED');
  await loadReplay(engineer,'A3',2240);
  const p=await createProposal(engineer,'A3',42);
  await transaction(s=>{s.proposals.find(x=>x.id===p.id).expiresAt='2020-01-01T00:00:00Z';});
  await assert.rejects(reviewProposal(qa,p.id,'approve','Reviewed'),e=>e.status===409);
});
test('Ollama uses only loopback and validates dynamically retrieved citations',async()=>{
  const context=buildContext(await loadDataset(),'A3');
  context.sources.push({id:'sop_test_1',file:'sample.md',detail:'chunk 1',data:{excerpt:'test'}});
  const answer={summary:'Ringkasan',findings:[{text:'Bukti',source_ids:['sop_test_1']}],checks:[],limitations:[]};
  const result=await localAnswer(context,'SOP?',async(url,init)=>{
    assert.match(url,/^http:\/\/(127\.0\.0\.1|localhost):11434\/api\/chat$/);
    const body=JSON.parse(init.body);assert.equal(body.stream,false);assert.equal(body.think,false);
    assert.ok(body.format.properties.findings.items.properties.source_ids.items.enum.includes('sop_test_1'));
    return new Response(JSON.stringify({done:true,done_reason:'stop',message:{content:JSON.stringify(answer)}}));
  });
  assert.deepEqual(result.answer,answer);
  process.env.OLLAMA_BASE_URL='https://external.example';
  await assert.rejects(localAnswer(context,'x'),e=>e.status===504||e.status===503);
  delete process.env.OLLAMA_BASE_URL;
});

test('local provider failures never become fabricated AI answers',async()=>{
  const c=buildContext(await loadDataset(),'A3');
  await assert.rejects(localAnswer(c,'x',async()=>{throw new Error('offline');}),e=>e.status===504);
  await assert.rejects(localAnswer(c,'x',async()=>new Response('',{status:500})),e=>e.status===502);
  await assert.rejects(localAnswer(c,'x',async()=>new Response(JSON.stringify({done:true,done_reason:'length'}))),e=>e.status===502);
  await assert.rejects(localAnswer(c,'x',async()=>new Response('not-json')),e=>e.status===502);
});
