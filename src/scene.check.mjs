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

console.log(`ok — ${sections.length} sections, camera minY ${minY.toFixed(2)}`);
