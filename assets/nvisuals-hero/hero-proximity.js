/* Local pointer response for decorative assets; no input is intercepted. */
(() => {
  'use strict';
  window.createHeroProximity = function(hero,{capture=false,reduced=matchMedia('(prefers-reduced-motion: reduce)')}={}) {
    const fine=matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const keys=['x','y','rx','ry','roll','strength'];
    const properties=['--near-x','--near-y','--near-rx','--near-ry','--near-roll','--near'];
    const targets=[...hero.querySelectorAll('.tool-icon,.float-vector')].map(el=>({
      el,icon:el.classList.contains('tool-icon'),
      value:{x:0,y:0,rx:0,ry:0,roll:0,strength:0},painted:[]
    }));
    const pointer={x:0,y:0,active:false};
    let playing=false,visible=true,disposed=false,raf=0,last=0,dirty=true,anchors=null,bounds=null;
    const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    const allowed=()=>!disposed&&!capture&&!reduced.matches&&fine.matches;
    const running=()=>allowed()&&playing&&visible&&!document.hidden;
    function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
    function reset(){
      for(const target of targets){
        for(const key of keys)target.value[key]=0;
        for(const property of properties)target.el.style.removeProperty(property);
        target.el.dataset.near='rest';target.painted=[];
      }
    }
    function wake(){if(running()&&!raf)raf=requestAnimationFrame(frame);}
    function reconcile(){
      stop();dirty=true;
      if(!allowed()){
        pointer.active=false;reset();hero.dataset.proximity='disabled';return;
      }
      if(!visible){pointer.active=false;reset();hero.dataset.proximity='idle';return;}
      if(!playing||document.hidden){hero.dataset.proximity='paused';return;}
      wake();
    }
    function paint(target){
      const v=target.value;
      const values=[v.x.toFixed(3)+'px',v.y.toFixed(3)+'px',v.rx.toFixed(3)+'deg',v.ry.toFixed(3)+'deg',v.roll.toFixed(3)+'deg',v.strength.toFixed(4)];
      values.forEach((value,index)=>{
        if(value!==target.painted[index])target.el.style.setProperty(properties[index],value);
      });
      target.painted=values;
      const near=v.strength>.015?'near':'rest';
      if(target.el.dataset.near!==near)target.el.dataset.near=near;
    }
    function frame(now){
      raf=0;
      if(!running()){reconcile();return;}
      const dt=last?Math.min(now-last,50):16.7;
      last=now;
      const blend=1-Math.exp(-dt/115);
      // Read every anchor before writing styles. Remove our own offset from the
      // measured center so the mouse never chases its own displacement.
      if(dirty||!anchors){
        bounds=hero.getBoundingClientRect();
        anchors=targets.map(target=>{
          const rect=target.el.getBoundingClientRect();
          return {target,rect,cx:rect.left+rect.width/2-target.value.x,cy:rect.top+rect.height/2-target.value.y};
        });
        dirty=false;
      }
      let moving=false,nearby=false;
      for(const {target,rect,cx,cy} of anchors){
        const goal={x:0,y:0,rx:0,ry:0,roll:0,strength:0};
        if(pointer.active&&rect.width&&rect.height){
          const dx=cx-pointer.x,dy=cy-pointer.y,distance=Math.hypot(dx,dy);
          const radius=target.icon?clamp(rect.width*.55+110,140,215):115;
          nearby=nearby||distance<radius+20;
          const falloff=clamp(1-distance/radius,0,1);
          const strength=falloff*falloff*(3-2*falloff);
          const direction=Math.max(distance,45),force=target.icon?18:28;
          goal.strength=strength;
          goal.x=dx/direction*force*strength;
          goal.y=dy/direction*force*strength;
          // Do not push an object farther outside the visible hero edges.
          goal.x=clamp(goal.x,Math.min(0,bounds.left+8-(cx-rect.width/2)),Math.max(0,bounds.right-8-(cx+rect.width/2)));
          goal.y=clamp(goal.y,Math.min(0,bounds.top+8-(cy-rect.height/2)),Math.max(0,bounds.bottom-8-(cy+rect.height/2)));
          if(target.icon){
            goal.rx=clamp(dy/(rect.height/2+24),-1,1)*8*strength;
            goal.ry=-clamp(dx/(rect.width/2+24),-1,1)*10*strength;
          }else goal.roll=dx/direction*14*strength;
        }
        for(const key of keys){
          const gap=goal[key]-target.value[key];
          target.value[key]=Math.abs(gap)<.002?goal[key]:target.value[key]+gap*blend;
          moving=moving||Math.abs(goal[key]-target.value[key])>.002;
        }
      }
      for(const target of targets)paint(target);
      hero.dataset.proximity=pointer.active&&nearby?'active':moving?'settling':'idle';
      // CSS keeps the float moving; JavaScript can sleep once the pointer response settles.
      if(moving)wake();else last=0;
    }
    function move(event){
      if(!['mouse','pen'].includes(event.pointerType)||event.target.closest?.('a,button,input,textarea,select')){
        leave();return;
      }
      pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;dirty=true;wake();
    }
    function leave(){pointer.active=false;dirty=true;wake();}
    function visibility(){if(document.hidden)pointer.active=false;reconcile();}
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();});
    intersection.observe(hero);
    const resize=new ResizeObserver(leave);resize.observe(hero);
    hero.addEventListener('pointermove',move,{passive:true});
    hero.addEventListener('pointerleave',leave,{passive:true});
    hero.addEventListener('pointercancel',leave,{passive:true});
    window.addEventListener('blur',leave);
    window.addEventListener('scroll',leave,{passive:true,capture:true});
    document.addEventListener('visibilitychange',visibility);
    fine.addEventListener('change',reconcile);reduced.addEventListener('change',reconcile);
    reconcile();
    return {
      setPlaying(value){playing=Boolean(value);reconcile();},
      destroy(){
        disposed=true;stop();reset();intersection.disconnect();resize.disconnect();
        hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',leave);hero.removeEventListener('pointercancel',leave);
        window.removeEventListener('blur',leave);window.removeEventListener('scroll',leave,true);
        document.removeEventListener('visibilitychange',visibility);
        fine.removeEventListener('change',reconcile);reduced.removeEventListener('change',reconcile);
        delete hero.dataset.proximity;
      }
    };
  };
})();
