import {build} from 'esbuild';
import sharp from 'sharp';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Run the exact component painter at build time, rather than in visitors' frames.
const result = await build({entryPoints:['components/ui/glass-folder-art.ts'],bundle:true,platform:'node',format:'esm',write:false});
const art = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const out=resolve('assets/glass-folders/art');
await mkdir(out,{recursive:true});
const entries=[['graphic','aurora',3],['podcast','ember',11],['event','verdant',7],['shortform','dusk',5],['website','glacier',3],['logo','verdant',19]];
for(const [name,preset,seed] of entries){
  const job=art.createArtJob(728,592,art.ART_PRESETS[preset],seed);
  while(!job.step(64)){}
  const bytes=await sharp(Buffer.from(job.pixels),{raw:{width:job.width,height:job.height,channels:4}}).webp({quality:83}).toBuffer();
  await writeFile(resolve(out,name+'.webp'),bytes);
  console.log(name+': '+(bytes.length/1024).toFixed(1)+' kB');
}
