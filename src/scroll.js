import Lenis from 'lenis';
import { sections } from './content';

// Single source of truth for scroll position.
// `progress` is read every frame by the 3D camera rig (no React re-render),
// `active` is a subscribable index used by the HTML overlay.
export const scroll = { progress: 0, active: 0, count: sections.length };

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getActive = () => scroll.active;

let instance = null;

export function startLenis() {
  const lenis = new Lenis({
    duration: 1.4,
    smoothWheel: true,
    // Touch devices get native scrolling; smoothing there fights the OS.
    syncTouch: false,
  });

  const update = ({ scroll: y, limit }) => {
    scroll.progress = limit > 0 ? Math.min(Math.max(y / limit, 0), 1) : 0;
    const next = Math.round(scroll.progress * (scroll.count - 1));
    if (next !== scroll.active) {
      scroll.active = next;
      listeners.forEach((fn) => fn());
    }
  };

  lenis.on('scroll', update);
  instance = lenis;

  let raf;
  const loop = (time) => {
    lenis.raf(time);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    lenis.destroy();
    instance = null;
  };
}

// Route jumps through Lenis so they're eased by the same engine as the wheel,
// instead of a native smooth-scroll racing it.
export const scrollToSection = (i) => {
  const top = (i / (scroll.count - 1)) * (document.body.scrollHeight - window.innerHeight);
  if (instance) instance.scrollTo(top, { duration: 1.8 });
  else window.scrollTo({ top, behavior: 'smooth' });
};
