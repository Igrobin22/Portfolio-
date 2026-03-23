/* ── main.js — shared across all pages ── */

/* ── CUSTOM CURSOR ── */
(function () {
  const dot  = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  if (!dot || !ring) return;

  let mx = -50, my = -50, rx = -50, ry = -50;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx - 5}px, ${my - 5}px)`;
  });

  (function animRing() {
    rx += (mx - rx - 18) * 0.12;
    ry += (my - ry - 18) * 0.12;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(animRing);
  })();

  document.querySelectorAll('a, button, [data-hover]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hov'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hov'));
  });
})();

/* ── NAV PILL INDICATOR ── */
(function () {
  const indicator = document.querySelector('.nav-pill-indicator');
  const links     = document.querySelectorAll('.nav-links a');
  if (!indicator || !links.length) return;

  // Mark active link based on current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  function moveIndicator(el) {
    const listRect = el.closest('ul').getBoundingClientRect();
    const elRect   = el.getBoundingClientRect();
    indicator.style.left  = (elRect.left - listRect.left) + 'px';
    indicator.style.width = elRect.width + 'px';
  }

  // Set initial position on active link
  const active = document.querySelector('.nav-links a.active');
  if (active) moveIndicator(active);

  links.forEach(a => {
    a.addEventListener('mouseenter', () => moveIndicator(a));
    a.addEventListener('mouseleave', () => {
      const cur = document.querySelector('.nav-links a.active');
      if (cur) moveIndicator(cur);
    });
  });
})();

/* ── CONTACT FORM SEND ANIMATION ── */
(function () {
  const btn = document.querySelector('.btn-submit');
  if (!btn) return;
  btn.addEventListener('click', function () {
    this.classList.add('sending');
    const txt = this.querySelector('.btn-text');
    if (txt) txt.textContent = 'Sending…';
    setTimeout(() => {
      this.classList.remove('sending');
      if (txt) txt.textContent = 'Send Message';
    }, 2000);
  });
})();

/* ── LIGHTBOX ── */
(function () {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCls = document.getElementById('lb-close');
  if (!lb) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;
      lbImg.src = img.src;
      lb.classList.add('open');
    });
  });

  function closeLb() { lb.classList.remove('open'); lbImg.src = ''; }
  if (lbCls) lbCls.addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
})();

/* ── VIDEO MODAL ── */
(function () {
  const modal    = document.getElementById('video-modal');
  const modalSrc = document.getElementById('modal-iframe');
  const modCls   = document.getElementById('modal-close');
  if (!modal) return;

  document.querySelectorAll('[data-video]').forEach(el => {
    el.addEventListener('click', () => {
      const src = el.dataset.video;
      if (!src) return;
      modalSrc.src = src + '?autoplay=1';
      modal.classList.add('open');
    });
  });

  function closeModal() {
    modal.classList.remove('open');
    modalSrc.src = '';
  }
  if (modCls) modCls.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();
