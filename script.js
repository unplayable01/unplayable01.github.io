/* Motion (motion.dev) loads on demand for the lightbox and timeline; both work without it */
var loadMotion = (function () {
  var p;
  return function () { return p || (p = import('https://cdn.jsdelivr.net/npm/motion@12.23.12/+esm')); };
})();

(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* Split headings into words for a staggered rise */
  document.querySelectorAll('.split').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="transition-delay:' + (i * 55) + 'ms">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>';
    }).join(' ');
  });

  /* Reveal on scroll (+ count-up) */
  function countUp(el) {
    var end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = null, dur = 1200;
    if (reduce) { el.textContent = end + suf; return; }
    function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1); var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * e).toLocaleString() + suf; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var targets = document.querySelectorAll('.reveal, .split, .stat');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        var c = e.target.querySelector('[data-count]'); if (c && !c.dataset.done) { c.dataset.done = 1; countUp(c); }
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el, i) { io.observe(el); });
  } else targets.forEach(function (el) { el.classList.add('in'); });
  /* stagger siblings */
  document.querySelectorAll('.stats, .timeline, .life, .stack').forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.transitionDelay = (i * 90) + 'ms'; });
  });

  /* Nav border + progress bar */
  var nav = document.querySelector('[data-nav]'), bar = document.querySelector('.progress i');
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 8);
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Hero stage: mouse + scroll parallax on floating glass cards */
  var stage = document.querySelector('[data-stage]');
  if (stage && !reduce) {
    var layers = stage.querySelectorAll('[data-depth]'), mx = 0, my = 0, sy = 0, raf;
    function paint() {
      raf = null;
      layers.forEach(function (l) { var d = +l.dataset.depth, sc = l.dataset.scroll;
        var py = my * d * 400 + (sc !== undefined ? sy * +sc : -sy * d * 3);
        l.style.setProperty('--px', (mx * d * 400) + 'px'); l.style.setProperty('--py', py + 'px');
        if (l.dataset.zoom) l.style.setProperty('--s', 1 + Math.max(0, sy) * +l.dataset.zoom); });
    }
    function queue() { if (!raf) raf = requestAnimationFrame(paint); }
    if (finePointer) stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; queue(); });
    stage.addEventListener('pointerleave', function () { mx = my = 0; queue(); });
    addEventListener('scroll', function () { var r = stage.getBoundingClientRect(); sy = Math.max(-200, Math.min(400, -r.top)); queue(); }, { passive: true });
  }

  /* 3D tilt cards */
  if (finePointer && !reduce) document.querySelectorAll('.tilt').forEach(function (c) {
    c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty('--rx', (-y * 6) + 'deg'); c.style.setProperty('--ry', (x * 8) + 'deg');
      c.style.setProperty('--gx', ((x + .5) * 100) + '%'); c.style.setProperty('--gy', ((y + .5) * 100) + '%'); c.classList.add('tilting'); });
    c.addEventListener('pointerleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); c.classList.remove('tilting'); });
  });

  /* Magnetic buttons */
  if (finePointer && !reduce) document.querySelectorAll('.magnetic').forEach(function (b) {
    b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .25) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35) + 'px)'; });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });

  /* Tabs with sliding pill */
  var tabs = document.querySelector('[data-tabs]');
  if (tabs) {
    var btns = tabs.querySelectorAll('[role=tab]'), pill = tabs.querySelector('.tab-pill');
    function movePill(b) { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + b.offsetLeft + 'px)'; pill.style.height = b.offsetHeight + 'px'; pill.style.top = b.offsetTop + 'px'; }
    function select(b, focus) {
      btns.forEach(function (x) { var on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (on) { p.hidden = false; p.classList.remove('show'); void p.offsetWidth; p.classList.add('show'); }
        else { p.hidden = true; p.querySelectorAll('video').forEach(function (v) { v.pause(); }); } });
      movePill(b); if (focus) b.focus();
      if (b.scrollIntoView && tabs.scrollWidth > tabs.clientWidth) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = btns.length;
        if (k === 'ArrowRight') select(btns[(i + 1) % n], true);
        if (k === 'ArrowLeft') select(btns[(i - 1 + n) % n], true);
        if (k === 'Home') select(btns[0], true); if (k === 'End') select(btns[n - 1], true);
      });
    });
    requestAnimationFrame(function () { movePill(btns[0]); document.getElementById('p-ttb').classList.add('show'); });
    addEventListener('resize', function () { movePill(tabs.querySelector('[aria-selected=true]')); });
    if (document.fonts) document.fonts.ready.then(function () { movePill(tabs.querySelector('[aria-selected=true]')); });
  }

  /* Galleries */
  document.querySelectorAll('[data-gallery]').forEach(function (g) {
    var track = g.querySelector('.gallery-track'), imgs = track.children, count = g.querySelector('.g-count');
    function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
    function go(i) { i = (i + imgs.length) % imgs.length; track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }
    g.querySelector('.g-prev').addEventListener('click', function () { go(idx() - 1); });
    g.querySelector('.g-next').addEventListener('click', function () { go(idx() + 1); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx() - 1); } });
    var t; track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(function () { count.textContent = (idx() + 1) + ' / ' + imgs.length; }, 60); });
  });

  /* Soundtrack player + mini pill (works on every page) */
  var playlist = [
    { src: 'ttb-menu.mp3', name: 'Main Menu' }, { src: 'ttb-level-1.mp3', name: 'Level 1' },
    { src: 'ttb-level-2.mp3', name: 'Level 2' }, { src: 'ttb-level-5.mp3', name: 'Level 3' }
  ];
  var audio = new Audio(); audio.preload = 'none'; var cur = -1;
  var mini = document.querySelector('[data-mini]'), miniName = document.querySelector('[data-mini-name]'), miniBtn = document.querySelector('[data-mini-toggle]');
  var trackBtns = Array.prototype.slice.call(document.querySelectorAll('[data-player] .track'));
  function btnFor(i) { return trackBtns.filter(function (b) { return b.dataset.src === (playlist[i] || {}).src; })[0]; }
  function sync() {
    var playing = !audio.paused && cur > -1;
    document.body.classList.toggle('is-playing', playing);
    trackBtns.forEach(function (b) { var on = playing && b === btnFor(cur); b.classList.toggle('is-playing', on);
      b.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + b.querySelector('.t-name').textContent); });
    if (cur > -1 && mini) { miniName.textContent = playlist[cur].name; var sub = mini.querySelector('[data-mini-sub]'); if (sub) sub.textContent = 'Tilt Tilt Boom'; }
    if (mini) mini.classList.toggle('playing', playing);
    if (miniBtn) { miniBtn.textContent = playing ? '❚❚' : '▶'; miniBtn.setAttribute('aria-label', playing ? 'Pause the soundtrack' : 'Play the Tilt Tilt Boom soundtrack'); }
  }
  function play(i) {
    if (i === cur) { audio.paused ? audio.play() : audio.pause(); return; }
    var old = btnFor(cur); if (old) old.querySelector('.t-bar i').style.width = '0';
    cur = i; audio.src = playlist[i].src; audio.play();
  }
  trackBtns.forEach(function (b) { b.addEventListener('click', function () {
    var i = playlist.map(function (p) { return p.src; }).indexOf(b.dataset.src); if (i > -1) play(i); }); });
  ['play', 'pause', 'ended'].forEach(function (ev) { audio.addEventListener(ev, sync); });
  audio.addEventListener('timeupdate', function () { var b = btnFor(cur); if (b && audio.duration) b.querySelector('.t-bar i').style.width = (audio.currentTime / audio.duration * 100) + '%'; });
  audio.addEventListener('ended', function () { if (cur < playlist.length - 1) play(cur + 1); });
  if (miniBtn) miniBtn.addEventListener('click', function () { play(cur > -1 ? cur : 0); });
  document.querySelectorAll('[data-play-ttb]').forEach(function (b) { b.addEventListener('click', function () { play(cur > -1 ? cur : 0); }); });
})();

/* Photo lightbox for detail pages */
(function () {
  var btns = Array.prototype.slice.call(document.querySelectorAll('.ph-open'));
  if (!btns.length) return;
  var lb = document.createElement('div'); lb.className = 'lightbox'; lb.hidden = true; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
  lb.innerHTML = '<img alt=""><button class="lb-btn lb-close" aria-label="Close">×</button><button class="lb-btn lb-prev" aria-label="Previous photo">‹</button><button class="lb-btn lb-next" aria-label="Next photo">›</button><span class="lb-count"></span>';
  document.body.appendChild(lb);
  var img = lb.querySelector('img'), count = lb.querySelector('.lb-count'), cur = 0, last = null;
  var mo = null, closing = 0;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) loadMotion().then(function (m) { mo = m; }).catch(function () {});
  var spring = { type: 'spring', duration: 0.55, bounce: 0.18 };
  function show(i, dir) {
    cur = (i + btns.length) % btns.length; var b = btns[cur];
    img.src = b.dataset.full; img.alt = b.querySelector('img').alt; count.textContent = (cur + 1) + ' / ' + btns.length;
    if (mo && dir) mo.animate(img, { opacity: [0, 1], x: [dir * 40, 0] }, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
  }
  function open(i) {
    last = document.activeElement; closing++; show(i); lb.hidden = false; lb.style.opacity = '';
    document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus();
    if (!mo) return;
    mo.animate(lb, { opacity: [0, 1] }, { duration: 0.25 });
    /* grow the photo out of its thumbnail once it has loaded */
    var from = btns[i].getBoundingClientRect();
    img.style.opacity = 0;
    img.decode().catch(function () {}).then(function () {
      var to = img.getBoundingClientRect();
      mo.animate(img, {
        opacity: [0, 1],
        x: [from.left + from.width / 2 - (to.left + to.width / 2), 0],
        y: [from.top + from.height / 2 - (to.top + to.height / 2), 0],
        scale: [from.width / (to.width || 1), 1]
      }, spring);
    });
  }
  function close() {
    document.body.style.overflow = ''; if (last) last.focus();
    if (!mo) { lb.hidden = true; return; }
    var token = ++closing;
    mo.animate(lb, { opacity: 0 }, { duration: 0.2 }).then(function () {
      if (token === closing) { lb.hidden = true; lb.style.opacity = ''; }
    });
  }
  btns.forEach(function (b, i) { b.addEventListener('click', function () { open(i); }); });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1, -1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1, 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1, -1); if (e.key === 'ArrowRight') show(cur + 1, 1); });
})();

/* Experience timeline: line draws with scroll, cards light up as it reaches them */
(function () {
  var tl = document.querySelector('.timeline');
  if (!tl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  loadMotion().then(function (m) {
    var line = document.createElement('i'); line.className = 'tl-line'; line.setAttribute('aria-hidden', 'true'); tl.appendChild(line);
    var cards = Array.prototype.filter.call(tl.children, function (c) { return c.classList.contains('t-card'); });
    var opts = { target: tl, offset: ['start 75%', 'end 60%'] };
    m.scroll(m.animate(line, { scaleY: [0, 1] }, { ease: 'linear' }), opts);
    m.scroll(function (p) {
      var y = p * tl.offsetHeight;
      cards.forEach(function (c) { c.classList.toggle('lit', c.offsetTop + 24 <= y); });
    }, opts);
  }).catch(function () {});
})();
