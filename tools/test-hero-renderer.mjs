import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source=readFileSync(new URL('../assets/nvisuals-hero/hero-engine.js',import.meta.url),'utf8');
function renderer(width,height,scale,dpr=2){
  const frames=new Map(),uniforms={},state={draws:0,count:0};let serial=0;
  const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({width:stage.clientWidth*scale,height:stage.clientHeight*scale})};
  const gl=new Proxy({
    getShaderParameter:()=>true,getProgramParameter:()=>true,isContextLost:()=>false,
    getUniformLocation:(_,name)=>name,getAttribLocation:()=>0,
    uniform2f:(key,x,y)=>{uniforms[key]=[x,y];},uniform1f:(key,value)=>{uniforms[key]=value;},
    drawElements:(_,count)=>{state.draws++;state.count=count;}
  },{get:(target,key)=>key in target?target[key]:key.toUpperCase()===key?1:()=>({})});
  const canvas={parentElement:stage,style:{},dataset:{},width:300,height:150,getContext:()=>gl,addEventListener(){}};
  const context={window:{},document:{hidden:false,addEventListener(){},removeEventListener(){}},devicePixelRatio:dpr,
    matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}},
    Image:class{set src(value){this.onload();}},
    requestAnimationFrame:callback=>{frames.set(++serial,callback);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
  vm.runInNewContext(source,context);
  const api=context.window.createHeroCharacter(canvas,{playing:true});
  function tick(time){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(time));}
  return {api,canvas,uniforms,state,frames,tick};
}

test('tight rendering preserves source coordinates at desktop and phone sizes',()=>{
  for(const [width,height,scale,dpr] of [[1600,900,.78,2],[600,300,.8,3],[900,505,.78,1]]){
    const {api,canvas,uniforms}=renderer(width,height,scale,dpr);
    const sourceScale=height/Math.max(941,1672/(width/height));
    const [viewWidth,viewHeight]=uniforms.u_view,[centerX,centerY]=uniforms.u_center;
    for(const [x,y] of [[836,210],[620,400],[1030,425],[560,600],[1180,618],[850,795]]){
      const actualX=parseFloat(canvas.style.left)+((x-centerX)/viewWidth+.5)*parseFloat(canvas.style.width);
      const actualY=parseFloat(canvas.style.top)+((y-centerY)/viewHeight+.5)*parseFloat(canvas.style.height);
      assert.ok(Math.abs(actualX-(width/2+(x-836)*sourceScale))<1e-7);
      assert.ok(Math.abs(actualY-(height/2+(y-470.5)*sourceScale))<1e-7);
    }
    const oldPixels=Math.round(width*scale*Math.min(dpr,1.75))*Math.round(height*scale*Math.min(dpr,1.75));
    assert.ok(canvas.width*canvas.height<oldPixels*.4,'must remove at least 60% of the transparent buffer');
    api.destroy();
  }
});

test('renders once per display frame at 60, 75 and 144 Hz without speeding up the motion',()=>{
  for(const hz of [60,75,144]){
    const {api,state,tick,uniforms}=renderer(1200,675,.78);
    const initial=state.draws;
    for(let frame=0;frame<hz*2;frame++)tick(frame*1000/hz);
    assert.equal(state.draws-initial,hz*2);
    assert.ok(Math.abs(uniforms.u_time-(2-1/hz))<1e-7);
    assert.ok(state.count/3<20000,'avoid processing the transparent outer mesh');
    api.destroy();
  }
});

test('pause cancels frames and resume does not jump after a long gap',()=>{
  const {api,state,tick,uniforms,frames}=renderer(1200,675,.78);
  tick(0);tick(16);api.setPlaying(false);
  const count=state.draws,time=uniforms.u_time;
  assert.equal(frames.size,0);tick(5000);assert.equal(state.draws,count);
  api.setPlaying(true);tick(10000);assert.equal(uniforms.u_time,time);
  tick(10016);assert.ok(Math.abs(uniforms.u_time-time-.016)<1e-7);
  api.destroy();assert.equal(frames.size,0);
});

test('pointer response settles without a permanent RAF loop or repeated geometry reads',()=>{
  const frames=new Map(),listeners=new Map(),styles={};let serial=0,reads=0,time=0;
  const element={dataset:{},classList:{contains:()=>true},
    style:{setProperty:(key,value)=>{styles[key]=value;},removeProperty:key=>delete styles[key]},
    getBoundingClientRect(){reads++;return {left:100+(parseFloat(styles['--near-x'])||0),top:100+(parseFloat(styles['--near-y'])||0),width:80,height:80};}};
  const hero={dataset:{},querySelectorAll:()=>[element],getBoundingClientRect:()=>({left:0,top:0,right:1000,bottom:600}),
    addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:name=>listeners.delete(name)};
  const media={matches:true,addEventListener(){},removeEventListener(){}};
  const context={window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}},
    matchMedia:()=>media,ResizeObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}},
    requestAnimationFrame:callback=>{frames.set(++serial,callback);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
  vm.runInNewContext(readFileSync(new URL('../assets/nvisuals-hero/hero-proximity.js',import.meta.url),'utf8'),context);
  const response=context.window.createHeroProximity(hero,{reduced:{matches:false,addEventListener(){},removeEventListener(){}}});
  function settle(){
    for(let count=0;frames.size&&count<300;count++){
      const pending=[...frames.values()];frames.clear();time+=1000/144;pending.forEach(callback=>callback(time));
    }
    assert.equal(frames.size,0,'the RAF loop must sleep after settling');
  }
  response.setPlaying(true);settle();
  const event=(x,y)=>({pointerType:'mouse',clientX:x,clientY:y,target:{closest:()=>null}});
  listeners.get('pointermove')(event(130,130));settle();
  assert.ok(Math.abs(parseFloat(styles['--near-x']))>1,'nearby pointer still moves the icon');
  assert.equal(element.dataset.near,'near');assert.ok(reads<=3,'geometry should be cached during settling');
  listeners.get('pointermove')(event(800,500));settle();
  assert.ok(Math.abs(parseFloat(styles['--near-x']))<.01);assert.equal(element.dataset.near,'rest');
  const previousReads=reads;
  for(let index=0;index<144;index++){
    listeners.get('pointermove')(event(130+Math.sin(index*.1)*40,130));
    const pending=[...frames.values()];frames.clear();time+=1000/144;pending.forEach(callback=>callback(time));
  }
  assert.ok(reads-previousReads<10,'sustained pointer input must not measure geometry every display frame');
  response.destroy();assert.equal(frames.size,0);
});
