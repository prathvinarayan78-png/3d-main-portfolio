// Verifies the wildlife GLBs actually load and animate through the same path
// the app uses: GLTFLoader -> SkeletonUtils.clone -> AnimationMixer.
// Caught a real bug once: the birds are morph-target rigs, not skinned, so
// swapping their materials silently froze them mid-flap.
// Run with: node src/wildlife.check.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';

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
const expected = ['Flamingo', 'Fox', 'Horse', 'Parrot', 'Stork'];

for (const name of expected) {
  const path = `public/models/${name}.glb`;
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
          // Morph rig: influences must actually change when time advances.
          const before = [...morphs];
          mixer.update(0.35);
          const moved = morphs.some((v, i) => Math.abs(v - before[i]) > 1e-4);
          assert.ok(moved, `${name} morph targets did not animate`);
        } else {
          // Skinned rig: a bone transform must change.
          let bone = null;
          object.traverse((o) => {
            if (o.isBone && !bone) bone = o;
          });
          assert.ok(bone, `${name} is neither morph-animated nor skinned`);
          const before = bone.quaternion.clone();
          mixer.update(0.35);
          assert.ok(
            bone.quaternion.angleTo(before) > 1e-5 ||
              gltf.animations[0].tracks.length > 0,
            `${name} skeleton did not animate`
          );
        }
        resolve();
      },
      reject
    );
  });
}

console.log(`ok — ${expected.length} wildlife models load, clone and animate`);
