import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// A flock of low-poly birds. Each bird is a 2-triangle wing pair whose vertices
// are flapped in the vertex shader, so the whole flock is one draw call.
function wingGeometry() {
  const g = new THREE.BufferGeometry();
  // Two triangles sharing a body edge: left wing and right wing.
  const positions = new Float32Array([
    0, 0, -0.35, 0, 0, 0.35, -1, 0, 0, // left
    0, 0, -0.35, 1, 0, 0, 0, 0, 0.35, // right
  ]);
  // side = -1 left wing, +1 right wing, 0 at the body (hinge stays still).
  const side = new Float32Array([0, 0, -1, 0, 1, 0]);
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  return g;
}

export default function Birds({ count = 40 }) {
  const ref = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(wingGeometry, []);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: '#11151b',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           attribute float aSide;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           // Phase offset per bird so the flock doesn't flap in lockstep.
           float phase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4;
           float flap = sin(uTime * 9.0 + phase);
           transformed.y += abs(aSide) * flap * 0.42;
           transformed.x *= 1.0 - abs(flap) * 0.12;`
        );
    };
    return m;
  }, [uniforms]);

  const birds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        // Far out and high: these are background specks behind Wildlife.jsx.
        radius: 62 + Math.random() * 55,
        height: 30 + Math.random() * 26,
        speed: 0.055 + Math.random() * 0.075,
        offset: Math.random() * Math.PI * 2,
        z: -Math.random() * 170,
        scale: 0.36 + Math.random() * 0.4,
      })),
    [count]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    birds.forEach((b, i) => {
      const a = t * b.speed + b.offset;
      dummy.position.set(
        Math.cos(a) * b.radius,
        b.height + Math.sin(a * 2.3) * 2.2,
        b.z + Math.sin(a) * b.radius * 0.55
      );
      // Face along the tangent of the circular path.
      dummy.rotation.set(0, -a + Math.PI / 2, Math.sin(a * 2) * 0.3);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
}
