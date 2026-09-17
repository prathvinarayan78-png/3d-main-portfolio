import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Instanced grass: one draw call for ~40k blades, animated entirely on the GPU
// by injecting wind into MeshStandardMaterial rather than shading from scratch.
export default function Grass({ count = 40000, area = 200 }) {
  const ref = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(() => {
    // A blade = 3-segment tapered strip, so it can bend along its height.
    const g = new THREE.PlaneGeometry(0.09, 1.05, 1, 3);
    g.translate(0, 0.525, 0);
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#38602a',
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           varying float vH;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vH = uv.y;
           // instanceMatrix[3].xyz is the blade's world position — use it to
           // desynchronise the wave so the field ripples instead of pulsing.
           vec3 ip = instanceMatrix[3].xyz;
           float wind = sin(uTime * 1.3 + ip.x * 0.22 + ip.z * 0.16)
                      + 0.5 * sin(uTime * 2.1 + ip.x * 0.4);
           // Cubic falloff: root stays planted, tip travels furthest.
           transformed.x += wind * 0.34 * pow(uv.y, 3.0);
           transformed.z += wind * 0.16 * pow(uv.y, 3.0);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vH;')
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           // Darken toward the root to fake self-shadowing in the canopy.
           gl_FragColor.rgb *= mix(0.45, 1.25, vH);`
        );
    };
    return m;
  }, [uniforms]);

  const setup = (mesh) => {
    if (!mesh || mesh.userData.done) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      // Sparser far from the path, denser near it.
      const x = (Math.random() - 0.5) * area;
      const z = 16 - Math.random() * area;
      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.6 + Math.random() * 0.9);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.done = true;
    ref.current = mesh;
  };

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={setup}
      args={[geometry, material, count]}
      frustumCulled={false}
      receiveShadow
    />
  );
}
