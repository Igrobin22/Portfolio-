(() => {
  'use strict';
  const hero=document.getElementById('hero'),title=hero.querySelector('#hero-title');
  const canvas=hero.querySelector('#hero-character'),button=hero.querySelector('.nv-motion-toggle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
  const families={themadi:'Themadi',delirium:'Delirium'};
  let headingFont,playing=!reduced.matches,visible=false,launched=false,scrolling=false,scrollTimer=0;
  const proximity=createHeroProximity(hero,{reduced}),experience=createHeroExperience(hero);
  const energy=createHeroTextEnergy(hero,title,{reduced,mode:'aura'});
  const entrance=createHeroEntrance(hero,title,{reduced,onComplete:()=>{experience.refresh();energy.refresh();update();}});
  let resolveArtwork;
  const artworkReady=new Promise(resolve=>{resolveArtwork=resolve;});
  const rig=createHeroCharacter(canvas,{
    src:'assets/nvisuals-hero/character.png',playing:false,
    onReady(){hero.dataset.ready='true';experience.refresh();update();resolveArtwork();},
    onError(error){canvas.hidden=true;hero.querySelector('.character-fallback').hidden=false;hero.dataset.ready='fallback';resolveArtwork();console.warn(error.message);}
  });
  function fitTitle(){
    const frame=hero.querySelector('.composition').getBoundingClientRect();
    if(!frame.width)return;
    const measure=document.createElement('canvas').getContext('2d');
    measure.font='400 500px '+families[headingFont];
    const metrics=measure.measureText('NVISUALS'),desktop=!mobile.matches;
    const width=frame.width*(desktop?.83:.94),inkWidth=metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight;
    const size=500*width/(inkWidth||metrics.width);
    const inkHeight=(metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent)*size/500;
    const scale=frame.height*(desktop?.565:.60)/inkHeight;
    const ascent=metrics.fontBoundingBoxAscent??metrics.actualBoundingBoxAscent,descent=metrics.fontBoundingBoxDescent??metrics.actualBoundingBoxDescent;
    const offset=(ascent-descent-metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent)*size/1000;
    title.style.fontSize=size+'px';title.style.height=size+'px';
    title.style.top=(frame.height*.49-size/2-offset*scale)+'px';title.style.transform='scaleY('+scale+')';
    energy.refresh();
  }
  function setFont(){
    const selected=headingFont=mobile.matches?'themadi':'delirium';
    hero.dataset.headingFont=selected;hero.dataset.font='loading';
    title.style.fontFamily=families[selected]+', "Arial Narrow", Impact, sans-serif';
    return document.fonts.load('400 500px '+families[selected]).catch(()=>{}).then(()=>{
      if(headingFont===selected){hero.dataset.font='loaded';fitTitle();}
    });
  }
  const fontReady=setFont();
  const iconsReady=Promise.all([...hero.querySelectorAll('.tool-icon img')].map(image=>image.decode().catch(()=>{})));
  const assetsReady=Promise.all([artworkReady,fontReady,iconsReady]);
  assetsReady.then(()=>window.dispatchEvent(new Event('nvisuals:assets-ready')));
  const splash=document.getElementById('intro-overlay');
  const splashHidden=()=>!splash||splash.hidden||splash.style.display==='none';
  let introDone=splashHidden();
  function launch(){if(introDone&&visible&&!launched){launched=true;entrance.start(assetsReady);}}
  const splashObserver=new MutationObserver(()=>{
    if(splashHidden()){introDone=true;splashObserver.disconnect();update();launch();}
  });
  if(splash&&!introDone)splashObserver.observe(splash,{attributes:true,attributeFilter:['class','style']});
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();launch();});
  intersection.observe(hero);
  function update(){
    const effective=playing&&visible&&introDone&&!document.hidden;
    // Slide cached layers first; deforming the canvas or repainting SVG strokes
    // during that transition competes with the compositor for every frame.
    const ambient=effective&&hero.dataset.entrance==='complete'&&!scrolling;
    hero.dataset.motion=ambient?'playing':'paused';
    rig.setPlaying(ambient);proximity.setPlaying(ambient);energy.setPlaying(ambient);entrance.setPlaying(effective);
    button.dataset.playing=String(playing);button.setAttribute('aria-label',playing?'Pause hero animation':'Play hero animation');
    button.setAttribute('aria-pressed',String(playing));
  }
  button.addEventListener('click',()=>{playing=!playing;update();});
  function onScroll(){
    if(!scrolling){scrolling=true;update();}
    clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{scrolling=false;update();},140);
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  const resize=new ResizeObserver(fitTitle);resize.observe(hero.querySelector('.composition'));
  mobile.addEventListener('change',setFont);
  reduced.addEventListener('change',()=>{if(reduced.matches){playing=false;update();}});
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pagehide',event=>{
    if(!event.persisted){clearTimeout(scrollTimer);window.removeEventListener('scroll',onScroll);intersection.disconnect();splashObserver.disconnect();resize.disconnect();entrance.destroy();rig.destroy();proximity.destroy();experience.destroy();energy.destroy();}
  });
  update();
})();
