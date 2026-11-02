import {readFile,writeFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {gzipSync} from 'node:zlib';
const file='assets/glass-folders/portfolio-folders.js';
const result=await transform(await readFile(file,'utf8'),{format:'esm',target:'es2022',minify:true,legalComments:'eof'});
await writeFile(file,result.code);
const licenses=[];
for(const name of ['react','react-dom','scheduler','lucide-react']){
  licenses.push(name+'\n'+'='.repeat(name.length)+'\n'+await readFile('node_modules/'+name+'/LICENSE','utf8'));
}
await writeFile('assets/glass-folders/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n'));
console.log('Folder script: '+(Buffer.byteLength(result.code)/1024).toFixed(1)+' kB / '+(gzipSync(result.code).length/1024).toFixed(1)+' kB gzip, loaded only near the portfolio.');
