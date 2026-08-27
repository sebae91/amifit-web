// This is the start of the main.js file
// Last revised: 2026-08-27 (Fable 5)

'use strict';

// ─── Typewriter ───────────────────────────────────────────────────────────────
// Cycles through the hero hook lines one at a time, character by character.
// These aren't hypothetical. They're the questions that got the app built.

// B12 is the baked-in HTML fallback (the one crawlers see), so it lives LAST:
// the page opens on it, the rotation cycles the others, then loops home to it.
const TYPEWRITER_LINES = window.TYPEWRITER_LINES || [
  "I can tell you my magnesium intake right now. Can you tell me yours?",
  "I know exactly how much iron I got this week. Do you?",
  "I know if I'm overdoing Vitamin A. Do you?",
  "I know if I'm getting enough zinc this week. Do you know if you are?",
  "In 2 minutes I know if I'm getting enough B12. Do you know if you are?"
];

function initTypewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;

  let lineIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let pauseTimer = null;

  const TYPING_SPEED   = 28;   // ms per character (typing)
  const DELETE_SPEED   = 28;   // ms per character (deleting)
  const PAUSE_EMPTY    = 400;  // ms — pause at empty before next line

  // How long a fully-typed line holds before it deletes — scaled to its length,
  // the same MECHANISM amifit-video uses to time its headlines (reveal.html): a
  // base settle time plus a reading allowance of READ_WPS words per second, so
  // longer lines stay longer. It counts words in whatever line it's handed, so
  // every language self-adjusts — no per-line, per-language tuning needed.
  // (The pace here is the site's own — quicker than the video, which is slower
  // on purpose.) We type the line out rather than fading it in whole, and the
  // reader's already reading during that, so we subtract the type-out time:
  // total on-screen time (typing + hold) lands on the reading budget below.
  const READ_BASE_SEC = 0.7;   // base settle time, seconds
  const READ_WPS      = 3.8;   // reading allowance, words per second
  const HOLD_FLOOR    = 1200;  // ms — never hold less than this, however short the line

  function tick() {
    const line = TYPEWRITER_LINES[lineIndex];

    if (isDeleting) {
      charIndex--;
      el.textContent = line.slice(0, charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        lineIndex = (lineIndex + 1) % TYPEWRITER_LINES.length;
        pauseTimer = setTimeout(tick, PAUSE_EMPTY);
        return;
      }
      pauseTimer = setTimeout(tick, DELETE_SPEED);
    } else {
      charIndex++;
      el.textContent = line.slice(0, charIndex);
      if (charIndex === line.length) {
        isDeleting = true;
        const words  = line.trim().split(/\s+/).length;
        const budget = (READ_BASE_SEC + words / READ_WPS) * 1000;          // total time the line should stay readable
        const hold   = Math.max(HOLD_FLOOR, budget - line.length * TYPING_SPEED);  // minus the type-out already spent reading
        pauseTimer = setTimeout(tick, hold);
        return;
      }
      pauseTimer = setTimeout(tick, TYPING_SPEED);
    }
  }

  // Respect reduced motion — leave whatever line the HTML already shows (the
  // baked-in SEO fallback) in place; only drop the caret. Empty span (the
  // localized pages) falls back to the first line.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (!el.textContent.trim()) el.textContent = TYPEWRITER_LINES[0];
    el.style.borderRight = 'none';
    return;
  }

  // Reserve the height of the tallest hook line so the page below never jumps
  // as lines type out, wrap to a second line and delete again. Measured, not
  // guessed: every language × viewport width has a different worst case, so
  // render each line at the real width (all inside one task — nothing paints
  // in between) and keep the max. The CSS min-heights are the no-JS fallback.
  const wrap = el.parentElement;
  let remeasureTimer = null;

  function reserveTallestLine() {
    const current = el.textContent;
    wrap.style.minHeight = '0';
    let tallest = 0;
    TYPEWRITER_LINES.forEach((line) => {
      el.textContent = line;
      tallest = Math.max(tallest, wrap.offsetHeight);
    });
    el.textContent = current;
    wrap.style.minHeight = `${tallest}px`;
  }

  reserveTallestLine();
  window.addEventListener('resize', () => {
    clearTimeout(remeasureTimer);
    remeasureTimer = setTimeout(reserveTallestLine, 150);
  });

  // If the HTML already shows one of the lines (the baked-in SEO fallback),
  // continue from it: hold it, then delete letter by letter, then cycle on.
  // This avoids wiping the full sentence and retyping from scratch, which
  // reads as a jarring snap on load.
  const existing = el.textContent.trim();
  const startIdx = TYPEWRITER_LINES.indexOf(existing);
  if (startIdx !== -1) {
    lineIndex  = startIdx;
    charIndex  = existing.length;
    isDeleting = true;
    const words  = existing.split(/\s+/).length;
    const budget = (READ_BASE_SEC + words / READ_WPS) * 1000;
    const hold   = Math.max(HOLD_FLOOR, budget - existing.length * TYPING_SPEED);
    pauseTimer = setTimeout(tick, hold);
  } else {
    pauseTimer = setTimeout(tick, 800);
  }
}

// ─── Graffiti placement (trust & pricing, mid widths) ────────────────────────
// Between 768 and 1100px the right spot for the graffiti depends on how the
// two columns actually render at this width, in this language: under the
// shorter column when the other towers over it (the graffiti fills the void
// at zero height cost), spanning both as a banner when they're about level.
// CSS can't compare rendered sibling heights, so JS measures and picks; the
// stylesheet defines what each placement looks like (components.css,
// "Mid-width graffiti placement variants"). No JS = banner, safe everywhere.

function initGraffitiPlacement() {
  const sections = [
    { name: 'trust',   textSel: '.trust__text-col',  shotsSel: '.trust__screenshot-col' },
    { name: 'pricing', textSel: '.pricing__copy',    shotsSel: '.pricing__screenshots' },
  ]
    .map(({ name, textSel, shotsSel }) => {
      const inner = document.querySelector(`.${name}__inner`);
      if (!inner) return null;
      return {
        inner,
        text:  inner.querySelector(textSel),
        shots: inner.querySelector(shotsSel),
        underText:  `${name}__inner--graffiti-under-text`,
        underShots: `${name}__inner--graffiti-under-shots`,
      };
    })
    .filter(Boolean);
  if (!sections.length) return;

  // Columns within this band count as "level" → banner. Beyond it, one is
  // clearly shorter and the graffiti moves under it. Started at 120 but a
  // ~100px void already reads as empty space, so the tuck should win it.
  const LEVEL_BAND = 50;

  function place() {
    const mid = window.innerWidth >= 768 && window.innerWidth < 1100;
    sections.forEach((s) => {
      s.inner.classList.remove(s.underText, s.underShots);
      if (!mid || !s.text || !s.shots) return;
      const diff = s.text.offsetHeight - s.shots.offsetHeight;
      if (diff > LEVEL_BAND) {
        s.inner.classList.add(s.underShots);       // text towers → fill the void under the screenshots
      } else if (diff < -LEVEL_BAND) {
        s.inner.classList.add(s.underText);        // screenshots tower → fill the void under the copy
      }                                            // else: level → banner (default CSS)
    });
  }

  // Live during the drag — the measurement is two offsetHeight reads per
  // section, cheap enough to run per frame (rAF-throttled, same pattern as
  // the anxiety spotlight). A trailing debounce here made the graffiti
  // visibly "think" before jumping to its spot.
  place();
  let ticking = false;
  window.addEventListener('resize', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      place();
    });
  });
}

// ─── Footer bar (row ↔ stacked) ───────────────────────────────────────────────
// The bar (links | legal | contact) goes vertical the moment its three groups
// stop fitting on one line — measured, not a breakpoint, because the fitting
// point differs by ~150px between languages (German's link names outgrow
// English's). Detection: on a single flex line, align-items: flex-end gives
// every child the same bottom edge; a child pushed to a wrapped line breaks
// that. No JS: phones stack via media query, mid widths fall back to the
// bar's flex-wrap.

function initFooterBar() {
  const bar = document.querySelector('.footer__bar');
  if (!bar) return;

  const STACKED = 'footer__bar--stacked';
  const kids = Array.from(bar.children);
  if (kids.length < 2) return;

  function fitsOneRow() {
    const bottom = (el) => el.offsetTop + el.offsetHeight;
    const first = bottom(kids[0]);
    return kids.every((el) => Math.abs(bottom(el) - first) < 2);
  }

  function place() {
    bar.classList.remove(STACKED);   // measure in row layout (same-frame, nothing paints)
    if (!fitsOneRow()) bar.classList.add(STACKED);
  }

  place();
  let ticking = false;
  window.addEventListener('resize', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      place();
    });
  });
}

// ─── Rotation Scroll Anchor ──────────────────────────────────────────────────
// iOS Safari quirk: rotate the phone while scrolled to the bottom and Safari
// re-applies the old orientation's PIXEL offset to the new orientation's
// geometry. Landscape's page is much shorter, so the restored offset lands
// past the end of the document — a void below the footer until the first
// touch snaps it back. Rotating back, the same offset lands ~24px shy of the
// bottom instead. Measured on an SE (3rd gen): the offset reads legal at
// 0/100/300ms after the orientation change, then Safari re-applies the stale
// value somewhere in the 300–700ms window — a fixed one-shot check races it
// and loses. So: capture what the position MEANS while the old layout is
// still standing ("at the bottom", not a pixel count), then enforce the
// meaning for 2s — the way a native UIScrollView keeps you pinned to the end
// through a rotation. A finger on the screen ends the window immediately;
// outside rotation, none of this runs.

function initRotationScrollAnchor() {
  let timer = null;
  let wasAtBottom = false;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  // Pin to the bottom if that's where the user was; otherwise only rescue an
  // out-of-range offset. 'instant' — the CSS scroll-behavior: smooth would
  // animate the correction into a visible glide.
  function correct() {
    const max = maxScroll();
    if (wasAtBottom ? Math.abs(window.scrollY - max) > 1 : window.scrollY > max) {
      window.scrollTo({ top: max, behavior: 'instant' });
    }
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    window.removeEventListener('scroll', correct);
    window.removeEventListener('touchstart', stop);
  }

  function onRotate() {
    stop();
    // The pre-rotation layout is still intact at this instant (the first
    // post-event read reports the old geometry), so this reads intent before
    // Safari starts rewriting the numbers.
    wasAtBottom = window.scrollY >= maxScroll() - 2;
    // Safari fires a scroll event when it re-applies the stale offset —
    // correct in the same breath, so the void never gets a frame to show.
    // The interval is the backstop; touchstart hands control back to the
    // user the moment a finger lands.
    window.addEventListener('scroll', correct, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    let checks = 0;
    timer = setInterval(() => {
      correct();
      if (++checks >= 20) stop();
    }, 100);
  }

  if (screen.orientation) {
    screen.orientation.addEventListener('change', onRotate);
  } else {
    window.addEventListener('orientationchange', onRotate);
  }
}

// ─── Scroll Reveal (IntersectionObserver) ────────────────────────────────────
// Adds --visible class to .reveal elements when they enter the viewport.
// If already above viewport on load (refresh while scrolled down), show instantly.

function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  function showInstant(el) {
    el.style.transition = 'none';
    el.classList.add('reveal--visible');
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      // Entering from above (scrolling up) or already past — skip animation
      if (entry.boundingClientRect.top < 0) {
        showInstant(entry.target);
      } else {
        entry.target.classList.add('reveal--visible');
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  // rAF defers until after browser scroll restoration
  requestAnimationFrame(() => {
    elements.forEach((el) => {
      if (el.getBoundingClientRect().bottom < 0) {
        showInstant(el);
      } else {
        observer.observe(el);
      }
    });
  });
}

// ─── Anxiety Questions (scroll-driven spotlight) ──────────────────────────────
// Lights the question nearest the vertical centre of the viewport and dims it
// again as you scroll past — driven by scroll position, never a timer, so it
// reads like the rest of the page instead of a slideshow happening at you.
// JS off: every question simply stays in its resting colour, fully legible.

function initAnxietySection() {
  const questions = Array.from(document.querySelectorAll('.anxiety__q'));
  const section   = document.querySelector('.anxiety');
  if (!questions.length || !section) return;

  // Reduced motion: no moving spotlight. Leave every line resting and readable.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;

  // Whichever line sits closest to the middle of the screen is the one you're
  // reading — light it. Lines above it are read (resting); lines below it are
  // still coming (recessed). Three states, one decided index.
  function lightNearest() {
    ticking = false;
    const centre = window.innerHeight / 2;
    let nearestIdx = 0;
    let best = Infinity;
    questions.forEach((q, i) => {
      const rect = q.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - centre);
      if (dist < best) { best = dist; nearestIdx = i; }
    });
    questions.forEach((q, i) => {
      q.classList.toggle('anxiety__q--focused', i === nearestIdx);
      q.classList.toggle('anxiety__q--upcoming', i > nearestIdx);
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(lightNearest);
  }

  // Only listen to scroll while the section is actually on screen — no work
  // (and no stray lit line) while you're elsewhere on the page.
  const gate = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        lightNearest();
      } else {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        questions.forEach((q) => q.classList.remove('anxiety__q--focused', 'anxiety__q--upcoming'));
      }
    });
  }, { threshold: 0 });

  gate.observe(section);
}

// ─── Pills Physics (Matter.js) ────────────────────────────────────────────────
// DOM-mode physics: pills are real <div> elements, Matter.js drives positions.
// Lava lamp: pills trickle in one by one, settle, then individually fade out
// and respawn at the top — always something falling, never a dead moment.

function initPillsPhysics() {
  const canvas  = document.querySelector('.pills-canvas');
  const tagline = document.querySelector('.pills-section__tagline');
  if (!canvas || typeof Matter === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pillEls     = canvas.querySelectorAll('.pill');
  const isMobile    = window.innerWidth < 768;
  const pillCount   = isMobile ? 20 : pillEls.length;
  const activePills = Array.from(pillEls).slice(0, pillCount);

  let engine, runner, walls;
  let started = false;

  // Park pills off-screen immediately so they never show at default CSS position
  // regardless of whether the IntersectionObserver fires or not
  activePills.forEach((el) => { el.style.transform = 'translate(-9999px, 0)'; });

  // On mobile we render fewer pills. The leftover ones must also be parked,
  // otherwise their default position-absolute layout glues them to the top of
  // the canvas (Tryptophan, Valine, etc. sitting in the corner like wallflowers).
  Array.from(pillEls).slice(pillCount).forEach((el) => {
    el.style.transform = 'translate(-9999px, 0)';
  });

  // Per-pill state: body + timestamp when it settled (null = still moving)
  const pillState = new Map();

  const PILL_H         = 30;
  const SPAWN_INTERVAL = 280;   // ms between each pill spawning
  const SETTLE_SPEED   = 0.25;  // velocity below this = settled
  const RECYCLE_AFTER  = 6000;  // ms a pill sits settled before recycling
  const RECYCLE_FADE   = 500;   // ms fade-out duration
  // Rest pills a few px above the canvas bottom. The canvas clips at its bottom
  // edge (overflow: hidden), and Matter lets settled bodies sink ~1-2px into a
  // static floor, so a floor flush with the clip line shaves the bottom border
  // off the resting pills. This inset keeps them inside the visible area.
  const FLOOR_INSET    = 5;     // px the floor sits above the canvas bottom

  function pillWidth(el) {
    const chars = el.textContent.trim().length;
    return Math.max(72, chars * 8 + 28);
  }

  // ── Spawn one pill at the top after an optional delay ─────────────────────
  function spawnOne(el, delay, atEdge) {
    setTimeout(() => {
      const W = canvas.offsetWidth;
      const w = pillWidth(el);
      const x     = Math.random() * (W - w) + w / 2;
      const y     = atEdge ? -(PILL_H + 5) : -(PILL_H + Math.random() * 140);
      const angle = (Math.random() - 0.5) * 0.5;

      const body = Matter.Bodies.rectangle(x, y, w, PILL_H, {
        restitution: 0.25,
        friction:    0.55,
        frictionAir: 0.015,
        angle,
        chamfer: { radius: 14 }
      });

      el.style.width      = `${w}px`;
      el.style.height     = `${PILL_H}px`;
      el.style.left       = '0';
      el.style.top        = '0';
      el.style.opacity    = '1';
      el.style.transition = '';

      Matter.World.add(engine.world, [body]);
      pillState.set(el, { body, settledAt: null });
    }, delay);
  }

  // ── Fade one pill out, remove its body, respawn at top ────────────────────
  function recyclePill(el) {
    const state = pillState.get(el);
    if (!state) return;

    pillState.delete(el); // remove from loop immediately

    el.style.transition = `opacity ${RECYCLE_FADE}ms ease`;
    el.style.opacity    = '0';
    Matter.World.remove(engine.world, state.body);

    setTimeout(() => {
      el.style.transition = '';
      el.style.transform  = 'translate(-9999px, 0)';
      spawnOne(el, 100 + Math.random() * 400);
    }, RECYCLE_FADE);
  }

  // ── Check loop — detect settled pills and queue them for recycling ─────────
  function checkLoop() {
    const now = Date.now();
    pillState.forEach((state, el) => {
      const insideCanvas = state.body.position.y > 0;
      const still = insideCanvas &&
                    Math.abs(state.body.velocity.x) < SETTLE_SPEED &&
                    Math.abs(state.body.velocity.y) < SETTLE_SPEED;
      if (still) {
        if (!state.settledAt) state.settledAt = now;
        else if (now - state.settledAt > RECYCLE_AFTER) recyclePill(el);
      } else {
        state.settledAt = null;
      }
    });
  }

  // ── rAF sync loop — updates DOM positions from physics ────────────────────
  function syncLoop() {
    pillState.forEach((state, el) => {
      const w = parseFloat(el.style.width)  || 100;
      const h = parseFloat(el.style.height) || PILL_H;
      const { x, y } = state.body.position;
      el.style.transform = `translate(${x - w/2}px, ${y - h/2}px) rotate(${state.body.angle}rad)`;
    });
    requestAnimationFrame(syncLoop);
  }

  // ── Bootstrap — called once when canvas enters viewport ───────────────────
  function start() {
    if (started) return;
    started = true;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    engine = Matter.Engine.create({ gravity: { y: 1.0 } });
    runner = Matter.Runner.create();

    walls = [
      Matter.Bodies.rectangle(W / 2,  H + 25 - FLOOR_INSET, W + 100, 50,    { isStatic: true }), // floor
      Matter.Bodies.rectangle(-25,    H / 2,  50,      H * 6, { isStatic: true }), // left
      Matter.Bodies.rectangle(W + 25, H / 2,  50,      H * 6, { isStatic: true }), // right
    ];

    Matter.World.add(engine.world, walls);
    Matter.Runner.run(runner, engine);

    // Trickle pills in one by one with random y so they don't pile at canvas top
    activePills.forEach((el, i) => spawnOne(el, i * SPAWN_INTERVAL));

    // Show tagline after first full wave has spawned + settled
    if (tagline) {
      const delay = activePills.length * SPAWN_INTERVAL + 3000;
      setTimeout(() => tagline.classList.add('pills-section__tagline--visible'), delay);
    }

    syncLoop();
    let checkInterval = setInterval(checkLoop, 500);

    // When the tab is hidden (laptop closed, tab switched), pause physics.
    // When visible again, reset settle timestamps so pills don't all mass-recycle
    // due to the accumulated time they appeared "settled" while frozen.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Matter.Runner.stop(runner);
        clearInterval(checkInterval);
      } else {
        pillState.forEach((state) => { state.settledAt = null; });
        runner = Matter.Runner.create();
        Matter.Runner.run(runner, engine);
        checkInterval = setInterval(checkLoop, 500);
      }
    });
  }

  // Start when canvas scrolls into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.unobserve(canvas);
        start();
      }
    });
  }, { threshold: 0.1 });

  observer.observe(canvas);

  // Reposition walls when canvas is resized (e.g. browser window resized).
  // Without this, pills fall through the gap between the old right wall and the new edge.
  //
  // Note: this is intentionally asymmetric. Narrowing from the right pushes pills left
  // (right wall acts as a piston), and widening back leaves them there — new pills fall
  // into the empty space. It looks great. Narrowing from the left does NOT push pills
  // right symmetrically; the right wall still moves inward because the canvas always
  // starts at x=0 and is full-width regardless of which browser edge moved.
  //
  // We looked into fixing this with window.screenX + window.outerWidth to detect
  // left-vs-right resize direction and move the left wall as a matching piston. It
  // didn't work cleanly: (1) both walls ended up moving simultaneously, squeezing pills
  // toward the middle instead of pushing them right, and (2) window.screenX reports in
  // physical pixels on HiDPI displays so the left wall moved 2x too fast. A proper fix
  // would also need to freeze the right wall during a left-side resize, which risks pills
  // escaping into physics positions beyond the visible canvas. Not worth it — the
  // right-side resize behavior is the one people actually see and it already feels great.
  const resizeObserver = new ResizeObserver(() => {
    if (!started || !walls) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    Matter.World.remove(engine.world, walls);
    walls[0] = Matter.Bodies.rectangle(W / 2,  H + 25 - FLOOR_INSET, W + 100, 50,    { isStatic: true }); // floor
    walls[1] = Matter.Bodies.rectangle(-25,    H / 2,  50,      H * 6, { isStatic: true }); // left
    walls[2] = Matter.Bodies.rectangle(W + 25, H / 2,  50,      H * 6, { isStatic: true }); // right
    Matter.World.add(engine.world, walls);
  });

  resizeObserver.observe(canvas);
}

// ─── Language Menu (globe icon + dropdown) ────────────────────────────────────
// Globe opens a simple dropdown. EN navigates. Others are coming-soon.

function initLangSwitcher() {
  const toggle   = document.getElementById('lang-toggle');
  const dropdown = document.getElementById('lang-dropdown');
  if (!toggle || !dropdown) return;

  function open() {
    dropdown.classList.add('lang-dropdown--open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function close() {
    dropdown.classList.remove('lang-dropdown--open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.contains('lang-dropdown--open') ? close() : open();
  });

  // Close on outside click
  document.addEventListener('click', close);

  // Stop clicks inside dropdown from closing it
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  // Handle option clicks
  dropdown.querySelectorAll('.lang-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const lang = opt.dataset.lang;
      if (!lang) return;

      if (opt.classList.contains('lang-option--soon')) {
        close();
        return; // do nothing — it's not built yet
      }

      close();
      // Clean-URL aware: keep the current page when switching language.
      // Paths are extensionless (e.g. /es/database, /support, /es/). Strip a
      // leading language segment to get the page, then re-prefix the new one.
      const langCodes = ['es', 'it', 'fr', 'de', 'pt'];
      const parts = window.location.pathname.split('/').filter(Boolean);
      const pageParts = (parts.length && langCodes.includes(parts[0])) ? parts.slice(1) : parts;
      const page = pageParts.join('/').replace(/index\.html$/i, '').replace(/\.html$/i, '');
      const url = lang === 'en'
        ? (page ? `/${page}` : '/')
        : (page ? `/${lang}/${page}` : `/${lang}/`);

      if (document.startViewTransition) {
        document.startViewTransition(() => { window.location.href = url; });
      } else {
        window.location.href = url;
      }
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

// ─── iPhone → App Store shortcut ──────────────────────────────────────────────
// Every download link points at /download by default — works for everyone with
// zero JS: desktop scans the QR there, Android reads the "get an iPhone" line.
// But an iPhone visitor is already holding the one device that can install the
// app; routing them to a QR they can't scan is absurd. So on iPhone, send those
// links straight to the App Store. One tap, done.
//
// On the download page itself the nav button ships [hidden]: for everyone else
// it would just reload the page, so it only appears here — on iPhone, pointing
// at the App Store.

function initAppStoreLinks() {
  if (!/iPhone|iPod/.test(navigator.userAgent)) return;
  const APP_STORE_URL = 'https://apps.apple.com/app/id6761309128';
  document.querySelectorAll('a[href="download"]').forEach((link) => {
    link.href = APP_STORE_URL;
    link.hidden = false;
  });
}

// ─── Nav scroll state ────────────────────────────────────────────────────────
// Solid at the top of the page, faintly translucent once you scroll. The bar
// should feel like it lifts off the content, not float over it — so the effect
// only kicks in past a few pixels of movement. Pure class toggle; the opacity
// styling lives in components.css.

function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const SCROLLED = 'nav--scrolled';
  const THRESHOLD = 8;
  let ticking = false;

  function update() {
    ticking = false;
    nav.classList.toggle(SCROLLED, window.scrollY > THRESHOLD);
  }

  update();   // honor a reload that's already scrolled down
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
}

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initGraffitiPlacement();
  initFooterBar();
  initRotationScrollAnchor();
  initNavScroll();
  initScrollReveal();
  initAnxietySection();
  initLangSwitcher();
  initAppStoreLinks();
  // Pills physics inits lazily when section enters viewport
  initPillsPhysics();
});

// This is the end of the main.js file
