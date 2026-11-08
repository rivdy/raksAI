import { buildContext, demoAnswer, loadDataset, validateInput, type Context } from '@/lib/copilot';
import { requireUser } from '@/lib/auth';
import { body,fail,json,HttpError } from '@/lib/http';
import { retrieveSops } from '@/lib/documents';
import { localAnswer,ollamaBase } from '@/lib/ollama';
import { bmsSnapshot } from '@/lib/bms';
import { forecast } from '@/lib/physics';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const runtimeState=globalThis as typeof globalThis & {ruaixInferenceBusy?:boolean};
export async function POST(request:Request){
  try{
    requireUser(request);
    const raw=await body(request),input=validateInput(raw);
    if(raw.source!==undefined&&!['replay','bms'].includes(raw.source))throw new HttpError(400,'Sumber data tidak valid.');
    const data=await loadDataset();
    const context:Context=buildContext(data,input.zone,input.k);
    if(raw.source==='bms'){
      const simulator=await bmsSnapshot(),z=simulator.zones[input.zone];
      context.at=z.at;context.assessment=z.recordedAssessment;
      context.sources[1]={id:'sensor',file:'BMS simulator',detail:'Versi '+z.version+' · '+z.at,data:z.reading};
      context.sources[2]={id:'gate',file:'BMS simulator',detail:'Gate awal replay; belum merupakan persetujuan usulan baru',data:{decision:z.recordedAssessment,mode:z.mode,version:z.version}};
    }
    const initial=context.sources[1].data,zone=data[0].zones.find((z:any)=>z.code===input.zone);
    if([initial.temperature_c,initial.rh_pct,initial.dp_pa,initial.fan_hz].every(x=>typeof x==='number'&&Number.isFinite(x))&&initial.fan_hz>0){
      const physics=forecast(zone,initial,Math.max(zone.hz_min,initial.fan_hz-1));
      context.sources.push({id:'physics',file:'lumped-balance-v1',detail:'Skenario fan -1 Hz; prediksi baru dari model fisika, bukan rekaman',data:{...physics,trajectory:undefined}});
    }
    context.sources.push(...await retrieveSops(input.question));
    if(input.demo)return json({mode:'demo',context,answer:demoAnswer(context)});
    if(runtimeState.ruaixInferenceBusy)throw new HttpError(429,'Model lokal sedang menganalisis. Coba setelah analisis selesai.');
    runtimeState.ruaixInferenceBusy=true;
    try{
      const {answer,model}=await localAnswer(context,input.question);
      return json({mode:'local',model,context,answer});
    }finally{runtimeState.ruaixInferenceBusy=false;}
  }catch(e){return fail(e);}
}

export async function GET(request:Request){
  try{
    requireUser(request);
    const model=process.env.OLLAMA_MODEL||'qwen3:1.7b';
    try{
      const response=await fetch(ollamaBase()+'/api/tags',{signal:AbortSignal.timeout(3000),cache:'no-store'});
      if(!response.ok)return json({ready:false,model,message:'Ollama belum siap.'});
      const tags=await response.json(),ready=Array.isArray(tags.models)&&tags.models.some((m:any)=>m.name===model);
      return json({ready,model,message:ready?'Model lokal siap.':'Model belum tersedia. Selesaikan ollama pull '+model});
    }catch{return json({ready:false,model,message:'Ollama tidak terhubung. Jalankan aplikasi Ollama.'});}
  }catch(e){return fail(e);}
}