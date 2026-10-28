(() => {
  'use strict';
  window.createHeroEntrance=function(hero,title,{capture,reduced,onComplete}){
    const root=document.documentElement;
    const enabled=!capture&&!reduced.matches&&root.dataset.heroIntro==='pending'&&typeof title.animate==='function';
    let animations=[],finished=!enabled,started=false,destroyed=false,playing=true,waitTimer;
    hero.dataset.entrance=enabled?'pending':'complete';
    if(!enabled)delete root.dataset.heroIntro;

    function complete(){
      if(finished||destroyed)return;
      finished=true;
      // Removing filled effects restores the original CSS, including float and proximity.
      animations.forEach(animation=>animation.cancel());
      animations=[];
      delete root.dataset.heroIntro;
      hero.dataset.entrance='complete';
      hero.dataset.entranceText='complete';
      onComplete?.();
    }
    function sync(){
      if(finished||destroyed)return;
      if(reduced.matches){complete();return;}
      for(const animation of animations){
        if(animation.playState==='finished')continue;
        if(playing&&!document.hidden)animation.play();else animation.pause();
      }
    }
    function focus(event){
      if(event.target.closest('.character-hotspot'))complete();
    }
    function start(ready){
      if(finished||started||destroyed)return;
      started=true;
      // Slow or failed assets must never leave the heading or artwork hidden.
      const deadline=new Promise(resolve=>{waitTimer=setTimeout(resolve,2200);});
      Promise.race([Promise.resolve(ready).catch(()=>{}),deadline]).then(()=>{
        clearTimeout(waitTimer);
        if(finished||destroyed)return;
        if(root.dataset.heroIntro!=='pending'){complete();return;}
        try{
          const distance=Math.max(hero.clientHeight,window.innerHeight);
          const figure=hero.querySelector('.character-layer');
          const icons=['.icon-ps picture','.icon-ae picture','.icon-cc picture'].map(selector=>hero.querySelector(selector));
          const vectors=hero.querySelector('.hero-vectors');
          // Read the existing font/figure scales once, before creating any effects.
          // Animating transform and opacity lets Chrome move cached layers.
          const transforms=new Map([title,figure,...icons,vectors].map(element=>{
            const transform=getComputedStyle(element).transform;
            return [element,transform==='none'?'':transform];
          }));
          function rise(element,delay,duration){
            const base=transforms.get(element);
            return element.animate([
              {transform:`translate3d(0,${distance}px,0) ${base}`,opacity:0,offset:0},
              {opacity:1,offset:.18},
              {transform:`translate3d(0,0,0) ${base}`,opacity:1,offset:1}
            ],{duration,delay,easing:'cubic-bezier(.25,.6,.3,1)',fill:'both'});
          }
          const textAnimation=rise(title,80,1450);
          animations.push(textAnimation);
          animations.push(rise(figure,230,1600));
          for(const [index,icon] of icons.entries()){
            animations.push(rise(icon,1150+index*170,1100));
          }
          // Decorative shapes and sparks appear after the text and figure settle.
          animations.push(vectors.animate([
            {opacity:0,transform:`translate3d(0,20px,0) ${transforms.get(vectors)}`},
            {opacity:1,transform:`translate3d(0,0,0) ${transforms.get(vectors)}`}
          ],{duration:650,delay:1850,easing:'ease-out',fill:'both'}));
          hero.dataset.entrance='running';
          hero.dataset.entranceText='sliding';
          delete root.dataset.heroIntro;
          sync();
          textAnimation.finished.catch(()=>{}).then(()=>{
            if(!destroyed)hero.dataset.entranceText='complete';
          });
          Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))).then(complete);
        }catch(error){complete();console.warn('Hero entrance skipped:',error.message);}
      });
    }
    document.addEventListener('visibilitychange',sync);
    reduced.addEventListener('change',sync);
    hero.addEventListener('focusin',focus);
    return {
      start,
      setPlaying(value){playing=Boolean(value);sync();},
      destroy(){
        destroyed=true;clearTimeout(waitTimer);
        animations.forEach(animation=>animation.cancel());animations=[];
        delete root.dataset.heroIntro;
        document.removeEventListener('visibilitychange',sync);
        reduced.removeEventListener('change',sync);
        hero.removeEventListener('focusin',focus);
      }
    };
  };
})();
