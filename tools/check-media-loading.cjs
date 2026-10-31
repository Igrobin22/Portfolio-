// Run using playwright-cli run-code --filename tools/check-media-loading.cjs.
async (page) => {
  await page.goto('about:blank');
  const review=await page.context().newPage();
  await review.setViewportSize({width:1600,height:900});
  const requests=[];review.on('request',request=>requests.push({url:request.url(),type:request.resourceType()}));
  await review.goto('http://127.0.0.1:4189/',{waitUntil:'load'});
  await review.waitForFunction(()=>document.getElementById('hero').dataset.entrance==='complete');
  const initial=await review.evaluate(()=>({
    gallery:document.querySelector('#page-graphic .gr-item img').getAttribute('src'),
    deferredImages:[...document.querySelectorAll('#page-graphic .gr-item img')].every(image=>image.loading==='lazy'),
    deferredVideos:[...document.querySelectorAll('video')].every(video=>video.preload==='none'),
    heroEager:![...document.querySelectorAll('#hero img')].some(image=>image.loading==='lazy'),
    runner:{name:getComputedStyle(document.querySelector('.vector-runner')).animationName,state:getComputedStyle(document.querySelector('.vector-runner')).animationPlayState}
  }));
  if(!initial.deferredImages||!initial.deferredVideos||!initial.heroEager)throw new Error('Incorrect media loading priorities.');
  if(requests.some(request=>request.url===initial.gallery||request.type==='media'))throw new Error('Hidden gallery/video downloaded during homepage load.');
  if(initial.runner.name!=='vector-travel'||initial.runner.state!=='running')throw new Error('Vector travel was disabled.');
  const firstOffset=await review.locator('.vector-runner').first().evaluate(element=>getComputedStyle(element).strokeDashoffset);
  await review.waitForTimeout(150);
  const nextOffset=await review.locator('.vector-runner').first().evaluate(element=>getComputedStyle(element).strokeDashoffset);
  if(firstOffset===nextOffset)throw new Error('The vector line no longer moves.');
  await review.evaluate(()=>goTo('graphic'));
  await review.waitForFunction(()=>{const image=document.querySelector('#page-graphic .gr-item img');return image.complete&&image.naturalWidth>0;});
  await review.locator('#page-graphic .gr-item').first().click();
  await review.waitForFunction(()=>document.getElementById('lightbox').classList.contains('open'));
  const fullImage=await review.locator('#lb-img').getAttribute('src');
  if(fullImage!==initial.gallery)throw new Error('The gallery lost its original full-size image.');
  await review.keyboard.press('Escape');
  await review.evaluate(()=>{document.getElementById('evModalVideo').muted=true;goTo('shortform');});
  await review.locator('#page-shortform .ev-grid-item').first().click();
  await review.waitForFunction(()=>{const video=document.getElementById('evModalVideo');return document.getElementById('evModal').classList.contains('open')&&!video.paused&&video.readyState>=2;},null,{timeout:20000});
  await review.keyboard.press('Escape');
  const videoStopped=await review.locator('#evModalVideo').evaluate(video=>video.paused);
  await review.close();
  return {homepageGalleryDeferred:true,homepageVideoDeferred:true,heroPriorityPreserved:true,vectorLinesMoving:true,galleryOpenedOriginal:true,videoPlayedOnClick:true,videoStopped};
}
