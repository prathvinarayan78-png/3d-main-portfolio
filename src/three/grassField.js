// Pure placement maths for the grass field, kept out of the JSX so it can be
// checked headlessly (see src/grass.check.mjs).

// Deterministic PRNG: the field must be identical on every load, otherwise
// bald patches would appear and disappear between reloads.
export function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FIELD = {
  // Deeper and wider than the camera path so the field never visibly ends.
  zNear: 18,
  zFar: -205,
  halfWidth: 130,
  // Blades are packed toward the corridor the camera flies down; the far
  // edges only need enough cover to read as continuous ground.
  corridorHalfWidth: 34,
};

/*
  Returns a flat array of blade transforms.

  Density comes from three things, not just raw count:
    1. a biased x-distribution, so most blades land near the camera corridor
    2. clumping — real grass grows in tufts, and tufts read as fuller than an
       even scatter at the same instance count
    3. per-blade lean and height variation, which fills the vertical gaps that
       make a uniform field look sparse
*/
export function placeBlades(count, seed = 1337) {
  const rand = mulberry32(seed);
  const { zNear, zFar, halfWidth, corridorHalfWidth } = FIELD;
  const depth = zNear - zFar;

  // Roughly 1 tuft per 9 blades, so clumps stay legible rather than merging.
  const clumpCount = Math.max(1, Math.floor(count / 9));
  const clumps = new Array(clumpCount);
  for (let i = 0; i < clumpCount; i++) {
    // Bias toward the corridor: squaring a 0..1 random pulls values low.
    const t = rand();
    const spread = t * t;
    const x = (rand() < 0.5 ? -1 : 1) * (corridorHalfWidth * spread + halfWidth * spread * spread);
    clumps[i] = [x, zNear - rand() * depth];
  }

  const blades = new Array(count);
  for (let i = 0; i < count; i++) {
    let x;
    let z;
    if (rand() < 0.78) {
      // In a tuft: scatter tightly around a clump centre.
      const [cx, cz] = clumps[(rand() * clumpCount) | 0];
      const r = rand() * rand() * 2.4; // dense core, sparse fringe
      const a = rand() * Math.PI * 2;
      x = cx + Math.cos(a) * r;
      z = cz + Math.sin(a) * r;
    } else {
      // Filler between tufts so the ground never shows bare.
      const t = rand();
      const spread = t * t;
      x = (rand() < 0.5 ? -1 : 1) * (corridorHalfWidth * spread + halfWidth * spread * spread);
      z = zNear - rand() * depth;
    }

    blades[i] = {
      x,
      z,
      yaw: rand() * Math.PI,
      // Lean: a field where every blade is vertical looks like a pin cushion.
      lean: (rand() - 0.5) * 0.5,
      scale: 0.55 + rand() * 1.05,
      // Slight width jitter breaks up the repeated silhouette.
      width: 0.85 + rand() * 0.5,
      // 0..1 drives a green ramp so the field isn't one flat colour.
      tint: rand(),
    };
  }
  return blades;
}
