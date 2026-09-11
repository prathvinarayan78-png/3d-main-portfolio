import './styles.css';
import { createScene } from './scene.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const N = 8; // sections

const body = document.body;
const html = document.documentElement;

/* ---------- cursor ---------- */

const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
const ringLabel = document.getElementById('cursorLabel');
let cx = innerWidth / 2;
let cy = innerHeight / 2;
let rx = cx;
let ry = cy;

function onHover(label) {
  if (COARSE) return;
  body.classList.toggle('is-scene', !!label);
  ringLabel.textContent = label;
}

if (!COARSE) {
  html.classList.add('has-cursor');
  addEventListener(
    'pointermove',
    (e) => {
      cx = e.clientX;
      cy = e.clientY;
      sceneApi.setPointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, true);
    },
    { passive: true }
  );
  document.addEventListener('mouseleave', () => {
    ring.style.opacity = 0;
    dot.style.opacity = 0;
    sceneApi.setPointer(2, 2, false);
  });
  document.addEventListener('mouseenter', () => {
    ring.style.opacity = 1;
    dot.style.opacity = 1;
  });
  document.addEventListener('mouseover', (e) => {
    const hit = e.target.closest && e.target.closest('a, button, [data-cursor]');
    body.classList.toggle('is-hover', !!hit);
  });
}

/* ---------- scene ---------- */

let sceneApi = {
  update() {},
  setPointer() {},
  introStart() {},
};
try {
  sceneApi = createScene(document.getElementById('scene'), { onHover });
} catch (err) {
  console.warn('WebGL unavailable — falling back to static backdrop.', err);
}

/* ---------- scroll model ---------- */

const spacer = document.getElementById('scrollspace');
let maxScroll = 1;
let raw = 0;
let smooth = 0;

function measure() {
  maxScroll = Math.max(1, spacer.offsetHeight - innerHeight);
  raw = clamp(scrollY / maxScroll, 0, 1);
}
addEventListener('scroll', () => {
  raw = clamp(scrollY / maxScroll, 0, 1);
}, { passive: true });
addEventListener('resize', measure);
measure();

/* ---------- ui sync ---------- */

const panels = [...document.querySelectorAll('.panel')];
const dots = [...document.querySelectorAll('.dot')];
const progress = document.getElementById('progress');
const hint = document.getElementById('scrollHint');
let hintOn = false;

function go(i) {
  scrollTo({ top: (i / (N - 1)) * maxScroll, behavior: RM ? 'auto' : 'smooth' });
}
dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
document.querySelectorAll('[data-go]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    go(+a.dataset.go);
  })
);
document.querySelectorAll('.work-link').forEach((a) =>
  a.addEventListener('click', (e) => e.preventDefault())
);

/* ---------- main loop ---------- */

let mx = 0;
let my = 0;
let last = performance.now();

function frame(now) {
  const dt = clamp((now - last) / 1000, 0.001, 0.05);
  last = now;

  smooth += (raw - smooth) * (RM ? 1 : 1 - Math.exp(-dt * 5));

  if (!RM && !COARSE) {
    const k = 1 - Math.exp(-dt * 6);
    mx += (ndcX - mx) * k;
    my += (ndcY - my) * k;
  }

  sceneApi.update(smooth, RM || COARSE ? 0 : mx, RM || COARSE ? 0 : my, dt);

  /* panels */
  const f0 = smooth * (N - 1);
  for (const p of panels) {
    const d = f0 - +p.dataset.idx;
    const o = clamp(1 - (Math.abs(d) - 0.16) / 0.64, 0, 1);
    const e = o * o * (3 - 2 * o);
    if (e < 0.005) {
      if (p.style.visibility !== 'hidden') {
        p.style.opacity = '0';
        p.style.visibility = 'hidden';
        p.classList.remove('live');
      }
    } else {
      if (p.style.visibility !== 'visible') {
        p.style.visibility = 'visible';
      }
      p.style.opacity = e.toFixed(3);
      p.style.transform = `translate3d(0 ${(d * -22).toFixed(2)}px, 0)`;
      p.style.setProperty('--f', d.toFixed(4));
      p.classList.toggle('live', e > 0.45);
    }
  }

  const active = Math.round(f0);
  dots.forEach((d, i) => d.classList.toggle('on', i === active));
  progress.style.transform = `scaleX(${smooth.toFixed(4)})`;
  if (hint && hintOn) hint.style.opacity = clamp(1 - smooth * 24, 0, 1).toFixed(3);

  /* cursor */
  if (!COARSE) {
    rx += (cx - rx) * Math.min(1, dt * 12);
    ry += (cy - ry) * Math.min(1, dt * 12);
    dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
  }

  requestAnimationFrame(frame);
}

/* pointer ndc for camera parallax */
let ndcX = 0;
let ndcY = 0;
addEventListener(
  'pointermove',
  (e) => {
    ndcX = (e.clientX / innerWidth) * 2 - 1;
    ndcY = (e.clientY / innerHeight) * 2 - 1;
  },
  { passive: true }
);

requestAnimationFrame(frame);

/* ---------- preloader ---------- */

const loader = document.getElementById('loader');
const count = document.getElementById('loaderCount');
const t0 = performance.now();
const DUR = RM ? 250 : 1400;

(function tickLoader(now) {
  const t = clamp((now - t0) / DUR, 0, 1);
  count.textContent = String(Math.round((1 - Math.pow(1 - t, 3)) * 100)).padStart(3, '0');
  if (t < 1) requestAnimationFrame(tickLoader);
  else finishLoader();
})(performance.now());

async function finishLoader() {
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* fonts api unavailable */
  }
  loader.classList.add('done');
  body.classList.add('ready');
  sceneApi.introStart();
  setTimeout(() => hintOn = true, 2400);
  setTimeout(() => loader.remove(), 1500);
}

/* ---------- clock ---------- */

const clockEl = document.getElementById('clock');
if (clockEl) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
  const tickClock = () => {
    clockEl.textContent = `${fmt.format(new Date())} IST`;
  };
  tickClock();
  setInterval(tickClock, 30000);
}
