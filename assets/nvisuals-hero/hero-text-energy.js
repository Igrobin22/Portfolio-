/* The three selected samples, clipped to the unchanged HTML heading. */
(() => {
  'use strict';
  window.createHeroTextEnergy=function(hero,title,{capture=false,reduced=matchMedia('(prefers-reduced-motion: reduce)'),mode='aura'}={}){
    const canvas=title.querySelector('.hero-title-energy'),ctx=canvas.getContext('2d');
    const mask=document.createElement('canvas'),maskCtx=mask.getContext('2d');
    const fine=matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const modes=['aura','wisps','dust'];
    let selected=modes.includes(mode)?mode:'aura';
    let disposed=false,visible=true,playing=false,raf=0,last=0,phase=0,opacity=0,geometry=null;
    const pointer={x:0,y:0,active:false};
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const allowed=()=>!disposed&&!capture&&Boolean(ctx&&maskCtx)&&fine.matches;
    const ready=()=>allowed()&&visible&&!document.hidden&&hero.dataset.font!=='loading';
    function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
    function clear(){if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}}
    function wake(){if(ready()&&!raf)raf=requestAnimationFrame(frame);}
    function refresh(){stop();geometry=null;pointer.active=false;opacity=0;clear();hero.dataset.textEnergy=allowed()?'idle':'disabled';}
    function measure(){
      const rect=title.getBoundingClientRect(),w=title.offsetWidth,h=title.offsetHeight;
      if(!rect.width||!rect.height||!w||!h)return null;
      const dpr=Math.min(devicePixelRatio||1,2),style=getComputedStyle(title);
      canvas.width=mask.width=Math.max(1,Math.round(w*dpr));canvas.height=mask.height=Math.max(1,Math.round(h*dpr));
      maskCtx.setTransform(dpr,0,0,dpr,0,0);
      maskCtx.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      maskCtx.textAlign='center';maskCtx.textBaseline='alphabetic';
      const text=title.querySelector('.hero-title-base').textContent,m=maskCtx.measureText(text);
      const ascent=m.fontBoundingBoxAscent??m.actualBoundingBoxAscent,descent=m.fontBoundingBoxDescent??m.actualBoundingBoxDescent;
      // This is the same centered line-box baseline used by the HTML text.
      maskCtx.fillStyle='#fff';maskCtx.fillText(text,w/2,h/2+(ascent-descent)/2);
      return {rect,kx:canvas.width/rect.width,ky:canvas.height/rect.height,r:clamp(hero.clientWidth*.065,54,90)};
    }
    function halo(x,y,r,alpha){
      const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
      gradient.addColorStop(0,'rgba(136,226,35,'+alpha+')');
      gradient.addColorStop(.45,'rgba(170,245,70,'+(alpha*.55)+')');gradient.addColorStop(1,'rgba(185,252,100,0)');
      ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    function draw(){
      clear();if(!geometry||opacity<=0)return;
      const {rect,kx,ky,r}=geometry,x=pointer.x-rect.left,y=pointer.y-rect.top;
      ctx.save();ctx.setTransform(kx,0,0,ky,0,0);
      ctx.beginPath();ctx.rect(x-r-4,y-r-4,r*2+8,r*2+8);ctx.clip();ctx.globalAlpha=opacity;
      if(selected==='aura'){
        halo(x,y,r,.29);halo(x+Math.sin(phase*.6)*8,y+Math.cos(phase*.7)*9,r*.55,.10);
      }else if(selected==='wisps'){
        halo(x,y,r,.065);
        for(let k=0;k<3;k++){
          ctx.beginPath();
          for(let i=0;i<=38;i++){
            const p=i/38,dx=(p-.5)*r*1.75,dy=(k-1)*12+Math.sin(p*6.2+phase*1.25+k*.8)*5+Math.sin(p*12-phase*.65)*2;
            if(i===0)ctx.moveTo(x+dx,y+dy);else ctx.lineTo(x+dx,y+dy);
          }
          ctx.strokeStyle='rgba(102,188,20,.48)';ctx.lineWidth=.65;ctx.shadowColor='rgba(160,245,45,.3)';ctx.shadowBlur=3;ctx.stroke();ctx.shadowBlur=0;
        }
      }else{
        halo(x,y,r,.045);
        for(let i=0;i<19;i++){
          const step=(i*.618033+phase*.065)%1,angle=i*2.399963,distance=Math.sqrt((i*.373)%1)*r*.87;
          const px=x+Math.cos(angle)*distance+Math.sin(phase*.5+i)*3,py=y+Math.sin(angle)*distance-(step-.5)*14;
          ctx.beginPath();ctx.arc(px,py,.65+(i%3)*.23,0,Math.PI*2);
          ctx.fillStyle='rgba(109,188,20,'+(.3+Math.sin(i*1.71+phase*.9)*.18)+')';ctx.shadowColor='rgba(155,240,40,.32)';ctx.shadowBlur=3;ctx.fill();
        }
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';
      const fade=ctx.createRadialGradient(x,y,r*.3,x,y,r);fade.addColorStop(0,'#fff');fade.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=fade;ctx.fillRect(x-r-4,y-r-4,r*2+8,r*2+8);
      ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(mask,0,0);ctx.restore();
    }
    function frame(now){
      raf=0;if(!ready()){refresh();return;}
      if(last&&now-last<1000/30-1){wake();return;}
      const dt=last?Math.min(now-last,60):33;last=now;
      geometry??=measure();if(!geometry){refresh();return;}
      const r=geometry.rect,inside=pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom;
      const target=pointer.active&&inside?1:0;
      opacity=reduced.matches?target:opacity+(target-opacity)*(1-Math.exp(-dt/90));
      if(Math.abs(opacity-target)<.005)opacity=target;
      if(playing&&!reduced.matches&&target)phase+=dt/1000;
      draw();hero.dataset.textEnergy=opacity>0?'visible':'idle';
      if(opacity!==target||(target&&playing&&!reduced.matches))wake();else last=0;
    }
    function move(event){
      if(!ready()||!['mouse','pen'].includes(event.pointerType)||event.target.closest?.('a,button,input,textarea,select')){leave();return;}
      pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;wake();
    }
    function leave(){pointer.active=false;wake();}
    function setMode(value){selected=modes.includes(value)?value:'aura';phase=.8;hero.dataset.energyEffect=selected;refresh();return selected;}
    const resize=new ResizeObserver(refresh);resize.observe(hero);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refresh();});intersection.observe(hero);
    hero.addEventListener('pointermove',move,{passive:true});hero.addEventListener('pointerleave',leave,{passive:true});hero.addEventListener('pointercancel',leave,{passive:true});
    window.addEventListener('blur',refresh);window.addEventListener('scroll',refresh,{capture:true,passive:true});
    document.addEventListener('visibilitychange',refresh);fine.addEventListener('change',refresh);reduced.addEventListener('change',refresh);
    setMode(selected);
    return {
      refresh,setMode,
      setPlaying(value){playing=Boolean(value);wake();},
      destroy(){
        disposed=true;stop();clear();resize.disconnect();intersection.disconnect();
        hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',leave);hero.removeEventListener('pointercancel',leave);
        window.removeEventListener('blur',refresh);window.removeEventListener('scroll',refresh,true);document.removeEventListener('visibilitychange',refresh);
        fine.removeEventListener('change',refresh);reduced.removeEventListener('change',refresh);
        delete hero.dataset.energyEffect;delete hero.dataset.textEnergy;
      }
    };
  };
})();
