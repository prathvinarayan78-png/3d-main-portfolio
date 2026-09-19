// Pure placement maths for the grass field — kept out of JSX so it can be
// verified headlessly (src/checks/grass.check.mjs).

export const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const FIELD = {
  zNear: 20,
  zFar: -250,
  halfWidth: 120,
  corridorHalfWidth: 32,
};

/*
  Grass reads as dense because of distribution, not raw count:
    - blades grow in tufts, the way real grass does
    - the field is biased toward the corridor the camera flies down
    - per-blade lean, height and tint break up the repeated silhouette
*/
export function placeBlades(count, seed = 4242) {
  const rand = mulberry32(seed);
  const { zNear, zFar, halfWidth, corridorHalfWidth } = FIELD;
  const depth = zNear - zFar;

  const pickX = () => {
    const t = rand();
    const spread = t * t; // bias low values -> cluster near the path
    return (rand() < 0.5 ? -1 : 1) * (corridorHalfWidth * spread + halfWidth * spread * spread);
  };

  const clumpCount = Math.max(1, Math.floor(count / 9));
  const clumps = Array.from({ length: clumpCount }, () => [pickX(), zNear - rand() * depth]);

  const blades = new Array(count);
  for (let i = 0; i < count; i++) {
    let x;
    let z;
    if (rand() < 0.78) {
      const [cx, cz] = clumps[(rand() * clumpCount) | 0];
      const r = rand() * rand() * 2.4; // dense core, sparse fringe
      const a = rand() * Math.PI * 2;
      x = cx + Math.cos(a) * r;
      z = cz + Math.sin(a) * r;
    } else {
      x = pickX();
      z = zNear - rand() * depth;
    }
    blades[i] = {
      x,
      z,
      yaw: rand() * Math.PI,
      lean: (rand() - 0.5) * 0.5,
      scale: 0.55 + rand() * 1.05,
      width: 0.85 + rand() * 0.5,
      tint: rand(),
    };
  }
  return blades;
}
