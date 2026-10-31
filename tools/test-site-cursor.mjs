import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/nvisuals-hero/site-cursor.js',import.meta.url),'utf8');
function cursor(fine=true){
  const frames=new Map(),listeners=new Map();let serial=0;
  const dot={style:{}},ring={style:{},dataset:{},classList:{add(){},remove(){}}};
  const context={window:{addEventListener:(name,fn)=>listeners.set(name,fn)},
    document:{hidden:false,getElementById:id=>id==='cur-dot'?dot:ring,addEventListener:(name,fn)=>listeners.set(name,fn)},
    matchMedia:()=>({matches:fine,addEventListener(){}}),requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
  vm.runInNewContext(source,context);
  function tick(now){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));}
  const move=(x,y)=>listeners.get('pointermove')({pointerType:'mouse',clientX:x,clientY:y});
  return {frames,listeners,dot,ring,tick,move};
}
test('cursor coalesces input and sleeps after settling at 60 and 144 Hz',()=>{
  for(const hz of [60,144]){
    const c=cursor();assert.equal(c.frames.size,0);
    for(let x=0;x<50;x++)c.move(x,100);
    assert.equal(c.frames.size,1);
    for(let i=0;i<hz;i++)c.tick(i*1000/hz);
    assert.equal(c.frames.size,0);assert.equal(c.ring.dataset.motion,'idle');
    assert.equal(c.dot.style.transform,'translate(44px,95px)');
    assert.equal(c.ring.style.transform,'translate(49px,100px) translate(-50%,-50%)');
    c.move(400,300);assert.equal(c.frames.size,1);
    c.listeners.get('blur')();assert.equal(c.frames.size,0);assert.equal(c.dot.style.opacity,'0');
  }
});
test('coarse-pointer devices never start the custom cursor loop',()=>{
  const c=cursor(false);c.move(100,100);assert.equal(c.frames.size,0);assert.equal(c.dot.style.opacity,'0');
});
