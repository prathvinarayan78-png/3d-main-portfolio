# 3D Nature Model Sources — Trees, Birds, Animals, Foliage

Research notes for sourcing detailed/realistic 3D nature assets (glTF/GLB-first, usable in
Three.js / React Three Fiber portfolios). Star counts and dates checked 2026-09-17.

---

## 1. Ready-to-download model libraries (GitHub)

| Repo | Stars | License | What's in it |
|---|---|---|---|
| [nasa/NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources) | 3.8k | Public domain (NASA usage terms) | Huge collection of NASA models/textures. Not nature-focused, but the terrain/satellite/planet assets are genuinely high detail and free of licensing headaches. |
| [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | 1.1k | Per-model (mostly CC0/CC-BY) | The canonical glTF asset set. Contains detailed PBR organic models (Fox — rigged + 3 animations, Duck, Brain Stem, Sheen Chair, Water Bottle). Best starting point for "does my loader/material pipeline work" plus a couple of usable animals. Browse it at [github.khronos.org/glTF-Assets](https://github.khronos.org/glTF-Assets/). |
| [pmndrs/market](https://github.com/pmndrs/market) | 283 | MIT (code), CC0 (assets) | Poimandres' CC0 asset market — searchable, one-click GLB download, and it generates the `<Gltf/>`/drei snippet for you. Direct fit for a React Three Fiber portfolio. Site: [market.pmnd.rs](https://market.pmnd.rs/). |
| [ToxSam/open-source-3D-assets](https://github.com/ToxSam/open-source-3D-assets) | 156 | CC0 | 991+ GLB models as a JSON registry with direct download URLs, previews and license fields. `avatar-garden` and `momus-park` collections have landscape/park/vegetation assets; `xyz` has 60 rigged creatures. API-friendly — you can fetch `data/projects.json` at build time. |
| [KayKit-Game-Assets/*](https://github.com/orgs/KayKit-Game-Assets/repositories) | 25–130 each | CC0 | Stylised low-poly packs (Hexagons, City Builder, Dungeon, Characters). Nature-adjacent rather than photoreal, but consistent and free. |
| [EverseDevelopment/3DModelsFamousSamples](https://github.com/EverseDevelopment/3DModelsFamousSamples) | 6 | Mixed | Classic test meshes (Stanford Bunny, Dragon, Cow, Lucy, Nefertiti, Suzanne) in obj/gltf/usdz/stl/dae/fbx. Handy for animal-ish silhouettes and pipeline tests. |
| [trebeljahr/quaternius-showcase](https://github.com/trebeljahr/quaternius-showcase) | 8 | MIT | R3F demo that loads Quaternius' animated animal/nature packs — useful as reference code for wiring the packs below into a scene. |

## 2. Procedural generators (make your own trees/plants — infinite variety, tiny repo size)

| Repo | Stars | License | Notes |
|---|---|---|---|
| [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) | **1.6k** | MIT | **Top pick for a Three.js portfolio.** Procedural tree generator written in JS + Three.js, with a live editor, presets (oak, pine, ash, aspen) and GLB export. Drop trees straight into your scene or bake them. Demo: [eztree.dev](https://eztree.dev). |
| [friggog/tree-gen](https://github.com/friggog/tree-gen) | 950 | GPL-3.0 | Blender addon implementing the Weber & Penn "Creation and Rendering of Realistic Trees" paper. Produces genuinely photoreal branching. Export to GLB from Blender. Note the GPL — it covers the addon, not the meshes you generate. |
| [abpy/improved-sapling-tree-generator](https://github.com/abpy/improved-sapling-tree-generator) | 145 | GPL-2.0 | Upgraded version of Blender's built-in Sapling addon (better branching, presets, armatures for wind animation). |
| [SkyeShark/SeedThree](https://github.com/SkyeShark/SeedThree) | 97 | MIT | Procedural tree & plant generator for Three.js on **WebGPU**, "infinite species generation". Newer and less battle-tested than ez-tree but modern. |
| [wdiestel/arbaro](https://github.com/wdiestel/arbaro) | 17 | GPL-2.0 | Long-running Java implementation of the same Weber & Penn algorithm; exports OBJ/POV. Good for batch-generating a forest offline. |
| [mracette/generative-trees](https://github.com/mracette/generative-trees) | 9 | — | Small Three.js modules (simple/fruit/pine/willow trees) with .gltf download from the [live page](https://mracette.github.io/generative-trees). Merged BufferGeometries, so cheap to render. |

## 3. Living detail — grass, wind, flocking birds

| Repo | Stars | Notes |
|---|---|---|
| [James-Smyth/three-grass-demo](https://github.com/James-Smyth/three-grass-demo) | 96 | Instanced grass blowing in the wind, GLSL. The classic reference implementation. |
| [Sahilk-027/Crystal-Bird](https://github.com/SahilK-027/Crystal-Bird) | 89 | Bird geometry + GPGPU flowfield particles. Strong hero-section material. |
| [jeromeetienne/threex.grass](https://github.com/jeromeetienne/threex.grass) | 65 | Older but very fast billboarded grass extension. |
| [Steve245270533/three-stylized](https://github.com/Steve245270533/three-stylized) | 61 | Stylized meadow: instanced grass + wind. |
| [achrefelouafi/GrassSystemThreeJS](https://github.com/achrefelouafi/GrassSystemThreeJS) | 60 | Complete grass system. |
| [leoawen/fluffytree-threejs](https://github.com/leoawen/fluffytree-threejs) | 32 | Anime-style fluffy tree + grass + wind + shadows. |
| Three.js official [`webgl_gpgpu_birds`](https://threejs.org/examples/#webgl_gpgpu_birds) | — | GPU flocking birds, MIT, in [mrdoob/three.js](https://github.com/mrdoob/three.js). The standard way to get hundreds of birds at 60fps. |

## 4. Off-GitHub but essential (where the *detailed* nature models actually live)

- **[Quaternius](https://quaternius.com/)** — 70+ packs, 2500+ models, **all CC0**, in FBX/OBJ/Blend/**glTF**.
  Most relevant: *Ultimate Animated Animals* (12 animals × 12 animations each — walk, gallop, jump, death),
  *Stylized Nature MegaKit* (116 models: 40 trees, 35 plants/flowers, 27 rocks), *Ultimate Nature Pack*,
  *Animated Birds*. This is the single best free source for rigged, animated animals and birds.
- **[Poly Haven](https://polyhaven.com/models)** — CC0 photogrammetry-grade models, PBR textures and HDRIs.
  Official [Blender addon](https://github.com/Poly-Haven/polyhavenassets) (516★) and
  [Public API](https://github.com/Poly-Haven/Public-API) (60★) for programmatic fetching. Best for *photoreal*.
- **[Poly Pizza](https://poly.pizza/)** — the rescued Google Poly archive, 9000+ low-poly models incl. tons of
  animals/birds/trees. CC-BY mostly. Has a public API.
- **[Icosa Gallery](https://icosa.gallery/)** — the open-source Poly successor
  ([icosa-foundation/icosa-gallery](https://github.com/icosa-foundation/icosa-gallery), Apache-2.0) with a
  [Three.js viewer component](https://github.com/icosa-foundation/gallery-viewer).
- **[Kenney](https://kenney.nl/assets)** — CC0, hundreds of themed low-poly assets incl. a Nature Kit and Nature Kit Extended.
- **[Smithsonian Open Access](https://www.si.edu/openaccess/3d)** — CC0 scans of real specimens: whales, birds,
  fossils, insects. Genuinely *detailed and natural* — museum photogrammetry, not game art.
- **[Sketchfab](https://sketchfab.com/features/free-3d-models)** — biggest pool of free rigged/animated birds and
  animals (auto-converts to glTF), but licenses are per-model — check CC-BY vs CC-BY-NC before shipping.
- **[BlendSwap](https://blendswap.com/)** / **[Fab free Megascans](https://www.fab.com/)** — high-poly source files.

---

## Recommendation for this portfolio

1. **Trees:** `dgreenheck/ez-tree` for runtime-generated trees (MIT, Three.js native, GLB export) — gives
   variety with almost no asset weight. Fall back to Quaternius' Stylized Nature MegaKit for hero trees.
2. **Animals & birds:** Quaternius *Ultimate Animated Animals* + *Animated Birds* (CC0, glTF, already rigged
   with looping animations — no extra rigging work).
3. **Flocks/ambience:** three.js `webgl_gpgpu_birds` for background flocking, `three-grass-demo` for ground cover.
4. **Photoreal accents:** Poly Haven models + HDRI for lighting; Smithsonian scans if you want one
   showstopper high-detail specimen.
5. **Licensing:** prefer CC0 (Quaternius, Poly Haven, Kenney, KayKit, Smithsonian) so no attribution is required,
   and keep a `CREDITS.md` anyway. Avoid GPL-licensed *generators* leaking into your build — generate meshes
   offline and commit the GLBs.

### Pipeline tips
- Compress everything with `gltf-transform optimize model.glb out.glb --texture-compress webp` and Draco/Meshopt;
  a 40 MB photoreal tree becomes ~2 MB.
- Use `gltfjsx` to turn GLBs into typed R3F components.
- Instance trees/grass (`<Instances>` from drei) — a forest should be 1 draw call, not 500.
