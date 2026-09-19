// Camera path and wildlife layout must stay in step with the content.
// Run: node src/checks/scene.check.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sections } from '../content.js';
import { FLYERS, GROUNDERS, wanderAt, flyAt } from '../three/wildlifePaths.js';

// Mirrors PATH in three/Scene.jsx.
const PATH = [
  [0, 2.4, 14],
  [-7, 3.2, -4],
  [8, 2.0, -26],
  [-6, 6.0, -50],
  [5, 1.7, -74],
  [-8, 4.4, -100],
  [7, 7.5, -128],
  [0, 11.0, -158],
];

assert.equal(PATH.length, sections.length, 'one camera waypoint per section');

// Spline can overshoot between waypoints — sample densely, never dip to ground.
const curve = new THREE.CatmullRomCurve3(
  PATH.map((p) => new THREE.Vector3(...p)),
  false,
  'catmullrom',
  0.4
);
const v = new THREE.Vector3();
let minY = Infinity;
for (let i = 0; i <= 600; i++) {
  curve.getPointAt(i / 600, v);
  minY = Math.min(minY, v.y);
}
assert.ok(minY > 1.0, `camera dips to ${minY.toFixed(2)}m — would clip the ground`);

// Scrolling must always travel forward, never double back.
for (let i = 1; i < PATH.length; i++) {
  assert.ok(PATH[i][2] < PATH[i - 1][2], `waypoint ${i} does not advance`);
}

// Every section needs the copy the overlay renders unconditionally.
for (const s of sections) {
  assert.ok(s.id && s.kicker && s.title && s.body, `section "${s.id}" missing copy`);
}

/* ---- wildlife: spread out, never clustered ---- */

const groundHomes = GROUNDERS.map((g) => g.home);
for (let i = 0; i < groundHomes.length; i++) {
  for (let j = i + 1; j < groundHomes.length; j++) {
    const d = Math.hypot(...groundHomes[i].map((val, k) => val - groundHomes[j][k]));
    assert.ok(d > 30, `ground animals ${i}/${j} clustered (${d.toFixed(1)}m)`);
  }
}

// Ground animals must stay clear of the camera corridor.
for (const g of GROUNDERS) {
  for (const s of g.stops) {
    assert.ok(Math.abs(s[0]) > 9, `${g.model} wanders into the camera path at x=${s[0]}`);
  }
}

// No more than two animals in any 30m slice; the flamingo pair is the only
// intentional pair, because flamingos actually flock.
const depths = [...FLYERS.map((f) => f.at[2]), ...groundHomes.map((h) => h[2])];
for (const d of depths) {
  const near = depths.filter((o) => Math.abs(o - d) < 30).length;
  assert.ok(near <= 2, `too many animals bunched near z=${d} (${near})`);
}

/* ---- movement must be continuous and natural ---- */

for (const spec of GROUNDERS) {
  let prev = wanderAt(spec, 0);
  let maxJump = 0;
  let sawPause = false;
  let sawMove = false;
  for (let t = 0.1; t < 400; t += 0.1) {
    const cur = wanderAt(spec, t);
    maxJump = Math.max(maxJump, Math.hypot(cur.x - prev.x, cur.z - prev.z));
    if (cur.moving) sawMove = true;
    else sawPause = true;
    prev = cur;
  }
  // A teleport between legs would show as a large per-step jump.
  assert.ok(maxJump < 0.6, `${spec.model} teleports (${maxJump.toFixed(2)}m in 0.1s)`);
  assert.ok(sawPause, `${spec.model} never pauses — movement would look robotic`);
  assert.ok(sawMove, `${spec.model} never moves`);
}

for (const spec of FLYERS) {
  let prev = flyAt(spec, 0);
  let maxJump = 0;
  let minY = Infinity;
  for (let t = 0.1; t < 400; t += 0.1) {
    const cur = flyAt(spec, t);
    maxJump = Math.max(maxJump, Math.hypot(cur.x - prev.x, cur.z - prev.z));
    minY = Math.min(minY, cur.y);
    prev = cur;
  }
  assert.ok(maxJump < 1.0, `${spec.model} flight jumps ${maxJump.toFixed(2)}m per tick`);
  assert.ok(minY > 8, `${spec.model} flies too low (${minY.toFixed(1)}m) — into the canopy`);
}

console.log(
  `ok — ${sections.length} sections, camera minY ${minY.toFixed(2)}, ` +
    `${FLYERS.length} flyers + ${GROUNDERS.length} wanderers, motion continuous`
);
