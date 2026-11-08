import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {addDocument} from '../lib/documents';
async function main(){for(const file of process.argv.slice(2)){const result=await addDocument(path.basename(file),await readFile(file),'archive-import');console.log(JSON.stringify(result));}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
