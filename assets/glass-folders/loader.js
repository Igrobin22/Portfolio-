(() => {
  'use strict';
  const grids=[...document.querySelectorAll('[data-portfolio-folders]')];
  if(!grids.length)return;
  const base=new URL('.',document.currentScript.src);
  let moduleReady;
  function load(){
    if(!moduleReady){
      const styles=new Promise((resolve,reject)=>{
        const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('folder-cards.css?v=folders-2',base).href;
        link.onload=resolve;link.onerror=reject;document.head.append(link);
      });
      moduleReady=Promise.all([styles,import(new URL('portfolio-folders.js?v=folders-2',base).href)]).then(([,module])=>module);
    }
    return moduleReady;
  }
  function mount(grid){
    if(grid.dataset.foldersLoading)return;
    grid.dataset.foldersLoading='true';
    load().then(module=>module.mountPortfolioFolders(grid)).catch(error=>{
      delete grid.dataset.foldersLoading;
      console.warn('Portfolio folders kept their gallery links:',error.message);
    });
  }
  const hero=document.getElementById('hero');
  function schedule(grid){
    const run=()=>{
      if('requestIdleCallback' in window)requestIdleCallback(()=>mount(grid),{timeout:350});
      else setTimeout(()=>mount(grid),0);
    };
    // When the visitor is still watching the hero, let its entrance finish.
    if(hero?.dataset.entrance==='running' && hero.getBoundingClientRect().bottom>0){
      const watcher=new MutationObserver(()=>{
        if(hero.dataset.entrance!=='complete')return;
        watcher.disconnect();run();
      });
      watcher.observe(hero,{attributes:true,attributeFilter:['data-entrance']});
      setTimeout(()=>{watcher.disconnect();run();},3000);
    }else run();
  }
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);schedule(entry.target);}
    },{rootMargin:'180px 0px'});
    grids.forEach(grid=>observer.observe(grid));
  }else grids.forEach(schedule);
})();
