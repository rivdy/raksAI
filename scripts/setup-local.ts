import { setupAuth } from '../lib/auth';
import { readFile,writeFile } from 'node:fs/promises';
import { addDocument } from '../lib/documents';
async function main(){
  const created=await setupAuth();
  await addDocument('SOP-DEMO-001.md',await readFile('docs/sample-sop.md'),'setup');
  try{await writeFile('.env.local','OLLAMA_BASE_URL=http://127.0.0.1:11434\nOLLAMA_MODEL=qwen3:1.7b\n',{flag:'wx'});}catch(e:any){if(e.code!=='EEXIST')throw e;}
  console.log(created?'Akun dibuat. Lihat .local/access.txt secara lokal; password tidak dicetak.':'Akun lokal yang ada dipertahankan.');
  console.log('Contoh SOP siap. Jalankan Ollama dan npm run dev -- --hostname 127.0.0.1');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
