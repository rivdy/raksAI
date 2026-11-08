'use client';
import { useEffect,useState } from 'react';
export default function DocumentsPanel(){
  const [documents,setDocuments]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function refresh(){const r=await fetch('/api/documents'),v=await r.json();if(!r.ok)throw new Error(v.error);setDocuments(v.documents);}
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  async function upload(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');setMessage('');const form=e.currentTarget;
    const file=new FormData(form).get('file') as File;if(!file?.size)return;
    if(file.size>4*1024*1024){setError('Batas unggahan 4 MB.');return;}
    setBusy(true);
    try{
      const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('File tidak terbaca.'));r.readAsDataURL(file);});
      const response=await fetch('/api/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,base64})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      setMessage(result.duplicate?'Dokumen sudah ada.':result.name+' diindeks menjadi '+result.chunks+' bagian.');form.reset();await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Unggahan gagal.');}finally{setBusy(false);}
  }
  return <details className="rounded-xl border border-line bg-white p-5"><summary className="cursor-pointer font-semibold">Pustaka SOP / dokumen ({documents.length})</summary>
    <p className="mt-3 text-sm text-steel">DOCX, TXT, MD · maksimum 4 MB. Teks dicari melalui LangChain dan diproses Ollama lokal. Dokumen adalah referensi belum diverifikasi; PDF/scan belum didukung.</p>
    <form onSubmit={upload} className="my-4 flex flex-wrap gap-3"><label className="text-sm">Dokumen<input required type="file" name="file" accept=".docx,.txt,.md" className="ml-2 max-w-full"/></label>
      <button disabled={busy} className="rounded bg-ink px-3 py-2 text-sm text-white disabled:opacity-50">{busy?'Mengindeks…':'Unggah & indeks'}</button></form>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-teal-700">{message}</p>}
    <ul className="mt-3 space-y-2 text-sm">{documents.map(d=><li key={d.id} className="rounded bg-mist p-3">{d.name} · {d.chunks} bagian<br/><span className="text-xs text-steel">{d.status} · {d.uploadedBy}</span></li>)}</ul>
  </details>;
}
