import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.split('// ── INTRO SPLASH ──')[1].split('</script>')[0];
function intro(){
  let now=0,serial=0;const timers=new Map(),listeners=new Map(),classes=new Set();
  const overlay={style:{},classList:{add:name=>classes.add(name)}};
  const elements={'intro-overlay':overlay,mainNav:{style:{}},'i-bar':{style:{}},'page-home':{classList:{add(){}}}};
  const context={document:{body:{style:{}},getElementById:id=>elements[id]},performance:{now:()=>now},
    window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)},
    setTimeout:(fn,delay)=>{timers.set(++serial,{fn,at:now+delay});return serial;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(source,context);
  function advance(to){
    while(true){const next=[...timers].filter(([,task])=>task.at<=to).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}
    now=to;
  }
  function ready(){const fn=listeners.get('nvisuals:assets-ready');listeners.delete('nvisuals:assets-ready');fn?.();}
  return {advance,ready,classes,overlay,context,timers};
}
test('ready artwork releases the brand splash after its short minimum',()=>{
  const i=intro();i.advance(300);i.ready();i.advance(1199);assert.ok(!i.classes.has('i-exit'));
  i.advance(1200);assert.ok(i.classes.has('i-exit'));i.advance(1880);
  assert.equal(i.overlay.style.display,'none');assert.equal(i.context.document.body.style.overflow,'');assert.equal(i.timers.size,0);
});
test('missing readiness still releases the splash through the fallback',()=>{
  const i=intro();i.advance(3499);assert.ok(!i.classes.has('i-exit'));
  i.advance(3500);assert.ok(i.classes.has('i-exit'));i.advance(4180);assert.equal(i.overlay.style.display,'none');
});
