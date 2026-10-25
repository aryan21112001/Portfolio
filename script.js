/* =========================================================
   ARYAN PRASAD — Portfolio
   Vanilla JS + GSAP/ScrollTrigger + Lenis. See BUILD-PLAN.md §20–§29
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth < 768;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // If the CDN scripts failed, leave a readable static page.
  if (!window.gsap || !window.ScrollTrigger) {
    $('.preloader')?.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('is-loading');

  /* ---------------- Text splitting ---------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', el.getAttribute('aria-label') || text);
    el.innerHTML = [...text].map(ch =>
      `<span class="split-char" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    return $$('.split-char', el);
  }
  function splitLines(el) {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i)
      .map(part => `<span class="split-line"><span>${part.trim()}</span></span>`).join('');
    return $$('.split-line > span', el);
  }
  function splitWords(el) {
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map(w => `<span class="split-word">${w}</span>`).join(' ');
    return $$('.split-word', el);
  }

  $$('[data-letters]').forEach(splitChars);
  $$('[data-lines]').forEach(splitLines);
  $$('[data-words]').forEach(splitWords);

  /* ---------------- Lenis ---------------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -90, duration: 1.6, easing: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
    else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    else target.scrollIntoView({ behavior: 'smooth' });
  };

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#main') return;
    e.preventDefault();
    scrollToTarget(id === '#top' ? 0 : $(id));
  }));

  /* =========================================================
     FILM — procedural glass orbit, or real frames when present
     ========================================================= */
  const rig = $('.rig');
  const canvas = $('.film__canvas');
  const film = { frames: [], count: 0, current: -1, ready: false, obj: { f: 0 } };

  // Deterministic randomness so the scene is identical on every load.
  let seed = 7;
  const rand = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); };

  const PANES = [
    { t: 'ingest.py', b: '<pre><span class="k">df</span> = (spark.read\n  .table(<span class="s">"raw.txn"</span>)\n  .filter(col(<span class="s">"amt"</span>) &gt; 0)\n  .withColumn(<span class="s">"dt"</span>, to_date(<span class="s">"ts"</span>)))\ndf.write.format(<span class="s">"delta"</span>)\n  .mode(<span class="s">"merge"</span>).save(path)</pre>', size: 'lg' },
    { t: 'dashboards', tag: 'live', b: '<div class="big">7,000</div><pre>tableau → power bi\n<span class="ok">● 1,200 canonical</span></pre>' },
    { t: 'pipeline.dag', b: dagSvg() },
    { t: 'validate', tag: '100%', b: '<pre><span class="ok">✓</span> nulls        0\n<span class="ok">✓</span> duplicates   0\n<span class="ok">✓</span> schema       ok\n<span class="ok">✓</span> reconcile    14/14\naccuracy  <span class="ok">1.00</span></pre>' },
    { t: 'throughput', b: barsHtml([3, 4, 3, 5, 6, 5, 8, 9, 12, 16], 9) },
    { t: 'osi.yaml', b: '<pre><span class="k">semantic_model</span>:\n  name: clm_overview\n  <span class="k">measures</span>:\n    - approval_rate\n    - txn_volume\n  source: <span class="s">delta.gold</span></pre>' },
    { t: 'llm.client', tag: 'gemini', b: '<pre>{\n  <span class="s">"providers"</span>: [<span class="s">"claude"</span>,\n                <span class="s">"gemini"</span>],\n  <span class="s">"validate"</span>: <span class="ok">true</span>,\n  <span class="s">"retries"</span>: 3\n}</pre>', size: 'sm' },
    { t: 'capacity', b: '<div class="big">50<small>×</small></div><pre>vs legacy run</pre>', size: 'sm' },
    { t: 'lineage', b: '<pre>CLM.approval_rate\n ├─ fct_auth.amt\n │   └─ raw.txn\n └─ dim_merchant\n     └─ raw.mcc   <span class="ok">95%</span></pre>' },
    { t: 'forecast', b: lineSvg() },
    { t: 'query.sql', b: '<pre><span class="k">SELECT</span> wb, COUNT(*) f\n<span class="k">FROM</span> tableau_meta\n<span class="k">GROUP BY</span> wb\n<span class="k">HAVING</span> sim &gt; <span class="s">0.82</span>;</pre>' },
    { t: 'mcp', tag: 'agent', b: '<pre>tools/list  → 6\nprofile_table()\ngen_spec()\nto_dax()   <span class="ok">ok</span></pre>', size: 'sm' },
    { t: 'feature_store', b: barsHtml([6, 9, 7, 11, 8, 12, 10, 13], 5), size: 'sm' },
    { t: 'ci/cd', tag: 'main', b: '<pre><span class="ok">✓</span> lint  <span class="ok">✓</span> test\n<span class="ok">✓</span> deploy → dbx\nPR #214 merged</pre>', size: 'sm' },
    { t: 'lookup LK00–07', b: dagSvg(true) },
    { t: 'dax', b: '<pre>Approval % =\nDIVIDE(\n  [Approved],\n  [Total], 0 )</pre>', size: 'sm' },
    { t: 'accuracy', b: '<div class="big">95<small>%</small></div><pre>lineage · 630 fields</pre>', size: 'sm' },
    { t: 'migrate.log', b: '<pre>T24        → delta  <span class="ok">done</span>\nLighthouse → delta  <span class="ok">done</span>\nGCN        → delta  <span class="ok">done</span>\nTalend     → dbx    <span class="ok">done</span></pre>', size: 'lg' },
    { t: 'pricing', b: lineSvg(true) },
    { t: 'eval', tag: 'llm', b: '<pre>invalid_json   <span class="ok">0</span>\nhallucinated   <span class="ok">0</span>\nbreakpoints    3 → 0</pre>', size: 'sm' },
    { t: 'pod', b: '<pre>lead: aryan\nsize: 6\nstatus: <span class="ok">shipping</span></pre>', size: 'sm' },
    { t: 'sdv.synth', tag: 'pii-safe', b: '<pre>real PII   → <span class="ok">0</span>\nruns       local\nfidelity   <span class="ok">✓</span></pre>', size: 'sm' },
    { t: 'cost', b: barsHtml([12, 10, 9, 7, 6, 5, 4, 3], -1), size: 'sm' },
  ];

  function barsHtml(vals, hl) {
    const max = Math.max(...vals);
    return `<div class="bars">${vals.map((v, i) => `<i class="${i === hl ? 'hl' : ''}" style="height:${(v / max) * 100}%"></i>`).join('')}</div>`;
  }
  function dagSvg(alt) {
    const n = alt ? [[16, 20], [16, 80], [70, 50], [124, 20], [124, 80], [184, 50]] : [[16, 50], [70, 20], [70, 80], [130, 50], [184, 30], [184, 76]];
    const e = alt ? [[0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]] : [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5]];
    const path = ([a, b]) => { const [x1, y1] = n[a], [x2, y2] = n[b], m = (x1 + x2) / 2; return `<path d="M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}"/>`; };
    return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="#8FB0FF" stroke-opacity=".55">${e.map(path).join('')}</g><g fill="#0A0B0E" stroke="#8FB0FF">${n.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === n.length - 1 ? 7 : 5}" ${i === n.length - 1 ? 'stroke="#C8F23A"' : ''}/>`).join('')}</g></svg>`;
  }
  function lineSvg(alt) {
    let y = 70; const pts = [];
    for (let x = 0; x <= 200; x += 12.5) { y = Math.max(8, Math.min(92, y + rand(-14, alt ? 10 : 6))); pts.push(`${x},${y.toFixed(1)}`); }
    return `<svg viewBox="0 0 200 100" preserveAspectRatio="none"><polyline points="${pts.join(' ')} 200,100 0,100" fill="rgba(47,91,234,.25)" stroke="none"/><polyline points="${pts.join(' ')}" fill="none" stroke="#8FB0FF" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function buildPanes() {
    const list = isMobile() ? PANES.filter((_, i) => i % 3 !== 2) : PANES;
    const n = list.length;
    const frag = document.createDocumentFragment();
    list.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = `pane${p.size ? ' pane--' + p.size : ''}`;
      const ring = i % 2;
      el.style.setProperty('--a', `${(i / n) * 360 + rand(-6, 6)}deg`);
      el.style.setProperty('--y', `${(ring ? -1 : 1) * rand(30, 230)}px`);
      el.style.setProperty('--r', `${rand(560, 820)}`);
      el.style.setProperty('--po', rand(0.55, 1).toFixed(2));
      el.innerHTML = `<div class="pane__bar"><span>${p.t}</span>${p.tag ? `<b>${p.tag}</b>` : '<span>●</span>'}</div>${p.b}`;
      frag.appendChild(el);
    });
    rig.appendChild(frag);
  }

  // Real footage: tools/make-frames.sh writes the frame counts into the canvas data attributes.
  // With a count set, probe the first frame; if it loads, scrub the image sequence on canvas.
  function probeFrames() {
    return new Promise(resolve => {
      const mobile = isMobile();
      if (!+(mobile ? canvas.dataset.framesMobile : canvas.dataset.frames)) return resolve(null);
      const dir = mobile ? 'assets/frames-m/' : 'assets/frames/';
      const img = new Image();
      img.onload = () => resolve(dir);
      img.onerror = () => resolve(null);
      img.src = dir + 'f_0001.webp';
    });
  }
  function frameSrc(dir, i) { return `${dir}f_${String(i + 1).padStart(4, '0')}.webp`; }

  function loadFrames(dir) {
    film.count = parseInt(isMobile() ? canvas.dataset.framesMobile : canvas.dataset.frames, 10);
    film.frames = new Array(film.count);
    const load = i => new Promise(res => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { film.frames[i] = img; res(); };
      img.onerror = res;
      img.src = frameSrc(dir, i);
    });
    // First pass: every 8th frame so scrubbing works immediately; then fill the gaps when idle.
    const first = [], rest = [];
    for (let i = 0; i < film.count; i++) (i % 8 === 0 || i === film.count - 1 ? first : rest).push(i);
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 16));
    const fill = () => { const batch = rest.splice(0, 6); if (batch.length) Promise.all(batch.map(load)).then(() => idle(fill)); };
    return Promise.all(first.map(load)).then(() => { film.ready = true; idle(fill); });
  }

  const ctx = canvas.getContext('2d');
  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    film.current = -1; drawFrame(film.obj.f);
  }
  function drawFrame(f) {
    if (!film.ready) return;
    let i = Math.round(f);
    if (i === film.current) return;
    // nearest loaded frame
    let img = film.frames[i];
    for (let d = 1; !img && d < film.count; d++) img = film.frames[i - d] || film.frames[i + d];
    if (!img) return;
    film.current = i;
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function filmTimeline(mobile) {
    const vars = { '--ry': '0deg', '--tilt': '-8deg', '--spread': 0.45, '--vis': 0.18, '--pz': '-520px', '--co': 1, '--so': 0, '--sb': '14px', '--sx': '0px', '--sy': '0px', '--sz': '0px', '--horizon': 0.8 };
    gsap.set(rig, vars);
    gsap.set('[data-act3]', { autoAlpha: 0, y: 40 });
    gsap.set('.act--3', { '--scrim': 0 });
    gsap.set('.act2-line', { autoAlpha: 0, y: 50 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.film',
        start: 'top top',
        end: () => '+=' + innerHeight * (mobile ? 3.4 : 5),
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // camera orbit (continuous across all three acts)
    tl.to(rig, { '--ry': '300deg', duration: 92 }, 0)
      .to(rig, { '--tilt': '-3deg', duration: 60 }, 0)
      .to(rig, { '--pz': '-400px', duration: 60 }, 0)
      .to(rig, { '--pz': '-260px', duration: 26, ease: 'power1.in' }, 66);

    // ACT I — orbit, faint glass edges
    tl.to(rig, { '--spread': 0.55, '--vis': 0.3, duration: 30 }, 0)
      .to('.hero-name__line:first-child', { xPercent: -18, duration: 24 }, 4)
      .to('.hero-name__line:last-child', { xPercent: 18, duration: 24 }, 4)
      .to('.hero-name', { autoAlpha: 0, filter: 'blur(14px)', duration: 18, ease: 'power1.in' }, 10)
      .to('.act--1 .eyebrow, .act__foot', { autoAlpha: 0, y: -20, duration: 8 }, 2);

    // ACT II — the bloom
    tl.to(rig, { '--spread': 1, '--vis': 1, duration: 26, ease: 'power2.inOut' }, 30)
      .to(rig, { '--horizon': 1, duration: 26 }, 30)
      .to(rig, { '--so': 0.28, duration: 20 }, 38)
      .to('[data-act2="1"]', { autoAlpha: 1, y: 0, duration: 6, ease: 'power2.out' }, 36)
      .to('[data-act2="1"]', { autoAlpha: 0, y: -50, duration: 5, ease: 'power2.in' }, 48)
      .to('[data-act2="2"]', { autoAlpha: 1, y: 0, duration: 6, ease: 'power2.out' }, 52)
      .to('.act2-line path', { strokeDashoffset: 0, duration: 6 }, 56)
      .to('[data-act2="2"]', { autoAlpha: 0, y: -50, duration: 4, ease: 'power2.in' }, 63);

    // ACT III — through the glass
    tl.to(rig, { '--spread': 2.4, '--vis': 0, duration: 22, ease: 'power2.in' }, 66)
      .to(rig, { '--co': 0, duration: 12 }, 58)
      .to(rig, { '--so': 1, '--sb': '0px', duration: 14, ease: 'power2.out' }, 68)
      .to(rig, { '--sz': '220px', duration: 22, ease: 'power2.out' }, 68)
      .to(rig, mobile
        ? { '--sy': () => -innerHeight * 0.14 + 'px', duration: 16, ease: 'power2.inOut' }
        : { '--sx': () => innerWidth * 0.2 + 'px', duration: 16, ease: 'power2.inOut' }, 72)
      .to(rig, { '--horizon': 0.55, duration: 20 }, 70)
      .to('.act--3', { '--scrim': 1, duration: 8 }, 72)
      .to('[data-act3]', { autoAlpha: 1, y: 0, duration: 8, stagger: 2, ease: 'power2.out' }, 76);

    // real-footage scrub rides the same 0–92 span
    if (film.count) {
      tl.to(film.obj, { f: film.count - 1, duration: 92, onUpdate: () => drawFrame(film.obj.f) }, 0);
    }

    // hand-off: the stage settles back like a card as the page continues
    tl.to('.film__stage', { scale: 0.92, borderRadius: 28, duration: 8, ease: 'power2.in' }, 92);
    return tl;
  }

  /* ---------------- Preloader & intro ---------------- */
  const imgReady = src => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = src; });

  async function boot() {
    const counter = $('[data-count]');
    const bar = $('.preloader__bar i');
    const state = { p: 0 };
    const tick = gsap.to(state, {
      p: 100, duration: 1.8, ease: 'power2.inOut',
      onUpdate: () => {
        counter.textContent = String(Math.round(state.p)).padStart(3, '0');
        bar.style.transform = `scaleX(${state.p / 100})`;
      },
    });

    const dir = await probeFrames();
    const tasks = [document.fonts?.ready, imgReady('assets/img/portrait.webp')];
    if (dir) {
      document.documentElement.classList.add('has-frames');
      tasks.push(loadFrames(dir));
    }
    await Promise.all([...tasks, tick.then()]);

    buildPanes();
    sizeCanvas();
    init();

    const intro = gsap.timeline();
    intro.to('.preloader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
      .from('.hero-name .split-char', { yPercent: 115, duration: 1.2, stagger: 0.035, ease: 'power4.out' }, '-=.45')
      .from('[data-intro]', { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, '-=.8')
      .fromTo('.nav', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power3.out', clearProps: 'all' }, '<')
      .add(() => {
        $('.preloader')?.remove();
        document.body.classList.remove('is-loading');
        lenis?.start();
      }, 1.1);
  }

  /* =========================================================
     INIT — everything after the preloader
     ========================================================= */
  function init() {
    const mm = gsap.matchMedia();

    mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)', reduce: '(prefers-reduced-motion: reduce)' }, ctx => {
      const { desktop, mobile, reduce } = ctx.conditions;

      if (reduce) {
        gsap.set(rig, { '--spread': 1, '--vis': 0.8, '--so': 0, '--co': 1 });
        gsap.set('.act--3, .act--2', { autoAlpha: 0 });
        orgGraph('static');
        return;
      }

      filmTimeline(mobile);
      let undoOrg;
      if (desktop) {
        const story = horizontal('.story', '.story__track');
        horizontal('.work', '.work__track');
        undoOrg = orgGraph('desktop', story);
      } else {
        // the barrel pins first so every trigger below it measures with its spacing
        undoOrg = orgGraph('mobile');
        $$('.tl').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 80%', onEnter: () => el.classList.add('is-in') }));
        gsap.to('.timeline', { '--line-p': 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
      }
      pillarsStack();
      return undoOrg;
    });

    stats();
    missionWords();
    reveals();
    marquee();
    nav();
    progressBar();
    clock();
    caseOverlay();
    fitWordmark();
    wordmarkReveal();
    easterEggs();
    // Pointer effects switch on whenever a fine pointer is (or becomes) available.
    if (!reduced) {
      const fine = matchMedia('(pointer: fine)');
      let pointerFx = false;
      const enable = () => {
        if (!pointerFx && fine.matches) { pointerFx = true; cursor(); magnetic(); tilt(); letterHover(); }
        document.documentElement.classList.toggle('has-cursor', pointerFx && fine.matches);
      };
      enable();
      fine.addEventListener('change', enable);
    }

    addEventListener('resize', debounce(() => { sizeCanvas(); fitWordmark(); }, 150));
    document.fonts?.ready.then(() => { fitWordmark(); ScrollTrigger.refresh(); });
  }

  /* ---------------- Horizontal pinned tracks ---------------- */
  function horizontal(section, trackSel) {
    const sec = $(section), track = $(trackSel, sec);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: sec, start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
      },
    });
    if (section === '.story') {
      const line = $('.timeline', sec);
      gsap.to(line, { '--line-p': 1, ease: 'none', scrollTrigger: { trigger: line, containerAnimation: tween, start: 'left 85%', end: 'right 85%', scrub: true } });
      $$('.tl', sec).forEach(el => ScrollTrigger.create({ trigger: el, containerAnimation: tween, start: 'left 80%', onEnter: () => el.classList.add('is-in') }));
    }
    return tween;
  }

  /* ---------------- Tredence client graph ---------------- */
  // Desktop: a DAG whose edges draw as the story track scrolls. Mobile: a pinned barrel.
  function orgGraph(mode, storyTween) {
    const graph = $('.org__graph');
    if (!graph) return;
    const jobs = $$('.job', graph);
    if (mode === 'static') { jobs.forEach(j => j.classList.add('is-done')); return; }
    return mode === 'desktop' ? orgDag(graph, jobs, storyTween) : orgBarrel(graph, jobs);
  }

  function orgDag(graph, jobs, storyTween) {
    const svg = $('.org__edges', graph), hub = graph.closest('.tl--org');
    let edges = [], progress = 0;

    const render = p => {
      progress = p;
      edges.forEach((e, i) => {
        const t = Math.min(1, Math.max(0, p * edges.length - i));
        e.el.style.strokeDashoffset = e.len * (1 - t);
        e.dot.classList.toggle('is-on', t >= 1);
        jobs[i]?.classList.toggle('is-done', t >= 1);
      });
    };

    // route edges from the live card positions: trunk → job_01 → … → job_05 → trunk
    const build = () => {
      const g = graph.getBoundingClientRect(), mid = g.height / 2;
      const box = el => { const r = el.getBoundingClientRect(); return { l: r.left - g.left, t: r.top - g.top, b: r.bottom - g.top, w: r.width, cy: r.top - g.top + r.height / 2 }; };
      const bs = jobs.map(box), first = bs[0], last = bs[bs.length - 1];
      const hubX = hub.getBoundingClientRect().left - g.left, fx = first.l + first.w * .25, lx = last.l + last.w * .75;
      const d = [`M${hubX} ${mid} C${hubX + (fx - hubX) * .7} ${mid} ${fx} ${first.b + 40} ${fx} ${first.b}`];
      for (let i = 0; i < bs.length - 1; i++) {
        const a = bs[i], b = bs[i + 1], down = b.cy > a.cy;
        const x1 = a.l + a.w * .75, y1 = down ? a.b : a.t, x2 = b.l + b.w * .25, y2 = down ? b.t : b.b, k = (y2 - y1) / 2;
        d.push(`M${x1} ${y1} C${x1} ${y1 + k} ${x2} ${y2 - k} ${x2} ${y2}`);
      }
      d.push(`M${lx} ${last.b} C${lx} ${mid} ${lx + 30} ${mid} ${g.width} ${mid}`);
      svg.innerHTML = d.map((p, i) => `<path class="e-ghost" d="${p}"/><path class="e-draw" id="org-e${i}" d="${p}"/><circle class="e-packet" r="2.5"><animateMotion dur="${(1.8 + i * .25).toFixed(2)}s" repeatCount="indefinite"><mpath href="#org-e${i}"/></animateMotion></circle>`).join('');
      const dots = $$('.e-packet', svg);
      edges = $$('.e-draw', svg).map((el, i) => { const len = el.getTotalLength(); el.style.strokeDasharray = len; return { el, len, dot: dots[i] }; });
      render(progress);
    };

    ScrollTrigger.create({ trigger: graph, containerAnimation: storyTween, start: 'left 80%', end: 'right 75%', onUpdate: s => render(s.progress) });
    build();
    ScrollTrigger.addEventListener('refresh', build);
    return () => {
      ScrollTrigger.removeEventListener('refresh', build);
      svg.innerHTML = '';
      jobs.forEach(j => j.classList.remove('is-done'));
    };
  }

  function orgBarrel(graph, jobs) {
    const items = jobs.map(j => j.parentElement), dots = $$('.org__strip li', graph), count = $('.org__count', graph);
    const n = items.length, step = 34, state = { p: 0 }, block = graph.closest('.tl--org');
    let radius = 0;
    graph.classList.add('is-barrel');

    const measure = () => { radius = (items[0].offsetWidth / 2) / Math.tan((step / 2) * Math.PI / 180) * 1.04; };
    const render = () => {
      const p = state.p, front = Math.round(p);
      items.forEach((li, i) => {
        const d = i - p, a = Math.abs(d);
        li.style.transform = `translate(-50%, -50%) translateZ(${-radius}px) rotateY(${d * step}deg) translateZ(${radius}px)`;
        li.style.opacity = Math.max(0, 1 - a * .55);
        li.style.zIndex = 10 - Math.round(a * 2);
        li.style.pointerEvents = i === front ? 'auto' : 'none';
        jobs[i].classList.toggle('is-done', i <= front);
        dots[i]?.classList.toggle('is-on', i === front);
        dots[i]?.classList.toggle('is-seen', i < front);
      });
      count.textContent = `${String(front + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    };

    measure();
    render();
    gsap.to(state, {
      p: n - 1, ease: 'none', onUpdate: render,
      // pin the whole Tredence entry, the way the film pins, so text and drum move as one
      scrollTrigger: {
        trigger: block, start: () => block.offsetHeight >= innerHeight ? 'bottom bottom' : 'center center',
        end: () => '+=' + innerHeight * .5 * (n - 1),
        pin: true, pinSpacing: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        onRefresh: () => { measure(); render(); },
      },
    });
    return () => {
      graph.classList.remove('is-barrel');
      items.forEach(li => li.removeAttribute('style'));
      jobs.forEach(j => j.classList.remove('is-done'));
    };
  }

  /* ---------------- Pillars stack ---------------- */
  function pillarsStack() {
    const cards = $$('.pillar');
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
        scale: 0.92, filter: 'brightness(0.55)', ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 12%', scrub: true },
      });
    });
  }

  /* ---------------- Stats ---------------- */
  function stats() {
    $$('[data-count-to]').forEach(el => {
      const to = +el.dataset.countTo, suffix = el.dataset.suffix || '', comma = el.dataset.format === 'comma';
      const fmt = v => (comma ? Math.round(v).toLocaleString('en-US') : Math.round(v)) + suffix;
      el.textContent = fmt(reduced ? to : 0);
      if (reduced) return;
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) }),
      });
    });
    gsap.from('.stat', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 80%' } });
  }

  /* ---------------- Mission scroll-lit words ---------------- */
  function missionWords() {
    const words = $$('.mission__statement .split-word');
    if (reduced) { gsap.set(words, { opacity: 1 }); return; }
    gsap.to(words, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.mission__statement', start: 'top 78%', end: 'bottom 45%', scrub: true },
    });
    const chips = $$('.mission__rig .glass-chip');
    gsap.from(chips, {
      yPercent: 40, autoAlpha: 0, rotation: i => (i % 2 ? 4 : -4), duration: 1, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '.mission__rig', start: 'top 85%' },
    });
    // gentle parallax on wider screens: the staggered column drifts a little faster
    if (!isMobile()) gsap.to(chips, { y: i => (i % 2 ? -36 : -14), ease: 'none', scrollTrigger: { trigger: '.mission__rig', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------------- Generic reveals ---------------- */
  function reveals() {
    if (reduced) return;
    $$('[data-lines]').forEach(el => {
      if (el.closest('.story__track') && !isMobile()) {
        gsap.from($$('.split-line > span', el), { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'power4.out', scrollTrigger: { trigger: '.story', start: 'top 70%' } });
        return;
      }
      gsap.from($$('.split-line > span', el), { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    gsap.set('[data-reveal]', { autoAlpha: 0 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: els => gsap.fromTo(els, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.1, ease: 'power3.out' }),
    });
  }

  /* ---------------- Velocity-reactive marquee ---------------- */
  function marquee() {
    $$('.marquee__row').forEach(row => {
      const track = $('.marquee__track', row);
      row.appendChild(track.cloneNode(true)).setAttribute('aria-hidden', 'true');
      const dir = +row.dataset.dir;
      let x = dir > 0 ? -track.offsetWidth : 0, hover = false;
      row.addEventListener('mouseenter', () => (hover = true));
      row.addEventListener('mouseleave', () => (hover = false));
      let visible = true;
      new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(row);
      if (reduced) return;
      gsap.ticker.add((_, dt) => {
        if (!visible) return;
        const w = track.offsetWidth;
        const vel = Math.abs(lenis?.velocity || 0);
        const speed = (hover ? 0.25 : 1) * (0.06 + Math.min(vel, 60) * 0.01);
        x += dir * speed * dt;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        row.style.transform = `translate3d(${x}px,0,0)`;
      });
    });
  }

  /* ---------------- Nav ---------------- */
  function nav() {
    const navEl = $('.nav');
    const onScroll = (y, dir) => navEl.classList.toggle('is-hidden', dir === 1 && y > 300);
    if (lenis) lenis.on('scroll', e => onScroll(e.scroll, e.direction));
    else { let last = 0; addEventListener('scroll', () => { onScroll(scrollY, scrollY > last ? 1 : -1); last = scrollY; }, { passive: true }); }

    $$('.nav__index a').forEach(a => {
      const sec = $(a.getAttribute('href'));
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => a.classList.toggle('is-active', s.isActive) });
    });
  }

  function progressBar() {
    const bar = $('.progress i');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => (bar.style.transform = `scaleX(${s.progress})`) });
  }

  /* ---------------- Live IST clock ---------------- */
  function clock() {
    const el = $('[data-clock]');
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const set = () => (el.textContent = fmt.format(new Date()));
    set(); setInterval(set, 1000);
  }

  /* ---------------- Case overlay ---------------- */
  function caseOverlay() {
    const overlay = $('.overlay'), content = $('.overlay__content'), close = $('.overlay__close');
    const tpl = $('#case-details').content;
    let opener = null, origin = '50% 50%';

    // shared full-screen window for case studies and award certificates
    const show = (node, from, x, y, dark = false) => {
      opener = from;
      overlay.classList.toggle('overlay--dark', dark);
      content.innerHTML = '';
      content.appendChild(node);
      origin = `${(x / innerWidth) * 100}% ${(y / innerHeight) * 100}%`;
      overlay.hidden = false;
      overlay.scrollTop = 0;
      lenis?.stop();
      gsap.fromTo(overlay, { clipPath: `circle(0% at ${origin})` }, { clipPath: `circle(150% at ${origin})`, duration: reduced ? 0 : 0.9, ease: 'expo.inOut' });
      gsap.from(content.children[0].children, { y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.06, delay: reduced ? 0 : 0.4, ease: 'power3.out' });
      close.focus();
    };
    const open = (key, from, x, y) => show(tpl.querySelector(`[data-case="${key}"]`).cloneNode(true), from, x, y);
    const centreOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    $$('[data-contact]').forEach(btn => btn.addEventListener('click', () => {
      show($('#contact-detail').content.firstElementChild.cloneNode(true), btn, ...centreOf(btn), true);
    }));
    content.addEventListener('click', e => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      navigator.clipboard?.writeText(btn.dataset.copy).then(() => say('Copied ' + btn.dataset.copy), () => say(btn.dataset.copy));
    });
    const awards = $('#awards');
    awards?.addEventListener('click', e => {
      const node = $('#awards-detail').content.firstElementChild.cloneNode(true);
      show(node, awards, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, true);
    });
    $$('[data-open-case]').forEach(btn => btn.addEventListener('click', e => {
      open(btn.dataset.openCase, btn, ...(e.detail ? [e.clientX, e.clientY] : centreOf(btn)));
    }));
    const shut = () => {
      gsap.to(overlay, {
        clipPath: `circle(0% at ${origin})`, duration: reduced ? 0 : 0.7, ease: 'expo.inOut',
        onComplete: () => { overlay.hidden = true; lenis?.start(); opener?.focus(); },
      });
    };

    $$('.case').forEach(card => {
      card.addEventListener('click', e => open(card.dataset.case, card, e.clientX, e.clientY));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const r = card.getBoundingClientRect();
          open(card.dataset.case, card, r.left + r.width / 2, r.top + r.height / 2);
        }
      });
    });
    close.addEventListener('click', shut);
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') shut();
      if (e.key === 'Tab') {
        const f = $$('button, a[href]', overlay);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------------- Footer wordmark ---------------- */
  function fitWordmark() {
    const el = $('[data-wordmark]');
    el.style.fontSize = '100px';
    const w = el.scrollWidth, target = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) * 2;
    el.style.fontSize = `${(100 * target) / w * 0.995}px`;
  }
  function wordmarkReveal() {
    if (reduced) return;
    gsap.from('[data-wordmark] .split-char', {
      yPercent: 100, stagger: 0.04, duration: 1.1, ease: 'power4.out',
      scrollTrigger: { trigger: '.footer', start: 'top 85%' },
    });
  }

  /* ---------------- Cursor ---------------- */
  function cursor() {
    // The native cursor stays; a faint ring trails it and a soft cobalt spotlight drifts behind.
    const root = $('.cursor'), glow = $('.cursor__glow'), ring = $('.cursor__ring'), label = $('.cursor__ring em');
    document.documentElement.classList.add('has-cursor');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 }, ringPos = { ...pos }, glowPos = { ...pos };
    addEventListener('pointermove', e => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      ringPos.x += (pos.x - ringPos.x) * 0.15;
      ringPos.y += (pos.y - ringPos.y) * 0.15;
      glowPos.x += (pos.x - glowPos.x) * 0.08;
      glowPos.y += (pos.y - glowPos.y) * 0.08;
      ring.style.transform = `translate3d(${ringPos.x}px,${ringPos.y}px,0)`;
      glow.style.transform = `translate3d(${glowPos.x}px,${glowPos.y}px,0)`;
    });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor], a, button, summary');
      root.classList.remove('is-link', 'is-view');
      if (!t) return;
      const kind = t.dataset.cursor || 'link';
      root.classList.add(kind === 'view' ? 'is-view' : 'is-link');
      label.textContent = t.dataset.cursorLabel || 'VIEW';
    });
    document.documentElement.addEventListener('mouseleave', () => root.classList.add('is-hidden'));
    document.documentElement.addEventListener('mouseenter', () => root.classList.remove('is-hidden'));
    addEventListener('pointermove', () => root.classList.remove('is-hidden'), { passive: true });
  }

  /* ---------------- Magnetic ---------------- */
  function magnetic() {
    $$('[data-magnetic]').forEach(el => {
      const strength = el.classList.contains('btn') ? 0.35 : 0.25;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: Math.max(-14, Math.min(14, dx * strength)), y: Math.max(-14, Math.min(14, dy * strength)), duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* ---------------- 3D tilt ---------------- */
  function tilt() {
    $$('[data-tilt], .case').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: px * 6, rotateX: -py * 6, transformPerspective: 900, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1, ease: 'elastic.out(1, .5)' }));
    });
  }

  /* ---------------- Playful letters ---------------- */
  function letterHover() {
    $$('.hero-name .split-char, [data-wordmark] .split-char').forEach(ch => {
      ch.addEventListener('pointerenter', () => {
        if (gsap.isTweening(ch)) return;
        gsap.timeline()
          .to(ch, { yPercent: -14, duration: 0.22, ease: 'power2.out' })
          .to(ch, { yPercent: 0, duration: 0.9, ease: 'elastic.out(1, .35)' });
      });
    });
  }

  /* ---------------- Easter eggs ---------------- */
  let toastTimer;
  function say(msg) {
    const toast = $('.toast');
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  function easterEggs() {
    const grain = $('.grain');

    let buf = '';
    addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, [contenteditable]') || e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-3);
      if (buf === 'sql') {
        say('SELECT * FROM curiosity WHERE fun = TRUE;');
        grain.classList.add('is-lime');
        setTimeout(() => grain.classList.remove('is-lime'), 1400);
      }
    });

    const chars = $$('[data-wordmark] .split-char');
    const original = chars.map(c => c.innerHTML);
    const alt = ['D', 'A', 'T', 'A', '&nbsp;'];
    let clicks = 0, clickTimer, busy = false;
    $('.clock').addEventListener('click', () => {
      clicks++; clearTimeout(clickTimer); clickTimer = setTimeout(() => (clicks = 0), 1500);
      if (clicks < 5 || busy) return;
      clicks = 0; busy = true;
      const swap = list => gsap.timeline()
        .to(chars.slice(0, 5), { yPercent: -100, duration: 0.25, stagger: 0.04, ease: 'power2.in' })
        .add(() => chars.slice(0, 5).forEach((c, i) => (c.innerHTML = list[i])))
        .fromTo(chars.slice(0, 5), { yPercent: 100 }, { yPercent: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' });
      swap(alt);
      say('Same guy. Different schema.');
      setTimeout(() => { swap(original).then(() => (busy = false)); }, 2200);
    });
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  boot();
})();
