/*
  Guards against the scene crushing to black.

  This happened once: four defensible darkening changes stacked (sun near the
  horizon, a heavy vignette, a near-black ground, a dark grass ramp) and under
  ACES tone mapping the result was an unusable frame. Each value here is
  scraped from Scene.jsx so the guard can't drift from the real settings.
  Run: node src/checks/lighting.check.mjs
*/
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync('src/three/Scene.jsx', 'utf8');

const num = (re, label) => {
  const m = src.match(re);
  assert.ok(m, `could not find ${label} in Scene.jsx`);
  return parseFloat(m[1]);
};

// 1. Sun elevation. Below ~3 degrees the Sky shader emits almost no radiance
//    and the key light grazes every surface, which is what went black before.
const sunY = num(/sunPosition=\{\[\s*[-\d.]+,\s*([-\d.]+)/, 'sunPosition');
const sunZ = num(/sunPosition=\{\[\s*[-\d.]+,\s*[-\d.]+,\s*([-\d.]+)/, 'sunPosition z');
const sunX = num(/sunPosition=\{\[\s*([-\d.]+)/, 'sunPosition x');
const elevation = (Math.atan2(sunY, Math.hypot(sunX, sunZ)) * 180) / Math.PI;
assert.ok(elevation > 3, `sun is only ${elevation.toFixed(2)} degrees above horizon`);

// 2. Key light must actually light things.
const key = num(/intensity=\{(2[\d.]*|[3-9][\d.]*)\}\s*\n\s*color="#ffd9a0"/, 'key intensity');
assert.ok(key >= 1.8, `key light too dim (${key})`);

// 3. Ambient + hemisphere fill, so shadows aren't pure black.
const amb = num(/<ambientLight intensity=\{([\d.]+)\}/, 'ambientLight');
const hemi = num(/hemisphereLight args=\{\['#[0-9a-f]+', '#[0-9a-f]+', ([\d.]+)\]/, 'hemisphereLight');
assert.ok(amb >= 0.4, `ambient too low (${amb})`);
assert.ok(hemi >= 0.6, `hemisphere fill too low (${hemi})`);

// 4. Vignette must not crush the frame edges, which is where the copy sits.
const vig = num(/<Vignette[^>]*darkness=\{([\d.]+)\}/, 'Vignette darkness');
const vigOffset = num(/<Vignette[^>]*offset=\{([\d.]+)\}/, 'Vignette offset');
assert.ok(vig <= 0.8, `vignette too dark (${vig})`);
assert.ok(vigOffset >= 0.15, `vignette starts too close to centre (${vigOffset})`);

// 5. Ground must read as earth, not a hole between the blades.
const ground = src.match(/color="#([0-9a-f]{6})" roughness=\{1\}/);
assert.ok(ground, 'could not find ground colour');
const [r, g, b] = ground[1].match(/../g).map((h) => parseInt(h, 16) / 255);
const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
assert.ok(lum > 0.02, `ground is near-black (luminance ${lum.toFixed(3)})`);

// 6. Explicit exposure, so brightness is one tunable number.
const exposure = num(/toneMappingExposure:\s*([\d.]+)/, 'toneMappingExposure');
assert.ok(exposure >= 0.9 && exposure <= 1.6, `exposure ${exposure} out of sane range`);

// 7. DoF must focus into the scene, not at the lens.
const focus = num(/focusDistance=\{([\d.]+)\}/, 'focusDistance');
assert.ok(focus >= 0.02, `DoF focuses ~at the lens (${focus}) — blurs everything`);

console.log(
  `ok — sun ${elevation.toFixed(1)}deg, key ${key}, ambient ${amb}, ` +
    `vignette ${vig}@${vigOffset}, exposure ${exposure}, ground lum ${lum.toFixed(3)}`
);
