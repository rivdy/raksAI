import { requireUser } from '@/lib/auth';
import { body,fail,json,HttpError } from '@/lib/http';
import { addDocument,listDocuments } from '@/lib/documents';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{requireUser(request);return json({documents:await listDocuments()});}catch(e){return fail(e);}}
export async function POST(request:Request){
  try{
    const user=requireUser(request,['ENGINEERING','QA']),v=await body(request,5700000);
    if(typeof v?.name!=='string'||typeof v?.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(v.base64))throw new HttpError(400,'Unggahan tidak valid.');
    return json(await addDocument(v.name,Buffer.from(v.base64,'base64'),user.username));
  }catch(e){return fail(e);}
}
