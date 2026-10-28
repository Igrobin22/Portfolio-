// Run with playwright-cli run-code --filename tools/check-hero-title-visibility.cjs.
// Uses the actual CSS cascade and animation timeline, which DOM mocks cannot check.
async (page) => {
  const context=page.context();
  await page.goto('about:blank');
  async function check(width,height,reducedMotion='no-preference'){
    const review=await context.newPage();
    await review.setViewportSize({width,height});
    await review.emulateMedia({reducedMotion});
    await review.addInitScript(()=>{
      const result=window.__titleVisibility={pendingFrames:0,pendingVisible:0,opacityDrops:0,finalOpacity:0,done:false};
      let previous=0,completedAt=0;
      function sample(now){
        const hero=document.getElementById('hero'),title=document.getElementById('hero-title');
        if(hero&&title){
          const style=getComputedStyle(title),opacity=style.visibility==='hidden'?0:Number(style.opacity);
          if(document.documentElement.dataset.heroIntro==='pending'&&hero.dataset.entrance!=='running'){
            result.pendingFrames++;if(opacity>0)result.pendingVisible++;
          }
          if(previous-opacity>.01)result.opacityDrops++;
          previous=opacity;
          if(hero.dataset.entrance==='complete'&&document.getElementById('intro-overlay').style.display==='none'){
            completedAt||=now;
            if(now-completedAt>500){result.finalOpacity=opacity;result.done=true;return;}
          }
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await review.goto('http://127.0.0.1:4189/',{waitUntil:'domcontentloaded'});
    await review.waitForFunction(()=>window.__titleVisibility.done,null,{timeout:20000});
    const result=await review.evaluate(()=>window.__titleVisibility);
    await review.close();
    if(result.pendingVisible||result.opacityDrops||result.finalOpacity!==1)throw new Error('Title flashed or disappeared at '+width+'px: '+JSON.stringify(result));
    if(reducedMotion==='no-preference'&&!result.pendingFrames)throw new Error('Did not observe the initial hidden state.');
    return {width,reducedMotion,...result};
  }
  return {desktop:await check(1600,900),mobile:await check(390,844),reduced:await check(1600,900,'reduce')};
}
