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
          function rise(element,delay,duration){
            return element.animate([
              {translate:`0 ${distance}px`,opacity:0,offset:0},
              {opacity:1,offset:.18},
              {translate:'0 0',opacity:1,offset:1}
            ],{duration,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
          }
          const textAnimation=rise(title,80,1450);
          animations.push(textAnimation);
          animations.push(rise(hero.querySelector('.character-layer'),230,1600));
          for(const [index,selector] of ['.icon-ps picture','.icon-ae picture','.icon-cc picture'].entries()){
            animations.push(rise(hero.querySelector(selector),1150+index*170,1100));
          }
          // Decorative shapes and sparks appear after the text and figure settle.
          animations.push(hero.querySelector('.hero-vectors').animate([
            {opacity:0,translate:'0 20px'},
            {opacity:1,translate:'0 0'}
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
