import Lenis from 'lenis';
import { sections } from './content';

/*
  One scroll value, two consumers.

  `progress` (0..1) is read every frame by the camera rig inside useFrame, so
  the 3D scene never triggers a React render. `active` is the section index and
  is subscribable, because the HTML overlay genuinely needs to re-render when
  it changes. Keeping these separate is what keeps scrolling at 60fps.
*/
export const scroll = { progress: 0, active: 0, velocity: 0, count: sections.length };

const listeners = new Set();
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getActive = () => scroll.active;

let lenis = null;

export function startLenis() {
  // Local handle: StrictMode mounts twice, and the first cleanup nulls the
  // module-level `lenis` while this loop is still scheduled. Closing over the
  // instance keeps the two lifecycles independent.
  const instance = new Lenis({
    // Long, heavy easing — the brief is "calm", and a snappy scroll fights that.
    duration: 1.9,
    easing: (t) => 1 - Math.pow(1 - t, 3.2),
    smoothWheel: true,
    // Touch gets native scrolling; smoothing it fights the OS and feels laggy.
    syncTouch: false,
    wheelMultiplier: 0.85,
  });

  lenis = instance;

  instance.on('scroll', ({ scroll: y, limit, velocity }) => {
    scroll.progress = limit > 0 ? Math.min(Math.max(y / limit, 0), 1) : 0;
    scroll.velocity = velocity;
    const next = Math.round(scroll.progress * (scroll.count - 1));
    if (next !== scroll.active) {
      scroll.active = next;
      listeners.forEach((fn) => fn());
    }
  });

  let raf = requestAnimationFrame(function loop(time) {
    instance.raf(time);
    raf = requestAnimationFrame(loop);
  });

  return () => {
    cancelAnimationFrame(raf);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

// Route jumps through Lenis so they ease with the same engine as the wheel.
export function scrollToSection(i) {
  const top = (i / (scroll.count - 1)) * (document.body.scrollHeight - window.innerHeight);
  if (lenis) lenis.scrollTo(top, { duration: 2.4 });
  else window.scrollTo({ top, behavior: 'smooth' });
}
