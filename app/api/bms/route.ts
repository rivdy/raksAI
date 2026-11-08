import { requireUser } from '@/lib/auth';
import { body,fail,json,HttpError } from '@/lib/http';
import { bmsSnapshot,createProposal,reviewProposal,loadReplay } from '@/lib/bms';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{requireUser(request);return json(await bmsSnapshot());}catch(e){return fail(e);}}
export async function POST(request:Request){
  try{
    const user=requireUser(request,['ENGINEERING','QA']),v=await body(request);
    if(!v||typeof v!=='object')throw new HttpError(400,'Input tidak valid.');
    if(v.action==='propose')return json(await createProposal(user,v.zone,v.targetHz));
    if(v.action==='review')return json(await reviewProposal(user,v.id,v.decision,v.comment));
    if(v.action==='replay')return json(await loadReplay(user,v.zone,v.k));
    throw new HttpError(400,'Aksi tidak dikenal.');
  }catch(e){return fail(e);}
}
