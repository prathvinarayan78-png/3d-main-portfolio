// Smallest runnable check: the camera path must stay in sync with the sections
// and never fly through the ground. Run with: node src/scene.check.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sections } from './content.js';

// Keep in step with three/Scene.jsx.
const PATH = [
  { pos: [0, 2.6, 12], look: [0, 3.2, -6] },
  { pos: [-6, 3.4, -2], look: [2, 2.6, -16] },
  { pos: [7, 2.2, -20], look: [-2, 3.0, -34] },
  { pos: [-5, 5.5, -40], look: [3, 3.4, -56] },
  { pos: [4, 1.8, -62], look: [-4, 2.8, -78] },
  { pos: [-7, 4.2, -86], look: [2, 3.6, -102] },
  { pos: [6, 6.5, -110], look: [-2, 4.0, -128] },
  { pos: [0, 9.5, -136], look: [0, 6.0, -165] },
];

// 1. One waypoint per section, or the last sections would never be reached.
assert.equal(PATH.length, sections.length, 'camera waypoints must match section count');

// 2. Sample the spline densely: the camera must never dip below the grass line.
const curve = new THREE.CatmullRomCurve3(
  PATH.map((p) => new THREE.Vector3(...p.pos)),
  false,
  'catmullrom',
  0.5
);
const v = new THREE.Vector3();
let minY = Infinity;
for (let i = 0; i <= 500; i++) {
  curve.getPointAt(i / 500, v);
  minY = Math.min(minY, v.y);
}
// Overshoot on a 0.5-tension spline can undershoot the lowest waypoint (1.8).
assert.ok(minY > 1.0, `camera dips too low (minY=${minY.toFixed(2)}), would clip the ground`);

// 3. Path must move consistently away from the camera, so scrolling always
//    travels forward through the forest rather than doubling back.
for (let i = 1; i < PATH.length; i++) {
  assert.ok(PATH[i].pos[2] < PATH[i - 1].pos[2], `waypoint ${i} does not advance into the scene`);
}

// 4. Every section needs the fields the overlay renders unconditionally.
for (const s of sections) {
  assert.ok(s.id && s.kicker && s.title && s.body, `section "${s.id}" is missing copy`);
}

// 5. Wildlife must be spread, not clustered. Mirrors the tables in Wildlife.jsx.
const FLYERS = [
  [-58, 27, -44],
  [-52, 29, -50],
  [-34, 13, -110],
  [26, 30, -170],
];
const GROUNDERS = [
  [-15.5, 0, -12],
  [19, 0, -80],
  [13.5, 0, -140],
];

// Ground animals walk circles the camera passes close to, so they need real
// separation. The flamingo pair is deliberately together (they flock), so
// flyers are checked on depth spread rather than pairwise distance.
for (let i = 0; i < GROUNDERS.length; i++) {
  for (let j = i + 1; j < GROUNDERS.length; j++) {
    const d = Math.hypot(...GROUNDERS[i].map((v, k) => v - GROUNDERS[j][k]));
    assert.ok(d > 30, `ground animals ${i}/${j} are clustered (${d.toFixed(1)}m apart)`);
  }
}

// No more than two animals may share any 30m slice of the corridor — and the
// only permitted pair is the two flamingos, which flock on purpose.
const depths = [...FLYERS, ...GROUNDERS].map((p) => p[2]);
for (const d of depths) {
  const near = depths.filter((o) => Math.abs(o - d) < 30);
  assert.ok(near.length <= 2, `too many animals bunched near z=${d} (${near.length})`);
}
// The flamingos (first two) are the pair; every other flyer must be solo.
const soloFlyers = FLYERS.slice(2).map((p) => p[2]);
for (const d of soloFlyers) {
  const near = depths.filter((o) => Math.abs(o - d) < 30).length;
  assert.ok(near === 1, `flyer at z=${d} should be solo but has company`);
}

// Ground animals must stay clear of the camera corridor (|x| < 8 is the path).
for (const [x, , z] of GROUNDERS) {
  assert.ok(Math.abs(x) > 9, `ground animal at z=${z} stands in the camera path`);
}

console.log(
  `ok — ${sections.length} sections, camera minY ${minY.toFixed(2)}, ` +
    `${FLYERS.length} flyers + ${GROUNDERS.length} ground animals spread over ${Math.abs(
      Math.min(...depths)
    )}m`
);
