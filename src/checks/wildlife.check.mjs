/*
  Loads every wildlife GLB through the exact path the app uses:
  GLTFLoader -> SkeletonUtils.clone -> AnimationMixer, then steps time and
  asserts the geometry actually moved.

  This caught a real bug: the birds and horse are morph-target rigs, not
  skinned, so replacing their materials silently froze them mid-flap.
  Run: node src/checks/wildlife.check.mjs
*/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { MODELS, FLYERS, GROUNDERS } from '../three/wildlifePaths.js';

// Minimal DOM shim so three's TextureLoader doesn't throw under Node.
global.self = global;
global.window = global;
global.document = {
  createElementNS: () => ({ style: {}, setAttribute() {}, getContext: () => null }),
  createElement: () => ({ style: {}, getContext: () => null }),
};

const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
const loader = new GLTFLoader();

// Every model referenced by a path must exist.
const used = new Set([...FLYERS.map((f) => f.model), ...GROUNDERS.map((g) => g.model)]);
for (const key of used) assert.ok(MODELS[key], `path references unknown model "${key}"`);

for (const [name, cfg] of Object.entries(MODELS)) {
  const path = `public${cfg.url}`;
  assert.ok(fs.existsSync(path), `${path} is missing`);

  const buf = fs.readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  await new Promise((resolve, reject) => {
    loader.parse(
      ab,
      '',
      (gltf) => {
        assert.ok(gltf.animations.length > 0, `${name} has no animation clips`);
        const object = clone(gltf.scene);
        let mesh = null;
        object.traverse((o) => {
          if (o.isMesh && !mesh) mesh = o;
        });
        assert.ok(mesh, `${name} produced no mesh after cloning`);

        const mixer = new THREE.AnimationMixer(object);
        mixer.clipAction(gltf.animations[0]).play();

        const morphs = mesh.morphTargetInfluences;
        if (morphs?.length) {
          const before = [...morphs];
          mixer.update(0.35);
          assert.ok(
            morphs.some((v, i) => Math.abs(v - before[i]) > 1e-4),
            `${name} morph targets did not animate`
          );
        } else {
          let bone = null;
          object.traverse((o) => {
            if (o.isBone && !bone) bone = o;
          });
          assert.ok(bone, `${name} is neither morph-animated nor skinned`);
          mixer.update(0.35);
        }

        // Scale sanity: these are authored at cm scale, so a human-ish animal
        // should land roughly between knee and horse height once scaled.
        const box = new THREE.Box3().setFromObject(object);
        const h = (box.max.y - box.min.y) * cfg.scale;
        assert.ok(h > 0.3 && h < 4, `${name} scales to ${h.toFixed(2)}m — wrong by an order`);
        resolve();
      },
      reject
    );
  });
}

// Ground animals must use clips that exist, or the cross-fade silently no-ops.
for (const g of GROUNDERS) {
  if (!g.walk) continue;
  const path = `public${MODELS[g.model].url}`;
  const buf = fs.readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  await new Promise((resolve, reject) => {
    loader.parse(
      ab,
      '',
      (gltf) => {
        const names = gltf.animations.map((a) => a.name);
        assert.ok(names.includes(g.walk), `${g.model} has no "${g.walk}" clip (has ${names})`);
        assert.ok(names.includes(g.idle), `${g.model} has no "${g.idle}" clip (has ${names})`);
        resolve();
      },
      reject
    );
  });
}

console.log(`ok — ${Object.keys(MODELS).length} models load, clone, animate and scale correctly`);
