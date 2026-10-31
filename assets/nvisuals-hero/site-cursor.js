/* Coalesce pointer events and sleep once the trailing ring reaches the pointer. */
(() => {
  'use strict';
  const dot=document.getElementById('cur-dot'),ring=document.getElementById('cur-ring');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  let x=0,y=0,rx=0,ry=0,raf=0,last=0,active=false;
  window.hoverOn=()=>ring?.classList.add('hov');
  window.hoverOff=()=>ring?.classList.remove('hov');
  if(!dot||!ring)return;
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;ring.dataset.motion='idle';}
  function hide(){active=false;stop();dot.style.opacity=ring.style.opacity='0';}
  function wake(){if(active&&fine.matches&&!document.hidden&&!raf)raf=requestAnimationFrame(frame);}
  function frame(now){
    raf=0;if(!active||!fine.matches||document.hidden){hide();return;}
    const dt=last?Math.min(now-last,50):16.7;last=now;
    const blend=1-Math.exp(-dt/65);
    rx+=(x-rx)*blend;ry+=(y-ry)*blend;
    const moving=Math.hypot(x-rx,y-ry)>.05;
    if(!moving){rx=x;ry=y;}
    dot.style.transform='translate('+(x-5)+'px,'+(y-5)+'px)';
    ring.style.transform='translate('+rx+'px,'+ry+'px) translate(-50%,-50%)';
    ring.dataset.motion=moving?'tracking':'idle';
    if(moving)wake();else last=0;
  }
  document.addEventListener('pointermove',event=>{
    if(!fine.matches||!['mouse','pen'].includes(event.pointerType))return;
    x=event.clientX;y=event.clientY;
    if(!active){rx=x;ry=y;active=true;dot.style.opacity=ring.style.opacity='1';}
    wake();
  },{passive:true});
  document.addEventListener('pointerleave',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  window.addEventListener('blur',hide);fine.addEventListener('change',hide);
  hide();
})();
