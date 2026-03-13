// This is the start of the main.js file
// Last revised by your AI friend: 2026-03-13

'use strict';

// ─── Typewriter ───────────────────────────────────────────────────────────────
// Cycles through the hero hook lines one at a time, character by character.

const TYPEWRITER_LINES = [
  "I can tell you my magnesium intake right now. Can you tell me yours?",
  "In 2 minutes I know if I'm getting enough B12. Do you know if you are?",
  "I know exactly how much iron I got today. Do you?",
  "Takes me 30 seconds to check my calcium levels. How do you check yours?",
  "I know if I'm getting enough zinc this week. Do you know if you are?"
];

function initTypewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;

  let lineIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let pauseTimer = null;

  const TYPING_SPEED   = 40;   // ms per character (typing)
  const DELETE_SPEED   = 20;   // ms per character (deleting)
  const PAUSE_END      = 2800; // ms — pause at end of line before delete
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

function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach((el) => observer.observe(el));
}

// ─── Anxiety Questions (staggered scroll reveal) ──────────────────────────────
// Each question fades in one at a time as the section scrolls into view.

function initAnxietySection() {
  const questions = document.querySelectorAll('.anxiety__q');
  const answer    = document.querySelector('.anxiety__answer');
  if (!questions.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      questions.forEach((q, i) => {
        setTimeout(() => {
          q.classList.add('anxiety__q--visible');
        }, i * 500);
      });

      if (answer) {
        setTimeout(() => {
          answer.classList.add('anxiety__answer--visible');
        }, questions.length * 500 + 400);
      }

      // After answer appears, start the endless intrusive thought loop
      setTimeout(() => {
        let current = -1;

        function nextThought() {
          questions.forEach((q) => {
            q.classList.add('anxiety__q--dim');
            q.classList.remove('anxiety__q--lit');
          });

          let next;
          do { next = Math.floor(Math.random() * questions.length); } while (next === current);
          current = next;

          questions[current].classList.remove('anxiety__q--dim');
          questions[current].classList.add('anxiety__q--lit');

          // Irregular timing — feels erratic, not robotic
          setTimeout(nextThought, 1200 + Math.random() * 1000);
        }

        nextThought();
      }, questions.length * 500 + 1800);

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  const section = document.querySelector('.anxiety');
  if (section) observer.observe(section);
}

// ─── Language Word Cycler ────────────────────────────────────────────────────
// Cycles through "chicken → pollo → poulet → pollo → Hähnchen → frango"

function initLanguageCycler() {
  const words = document.querySelectorAll('.languages__word[data-lang]');
  if (!words.length) return;

  let current = 0;

  function showNext() {
    words.forEach((w) => w.classList.remove('languages__word--active'));
    words[current].classList.add('languages__word--active');
    current = (current + 1) % words.length;
  }

  // Start when section is visible
  const section = document.querySelector('.languages');
  if (!section) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        showNext();
        setInterval(showNext, 1200);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(section);
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

  // Per-pill state: body + timestamp when it settled (null = still moving)
  const pillState = new Map();

  const PILL_H         = 30;
  const SPAWN_INTERVAL = 300;   // ms between each pill spawning
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

    // Park all pills off-screen before spawning so they don't pile at (0,0)
    activePills.forEach((el) => { el.style.transform = 'translate(-9999px, 0)'; });

    // Trickle pills in one by one
    activePills.forEach((el, i) => spawnOne(el, i * SPAWN_INTERVAL, true));

    // Show tagline after first full wave has spawned + settled
    if (tagline) {
      const delay = activePills.length * SPAWN_INTERVAL + 3000;
      setTimeout(() => tagline.classList.add('pills-section__tagline--visible'), delay);
    }

    syncLoop();
    setInterval(checkLoop, 500);
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
      const url = lang === 'en' ? '/' : `/${lang}/`;

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
  initLanguageCycler();
  initLangSwitcher();
  // Pills physics inits lazily when section enters viewport
  initPillsPhysics();
});

// This is the end of the main.js file
