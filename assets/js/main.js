// This is the start of the main.js file
// Last revised by your AI friend: 2026-03-12

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

function initPillsPhysics() {
  const canvas  = document.querySelector('.pills-canvas');
  const tagline = document.querySelector('.pills-section__tagline');
  if (!canvas || typeof Matter === 'undefined') return;

  // Don't run if reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pillEls    = canvas.querySelectorAll('.pill');
  const isMobile   = window.innerWidth < 768;
  const pillCount  = isMobile ? 20 : pillEls.length;

  // Only use the first N pills
  const activePills = Array.from(pillEls).slice(0, pillCount);

  let engine, runner, bodies, bodiesMap;
  let started = false;

  function getRect(el) {
    // Approximate pill dimensions — we can't reflow before positioning
    const text = el.textContent.trim();
    const w = Math.max(80, text.length * 8 + 28);
    const h = 30;
    return { w, h };
  }

  function buildPhysics() {
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    engine = Matter.Engine.create({ gravity: { y: 1.2 } });
    runner = Matter.Runner.create();

    // Ground + walls (invisible)
    const ground  = Matter.Bodies.rectangle(W / 2, H + 25, W + 100, 50,  { isStatic: true });
    const wallL   = Matter.Bodies.rectangle(-25,   H / 2, 50, H * 2,     { isStatic: true });
    const wallR   = Matter.Bodies.rectangle(W + 25, H / 2, 50, H * 2,    { isStatic: true });

    bodies = [];
    bodiesMap = new Map();

    activePills.forEach((el) => {
      const { w, h } = getRect(el);
      const x = Math.random() * (W - w) + w / 2;
      const y = -(Math.random() * H * 1.5 + h); // start above viewport, staggered
      const angle = (Math.random() - 0.5) * 0.4;

      const body = Matter.Bodies.rectangle(x, y, w, h, {
        restitution: 0.3,
        friction: 0.5,
        frictionAir: 0.02,
        angle,
        chamfer: { radius: 15 }
      });

      bodies.push(body);
      bodiesMap.set(body, el);

      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;
      el.style.left   = '0';
      el.style.top    = '0';
    });

    Matter.World.add(engine.world, [ground, wallL, wallR, ...bodies]);
    Matter.Runner.run(runner, engine);

    // Show tagline after pills have had time to settle (~3s after start)
    setTimeout(() => {
      if (tagline) tagline.classList.add('pills-section__tagline--visible');
    }, 3200);
  }

  // Proper DOM position sync loop
  function syncLoop() {
    if (!bodies || !bodiesMap) return;
    bodies.forEach((body) => {
      const el = bodiesMap.get(body);
      if (!el) return;
      const w = parseFloat(el.style.width)  || 100;
      const h = parseFloat(el.style.height) || 30;
      const { x, y } = body.position;
      const angle = body.angle;
      el.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px) rotate(${angle}rad)`;
    });
    requestAnimationFrame(syncLoop);
  }

  function start() {
    if (started) return;
    started = true;
    buildPhysics();
    syncLoop();
  }

  // Trigger on section entering viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        start();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(canvas);
}

// ─── Language Switcher (View Transitions API) ─────────────────────────────────
// Language pill buttons — navigates to language subfolder.

function initLangSwitcher() {
  const btns = document.querySelectorAll('.lang-switcher__btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (!lang) return;

      const url = lang === 'en'
        ? '/'
        : `/${lang}/`;

      if (document.startViewTransition) {
        document.startViewTransition(() => {
          window.location.href = url;
        });
      } else {
        window.location.href = url;
      }
    });
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
