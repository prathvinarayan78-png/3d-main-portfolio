// Verifies the grass field is dense everywhere the camera can see, with no
// bald patches. Pure maths, so it runs headlessly.
// Run with: node src/grass.check.mjs
import assert from 'node:assert/strict';
import { placeBlades, FIELD } from './three/grassField.js';

const COUNT = 120000;
const blades = placeBlades(COUNT);

assert.equal(blades.length, COUNT, 'wrong blade count');

// 1. Deterministic: two runs must be byte-identical, or the field would
//    reshuffle on every reload and patches would flicker.
const again = placeBlades(COUNT);
assert.deepEqual(blades[0], again[0], 'placement is not deterministic');
assert.deepEqual(blades[COUNT - 1], again[COUNT - 1], 'placement is not deterministic');

// 2. Coverage: bucket the corridor the camera actually flies down and assert
//    every slice has grass. This is the real "no bald patches" test.
const SLICE = 10; // metres
const zSlices = Math.ceil((FIELD.zNear - FIELD.zFar) / SLICE);
const corridor = new Array(zSlices).fill(0);
const wide = new Array(zSlices).fill(0);

for (const b of blades) {
  const idx = Math.min(zSlices - 1, Math.max(0, Math.floor((FIELD.zNear - b.z) / SLICE)));
  if (Math.abs(b.x) <= FIELD.corridorHalfWidth) corridor[idx]++;
  wide[idx]++;
}

const emptyWide = wide.filter((n) => n === 0).length;
assert.equal(emptyWide, 0, 'some depth slices have no grass at all');

// The last bucket is a partial slice running off the end of the field, far
// behind the final camera target — judge density on full slices only.
const full = corridor.slice(0, -1);
const minCorridor = Math.min(...full);
const maxCorridor = Math.max(...full);

assert.ok(
  minCorridor > 2500,
  `sparsest corridor slice has only ${minCorridor} blades — would read as bald`
);
// Evenness matters as much as volume: a field that's thick near the camera and
// thin further down reads as a visible density falloff.
assert.ok(
  maxCorridor / minCorridor < 1.35,
  `corridor density is uneven (${minCorridor}..${maxCorridor} per slice)`
);

// 3. Bias: most blades should sit near the path, not wasted at the far edges.
const nearPath = blades.filter((b) => Math.abs(b.x) <= FIELD.corridorHalfWidth).length;
const frac = nearPath / COUNT;
assert.ok(frac > 0.6, `only ${(frac * 100).toFixed(0)}% of blades are near the camera corridor`);

// 4. Variation: a field of identical blades reads as fake.
const scales = blades.slice(0, 5000).map((b) => b.scale);
assert.ok(Math.max(...scales) - Math.min(...scales) > 0.8, 'not enough height variation');
const leans = blades.slice(0, 5000).map((b) => b.lean);
assert.ok(Math.min(...leans) < -0.15 && Math.max(...leans) > 0.15, 'blades are too uniform');

// 5. Field must extend past the last camera waypoint (z=-136) plus its look
//    target (-165), or the ground would visibly end mid-shot.
assert.ok(FIELD.zFar < -180, 'grass field ends too early for the final camera shot');

const avg = (corridor.reduce((a, b) => a + b, 0) / zSlices).toFixed(0);
console.log(
  `ok — ${COUNT} blades, ${zSlices} depth slices all covered, ` +
    `corridor ${minCorridor}-${maxCorridor}/slice (avg ${avg}), ${(frac * 100).toFixed(0)}% near path`
);
