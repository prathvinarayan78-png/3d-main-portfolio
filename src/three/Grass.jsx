import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { placeBlades } from './grassField';

/*
  Instanced grass — one draw call for the whole field, animated on the GPU.

  Density is bought with geometry and distribution rather than brute count:
  blades are clumped into tufts, biased toward the camera corridor, leaned,
  and tinted per instance. A cross-quad (two crossed planes per blade) doubles
  the visible surface for the same instance count, which is what actually
  removes the "see-through" look.
*/
export default function Grass({ count, cross = true }) {
  // 3 segments x 2 crossed quads = 12 tris/blade. At 120k that's 1.4M tris in
  // a single draw call — fine on desktop, too much for a phone, so halve it
  // on small/low-core devices rather than shipping a slideshow.
  const bladeCount = useMemo(() => {
    if (count) return count;
    if (typeof window === 'undefined') return 120000;
    const small = window.matchMedia?.('(max-width: 820px)').matches;
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
    return small || weak ? 45000 : 120000;
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(() => {
    const blade = new THREE.PlaneGeometry(0.085, 1, 1, 3);
    blade.translate(0, 0.5, 0);

    if (!cross) return blade;

    // Two crossed quads per blade: from any angle at least one face is broad,
    // so the field reads solid instead of flickering edge-on.
    const second = blade.clone();
    second.rotateY(Math.PI / 2);

    const merged = mergeTwo(blade, second);
    blade.dispose();
    second.dispose();
    return merged;
  }, [cross]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff', // tinted per instance below
      side: THREE.DoubleSide,
      roughness: 0.92,
      metalness: 0,
      // Blades are thin; skip the depth-sort cost of transparency entirely.
      alphaTest: 0,
    });

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           attribute float aLean;
           attribute float aTint;
           varying float vH;
           varying float vTint;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vH = uv.y;
           vTint = aTint;
           vec3 ip = instanceMatrix[3].xyz;
           // Two summed waves at different scales: one broad gust rolling
           // across the field, one fine chop so neighbours differ.
           float gust = sin(uTime * 0.85 + ip.x * 0.06 + ip.z * 0.05);
           float chop = sin(uTime * 2.4 + ip.x * 0.55 + ip.z * 0.42);
           float sway = gust * 0.75 + chop * 0.3;
           // Static lean keeps the field from looking like a pin cushion.
           float bend = (sway * 0.34 + aLean) * pow(uv.y, 2.0);
           transformed.x += bend;
           transformed.z += bend * 0.45;
           // Shorten slightly as it bends, so blades pivot instead of stretch.
           transformed.y -= abs(bend) * 0.16 * uv.y;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying float vH;
           varying float vTint;`
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           // Ramp from a deep shadowed base to a warmer sunlit tip, varied per
           // blade — a single flat green is the main thing that reads as fake.
           vec3 base = mix(vec3(0.055, 0.105, 0.045), vec3(0.10, 0.16, 0.06), vTint);
           vec3 tip  = mix(vec3(0.26, 0.38, 0.14),  vec3(0.42, 0.50, 0.19), vTint);
           gl_FragColor.rgb *= mix(base, tip, pow(vH, 1.35)) * 3.4;`
        );
    };
    return m;
  }, [uniforms]);

  const setup = (mesh) => {
    if (!mesh || mesh.userData.done) return;

    const blades = placeBlades(bladeCount);
    const dummy = new THREE.Object3D();
    const lean = new Float32Array(bladeCount);
    const tint = new Float32Array(bladeCount);

    for (let i = 0; i < bladeCount; i++) {
      const b = blades[i];
      dummy.position.set(b.x, 0, b.z);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.scale.set(b.width, b.scale, b.width);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      lean[i] = b.lean;
      tint[i] = b.tint;
    }

    mesh.geometry.setAttribute('aLean', new THREE.InstancedBufferAttribute(lean, 1));
    mesh.geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.done = true;
  };

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={setup}
      args={[geometry, material, bladeCount]}
      frustumCulled={false}
      receiveShadow
      // Casting shadows from 160k blades is far too expensive for the payoff.
      castShadow={false}
    />
  );
}

// Minimal two-buffer merge — avoids pulling in BufferGeometryUtils for one call.
function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry();
  const aPos = a.attributes.position.array;
  const bPos = b.attributes.position.array;
  const aUv = a.attributes.uv.array;
  const bUv = b.attributes.uv.array;
  const aNor = a.attributes.normal.array;
  const bNor = b.attributes.normal.array;

  const pos = new Float32Array(aPos.length + bPos.length);
  pos.set(aPos, 0);
  pos.set(bPos, aPos.length);
  const uv = new Float32Array(aUv.length + bUv.length);
  uv.set(aUv, 0);
  uv.set(bUv, aUv.length);
  const nor = new Float32Array(aNor.length + bNor.length);
  nor.set(aNor, 0);
  nor.set(bNor, aNor.length);

  const aIdx = Array.from(a.index.array);
  const offset = aPos.length / 3;
  const bIdx = Array.from(b.index.array).map((i) => i + offset);

  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex([...aIdx, ...bIdx]);
  return g;
}
