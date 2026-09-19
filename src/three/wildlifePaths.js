/*
  Animal placement and motion, kept pure so it can be verified headlessly
  (src/checks/wildlife.check.mjs).

  Models:
    Flamingo, Parrot, Stork, Horse — mrdoob/three.js examples (MIT)
    Fox                           — KhronosGroup/glTF-Sample-Assets (CC0)

  Placement is hand-authored, never random: animals are spread down the 215m
  corridor so the camera meets them one at a time instead of passing a crowd.
*/

// Scales derived from each model's real bounding box, not guessed: these are
// authored at centimetre scale AND the bbox includes wingspan, so eyeballing
// the numbers put every animal 3-8x oversized (a 10m flamingo).
// Verified by the height assertion in checks/wildlife.check.mjs.
export const MODELS = {
  Flamingo: { url: '/models/Flamingo.glb', scale: 0.0029 }, // ~1.2m
  Parrot: { url: '/models/Parrot.glb', scale: 0.0021 }, // ~0.35m
  Stork: { url: '/models/Stork.glb', scale: 0.0065 }, // ~1.1m
  Horse: { url: '/models/Horse.glb', scale: 0.0079 }, // ~2.4m
  Fox: { url: '/models/Fox.glb', scale: 0.0089 }, // ~0.7m
};

// Flyers travel long, lazy ellipses. Birds that orbit a tight circle read as
// fairground rides, so these are wide and slow with the long axis across view.
export const FLYERS = [
  { model: 'Stork', at: [-30, 21, -48], rx: 46, rz: 26, speed: 0.052, phase: 0.0, bob: 1.5 },
  { model: 'Flamingo', at: [42, 25, -84], rx: 40, rz: 24, speed: 0.045, phase: 1.1, bob: 1.9 },
  { model: 'Flamingo', at: [46, 27, -90], rx: 40, rz: 24, speed: 0.045, phase: 1.34, bob: 1.9 },
  { model: 'Parrot', at: [-26, 12, -158], rx: 26, rz: 17, speed: 0.1, phase: 2.6, bob: 1.1 },
  { model: 'Stork', at: [24, 29, -220], rx: 52, rz: 30, speed: 0.038, phase: 4.2, bob: 1.6 },
];

/*
  Ground animals wander rather than loop. Each has a home point and a list of
  grazing spots it walks between, pausing at each — that pause is what makes
  the movement read as an animal deciding where to go, instead of a model on
  a track. `pauseAt` is the fraction of each leg spent standing still.
*/
export const GROUNDERS = [
  {
    model: 'Fox',
    walk: 'Walk',
    idle: 'Survey',
    home: [-17, 0, -14],
    stops: [
      [-21, 0, -9],
      [-13, 0, -19],
      [-20, 0, -21],
      [-12, 0, -10],
    ],
    speed: 1.5,
    pauseAt: 0.28,
  },
  {
    model: 'Horse',
    walk: null,
    idle: null,
    home: [22, 0, -126],
    stops: [
      [28, 0, -118],
      [17, 0, -133],
      [27, 0, -137],
      [16, 0, -120],
    ],
    speed: 1.15,
    pauseAt: 0.34,
  },
  {
    model: 'Fox',
    walk: 'Walk',
    idle: 'Survey',
    home: [15, 0, -190],
    stops: [
      [19, 0, -185],
      [11, 0, -195],
      [18, 0, -197],
    ],
    speed: 1.3,
    pauseAt: 0.4,
  },
];

/*
  Returns {x, z, heading, moving} for a wandering animal at time t.
  Legs are walked in order, each leg = travel phase then a pause. Heading is
  the direction of travel, held through the pause so the animal doesn't spin.
*/
export function wanderAt(spec, t) {
  const { stops, speed, pauseAt } = spec;
  const legs = stops.length;

  // Precompute leg lengths so speed is constant in metres, not per-leg.
  let total = 0;
  const lens = [];
  for (let i = 0; i < legs; i++) {
    const a = stops[i];
    const b = stops[(i + 1) % legs];
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    lens.push(d);
    total += d;
  }

  // Full circuit = travel time + one pause per leg.
  const travelTime = total / speed;
  const pauseTime = (travelTime * pauseAt) / (1 - pauseAt);
  const perPause = pauseTime / legs;
  const cycle = travelTime + pauseTime;

  let local = ((t % cycle) + cycle) % cycle;

  for (let i = 0; i < legs; i++) {
    const a = stops[i];
    const b = stops[(i + 1) % legs];
    const legTime = lens[i] / speed;

    if (local < legTime) {
      const u = legTime > 0 ? local / legTime : 0;
      // Ease in and out of each leg so the animal accelerates from rest.
      const e = u * u * (3 - 2 * u);
      return {
        x: a[0] + (b[0] - a[0]) * e,
        z: a[2] + (b[2] - a[2]) * e,
        heading: Math.atan2(b[0] - a[0], b[2] - a[2]),
        moving: true,
      };
    }
    local -= legTime;

    if (local < perPause) {
      return {
        x: b[0],
        z: b[2],
        heading: Math.atan2(b[0] - a[0], b[2] - a[2]),
        moving: false,
      };
    }
    local -= perPause;
  }

  const last = stops[legs - 1];
  return { x: last[0], z: last[2], heading: 0, moving: false };
}

// Flyer position on its ellipse, plus banking into the turn.
export function flyAt(spec, t) {
  const a = t * spec.speed + spec.phase;
  return {
    x: spec.at[0] + Math.cos(a) * spec.rx,
    y: spec.at[1] + Math.sin(a * 1.6) * spec.bob,
    z: spec.at[2] + Math.sin(a) * spec.rz,
    // Tangent of the ellipse — accounts for rx != rz, unlike a plain circle.
    heading: Math.atan2(-Math.sin(a) * spec.rx, Math.cos(a) * spec.rz),
    bank: Math.cos(a) * 0.3,
  };
}
