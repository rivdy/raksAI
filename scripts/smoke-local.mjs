import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.SMOKE_BASE||'http://127.0.0.1:3000';
const credentials=Object.fromEntries((await readFile('.local/access.txt','utf8')).split('\n').filter(x=>x.includes(': ')).map(x=>x.split(': ')));
const request=async(route,cookie,body)=>fetch(base+route,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const check=async(response,status)=>{const value=await response.json();assert.equal(response.status,status,JSON.stringify(value));return value;};
async function login(username){
 const r=await request('/api/auth',null,{username,password:credentials[username]});assert.equal(r.status,200);
 assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/SameSite=strict/i);
 return r.headers.get('set-cookie').split(';')[0];
}
assert.equal((await fetch(base+'/lab',{redirect:'manual'})).status,307);
for(const route of ['/api/bms','/api/documents','/api/auth'])assert.equal((await request(route)).status,401);
const engineer=await login('engineering'),qa=await login('qa'),viewer=await login('viewer');
assert.equal((await fetch(base+'/lab',{headers:{cookie:engineer}})).status,200);
const snap=await check(await request('/api/bms',engineer),200);
await check(await request('/api/bms',viewer,{action:'propose',zone:'A3',targetHz:42}),403);
await check(await request('/api/bms',engineer,{action:'replay',zone:'A3',k:2240}),200);
const proposal=await check(await request('/api/bms',engineer,{action:'propose',zone:'A3',targetHz:42}),200);
assert.equal(proposal.status,'PENDING');
await check(await request('/api/bms',engineer,{action:'review',id:proposal.id,decision:'approve',comment:'QA smoke review'}),403);
const applied=await check(await request('/api/bms',qa,{action:'review',id:proposal.id,decision:'approve',comment:'Uji end-to-end simulator; bukan operasi pabrik.'}),200);
assert.equal(applied.status,'APPLIED_SIMULATED');
await check(await request('/api/bms',qa,{action:'review',id:proposal.id,decision:'approve',comment:'Duplicate review'}),409);
let upload;
try { upload={name:'01_ID_Regulasi_AI_Farmasi.docx',base64:(await readFile('.local/imports/01_ID_Regulasi_AI_Farmasi.docx')).toString('base64')}; }
catch(error) { if(error.code!=='ENOENT')throw error; upload={name:'SOP-DEMO-001.md',base64:(await readFile('docs/sample-sop.md')).toString('base64')}; }
await check(await request('/api/documents',viewer,upload),403);
const imported=await check(await request('/api/documents',engineer,upload),200);assert.equal(imported.duplicate,true);
const csrf=await fetch(base+'/api/bms',{method:'POST',headers:{cookie:qa,'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify({action:'replay',zone:'A3',k:2240})});assert.equal(csrf.status,403);
const d=await check(await request('/api/documents',engineer),200);assert.ok(d.documents.length>0);
const health=await check(await request('/api/copilot',engineer),200);assert.equal(health.ready,true,health.message);
const demo=await check(await request('/api/copilot',engineer,{zone:'A3',source:'bms',question:'Apa SOP pemeriksaan sensor RH sebelum penghematan energi?',demo:true}),200);
assert.equal(demo.context.sources[1].data.fan_hz,42);assert.ok(demo.context.sources.some(s=>s.id.startsWith('sop_')));
const started=Date.now();
const live=await check(await request('/api/copilot',engineer,{zone:'A3',source:'bms',question:'Menurut SOP demo, apa yang diperiksa sebelum usulan perubahan fan? Sebutkan batas klaim penghematan.'}),200);
assert.equal(live.mode,'local');assert.ok(live.answer.findings.length>0);
assert.ok(live.answer.findings.every(f=>f.source_ids.every(id=>live.context.sources.some(s=>s.id===id))));
await writeFile('.local/last-ai-test.json',JSON.stringify({at:new Date().toISOString(),durationSeconds:(Date.now()-started)/1000,...live},null,2));
const logout=await fetch(base+'/api/auth',{method:'DELETE',headers:{cookie:engineer}});assert.equal(logout.status,200);
assert.equal((await request('/api/bms',engineer)).status,401);
console.log(JSON.stringify({passed:true,model:live.model,aiDurationSeconds:(Date.now()-started)/1000,documents:d.documents.length,feedback:applied.feedback,findings:live.answer.findings.length,evidence:'.local/last-ai-test.json'}));
