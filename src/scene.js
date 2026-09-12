import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FOG_COLOR = 0xf2efe9;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- small deterministic PRNG + perlin noise (for the organic blob) ---------- */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePerlin(seed = 1337) {
  const rand = mulberry32(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x, y, z) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
        lerp(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  };
}

function fbm(n, x, y, z) {
  let v = 0, a = 0.55, f = 1;
  for (let i = 0; i < 3; i++) {
    v += a * n(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

function makeBlob(radius, seed, strength) {
  const geo = new THREE.SphereGeometry(radius, 120, 84);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const n = makePerlin(seed);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const d = 1 + strength * fbm(n, v.x * 1.6 + 3.7, v.y * 1.6 + 9.2, v.z * 1.6 + 5.1);
    pos.setXYZ(i, v.x * radius * d, v.y * radius * d, v.z * radius * d);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------- textures ---------- */

function makeDotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeShadowTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/* hero character — blaugrana jersey + cap textures, painted in canvas */

function roundRectPath(ctx, x0, y0, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  ctx.arcTo(x0, y0 + h, x0, y0, r);
  ctx.arcTo(x0, y0, x0 + w, y0, r);
  ctx.closePath();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function makeJerseyTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const x = c.getContext('2d');
  const gold = '#d9a441';
  const white = '#f0ede4';

  /* blaugrana stripes */
  const stripes = ['#7a2030', '#2b3f8c', '#7a2030', '#2b3f8c', '#7a2030', '#2b3f8c'];
  const w = c.width / stripes.length;
  stripes.forEach((s, i) => {
    x.fillStyle = s;
    x.fillRect(i * w, 0, w + 2, c.height);
  });

  /* white V collar */
  x.fillStyle = white;
  x.beginPath();
  x.moveTo(402, -4);
  x.lineTo(622, -4);
  x.lineTo(560, 140);
  x.lineTo(512, 185);
  x.lineTo(464, 140);
  x.closePath();
  x.fill();
  x.strokeStyle = '#d8d2c2';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(464, 140);
  x.lineTo(512, 185);
  x.lineTo(560, 140);
  x.stroke();

  /* gold swoosh — his right chest */
  x.fillStyle = gold;
  x.beginPath();
  x.moveTo(262, 352);
  x.quadraticCurveTo(352, 384, 448, 292);
  x.quadraticCurveTo(378, 322, 296, 330);
  x.closePath();
  x.fill();

  /* gold wordmark */
  x.fillStyle = gold;
  x.font = '700 64px Arial, Helvetica, sans-serif';
  x.textAlign = 'center';
  x.fillText('unicef', 452, 512);

  /* small gold emblem ring */
  x.strokeStyle = gold;
  x.lineWidth = 9;
  x.beginPath();
  x.arc(640, 492, 30, 0, Math.PI * 2);
  x.stroke();
  x.fillStyle = gold;
  x.beginPath();
  x.arc(640, 492, 9, 0, Math.PI * 2);
  x.fill();

  /* club crest — his left chest */
  x.save();
  x.translate(760, 430);
  x.fillStyle = white;
  roundRectPath(x, -52, -58, 104, 116, 16);
  x.fill();
  x.fillStyle = '#7a2030';
  roundRectPath(x, -46, -52, 92, 104, 12);
  x.fill();
  /* top-left: blue field + gold star */
  x.fillStyle = '#2b3f8c';
  x.fillRect(-46, -52, 46, 42);
  x.fillStyle = gold;
  starPath(x, -23, -31, 14);
  x.fill();
  /* top-right: senyera bars */
  x.fillStyle = '#a3243c';
  x.fillRect(0, -52, 46, 42);
  x.fillStyle = gold;
  for (let i = 0; i < 3; i++) x.fillRect(5, -46 + i * 13, 36, 6);
  /* bottom: vertical stripes + ball */
  x.fillStyle = '#2b3f8c';
  x.fillRect(-46, -10, 30, 62);
  x.fillStyle = '#7a2030';
  x.fillRect(-16, -10, 32, 62);
  x.fillStyle = '#2b3f8c';
  x.fillRect(16, -10, 30, 62);
  x.fillStyle = '#a3243c';
  x.beginPath();
  x.arc(0, 26, 14, 0, Math.PI * 2);
  x.fill();
  x.restore();

  return new THREE.CanvasTexture(c);
}

function makeCapTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 288;
  const x = c.getContext('2d');
  x.fillStyle = '#16161a';
  x.fillRect(0, 0, 512, 288);
  x.fillStyle = '#f5f2ea';
  x.textAlign = 'center';
  x.font = 'italic 700 76px Georgia, "Times New Roman", serif';
  x.fillText('Smoke', 256, 118);
  x.font = 'italic 700 58px Georgia, "Times New Roman", serif';
  x.fillText('& Drome', 256, 210);
  return new THREE.CanvasTexture(c);
}

/* ---------- scene ---------- */

export function createScene(canvas, hooks = {}) {
  const onHover = hooks.onHover || (() => {});

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG_COLOR, 11, 40);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 7, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe7cf, 0.4);
  fill.position.set(-6, 2, -4);
  scene.add(fill);

  /* materials */
  const matChrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.13, envMapIntensity: 1.15 });
  const matChromeFlat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.2, flatShading: true, envMapIntensity: 1.2 });
  const matCeramic = new THREE.MeshPhysicalMaterial({ color: 0xece5d8, metalness: 0, roughness: 0.48, clearcoat: 0.55, clearcoatRoughness: 0.4, envMapIntensity: 0.8 });
  const matClay = new THREE.MeshPhysicalMaterial({ color: 0xded2bd, metalness: 0, roughness: 0.62, envMapIntensity: 0.7 });
  const matAccent = new THREE.MeshPhysicalMaterial({ color: 0xe4572e, metalness: 0.1, roughness: 0.35, clearcoat: 0.5, envMapIntensity: 0.8 });
  const matGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 1.4, ior: 1.45, envMapIntensity: 1 });
  const matIridescent = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.24, iridescence: 1, iridescenceIOR: 1.35, envMapIntensity: 1.1 });
  const matPedestal = new THREE.MeshPhysicalMaterial({ color: 0xe5ded0, metalness: 0, roughness: 0.85, envMapIntensity: 0.5 });

  /* palette — mirrors the UI accents */
  const COL = { teal: 0x2f8c7e, blue: 0x4a6fa5, rose: 0xb0587c, amber: 0xd9822b, sage: 0x6f7f52 };
  const matTealMetal = new THREE.MeshPhysicalMaterial({ color: COL.teal, metalness: 1, roughness: 0.18, envMapIntensity: 1.3 });
  const matBlueClay = new THREE.MeshPhysicalMaterial({ color: COL.blue, metalness: 0, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.8 });
  const matRoseMetal = new THREE.MeshPhysicalMaterial({ color: COL.rose, metalness: 1, roughness: 0.2, flatShading: true, envMapIntensity: 1.3 });
  const matAmberIrid = new THREE.MeshPhysicalMaterial({ color: COL.amber, metalness: 0.9, roughness: 0.25, iridescence: 1, iridescenceIOR: 1.35, envMapIntensity: 1.15 });
  const matSageCeramic = new THREE.MeshPhysicalMaterial({ color: COL.sage, metalness: 0, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.4, envMapIntensity: 0.8 });
  const matTealCeramic = new THREE.MeshPhysicalMaterial({ color: COL.teal, metalness: 0, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.4, envMapIntensity: 0.8 });
  const matAmberMetal = new THREE.MeshPhysicalMaterial({ color: COL.amber, metalness: 1, roughness: 0.22, flatShading: true, envMapIntensity: 1.3 });

  /* hero character (GTA-style) materials */
  const matSkin = new THREE.MeshPhysicalMaterial({ color: 0xa06a42, roughness: 0.72, envMapIntensity: 0.5 });
  const matHair = new THREE.MeshPhysicalMaterial({ color: 0x171210, roughness: 0.9, envMapIntensity: 0.4 });
  const matCapM = new THREE.MeshPhysicalMaterial({ color: 0x16161a, roughness: 0.6, envMapIntensity: 0.5 });
  const matGlasses = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.9 });
  const matMustache = new THREE.MeshPhysicalMaterial({ color: 0x221612, roughness: 0.9 });
  const matSleeve = new THREE.MeshPhysicalMaterial({ color: 0x2b3f8c, roughness: 0.85, envMapIntensity: 0.5 });
  const matWhiteTrim = new THREE.MeshPhysicalMaterial({ color: 0xf0ede4, roughness: 0.6 });
  const matPantsM = new THREE.MeshPhysicalMaterial({ color: 0x1d1d22, roughness: 0.9 });
  const matShoe = new THREE.MeshPhysicalMaterial({ color: 0xe9e5da, roughness: 0.5, clearcoat: 0.3 });
  const matSole = new THREE.MeshPhysicalMaterial({ color: 0xcfc8b8, roughness: 0.75 });
  const matJersey = new THREE.MeshPhysicalMaterial({ map: makeJerseyTexture(), roughness: 0.88, envMapIntensity: 0.55 });
  const matCapPatch = new THREE.MeshPhysicalMaterial({ map: makeCapTexture(), roughness: 0.65 });

  function buildCJ() {
    const g = new THREE.Group();

    /* shoes */
    [-0.19, 0.19].forEach((sx) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.56), matShoe);
      s.position.set(sx, 0.12, 0.04);
      g.add(s);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.06, 0.57), matSole);
      sole.position.set(sx, 0.035, 0.04);
      g.add(sole);
      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.14), matShoe);
      toe.position.set(sx, 0.2, 0.34);
      g.add(toe);
    });

    /* legs + hips */
    const legGeo = new THREE.BoxGeometry(0.26, 0.78, 0.3);
    [-0.18, 0.18].forEach((sx) => {
      const l = new THREE.Mesh(legGeo, matPantsM);
      l.position.set(sx, 0.62, 0);
      g.add(l);
    });
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.42, 0.44), matPantsM);
    hips.position.y = 1.14;
    g.add(hips);

    /* jersey torso — texture front faces the camera */
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 1.02, 16), matJersey);
    torso.position.y = 1.84;
    torso.rotation.y = Math.PI;
    g.add(torso);

    /* shoulders */
    [-0.52, 0.52].forEach((sx) => {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), matSleeve);
      sh.position.set(sx, 2.3, 0);
      sh.scale.set(1, 0.9, 1.05);
      g.add(sh);
    });

    /* neck */
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 12), matSkin);
    neck.position.y = 2.44;
    g.add(neck);

    /* head */
    const head = new THREE.Group();
    head.position.y = 2.8;
    g.add(head);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), matSkin);
    skull.scale.set(1, 1.1, 1.02);
    head.add(skull);

    /* ears */
    [-0.35, 0.35].forEach((ex) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), matSkin);
      e.position.set(ex, -0.02, 0.02);
      e.scale.set(0.6, 1, 0.8);
      head.add(e);
    });

    /* nose */
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.11), matSkin);
    nose.position.set(0, -0.06, 0.33);
    head.add(nose);

    /* sunglasses */
    const lensGeo = new THREE.BoxGeometry(0.2, 0.13, 0.05);
    [-0.12, 0.12].forEach((lx) => {
      const l = new THREE.Mesh(lensGeo, matGlasses);
      l.position.set(lx, 0.06, 0.3);
      head.add(l);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.04), matGlasses);
    bridge.position.set(0, 0.07, 0.3);
    head.add(bridge);
    [-0.28, 0.28].forEach((tx) => {
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), matGlasses);
      temple.position.set(tx, 0.07, 0.14);
      head.add(temple);
    });

    /* mustache + goatee */
    const must = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.05), matMustache);
    must.position.set(0, -0.19, 0.3);
    head.add(must);
    const goatee = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.04), matMustache);
    goatee.position.set(0, -0.34, 0.28);
    head.add(goatee);

    /* hair curls (kept clear of the face and the cap) */
    const hairGeo = new THREE.IcosahedronGeometry(0.1, 0);
    const rand = mulberry32(42);
    for (let i = 0; i < 34; i++) {
      const a = rand() * Math.PI * 2;
      const y = -0.28 + rand() * 0.5;
      const hx = Math.cos(a) * 0.34;
      const hz = Math.sin(a) * 0.335;
      if (y > 0.14) continue; // cap covers the top
      if (hz > 0.12 && y > -0.16 && Math.abs(hx) < 0.3) continue; // keep the face clear
      const h = new THREE.Mesh(hairGeo, matHair);
      h.position.set(hx, y, hz);
      h.scale.setScalar(0.7 + rand() * 0.6);
      head.add(h);
    }

    /* cap */
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 14, 0, Math.PI * 2, 0, 1.75), matCapM);
    cap.position.y = 0.05;
    cap.scale.set(1, 0.94, 1.04);
    head.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), matCapM);
    brim.position.set(0, 0.02, 0.44);
    brim.rotation.x = -0.28;
    head.add(brim);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), matCapM);
    button.position.y = 0.4;
    head.add(button);
    /* "Smoke & Drome" patch */
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.24), matCapPatch);
    patch.position.set(0, 0.2, 0.352);
    patch.rotation.x = -0.3;
    head.add(patch);

    /* arms */
    function makeArm(side) {
      const armG = new THREE.Group();
      armG.position.set(side * 0.55, 2.32, 0);
      if (side === -1) {
        armG.rotation.x = 1.05;
        armG.rotation.z = 0.35;
      } else {
        armG.rotation.x = 0.18;
        armG.rotation.z = -0.12;
      }
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 10), matSleeve);
      up.position.y = -0.28;
      armG.add(up);
      const elbow = new THREE.Group();
      elbow.position.y = -0.56;
      elbow.rotation.x = side === -1 ? 0.35 : 0.3;
      armG.add(elbow);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.5, 10), matSleeve);
      fore.position.y = -0.26;
      elbow.add(fore);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 10), matWhiteTrim);
      cuff.position.y = -0.5;
      elbow.add(cuff);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.12), matSkin);
      hand.position.y = -0.6;
      elbow.add(hand);
      if (side === -1) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.06), matSkin);
        finger.position.set(0, -0.75, 0.02);
        elbow.add(finger);
      }
      g.add(armG);
      return armG;
    }
    const pointArm = makeArm(-1);
    makeArm(1);

    return { group: g, head, pointArm };
  }

  const dotTex = makeDotTexture();
  const shadowTex = makeShadowTexture();
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const hitGeo = new THREE.SphereGeometry(1, 12, 12);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

  /* hoverables */
  const hoverables = [];
  const hitToEntry = new Map();
  function registerHover(group, radius, label) {
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.scale.setScalar(radius);
    group.add(hit);
    const entry = { group, hit, label, t: 0, base: 1 };
    hitToEntry.set(hit, entry);
    hoverables.push(entry);
    return entry;
  }
  function addShadow(parent, scale, opacity, y) {
    const m = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(scale, scale, 1);
    m.position.y = y;
    parent.add(m);
    return m;
  }

  /* 0 · hero — GTA-style street hero in a blaugrana jersey */
  const hero = new THREE.Group();
  scene.add(hero);
  const cJ = buildCJ();
  hero.add(cJ.group);
  addShadow(hero, 2.7, 0.32, 0.012);
  const heroHit = new THREE.Mesh(hitGeo, hitMat);
  heroHit.scale.setScalar(2.05);
  heroHit.position.set(0, 1.4, 0);
  hero.add(heroHit);
  const heroEntry = { group: hero, hit: heroHit, label: 'WEBGL', t: 0, base: 1 };
  hitToEntry.set(heroHit, heroEntry);
  hoverables.push(heroEntry);

  /* 1 · about — floating primitive cluster */
  const cluster = new THREE.Group();
  cluster.position.set(0, 0.55, -14);
  scene.add(cluster);
  const cCenter = new THREE.Mesh(new THREE.SphereGeometry(0.52, 48, 32), matCeramic);
  cluster.add(cCenter);
  const cItems = [];
  const cDefs = [
    [new RoundedBoxGeometry(0.56, 0.56, 0.56, 3, 0.07), matChrome],
    [new THREE.ConeGeometry(0.34, 0.64, 28), matAccent],
    [new THREE.TorusGeometry(0.3, 0.115, 24, 56), matSageCeramic],
    [new THREE.CapsuleGeometry(0.17, 0.34, 8, 20), matTealCeramic],
    [new THREE.IcosahedronGeometry(0.32, 0), matAmberMetal],
  ];
  cDefs.forEach(([geo, mat], i) => {
    const a = (i / cDefs.length) * Math.PI * 2;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(Math.cos(a) * 1.7, Math.sin(a * 1.9) * 0.4, Math.sin(a) * 1.7);
    m.userData = { phase: a * 2.1, baseY: m.position.y, spin: 0.2 + (i % 3) * 0.12 };
    cluster.add(m);
    cItems.push(m);
  });

  /* 2–5 · work — a gallery row of four pieces on pedestals */
  const WORK_Z = -26;
  const work = [];
  function addWork(x, build) {
    const g = new THREE.Group();
    g.position.set(x, 0, WORK_Z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.12, 56), matPedestal);
    ped.position.y = -0.66;
    g.add(ped);
    addShadow(g, 3.2, 0.26, -0.715);
    const obj = build();
    obj.position.y = 0.38;
    g.add(obj);
    scene.add(g);
    registerHover(g, 1.5, 'VIEW');
    work.push({ g, obj });
  }
  addWork(-7.5, () => {
    const cube = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.5, 1.5, 4, 0.16), matGlass);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), matTealMetal);
    cube.add(core);
    cube.userData.core = core;
    return cube;
  });
  addWork(-2.5, () => new THREE.Mesh(makeBlob(0.88, 21, 0.26), matBlueClay));
  addWork(2.5, () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 0), matRoseMetal));
  addWork(7.5, () => new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.3, 32, 96), matAmberIrid));

  /* 6 · craft — particle orbit + small chrome knot */
  const craft = new THREE.Group();
  craft.position.set(0, 0.6, -44);
  scene.add(craft);
  /* sunset color ramp for the orbit */
  const CRAFT_RAMP = [0xd9822b, 0xb0587c, 0x4a6fa5, 0x2f8c7e].map((c) => new THREE.Color(c));
  const rampCol = new THREE.Color();
  function sampleRamp(t, out) {
    const n = CRAFT_RAMP.length;
    const x = (((t % 1) + 1) % 1) * n;
    const i = Math.floor(x) % n;
    out.copy(CRAFT_RAMP[i]).lerp(CRAFT_RAMP[(i + 1) % n], x - Math.floor(x));
    return out;
  }
  function makeRing(count, radius, spread, ySpread, size, opacity, useRamp, flatColor) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rand = mulberry32(count * 7 + 1);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = radius + (rand() - 0.5) * spread * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (rand() - 0.5) * ySpread * 2;
      pos[i * 3 + 2] = Math.sin(a) * r;
      if (useRamp) sampleRamp(a / (Math.PI * 2), rampCol);
      else rampCol.set(flatColor);
      col[i * 3] = rampCol.r;
      col[i * 3 + 1] = rampCol.g;
      col[i * 3 + 2] = rampCol.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, opacity, depthWrite: false })
    );
  }
  const ring1 = makeRing(850, 2.3, 0.55, 0.5, 0.05, 0.85, true);
  const ring2 = makeRing(300, 3.35, 0.7, 0.3, 0.045, 0.5, false, 0xc9b59a);
  const craftKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.15, 140, 24), matChrome);
  craft.add(ring1, ring2, craftKnot);

  /* 7 · contact — iridescent orb */
  const contact = new THREE.Group();
  contact.position.set(0, 0, -56);
  scene.add(contact);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.85, 64, 48), matIridescent);
  orb.position.y = 0.48;
  contact.add(orb);
  const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 0.12, 56), matPedestal);
  ped2.position.y = -0.34;
  contact.add(ped2);
  addShadow(contact, 2.7, 0.28, -0.395);
  registerHover(contact, 1.35, 'SAY HI');

  /* ambient dust along the whole path */
  const dust = (() => {
    const N = 620;
    const pos = new Float32Array(N * 3);
    const rand = mulberry32(99);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() - 0.5) * 26;
      pos[i * 3 + 1] = -1.5 + rand() * 6.5;
      pos[i * 3 + 2] = 9 - rand() * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.055, map: dotTex, color: 0xa89d89, transparent: true, opacity: 0.5, depthWrite: false })
    );
  })();
  scene.add(dust);

  /* camera keyframes — one per section */
  const KF = [
    { p: new THREE.Vector3(0, 1.7, 8.6), t: new THREE.Vector3(0, 1.45, 0), dx: -0.85, mdy: 0.3, c: new THREE.Vector3(3.4, 2.2, -1.4) },
    { p: new THREE.Vector3(0, 1.05, -9.3), t: new THREE.Vector3(0, 0.55, -14), dx: -0.85, mdy: 0.55, c: null },
    { p: new THREE.Vector3(-7.5, 0.85, -20.9), t: new THREE.Vector3(-7.5, 0.1, -26), dx: -1.15, mdy: 0.6, c: null },
    { p: new THREE.Vector3(-2.5, 0.85, -20.9), t: new THREE.Vector3(-2.5, 0.1, -26), dx: -1.15, mdy: 0.6, c: null },
    { p: new THREE.Vector3(2.5, 0.85, -20.9), t: new THREE.Vector3(2.5, 0.1, -26), dx: -1.15, mdy: 0.6, c: null },
    { p: new THREE.Vector3(7.5, 0.85, -20.9), t: new THREE.Vector3(7.5, 0.1, -26), dx: -1.15, mdy: 0.6, c: null },
    { p: new THREE.Vector3(0, 1.35, -38.6), t: new THREE.Vector3(0, 0.6, -44), dx: -0.7, mdy: 0.5, c: null },
    { p: new THREE.Vector3(0, 0.55, -51.3), t: new THREE.Vector3(0, 0.3, -56), dx: 0, mdy: 0.35, c: null },
  ];

  const hitMeshes = hoverables.map((h) => h.hit);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(2, 2);
  let pointerOn = false;

  let aspect = 1;
  let tTime = 0;
  let hoverId = null;
  let hoverLabel = '';
  let introT = 0;
  let introAt = 0;
  let introStarted = false;

  const vPos = new THREE.Vector3();
  const vTgt = new THREE.Vector3();
  const vTmp = new THREE.Vector3();
  const vTmp2 = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const coarse = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 2));
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  function setPointer(x, y, on) {
    ndc.set(x, y);
    pointerOn = !!on;
  }

  function introStart() {
    if (!introStarted) {
      introStarted = true;
      introAt = performance.now();
      introT = 0;
    }
  }

  function update(s, mx, my, dt) {
    tTime += dt;
    if (introStarted) introT = Math.min(1, (performance.now() - introAt) / 1900);
    const ie = 1 - Math.pow(1 - introT, 3);

    /* camera path */
    const f = clamp(s, 0, 1) * (KF.length - 1);
    const i = clamp(Math.floor(f), 0, KF.length - 2);
    const t = clamp(f - i, 0, 1);
    const tt = t * t * (3 - 2 * t);
    const A = KF[i];
    const B = KF[i + 1];

    if (A.c) {
      vTmp.lerpVectors(A.p, A.c, tt);
      vTmp2.lerpVectors(A.c, B.p, tt);
      vPos.lerpVectors(vTmp, vTmp2, tt);
    } else {
      vPos.lerpVectors(A.p, B.p, tt);
    }
    vTgt.lerpVectors(A.t, B.t, tt);

    /* composition: shift the view so 3D art sits right of the copy */
    const blend = clamp((aspect - 0.72) / 0.55, 0, 1);
    const dxx = (A.dx * (1 - t) + B.dx * t) * blend;
    const mdy = (A.mdy * (1 - t) + B.mdy * t) * (1 - blend);
    vPos.x += dxx;
    vTgt.x += dxx;
    vTgt.y += mdy;

    /* intro dolly + idle float + mouse parallax */
    vPos.z += (1 - ie) * 2.6;
    vPos.y += Math.sin(tTime * 0.55) * 0.05 * ie;
    vPos.x += mx * 0.32;
    vPos.y -= my * 0.2;

    camera.position.copy(vPos);
    camera.lookAt(vTgt);

    /* hero — the street hero */
    cJ.group.rotation.y = tTime * 0.14;
    cJ.group.position.y = Math.sin(tTime * 0.8) * 0.03;
    cJ.head.rotation.y = Math.sin(tTime * 0.5) * 0.08;
    cJ.head.rotation.x = Math.sin(tTime * 0.7) * 0.03;
    cJ.pointArm.rotation.x = 1.05 + Math.sin(tTime * 1.6) * 0.05;
    heroEntry.base = (0.9 + 0.1 * ie) * (1 + 0.012 * Math.sin(tTime * 0.8));

    /* about cluster */
    cluster.rotation.y = tTime * 0.07;
    cCenter.rotation.y = tTime * 0.2;
    for (const m of cItems) {
      m.position.y = m.userData.baseY + Math.sin(tTime * 0.9 + m.userData.phase) * 0.13;
      m.rotation.x += dt * m.userData.spin * 0.5;
      m.rotation.y += dt * m.userData.spin;
    }

    /* work row */
    work.forEach((w, k) => {
      w.obj.rotation.y = tTime * 0.22 + k * 1.3;
      w.obj.position.y = 0.38 + Math.sin(tTime * 0.8 + k * 1.7) * 0.05;
      if (w.obj.userData.core) {
        w.obj.userData.core.rotation.y = -tTime * 0.55;
        w.obj.userData.core.rotation.x = tTime * 0.3;
      }
    });

    /* craft orbit */
    ring1.rotation.y = tTime * 0.06;
    ring2.rotation.y = -tTime * 0.042;
    ring2.rotation.x = 0.35;
    craftKnot.rotation.y = tTime * 0.4;
    craftKnot.rotation.x = tTime * 0.23;

    /* contact orb */
    orb.rotation.y = tTime * 0.35;
    orb.position.y = 0.48 + Math.sin(tTime * 0.7) * 0.045;

    /* dust */
    dust.rotation.y = tTime * 0.008;

    /* hover raycast */
    if (pointerOn) {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      const found = hits.length ? hitToEntry.get(hits[0].object) : null;
      if (found !== hoverId) {
        hoverId = found;
        const label = found ? found.label : '';
        if (label !== hoverLabel) {
          hoverLabel = label;
          onHover(label);
        }
      }
    } else if (hoverId) {
      hoverId = null;
      if (hoverLabel) {
        hoverLabel = '';
        onHover('');
      }
    }

    /* hover scale */
    for (const h of hoverables) {
      const target = h === hoverId ? 1 : 0;
      h.t += (target - h.t) * Math.min(1, dt * 9);
      h.group.scale.setScalar(h.base * (1 + h.t * 0.055));
    }

    renderer.render(scene, camera);
  }

  return { update, setPointer, introStart };
}
