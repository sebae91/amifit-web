// This is the start of the main.js file
// Last revised by your AI friend: 2026-03-19

'use strict';

// ─── Typewriter ───────────────────────────────────────────────────────────────
// Cycles through the hero hook lines one at a time, character by character.
// These aren't hypothetical. They're the questions that got the app built.

const TYPEWRITER_LINES = window.TYPEWRITER_LINES || [
  "I can tell you my magnesium intake right now. Can you tell me yours?",
  "In 2 minutes I know if I'm getting enough B12. Do you know if you are?",
  "I know exactly how much iron I got this week. Do you?",
  "I know if I'm overdoing Vitamin A. Do you?",
  "I know if I'm getting enough zinc this week. Do you know if you are?"
];

function initTypewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;

  let lineIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let pauseTimer = null;

  const TYPING_SPEED   = 28;   // ms per character (typing)
  const DELETE_SPEED   = 18;   // ms per character (deleting)
  const PAUSE_END      = 3600; // ms — pause at end of line before delete
  const PAUSE_EMPTY    = 400;  // ms — pause at empty before next line

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
        pauseTimer = setTimeout(tick, PAUSE_END);
        return;
      }
      pauseTimer = setTimeout(tick, TYPING_SPEED);
    }
  }

  // Respect reduced motion — just show the first line statically
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = TYPEWRITER_LINES[0];
    el.style.borderRight = 'none';
    return;
  }

  pauseTimer = setTimeout(tick, 800);
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

// ─── Anxiety Questions (staggered scroll reveal) ──────────────────────────────
// Each question fades in one at a time as the section scrolls into view.

function initAnxietySection() {
  const questions = document.querySelectorAll('.anxiety__q');
  const answer    = document.querySelector('.anxiety__answer');
  if (!questions.length) return;

  const section = document.querySelector('.anxiety');
  if (!section) return;

  // Start the cycling thought loop (runs regardless of how section was revealed)
  function startThoughtLoop() {
    let current = -1;
    function nextThought() {
      questions.forEach((q) => {
        q.classList.add('anxiety__q--dim');
        q.classList.remove('anxiety__q--lit');
      });
      current = (current + 1) % questions.length;
      questions[current].classList.remove('anxiety__q--dim');
      questions[current].classList.add('anxiety__q--lit');
      setTimeout(nextThought, 1800);
    }
    nextThought();
  }

  // Show everything instantly — no stagger, no transitions
  const clarification = document.querySelector('.anxiety__clarification');
  function showInstant() {
    questions.forEach((q) => {
      q.style.transition = 'none';
      q.style.opacity = '1';
      q.style.transform = 'none';
      q.classList.add('anxiety__q--visible');
    });
    if (answer) {
      answer.style.transition = 'none';
      answer.classList.add('anxiety__answer--visible');
    }
    if (clarification) {
      clarification.style.transition = 'none';
      clarification.style.opacity = '1';
    }
    startThoughtLoop();
  }

  // rAF defers until after browser scroll restoration
  requestAnimationFrame(() => {
    // Already above viewport on load — show instantly
    if (section.getBoundingClientRect().bottom < 0) {
      showInstant();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        // Scrolled past too fast — show instantly
        if (entry.boundingClientRect.bottom < 0) {
          showInstant();
          observer.unobserve(section);
          return;
        }

        // Entering from above (scrolling up) — show instantly
        if (entry.boundingClientRect.top < 0) {
          showInstant();
          observer.unobserve(section);
          return;
        }

        // Normal scroll — staggered reveal
        questions.forEach((q, i) => {
          setTimeout(() => q.classList.add('anxiety__q--visible'), i * 500);
        });

        if (answer) {
          setTimeout(() => {
            answer.classList.add('anxiety__answer--visible');
          }, (questions.length - 1) * 500 + 500);
        }

        setTimeout(startThoughtLoop, questions.length * 500 + 1800);

        observer.unobserve(section);
      });
    }, { threshold: 0 });

    observer.observe(section);
  });
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
      Matter.Bodies.rectangle(W / 2,  H + 25, W + 100, 50,    { isStatic: true }), // floor
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
    walls[0] = Matter.Bodies.rectangle(W / 2,  H + 25, W + 100, 50,    { isStatic: true }); // floor
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

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initScrollReveal();
  initAnxietySection();
  initLangSwitcher();
  // Pills physics inits lazily when section enters viewport
  initPillsPhysics();
});

// This is the end of the main.js file
