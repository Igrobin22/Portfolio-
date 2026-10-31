import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source=name=>readFileSync(new URL('../assets/nvisuals-hero/'+name,import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('the splash and slide finish before ambient animation starts',async()=>{
  const states={},listeners=new Map(),observers=[];
  const media={matches:false,addEventListener(){}};
  const makeController=name=>({setPlaying(value){states[name]=value;},refresh(){},destroy(){}});
  const title={style:{}},button={dataset:{},setAttribute(){},addEventListener:(name,fn)=>listeners.set(name,fn)};
  const frame={getBoundingClientRect:()=>({width:1600,height:900})};
  const elements={'#hero-title':title,'#hero-character':{},'.nv-motion-toggle':button,'.composition':frame};
  const hero={dataset:{},querySelector:key=>elements[key],querySelectorAll:()=>[]};
  const splash={style:{display:''},hidden:false,classList:{contains:()=>true}};
  let intersect,mutation,complete,starts=0;
  const document={hidden:false,getElementById:id=>id==='hero'?hero:splash,
    fonts:{load:()=>Promise.resolve()},addEventListener:(name,fn)=>listeners.set(name,fn),
    createElement:()=>({getContext:()=>({measureText:()=>({width:800,actualBoundingBoxLeft:400,actualBoundingBoxRight:400,actualBoundingBoxAscent:500,actualBoundingBoxDescent:0})})})};
  const scrollTimers=new Map();let timerId=0;
  const context={document,window:{addEventListener:(name,fn)=>listeners.set('window:'+name,fn)},matchMedia:()=>media,
    setTimeout:fn=>{scrollTimers.set(++timerId,fn);return timerId;},clearTimeout:id=>scrollTimers.delete(id),
    createHeroProximity:()=>makeController('proximity'),createHeroExperience:()=>makeController('experience'),
    createHeroTextEnergy:()=>makeController('energy'),createHeroCharacter:()=>makeController('rig'),
    createHeroEntrance:(_,__,options)=>{
      hero.dataset.entrance='pending';
      complete=()=>{hero.dataset.entrance='complete';options.onComplete();};
      return {...makeController('entrance'),start(){starts++;hero.dataset.entrance='running';}};
    },
    MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){}},
    IntersectionObserver:class{constructor(fn){intersect=fn;}observe(){}disconnect(){}},
    ResizeObserver:class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}}};
  vm.runInNewContext(source('hero-site.js'),context);await flush();
  intersect([{isIntersecting:true}]);
  mutation(); // The splash curtain has started exiting, but still covers the hero.
  assert.equal(starts,0);assert.equal(states.rig,false);
  splash.style.display='none';mutation();
  assert.equal(starts,1);assert.equal(states.entrance,true);
  assert.equal(hero.dataset.motion,'paused');
  for(const name of ['rig','proximity','energy'])assert.equal(states[name],false);
  complete();
  for(const name of ['rig','proximity','energy'])assert.equal(states[name],true);
  assert.equal(hero.dataset.motion,'playing');
  listeners.get('window:scroll')();assert.equal(states.rig,false);assert.equal(states.entrance,true);
  [...scrollTimers.values()].forEach(fn=>fn());scrollTimers.clear();assert.equal(states.rig,true);
  listeners.get('click')();assert.equal(states.rig,false);
  listeners.get('click')();assert.equal(states.rig,true);assert.equal(starts,1);
  document.hidden=true;listeners.get('visibilitychange')();assert.equal(states.rig,false);
  document.hidden=false;listeners.get('visibilitychange')();assert.equal(states.rig,true);
  intersect([{isIntersecting:false}]);assert.equal(states.rig,false);
});

test('the slide preserves artwork scales and releases its effects after pause/resume',async()=>{
  const animations=[],reads=[],listeners=new Map(),root={dataset:{heroIntro:'pending'}};
  const media={matches:false,addEventListener(){},removeEventListener(){}};
  function element(name,transform='none'){
    return {name,transform,animate(keyframes,timing){
      let finish;
      const animation={keyframes,timing,playState:'running',finished:new Promise(resolve=>{finish=resolve;}),
        cancel(){this.cancelled=true;},play(){this.playState='running';},pause(){this.playState='paused';},
        finish(){this.playState='finished';finish();}};
      animations.push(animation);return animation;
    }};
  }
  const title=element('title','matrix(1, 0, 0, .7, 0, 0)'),figure=element('figure','matrix(.78, 0, 0, .78, 0, 0)');
  const elements={'.character-layer':figure,'.icon-ps picture':element('ps'),'.icon-ae picture':element('ae'),'.icon-cc picture':element('cc'),'.hero-vectors':element('vectors')};
  const hero={dataset:{},clientHeight:900,querySelector:key=>elements[key],addEventListener(){},removeEventListener(){}};
  let completed=0;
  const context={window:{innerHeight:900},document:{documentElement:root,hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener(){}},
    getComputedStyle:el=>{reads.push(el.name);assert.equal(animations.length,0,'batch geometry reads before animation writes');return {transform:el.transform};},setTimeout,clearTimeout,console};
  vm.runInNewContext(source('hero-entrance.js'),context);
  const entrance=context.window.createHeroEntrance(hero,title,{reduced:media,onComplete:()=>completed++});
  entrance.start(Promise.resolve());await flush();
  assert.equal(animations.length,6);assert.equal(reads.length,6);
  assert.equal(animations[1].timing.delay-animations[0].timing.delay,150);
  assert.ok(animations[0].keyframes[0].transform.endsWith(title.transform));
  assert.ok(animations[1].keyframes[0].transform.endsWith(figure.transform));
  for(const animation of animations)for(const keyframe of animation.keyframes){
    assert.ok(Object.keys(keyframe).every(key=>['transform','opacity','offset'].includes(key)));
  }
  entrance.setPlaying(false);assert.ok(animations.every(animation=>animation.playState==='paused'));
  entrance.setPlaying(true);assert.ok(animations.every(animation=>animation.playState==='running'));
  documentHidden(true);assert.ok(animations.every(animation=>animation.playState==='paused'));
  documentHidden(false);
  animations.forEach(animation=>animation.finish());await flush();
  assert.equal(hero.dataset.entrance,'complete');assert.equal(completed,1);
  assert.ok(animations.every(animation=>animation.cancelled));assert.equal(root.dataset.heroIntro,undefined);
  entrance.destroy();
  function documentHidden(value){context.document.hidden=value;listeners.get('visibilitychange')();}
});
