// Original blueprint camera / video camera / editor animation.
// Suspend its frame loop whenever the hero cannot be seen.
(() => {
  const wrap = document.getElementById('blueprint-wrap');
  const rotator = document.getElementById('blueprint-rotator');
  if (!wrap || !rotator) return;

  const devices = ['bp-dslr', 'bp-vcam', 'bp-laptop'].map(id => document.getElementById(id));
  const labels = ['DSLR · CINEMA', 'VIDEO CAM', 'EDITOR'];
  const label = document.getElementById('bp-label-1');
  const home = document.getElementById('page-home');
  const overlay = document.getElementById('intro-overlay');
  const desktop = matchMedia('(min-width:769px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let visible = false, frame = 0, last = 0, angle = 0, elapsed = 0, current = 0;
  let mouseX = 0, mouseY = 0, scrollRotation = 0, lastScroll = scrollY;

  const canPlay = () => visible && desktop.matches && !reduced.matches &&
    !document.hidden && home.classList.contains('active') &&
    (!overlay || overlay.style.display === 'none');

  function tick(now) {
    frame = 0;
    if (!canPlay()) { last = 0; return; }
    const dt = last ? Math.min(now - last, 50) : 0;
    last = now;
    angle += dt * 0.012;
    scrollRotation *= Math.pow(0.94, dt / (1000 / 60));
    rotator.style.transform = `rotateY(${-15 + angle + scrollRotation + mouseX}deg) rotateX(${8 + mouseY}deg)`;
    elapsed += dt;
    if (elapsed >= 3200) {
      elapsed = 0;
      const next = (current + 1) % devices.length;
      devices[current].style.opacity = '0';
      devices[next].style.opacity = '1';
      current = next;
      label.textContent = labels[next];
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (canPlay()) {
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
    wrap.style.setProperty('--blueprint-play', canPlay() ? 'running' : 'paused');
  }

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(document.getElementById('hero'));
  const observer = new MutationObserver(sync);
  observer.observe(home, {attributes:true, attributeFilter:['class']});
  if (overlay) observer.observe(overlay, {attributes:true, attributeFilter:['style']});
  document.addEventListener('visibilitychange', sync);
  desktop.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  document.addEventListener('pointermove', event => {
    if (!canPlay() || event.pointerType === 'touch') return;
    mouseX = ((event.clientX - innerWidth / 2) / (innerWidth / 2)) * 12;
    mouseY = ((event.clientY - innerHeight / 2) / (innerHeight / 2)) * -6;
  }, {passive:true});
  addEventListener('scroll', () => {
    if (canPlay()) scrollRotation += (scrollY - lastScroll) * 0.22;
    lastScroll = scrollY;
  }, {passive:true});

  // The original hero needs only its fonts; it no longer waits for character art.
  Promise.resolve(document.fonts?.ready).then(() => {
    dispatchEvent(new Event('nvisuals:assets-ready'));
  });
  sync();
})();
