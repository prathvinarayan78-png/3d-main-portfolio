# Prathvi — 3D Scroll-Driven Portfolio

A fully 3D, scroll-driven portfolio for **Prathvi** — editor, motion designer,
graphic designer, web developer and brand manager. The whole page is one WebGL
scene: scrolling flies a camera along a spline through a procedurally generated
forest at golden hour, past wildlife that wanders on its own.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run check    # scene, grass, wildlife and lighting checks
```

## Dependencies

| Package | Role |
|---|---|
| **[Lenis](https://github.com/darkroomengineering/lenis)** | Smooth scroll. Drives both the page and the camera from one eased value. |
| **[Ponytail](https://github.com/DietrichGebert/ponytail)** | Agent ruleset (141k★). Not a runtime library — see below. |
| **[ez-tree](https://github.com/dgreenheck/ez-tree)** | Procedural trees, textures embedded as base64 (no binary assets). |
| React 19 · Three.js · R3F · drei · postprocessing | Rendering stack. |

### A note on Ponytail

Ponytail is an **AI-agent ruleset**, not an npm library — the `ponytail` package
on npm is an unrelated 2019 project. The real rules are vendored where agents
look for them: `AGENTS.md`, `.agents/rules/ponytail.md`, `.cursor/rules/ponytail.mdc`.
They shaped this build: no state library, no UI framework, no CSS framework,
no asset pipeline. 13 source files.

## 3D models

All from well-known open repos, 588 KB total:

| Model | Source | Licence |
|---|---|---|
| Flamingo, Parrot, Stork, Horse | [mrdoob/three.js](https://github.com/mrdoob/three.js) examples | MIT |
| Fox (Survey / Walk / Run) | [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | CC0 |

Quaternius and Poly Haven packs were considered and rejected: tens of MB of
binaries for what procedural generation and five small GLBs already cover.

## Atmosphere

The brief was "calm and mesmerising", which came down to five things:

- **Golden-hour light** — low warm key at 8°, cool rim from behind so trees
  separate from the sky, explicit tone-mapping exposure.
- **Drifting motes** — 900 additive points on slow figure-eight paths. The
  single biggest contributor to air feeling *volumetric* rather than empty.
- **Layered ground mist** — soft radial-gradient planes that breathe in and out.
- **Slow everything** — 1.9s scroll easing, 0.62Hz wind, birds on 40m ellipses.
- **A camera that never sits still** — a 0.28Hz vertical float plus pointer parallax.

## Natural animal movement

Ground animals don't loop a circle — they **wander**. Each has a set of grazing
stops and walks between them at constant speed, easing in and out of each leg,
then **pausing** at each stop. The fox cross-fades `Walk` → `Survey` while
paused, so it stops, looks around, and moves on. Headings are angularly damped,
so turns glide instead of snapping.

Flyers travel long ellipses (`rx` ≠ `rz`) with banking into the turn and a
heading computed from the true ellipse tangent. Wing cycles are phase-offset so
a flamingo pair never flaps in lockstep.

**Only the Fox is a skinned rig** — the birds and horse are morph-target
animated. Replacing their materials silently freezes them mid-flap.

## Architecture

```
src/
  content.js            Section copy — the list that drives everything
  scroll.js             Lenis + the shared scroll store
  Overlay.jsx           HTML panels, nav rail, progress bar
  styles.css            Editorial type system
  main.jsx
  three/
    Scene.jsx           Canvas, lighting, post-processing, camera rig
    Forest.jsx          ez-tree generation + deterministic placement
    Grass.jsx           110k instanced cross-quad blades, GPU wind
    grassField.js       Pure blade-placement maths
    Wildlife.jsx        GLB animals, animation state machine
    wildlifePaths.js    Pure placement + wander/fly maths
    Atmosphere.jsx      Drifting motes, layered mist
  checks/               Runnable checks (no framework)
public/models/          5 animated GLBs
```

**The scroll → camera link bypasses React.** Lenis writes `scroll.progress` to a
plain object; the camera rig reads it inside `useFrame` and interpolates along a
`CatmullRomCurve3`. No state updates, no re-renders, no dropped frames. Only the
*active section index* is subscribable (`useSyncExternalStore`), because the
HTML overlay genuinely needs it.

## Checks

`npm run check` — plain Node asserts, no test framework. These caught real bugs:

- **wildlife** — loads every GLB through the real path and steps an
  `AnimationMixer`. Caught that every animal was **3–8× oversized** (a 10m
  flamingo), because the raw bbox includes wingspan.
- **scene** — one camera waypoint per section, camera never clips the ground,
  animals spread >30m apart and clear of the corridor, and motion is continuous
  (no teleports) with real pauses.
- **grass** — every depth slice covered, corridor density even, deterministic.
- **lighting** — scrapes Scene.jsx and asserts sun elevation, light intensities,
  vignette, ground luminance and exposure. Guards a regression where the scene
  rendered black.

## Typography

Fraunces (variable serif) against Inter, on a fluid clamp-based scale so the
rhythm holds at any viewport with no per-breakpoint overrides. Headings split
into words that rise out of clipping masks on staggered delays; the second line
of each heading is set in italic gold. Body copy is capped at 34ch measure.

No scrim sits behind the text — legibility comes from layered short-radius
text-shadow halos that hug each glyph, so the forest stays visible right up to
the letterforms. Verified at **13–18:1** against sky, sun band, cloud, grass and
fog. Bare contrast on a lit cloud is only 1.27:1, so the halo is doing all the
work and is deliberately dense.

## Customising

- **Copy** — `src/content.js`. Adding a section needs a matching camera waypoint
  in `PATH` in `Scene.jsx`; `npm run check` fails if you forget.
- **Email** — `hello@prathvi.design` is a placeholder in the last section.
- **Density** — `<Forest count={52} />`; grass auto-scales (110k desktop, 40k
  mobile), override with `<Grass count={80000} />`.
- **Animals** — `src/three/wildlifePaths.js`. The checks enforce spacing.

## Credits

- [ez-tree](https://github.com/dgreenheck/ez-tree) — Dan Greenheck (MIT)
- [three.js](https://github.com/mrdoob/three.js) examples — Flamingo, Parrot, Stork, Horse (MIT)
- [glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) — Fox, by PixelMannen / tomkranis (CC0 / CC-BY 4.0)
- [Lenis](https://github.com/darkroomengineering/lenis) — darkroom.engineering
- [Ponytail](https://github.com/DietrichGebert/ponytail) — Dietrich Gebert (MIT)
