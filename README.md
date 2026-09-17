# Prathvi — 3D Scroll-Driven Portfolio

A fully 3D, scroll-driven portfolio for **Prathvi** — editor, motion designer, graphic designer,
web developer and brand manager. The entire page is a single WebGL scene; scrolling flies the
camera down a spline through a procedurally generated forest while HTML panels fade in over it.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
node src/scene.check.mjs   # camera-path sanity check
```

## Why these choices

Picked from the research in [`docs/3d-nature-model-sources.md`](docs/3d-nature-model-sources.md):

| Need | Chosen | Reason |
|---|---|---|
| Trees | **[ez-tree](https://github.com/dgreenheck/ez-tree)** (1.6k★, MIT) | Highest-rated nature repo found, native Three.js, and it embeds its bark/leaf textures as base64 — **zero binary assets in the repo**. Six species generated at runtime. |
| Smooth scroll | **[Lenis](https://github.com/darkroomengineering/lenis)** | Drives both the page and the camera from one eased scroll value. |
| Agent rules | **[Ponytail](https://github.com/DietrichGebert/ponytail)** (141k★, MIT) | See note below. |
| Grass / birds | Hand-written instanced shaders | One draw call each; a model pack would have been heavier and less controllable. |

Quaternius/Poly Haven models were deliberately **not** used: they'd add tens of MB of binaries to
git for assets that procedural generation covers at ~0 bytes.

### A note on Ponytail

Ponytail is an **AI-agent ruleset**, not a runtime library — the `ponytail` package on npm is an
unrelated 2019 project, so it was uninstalled. The real rules are vendored where agents look for
them: `AGENTS.md`, `.agents/rules/ponytail.md` and `.cursor/rules/ponytail.mdc`. They shaped this
build: no state-management library, no component framework, no asset pipeline, 8 source files.

## Architecture

```
src/
  content.js          Section copy — the single list that drives everything
  scroll.js           Lenis + the shared scroll store
  Overlay.jsx         HTML panels, nav dots
  styles.css
  scene.check.mjs     Runnable check
  three/
    Scene.jsx         Canvas, lighting, post-processing, camera rig
    Forest.jsx        ez-tree generation + deterministic placement
    Grass.jsx         40k instanced blades, GPU wind
    Birds.jsx         Flock with vertex-shader wing flap
```

**The scroll → camera link avoids React entirely.** Lenis writes `scroll.progress` to a plain
object; the camera rig reads it inside `useFrame` and interpolates along a `CatmullRomCurve3`.
No state updates, no re-renders, no dropped frames. Only the *active section index* is a
subscribable value, via `useSyncExternalStore`, because the HTML overlay genuinely needs it.

Performance: the forest is 6 uniquely generated trees cloned 26 times, grass and birds are
instanced (1 draw call each), DPR capped at 1.75, and shadow cameras are tightly bounded.

## Customising

- **Copy** — edit `src/content.js`. Adding a section requires adding a matching camera waypoint
  to `PATH` in `src/three/Scene.jsx`; `scene.check.mjs` fails if you forget.
- **Email** — the placeholder `hello@prathvi.design` is in the last section of `content.js`.
- **Forest density** — `<Forest count={26} />` and `<Grass count={40000} />` in `Scene.jsx`.
