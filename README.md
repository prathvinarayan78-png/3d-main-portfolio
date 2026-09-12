# Prathvi Narayan — 3D Scroll Portfolio

A fully 3D, scroll-driven portfolio built with **Three.js** and **Vite**. A fixed WebGL
stage plays the hero while the page scrolls: the camera glides along a keyframed path
through eight "stations" (intro → about → four projects → craft → contact), and crisp
HTML/UI panels crossfade in sync with the 3D world.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build
node smoke-test.mjs # headless render check (stubbed WebGL, no GPU needed)
```

## Structure

| File | Purpose |
| ---- | ------- |
| `index.html` | Page shell: 8 fixed UI panels, nav, section dots, cursor, loader |
| `src/main.js` | Scroll model, panel/dot/progress sync, custom cursor, preloader, clock |
| `src/scene.js` | Three.js scene — materials, objects per station, keyframed camera, hover raycast |
| `src/styles.css` | Clean editorial styling, responsive + reduced-motion support |

## How it works

- **Scroll → camera.** Normalized scroll progress maps to a keyframed camera path
  (one keyframe per section, eased between keyframes). Mouse adds a subtle parallax.
- **Stations.** Each section has its own 3D content: a sculpted GTA-style CJ in a
  blaugrana jersey (home), a floating primitive cluster (about), four project pieces
  on pedestals (work), a particle orbit (craft), and an iridescent orb (contact).
- **Synced UI.** Fixed HTML panels fade/translate in based on distance from their
  keyframe, so text and 3D stay in lockstep.
- **Polish.** PBR materials lit by a PMREM room environment, soft shadows, filmic
  ACES tone mapping, grain + vignette, custom cursor with contextual labels,
  loading counter, and `prefers-reduced-motion` support.

## Stack

- [Three.js](https://threejs.org/) r160 — WebGL scene
- [Vite](https://vitejs.dev/) — dev server & build
- No framework — vanilla ES modules
