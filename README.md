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
| Wildlife | **[three.js examples](https://github.com/mrdoob/three.js)** (MIT) + **[Khronos Fox](https://github.com/KhronosGroup/glTF-Sample-Assets)** (CC0) | Flamingo, Parrot, Stork and Horse are the classic animated three.js models; the Fox is Khronos' rigged sample with Survey/Walk/Run clips. 596 KB for all five. |
| Grass / distant birds | Hand-written instanced shaders | One draw call each; a model pack would have been heavier and less controllable. |

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
  wildlife.check.mjs  Verifies every GLB loads, clones and animates
  three/
    Scene.jsx         Canvas, lighting, post-processing, camera rig
    Forest.jsx        ez-tree generation + deterministic placement
    Grass.jsx         40k instanced blades, GPU wind
    Birds.jsx         Distant silhouette flock, vertex-shader wing flap
    Wildlife.jsx      Animated GLB animals on hand-authored paths
public/models/        Flamingo, Parrot, Stork, Horse (MIT), Fox (CC0)
```

### Wildlife placement

Positions in `Wildlife.jsx` are **hand-authored, not random** — 4 flyers and 3
ground animals spread over 170 m, alternating sides, with no two sharing a scroll
section. `scene.check.mjs` enforces it: ground animals must be >30 m apart and
clear of the camera corridor, and no more than two animals may share any 30 m
slice. The only deliberate pair is the two flamingos, which flock on purpose.

Note the birds and horse are **morph-target** rigs, not skinned — only the Fox has
a skeleton. Replacing their materials freezes them mid-flap, which is why
`wildlife.check.mjs` steps a real `AnimationMixer` and asserts the geometry moves.

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

## Credits

- **Trees** — [ez-tree](https://github.com/dgreenheck/ez-tree) by Dan Greenheck (MIT)
- **Flamingo, Parrot, Stork, Horse** — [three.js](https://github.com/mrdoob/three.js) examples (MIT)
- **Fox** — [glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets), by PixelMannen / tomkranis (CC0 / CC-BY 4.0)
- **Smooth scroll** — [Lenis](https://github.com/darkroomengineering/lenis) by darkroom.engineering
- **Agent rules** — [Ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert (MIT)
