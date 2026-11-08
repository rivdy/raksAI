import { createHash, randomUUID } from 'node:crypto';
import mammoth from 'mammoth';
import yauzl from 'yauzl';
import { Document } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { transaction, readState, appendAudit } from './local-store';
import { HttpError } from './http';

async function validateDocx(buffer:Buffer){
  await new Promise<void>((resolve,reject)=>yauzl.fromBuffer(buffer,{lazyEntries:true},(error,zip)=>{
    if(error||!zip)return reject(new HttpError(400,'DOCX tidak valid.'));
    let bytes=0,count=0,found=false;
    zip.on('error',()=>reject(new HttpError(400,'Arsip DOCX rusak.')));
    zip.on('entry',(entry)=>{
      bytes+=entry.uncompressedSize;count++;if(entry.fileName==='word/document.xml')found=true;
      if(bytes>16*1024*1024||count>2048){zip.close();reject(new HttpError(413,'Isi DOCX terlalu besar.'));return;}
      zip.readEntry();
    });
    zip.on('end',()=>found?resolve():reject(new HttpError(400,'File bukan DOCX.')));
    zip.readEntry();
  }));
}
export async function extractDocument(name:string,buffer:Buffer){
  if(!buffer.length||buffer.length>4*1024*1024)throw new HttpError(413,'Batas dokumen 4 MB.');
  const ext=name.split('.').at(-1)?.toLowerCase();
  let text:string;
  if(ext==='docx'){await validateDocx(buffer);try{text=(await mammoth.extractRawText({buffer})).value;}catch{throw new HttpError(400,'Teks DOCX tidak dapat dibaca.');}}
  else if(ext==='txt'||ext==='md')text=buffer.toString('utf8');
  else throw new HttpError(415,'Format yang didukung: DOCX, TXT, MD. PDF/scan belum didukung.');
  text=text.replace(/\u0000/g,'').trim();
  if(text.length<30||text.length>120000)throw new HttpError(400,'Teks harus 30–120.000 karakter.');
  return text;
}
export async function addDocument(name:string,buffer:Buffer,actor:string){
  if(typeof name!=='string'||name.length>180)throw new HttpError(400,'Nama file tidak valid.');
  const safeName=name.replace(/[^\p{L}\p{N}._ -]/gu,'_');
  const text=await extractDocument(safeName,buffer),hash=createHash('sha256').update(text).digest('hex');
  const splitter=new RecursiveCharacterTextSplitter({chunkSize:1000,chunkOverlap:150});
  const chunks=await splitter.splitText(text);
  return transaction(state=>{
    const existing=state.documents.find(d=>d.hash===hash);if(existing)return {id:existing.id,name:existing.name,chunks:existing.chunks.length,duplicate:true};
    if(state.documents.length>=20)throw new HttpError(409,'Batas 20 dokumen lokal tercapai.');
    const doc={id:randomUUID(),name:safeName,hash,uploadedAt:new Date().toISOString(),uploadedBy:actor,status:'REFERENSI BELUM DIVERIFIKASI',chunks};
    state.documents.push(doc);appendAudit(state,actor,'DOCUMENT_IMPORTED',{id:doc.id,name:safeName,hash});
    return {id:doc.id,name:safeName,chunks:chunks.length,duplicate:false};
  });
}
const stop=new Set(['yang','dan','di','ke','dari','untuk','ini','itu','apa','bagaimana','dengan','the','and','of','to','a','is']);
const tokens=(s:string):string[]=>{const matches:string[]=s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];return matches.filter(x=>x.length>1&&!stop.has(x));};
export class SopRetriever extends BaseRetriever {
  lc_namespace=['ruaix','sop'];
  docs:Document[];
  constructor(docs:Document[]){super();this.docs=docs;}
  async _getRelevantDocuments(query:string){
    const terms=[...new Set(tokens(query))], texts=this.docs.map(d=>tokens(d.pageContent)),avg=texts.reduce((s,x)=>s+x.length,0)/(texts.length||1);
    const scored=this.docs.map((doc,i)=>{
      let score=0;
      for(const term of terms){
        const tf=texts[i].filter(t=>t===term).length;if(!tf)continue;
        const df=texts.filter(t=>t.includes(term)).length;
        score+=Math.log(1+(texts.length-df+0.5)/(df+0.5))*tf*2.2/(tf+1.2*(0.25+0.75*texts[i].length/(avg||1)));
      }
      return {doc,score};
    });
    return scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.doc);
  }
}
export async function retrieveSops(query:string){
  const state=await readState();
  const docs=state.documents.flatMap(d=>d.chunks.map((text:string,i:number)=>new Document({pageContent:text,metadata:{id:'sop_'+d.id+'_'+(i+1),name:d.name,chunk:i+1,hash:d.hash,status:d.status}})));
  const retrieved=await new SopRetriever(docs).invoke(query);
  return retrieved.map(d=>({id:d.metadata.id,file:d.metadata.name,detail:'Bagian '+d.metadata.chunk+' · '+d.metadata.status,data:{excerpt:d.pageContent,sha256:d.metadata.hash}}));
}
export async function listDocuments(){return (await readState()).documents.map(({chunks,...d})=>({...d,chunks:chunks.length}));}
