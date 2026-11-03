/* The transparent trigger follows the PNG figure, rather than its large canvas. */
(() => {
  'use strict';
  window.createHeroExperience=function(hero){
    const trigger=hero.querySelector('.character-hotspot');
    const tip=hero.querySelector('#experience-callout');
    const canvas=hero.querySelector('.character-layer');
    const copy=tip.querySelector('.experience-copy');
    const ring=tip.querySelector('#experience-ring');
    const paths=[...tip.querySelectorAll('[data-experience-leader]')];
    const endpoint=tip.querySelector('#experience-endpoint');
    const introduction=tip.querySelector('.introduction-copy');
    const introductionPaths=[...tip.querySelectorAll('[data-introduction-leader]')];
    const introductionEndpoint=tip.querySelector('#introduction-endpoint');
    const hoverTargets=[...tip.querySelectorAll('.experience-copy,.experience-hover-route')];
    let triggerHover=false,tipHover=false,focused=false,pinned=false,dismissed=false,timer=0,lastInput='';
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function layout(){
      const bounds=hero.getBoundingClientRect(),rect=canvas.getBoundingClientRect();
      const width=canvas.clientWidth,height=canvas.clientHeight;
      if(!width||!height||!rect.width||!rect.height)return;
      const viewHeight=Math.max(941,1672/(width/height)),localScale=height/viewHeight;
      trigger.style.left=(width/2+(558-836)*localScale)+'px';
      trigger.style.top=(height/2+(201-470.5)*localScale)+'px';
      trigger.style.width=(608*localScale)+'px';trigger.style.height=(605*localScale)+'px';
      const scale=rect.height/Math.max(941,1672/(rect.width/rect.height));
      const x=rect.left-bounds.left+rect.width/2+(834-836)*scale;
      const y=rect.top-bounds.top+rect.height/2+(243-470.5)*scale;
      const r=clamp(62*scale,24,40),compact=bounds.width<=900;
      const cardW=compact?(bounds.width<360?96:116):194,cardH=compact?104:82;
      const introW=compact?Math.min(248,bounds.width-32-cardW-12):248;
      const introH=compact?104:112;
      let cardX,cardY,introX,introY,leader,introLeader,endX,endY,introEndX,introEndY;
      if(compact){
        // Keep both descriptions together and clear of the action buttons.
        const actions=hero.querySelector('.nv-hero-actions,.site-hero-actions');
        const actionsTop=actions?actions.getBoundingClientRect().top-bounds.top:bounds.height-32;
        cardX=(bounds.width-cardW-introW-12)/2;
        introX=cardX+cardW+12;
        cardY=introY=clamp(actionsTop-cardH-12,82,bounds.height-cardH-16);
        endX=cardX+cardW/2;endY=cardY-10;
        introEndX=introX+introW/2;introEndY=introY-10;
        leader=`M ${x-r*.65} ${y+r*.75} L ${x-r-22} ${endY-22} H ${endX} V ${endY}`;
        introLeader=`M ${x+r*.65} ${y+r*.75} L ${x+r+22} ${introEndY-22} H ${introEndX} V ${introEndY}`;
      }else{
        cardX=clamp(x-r-cardW-Math.min(160,bounds.width*.12),20,bounds.width-cardW-20);
        cardY=clamp(y+r+28,76,bounds.height-cardH-76);
        const ae=hero.querySelector('.icon-ae').getBoundingClientRect();
        if(cardX+cardW>ae.left-bounds.left-12&&cardX<ae.right-bounds.left+12&&cardY+cardH>ae.top-bounds.top-12&&cardY<ae.bottom-bounds.top+12){
          const above=ae.top-bounds.top-cardH-16;
          if(above>=70)cardY=Math.min(cardY,above);
        }
        introX=clamp(x+r+Math.min(160,bounds.width*.12),20,bounds.width-introW-20);
        introY=clamp(y+r+92,76,bounds.height-introH-76);
        const capcut=hero.querySelector('.icon-cc').getBoundingClientRect();
        if(introX+introW>capcut.left-bounds.left-12&&introX<capcut.right-bounds.left+12&&introY+introH>capcut.top-bounds.top-12&&introY<capcut.bottom-bounds.top+12){
          const above=capcut.top-bounds.top-introH-16;
          if(above>=70)introY=Math.min(introY,above);
        }
        endX=cardX+cardW+14;endY=cardY+cardH/2;
        introEndX=introX-14;introEndY=introY+introH/2;
        leader=`M ${x-r*.65} ${y+r*.75} L ${x-r-28} ${endY} H ${endX}`;
        introLeader=`M ${x+r*.65} ${y+r*.75} L ${x+r+42} ${introEndY} H ${introEndX}`;
      }
      ring.setAttribute('transform',`translate(${x} ${y}) scale(${r/32})`);
      paths.forEach(path=>path.setAttribute('d',leader));
      introductionPaths.forEach(path=>path.setAttribute('d',introLeader));
      endpoint.setAttribute('cx',endX);endpoint.setAttribute('cy',endY);
      introductionEndpoint.setAttribute('cx',introEndX);introductionEndpoint.setAttribute('cy',introEndY);
      copy.style.left=cardX+'px';copy.style.top=cardY+'px';copy.style.width=cardW+'px';
      introduction.style.left=introX+'px';introduction.style.top=introY+'px';introduction.style.width=introW+'px';
    }
    function render(){
      clearTimeout(timer);
      const show=(triggerHover||tipHover||focused||pinned)&&!dismissed;
      if(show)layout();
      hero.dataset.experience=show?'visible':'hidden';
      hero.dataset.experienceFocus=String(focused);
      trigger.setAttribute('aria-expanded',String(show));tip.setAttribute('aria-hidden',String(!show));
    }
    function leaveSoon(){clearTimeout(timer);timer=setTimeout(render,250);}
    function enterTrigger(event){if(event.pointerType==='touch')return;triggerHover=true;dismissed=false;render();}
    function leaveTrigger(){triggerHover=false;leaveSoon();}
    function enterTip(){tipHover=true;render();}
    function leaveTip(){tipHover=false;leaveSoon();}
    function focus(){focused=trigger.matches(':focus-visible');if(focused)dismissed=false;render();}
    function blur(){focused=false;leaveSoon();}
    function pointerDown(event){lastInput=event.pointerType;}
    function activate(event){
      if(lastInput==='touch'||event.detail===0){pinned=!pinned;dismissed=!pinned;}
      else dismissed=false;
      render();
    }
    function close(){triggerHover=false;tipHover=false;pinned=false;dismissed=true;render();}
    function outside(event){if(!trigger.contains(event.target)&&!tip.contains(event.target))close();}
    function escape(event){if(event.key==='Escape')close();}
    function scroll(){if(!pinned&&!focused)close();}
    const resize=new ResizeObserver(layout);resize.observe(hero);resize.observe(canvas);
    const intersection=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)close();});intersection.observe(hero);
    trigger.addEventListener('pointerenter',enterTrigger);trigger.addEventListener('pointerleave',leaveTrigger);
    trigger.addEventListener('pointerdown',pointerDown);trigger.addEventListener('click',activate);
    trigger.addEventListener('focus',focus);trigger.addEventListener('blur',blur);
    for(const el of hoverTargets){el.addEventListener('pointerenter',enterTip);el.addEventListener('pointerleave',leaveTip);}
    document.addEventListener('pointerdown',outside,{capture:true,passive:true});document.addEventListener('keydown',escape);
    window.addEventListener('blur',close);window.addEventListener('scroll',scroll,{capture:true,passive:true});
    layout();render();
    return {
      refresh:layout,
      destroy(){
        clearTimeout(timer);resize.disconnect();intersection.disconnect();
        trigger.removeEventListener('pointerenter',enterTrigger);trigger.removeEventListener('pointerleave',leaveTrigger);
        trigger.removeEventListener('pointerdown',pointerDown);trigger.removeEventListener('click',activate);
        trigger.removeEventListener('focus',focus);trigger.removeEventListener('blur',blur);
        for(const el of hoverTargets){el.removeEventListener('pointerenter',enterTip);el.removeEventListener('pointerleave',leaveTip);}
        document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape);
        window.removeEventListener('blur',close);window.removeEventListener('scroll',scroll,true);
      }
    };
  };
})();
