import { randomUUID } from 'node:crypto';
import { loadDataset, buildContext } from './copilot';
import { forecast } from './physics';
import { transaction, readState, appendAudit, verifyAudit, type State } from './local-store';
import { HttpError } from './http';
import type { User } from './auth';

export async function initializeBms(state: State) {
  if(Object.keys(state.zones).length)return;
  const data=await loadDataset();
  for(const zone of data[0].zones){
    const context=buildContext(data,zone.code);
    state.zones[zone.code]={zone,reading:context.sources[1].data,version:1,at:context.at,recordedAssessment:context.assessment,mode:context.sources[2].data.mode,online:true,maintenance:false};
  }
}
export async function bmsSnapshot() {
  await transaction(initializeBms);
  const state=await readState();
  return {kind:'SIMULATOR',zones:state.zones,proposals:state.proposals.slice(-50).reverse(),audit:state.audit.slice(-50).reverse(),auditValid:verifyAudit(state.audit)};
}
function evaluate(z:any,targetHz:number) {
  let result: ReturnType<typeof forecast>; try { result=forecast(z.zone,z.reading,targetHz); } catch { throw new HttpError(422,'Sensor tidak lengkap atau tidak valid; prediksi dan aktuasi ditahan.'); }
  if(!z.online)result.gate.reasons.push('Simulator BMS offline.');
  if(z.maintenance)result.gate.reasons.push('Maintenance lock aktif.');
  if(z.recordedAssessment!=='LULUS')result.gate.reasons.push('Gate replay memerlukan penahanan atau tinjauan.');
  if(z.mode!=='ADVISORY')result.gate.reasons.push('Mode harus ADVISORY untuk aktuasi simulator.');
  if(result.gate.reasons.length)result.gate.decision='TAHAN';
  return result;
}
export async function createProposal(user:User,zone:string,targetHz:number) {
  if(!['ENGINEERING','QA'].includes(user.role))throw new HttpError(403,'Hanya Engineering/QA dapat mengusulkan.');
  if(typeof targetHz!=='number'||!Number.isFinite(targetHz)||targetHz<1||targetHz>60)throw new HttpError(400,'Frekuensi harus 1–60 Hz.');
  return transaction(async state=>{
    await initializeBms(state);const z=state.zones[zone];if(!z)throw new HttpError(400,'Zona tidak valid.');
    const result=evaluate(z,targetHz);
    const proposal={id:randomUUID(),zone,baseVersion:z.version,targetHz,result,status:result.gate.decision==='LULUS'?'PENDING':'BLOCKED',createdBy:user.username,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+15*60000).toISOString()};
    state.proposals.push(proposal);appendAudit(state,user.username,'PROPOSAL_CREATED',{id:proposal.id,zone,targetHz,decision:result.gate.decision});
    return proposal;
  });
}
export async function reviewProposal(user:User,id:string,decision:string,comment:string) {
  if(user.role!=='QA')throw new HttpError(403,'Persetujuan memerlukan akun QA.');
  if(!['approve','reject'].includes(decision)||typeof comment!=='string'||comment.trim().length<5||comment.length>1000)throw new HttpError(400,'Isi alasan tinjauan (5–1.000 karakter).');
  return transaction(state=>{
    const p=state.proposals.find(x=>x.id===id);if(!p)throw new HttpError(404,'Usulan tidak ditemukan.');
    if(p.status!=='PENDING')throw new HttpError(409,'Usulan sudah diproses atau ditahan.');
    if(p.createdBy===user.username)throw new HttpError(403,'Pengusul tidak boleh menyetujui usulannya sendiri.');
    const z=state.zones[p.zone];
    if(Date.parse(p.expiresAt)<Date.now())throw new HttpError(409,'Usulan kedaluwarsa. Buat usulan baru.');
    if(p.baseVersion!==z.version)throw new HttpError(409,'Kondisi simulator berubah. Buat usulan baru.');
    if(decision==='approve'){
      const checked=evaluate(z,p.targetHz);
      if(checked.gate.decision!=='LULUS')throw new HttpError(409,'Pemeriksaan ulang menahan usulan.');
      appendAudit(state,user.username,'QA_APPROVED',{id:p.id,comment:comment.trim()});
      // Atomic simulated actuation + feedback. No network adapter or real BMS endpoint exists.
      z.reading={...z.reading,...checked.endpoint,fan_hz:p.targetHz};delete z.reading.minute;
      z.version++;z.at=new Date(Date.parse(z.at)+30*60000).toISOString();
      p.status='APPLIED_SIMULATED';p.feedback={fan_hz:z.reading.fan_hz,version:z.version,at:z.at,simulated:true};
      appendAudit(state,user.username,'SIMULATED_BMS_FEEDBACK',{id:p.id,zone:p.zone,...p.feedback});
    }else{p.status='REJECTED';appendAudit(state,user.username,'QA_REJECTED',{id:p.id,comment:comment.trim()});}
    p.reviewedBy=user.username;p.comment=comment.trim();return p;
  });
}
export async function loadReplay(user:User,zone:string,k:number) {
  if(user.role!=='ENGINEERING'&&user.role!=='QA')throw new HttpError(403,'Peran tidak diizinkan.');
  if(!Number.isInteger(k)||k<0)throw new HttpError(400,'Indeks replay harus bilangan bulat nonnegatif.');
  const data=await loadDataset();const context=buildContext(data,zone,k);
  return transaction(async state=>{
    await initializeBms(state);const z=state.zones[zone];if(!z)throw new HttpError(400,'Zona tidak valid.');
    z.reading=context.sources[1].data;z.at=context.at;z.version++;z.recordedAssessment=context.assessment;z.mode=context.sources[2].data.mode;
    appendAudit(state,user.username,'SIMULATOR_REPLAY_LOADED',{zone,k,version:z.version});return z;
  });
}
