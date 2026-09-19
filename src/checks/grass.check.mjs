// The grass field must cover everywhere the camera can see, evenly, and
// identically on every reload. Run: node src/checks/grass.check.mjs
import assert from 'node:assert/strict';
import { placeBlades, FIELD } from '../three/grassField.js';

const COUNT = 110000;
const blades = placeBlades(COUNT);
assert.equal(blades.length, COUNT, 'wrong blade count');

// Deterministic, or patches would flicker between reloads.
const again = placeBlades(COUNT);
assert.deepEqual(blades[0], again[0], 'placement is not deterministic');
assert.deepEqual(blades[COUNT - 1], again[COUNT - 1], 'placement is not deterministic');

// Bucket by depth: no slice may be bare, and the corridor must stay even.
const SLICE = 10;
const n = Math.ceil((FIELD.zNear - FIELD.zFar) / SLICE);
const corridor = new Array(n).fill(0);
const all = new Array(n).fill(0);
for (const b of blades) {
  const i = Math.min(n - 1, Math.max(0, Math.floor((FIELD.zNear - b.z) / SLICE)));
  all[i]++;
  if (Math.abs(b.x) <= FIELD.corridorHalfWidth) corridor[i]++;
}

assert.equal(all.filter((c) => c === 0).length, 0, 'some depth slices have no grass');

// Last bucket is a partial slice off the end of the field — judge full ones.
const full = corridor.slice(0, -1);
const min = Math.min(...full);
const max = Math.max(...full);
assert.ok(min > 2000, `sparsest corridor slice has ${min} blades — reads as bald`);
assert.ok(max / min < 1.4, `corridor density uneven (${min}..${max} per slice)`);

// Most blades should sit where the camera actually looks.
const near = blades.filter((b) => Math.abs(b.x) <= FIELD.corridorHalfWidth).length;
assert.ok(near / COUNT > 0.55, `only ${((near / COUNT) * 100) | 0}% of blades near the path`);

// Variation, or the field reads as a repeated stamp.
const sample = blades.slice(0, 5000);
const scales = sample.map((b) => b.scale);
assert.ok(Math.max(...scales) - Math.min(...scales) > 0.8, 'not enough height variation');
const leans = sample.map((b) => b.lean);
assert.ok(Math.min(...leans) < -0.15 && Math.max(...leans) > 0.15, 'blades too uniform');

// Must reach past the final camera look target (-196) and last animal (-220).
assert.ok(FIELD.zFar < -225, 'grass ends before the final shot');

console.log(
  `ok — ${COUNT} blades, ${n} slices covered, corridor ${min}-${max}/slice, ` +
    `${((near / COUNT) * 100) | 0}% near path`
);
