// Run with playwright-cli run-code --filename tools/check-interaction-patch.cjs.
async (page) => {
  const browser=page.context().browser();await page.goto('about:blank');
  async function check(url,{width=1600,height=900,dpr=1,touch=false}={}){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:touch,hasTouch:touch});
    const review=await context.newPage(),errors=[];review.on('pageerror',error=>errors.push(error.message));
    await review.addInitScript(()=>{
      window.__timing={};
      const observer=new MutationObserver(()=>{
        const hero=document.getElementById('hero');
        if(hero?.dataset.entrance==='running'&&!window.__timing.started)window.__timing.started=performance.now();
      });observer.observe(document,{subtree:true,attributes:true,attributeFilter:['data-entrance']});
    });
    await review.goto(url,{waitUntil:'domcontentloaded'});
    await review.waitForFunction(()=>document.getElementById('hero').dataset.entrance==='complete');
    const result=await review.evaluate(()=>({started:window.__timing.started,font:document.getElementById('hero').dataset.headingFont,
      motion:document.getElementById('hero').dataset.motion||document.body.dataset.motion,rig:[document.getElementById('hero-character').width,document.getElementById('hero-character').height]}));
    if(!touch){
      const point=await review.evaluate(()=>{const r=document.getElementById('hero-title').getBoundingClientRect(),f=document.getElementById('composition').getBoundingClientRect();return {x:r.left+20,y:f.top+f.height*.49};});
      await review.mouse.move(point.x,point.y);
      await review.waitForFunction(()=>document.getElementById('hero').dataset.textEnergy==='visible');
      await review.waitForTimeout(250);
      result.patch=await review.locator('.hero-title-energy').evaluate(canvas=>{
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        return {width:canvas.width,height:canvas.height,paintedPixels:data.filter((value,index)=>index%4===3&&value>0).length};
      });
      if(result.patch.width>376||result.patch.height>376||!result.patch.paintedPixels)throw new Error('Invalid bounded hover patch: '+JSON.stringify(result));
      if(!url.includes('4188')){
        await review.waitForTimeout(700);
        result.cursor=await review.locator('#cur-ring').getAttribute('data-motion');
        if(result.cursor!=='idle')throw new Error('Cursor did not sleep.');
      }else{
        result.modes=[];
        for(const mode of ['wisps','dust','aura']){
          await review.locator('#text-energy').selectOption(mode);await review.mouse.move(point.x+3,point.y);
          await review.waitForFunction(()=>document.getElementById('hero').dataset.textEnergy==='visible');result.modes.push(mode);
        }
      }
    }else if(!url.includes('4188')){
      result.cursorHidden=await review.locator('#cur-dot').evaluate(element=>getComputedStyle(element).display==='none');
      if(!result.cursorHidden)throw new Error('Touch device has a custom cursor.');
    }
    if(!url.includes('4188')){
      await review.mouse.wheel(0,180);
      await review.waitForFunction(()=>document.getElementById('hero').dataset.motion==='paused');
      await review.waitForFunction(()=>document.getElementById('hero').dataset.motion==='playing');
      result.scrollResumed=true;
      await review.mouse.wheel(0,2200);await review.waitForTimeout(500);
      result.offscreen=await review.locator('#hero').getAttribute('data-motion');
      if(result.offscreen!=='paused')throw new Error('Offscreen hero was not paused.');
    }
    await context.close();if(errors.length)throw new Error(JSON.stringify(errors));return result;
  }
  return {desktop:await check('http://127.0.0.1:4189/'),retina:await check('http://127.0.0.1:4189/',{dpr:2}),
    mobile:await check('http://127.0.0.1:4189/',{width:390,height:844,dpr:2,touch:true}),prototype:await check('http://127.0.0.1:4188/hero.html')};
}
