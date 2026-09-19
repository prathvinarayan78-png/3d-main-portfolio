import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { placeBlades } from './grassField';

/*
  Instanced grass — the whole field is one draw call, animated on the GPU.

  Each blade is a cross-quad (two planes crossed at 90 degrees). A single plane
  disappears when viewed edge-on, which is what makes cheap grass look
  see-through; crossing them means one face is always broad to the camera.
*/
export default function Grass({ count }) {
  // 3 segments x 2 quads = 12 tris/blade. 110k blades is ~1.3M tris in one
  // draw call: fine on desktop, too much for a phone, so scale it down there.
  const n = useMemo(() => {
    if (count) return count;
    if (typeof window === 'undefined') return 110000;
    const small = window.matchMedia?.('(max-width: 820px)').matches;
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
    return small || weak ? 40000 : 110000;
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(() => {
    const a = new THREE.PlaneGeometry(0.09, 1, 1, 3);
    a.translate(0, 0.5, 0);
    const b = a.clone();
    b.rotateY(Math.PI / 2);

    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'uv', 'normal']) {
      const av = a.attributes[name].array;
      const bv = b.attributes[name].array;
      const merged = new Float32Array(av.length + bv.length);
      merged.set(av, 0);
      merged.set(bv, av.length);
      g.setAttribute(name, new THREE.BufferAttribute(merged, a.attributes[name].itemSize));
    }
    const offset = a.attributes.position.count;
    g.setIndex([...a.index.array, ...Array.from(b.index.array, (i) => i + offset)]);
    a.dispose();
    b.dispose();
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      side: THREE.DoubleSide,
      roughness: 0.94,
      metalness: 0,
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
           // Two summed waves: a slow gust rolling across the whole field, and
           // a finer chop so neighbouring blades never move in lockstep.
           float gust = sin(uTime * 0.62 + ip.x * 0.05 + ip.z * 0.04);
           float chop = sin(uTime * 1.9  + ip.x * 0.5  + ip.z * 0.4);
           float sway = gust * 0.8 + chop * 0.24;
           float bend = (sway * 0.3 + aLean) * pow(uv.y, 2.0);
           transformed.x += bend;
           transformed.z += bend * 0.45;
           // Shorten as it bends so the blade pivots instead of stretching.
           transformed.y -= abs(bend) * 0.15 * uv.y;`
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
           // Shadowed base to sunlit tip, varied per blade. One flat green is
           // the main thing that makes instanced grass read as fake.
           vec3 base = mix(vec3(0.10, 0.15, 0.07), vec3(0.15, 0.21, 0.09), vTint);
           vec3 tip  = mix(vec3(0.42, 0.52, 0.22), vec3(0.62, 0.66, 0.30), vTint);
           gl_FragColor.rgb *= mix(base, tip, pow(vH, 1.3)) * 3.2;`
        );
    };
    return m;
  }, [uniforms]);

  const setup = (mesh) => {
    if (!mesh || mesh.userData.done) return;
    const blades = placeBlades(n);
    const dummy = new THREE.Object3D();
    const lean = new Float32Array(n);
    const tint = new Float32Array(n);
    for (let i = 0; i < n; i++) {
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

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={setup}
      args={[geometry, material, n]}
      frustumCulled={false}
      receiveShadow
      // 110k shadow casters costs far more than it's worth visually.
      castShadow={false}
    />
  );
}
