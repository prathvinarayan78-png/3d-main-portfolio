import { useMemo } from 'react';
import { Tree } from '@dgreenheck/ez-tree';
import * as THREE from 'three';

// ez-tree ships its bark/leaf textures as embedded base64, so generating a tree
// needs no network fetch and no asset files in the repo.
function makeTree(preset, seed) {
  const tree = new Tree();
  tree.loadPreset(preset);
  tree.options.seed = seed;
  tree.generate();
  tree.castShadow = true;
  tree.receiveShadow = true;
  tree.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return tree;
}

// Deterministic PRNG so the forest layout is identical on every load/reload.
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRESETS = ['Oak Medium', 'Ash Medium', 'Aspen Medium', 'Pine Medium', 'Oak Large', 'Aspen Large'];

export default function Forest({ count = 26, pathLength = 190 }) {
  // Build a small pool of unique trees, then clone them across the valley.
  // Generating 26 unique trees costs ~2s; 6 uniques cloned is instant and
  // visually indistinguishable once rotation and scale vary.
  // ponytail: fixed pool of 6 species-instances, not per-tree generation.
  const pool = useMemo(() => PRESETS.map((p, i) => makeTree(p, 1000 + i * 137)), []);

  const placements = useMemo(() => {
    const rand = mulberry32(20260917);
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const z = 14 - t * pathLength;
      // Keep a clear corridor down the middle so the camera always has a view.
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (7 + rand() * 16);
      out.push({
        key: i,
        tree: pool[i % pool.length],
        position: [x, 0, z + (rand() - 0.5) * 9],
        rotation: [0, rand() * Math.PI * 2, 0],
        scale: 0.42 + rand() * 0.3,
      });
    }
    return out;
  }, [count, pathLength, pool]);

  return (
    <group>
      {placements.map(({ key, tree, position, rotation, scale }) => (
        <primitive key={key} object={tree.clone()} position={position} rotation={rotation} scale={scale} />
      ))}
    </group>
  );
}
