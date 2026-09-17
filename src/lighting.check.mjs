// Guards against the scene going black again.
//
// The frame crushed to near-black because four separate darkening changes
// stacked: sun elevation dropped to 0.25 degrees, the vignette hit 1.15
// darkness at a 0.06 offset, the ground went to #111d0e and the grass ramp
// started at 0.055. Each looked reasonable alone. This asserts the combination
// stays in a visible range.
//
// Run with: node src/lighting.check.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync(new URL('./three/Scene.jsx', import.meta.url), 'utf8');
const grass = fs.readFileSync(new URL('./three/Grass.jsx', import.meta.url), 'utf8');

const num = (src, re, label) => {
  const m = src.match(re);
  assert.ok(m, `could not find ${label}`);
  return parseFloat(m[1]);
};

// 1. Sun elevation. Below ~3 degrees the Sky shader returns almost no
//    radiance and the directional light grazes everything.
const sun = scene.match(/sunPosition=\{\[([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\]\}/);
assert.ok(sun, 'no sunPosition found');
const [sx, sy, sz] = sun.slice(1).map(Number);
const elevation = (Math.atan2(sy, Math.hypot(sx, sz)) * 180) / Math.PI;
assert.ok(
  elevation > 3,
  `sun is ${elevation.toFixed(2)} degrees above horizon — too low, scene will render black`
);

// 2. Vignette must not crush the frame edges, which is where the copy sits.
const darkness = num(scene, /<Vignette[^>]*darkness=\{([\d.]+)\}/s, 'vignette darkness');
const offset = num(scene, /<Vignette[^>]*offset=\{([\d.]+)\}/s, 'vignette offset');
assert.ok(darkness <= 0.75, `vignette darkness ${darkness} is too strong`);
assert.ok(offset >= 0.2, `vignette offset ${offset} starts the falloff too close to centre`);

// 3. Key light must actually deliver energy.
const keyIntensity = num(scene, /<directionalLight[\s\S]*?intensity=\{([\d.]+)\}/, 'key light');
const ambient = num(scene, /<ambientLight intensity=\{([\d.]+)\}/, 'ambient light');
assert.ok(keyIntensity >= 2.2, `key light ${keyIntensity} is too dim`);
assert.ok(ambient >= 0.5, `ambient ${ambient} is too dim — shadows will read as black holes`);

// 4. Ground and grass base must stay above "reads as a hole" luminance.
const rel = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lumHex = (hex) => {
  const [r, g, b] = hex.match(/../g).map((h) => parseInt(h, 16) / 255);
  return 0.2126 * rel(r) + 0.7152 * rel(g) + 0.0722 * rel(b);
};

const groundHex = scene.match(/<meshStandardMaterial color="#([0-9a-f]{6})"/i)[1];
const groundLum = lumHex(groundHex);
assert.ok(
  groundLum > 0.012,
  `ground #${groundHex} (luminance ${groundLum.toFixed(4)}) is effectively black`
);

// Grass base colour is already linear-space in the shader, so compare directly.
const grassBase = grass.match(/vec3 base = mix\(vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)/);
assert.ok(grassBase, 'could not find grass base colour');
const [gr, gg, gb] = grassBase.slice(1).map(Number);
const grassLum = 0.2126 * gr + 0.7152 * gg + 0.0722 * gb;
assert.ok(grassLum > 0.09, `grass base luminance ${grassLum.toFixed(3)} is too dark`);

// 5. Depth of field must focus on the scene, not on the lens.
const focus = num(scene, /focusDistance=\{([\d.]+)\}/, 'focusDistance');
assert.ok(focus > 0.03, `focusDistance ${focus} focuses too near — the scene will be a blur`);

// 6. Exposure should be explicit, so brightness is tunable rather than emergent.
const exposure = num(scene, /toneMappingExposure:\s*([\d.]+)/, 'toneMappingExposure');
assert.ok(exposure >= 1.0, `exposure ${exposure} is below neutral`);

console.log(
  `ok — sun ${elevation.toFixed(1)}deg, key ${keyIntensity}, ambient ${ambient}, ` +
    `exposure ${exposure}, vignette ${darkness}@${offset}, ground lum ${groundLum.toFixed(3)}`
);
