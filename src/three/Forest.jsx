import { useMemo } from 'react';
import { Tree } from '@dgreenheck/ez-tree';

/*
  Procedural trees from ez-tree (github.com/dgreenheck/ez-tree, MIT).
  Its bark and leaf textures are embedded as base64 inside the package, so a
  full forest costs zero binary assets in the repo and zero network requests.
*/

const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const PRESETS = [
  'Ash Large',
  'Aspen Large',
  'Oak Large',
  'Pine Large',
  'Ash Medium',
  'Aspen Medium',
  'Oak Medium',
  'Bush 2',
];

function build(preset, seed) {
  const t = new Tree();
  t.loadPreset(preset);
  t.options.seed = seed;
  t.generate();
  t.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return t;
}

export default function Forest({ count = 52, length = 250 }) {
  // Generate a small pool of unique trees, then clone across the valley.
  // 8 uniques at varied rotation/scale is visually indistinguishable from 44
  // uniques, and generating 44 would block the main thread for seconds.
  const pool = useMemo(() => PRESETS.map((p, i) => build(p, 700 + i * 331)), []);

  const placed = useMemo(() => {
    const rand = mulberry32(90210);
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const z = 16 - t * length;
      const side = i % 2 === 0 ? -1 : 1;
      // Keep a clear corridor down the middle so the camera always has a view,
      // and push a few trees far out to fill the horizon.
      const far = rand() > 0.72;
      const x = side * (far ? 30 + rand() * 30 : 8.5 + rand() * 17);
      out.push({
        tree: pool[i % pool.length],
        position: [x, -0.15, z + (rand() - 0.5) * 11],
        rotation: [0, rand() * Math.PI * 2, 0],
        scale: (far ? 0.5 : 0.36) + rand() * 0.34,
      });
    }
    return out;
  }, [count, length, pool]);

  return (
    <group>
      {placed.map((p, i) => (
        <primitive
          key={i}
          object={p.tree.clone()}
          position={p.position}
          rotation={p.rotation}
          scale={p.scale}
        />
      ))}
    </group>
  );
}
