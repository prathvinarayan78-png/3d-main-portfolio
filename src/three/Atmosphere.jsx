import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
  Floating pollen / firefly motes. This is the single biggest contributor to a
  scene feeling "alive and calm" — slow, drifting specks catch the light and
  give the air volume. Rendered as one additive Points cloud, so the cost is a
  single draw call regardless of count.
*/
export function Motes({ count = 900 }) {
  const ref = useRef();
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } }),
    []
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Concentrated along the camera corridor, thinning outward.
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 16 + 0.4;
      pos[i * 3 + 2] = 20 - Math.random() * 210;
      seed[i] = Math.random() * Math.PI * 2;
      size[i] = 0.5 + Math.random() * 1.9;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          uniform float uTime;
          uniform float uPixelRatio;
          attribute float aSeed;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            // Slow figure-eight drift: no two motes share a path.
            p.x += sin(uTime * 0.16 + aSeed) * 1.7;
            p.y += sin(uTime * 0.23 + aSeed * 1.7) * 0.9;
            p.z += cos(uTime * 0.13 + aSeed * 0.8) * 1.4;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            // Attenuate with distance so far motes don't pop as bright dots.
            gl_PointSize = aSize * uPixelRatio * (34.0 / -mv.z);
            // Gentle twinkle, plus fade at the very back of the field.
            vAlpha = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 3.1)))
                   * smoothstep(210.0, 60.0, -mv.z);
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          void main() {
            // Round, soft-edged sprite from point coords — no texture needed.
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            float a = smoothstep(0.5, 0.06, d) * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vec3(1.0, 0.93, 0.74), a * 0.7);
          }
        `,
      }),
    [uniforms]
  );

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/*
  Ground mist: a few large, very soft horizontal planes that always face the
  camera's yaw. Cheaper and calmer than volumetric fog, and it gives the forest
  floor the layered depth that reads as early morning.
*/
export function Mist({ layers = 7 }) {
  const group = useRef();

  const planes = useMemo(
    () =>
      Array.from({ length: layers }, (_, i) => ({
        z: 6 - i * 28,
        y: 1.1 + (i % 3) * 0.5,
        scale: 68 + i * 9,
        opacity: 0.2 - i * 0.012,
        drift: 0.05 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2,
      })),
    [layers]
  );

  const texture = useMemo(() => {
    // Radial-gradient canvas: a soft blob with no hard edge anywhere.
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useFrame((s) => {
    if (!group.current) return;
    const t = s.clock.elapsedTime;
    group.current.children.forEach((m, i) => {
      const p = planes[i];
      m.position.x = Math.sin(t * p.drift + p.phase) * 9;
      m.material.opacity = p.opacity * (0.75 + 0.25 * Math.sin(t * 0.22 + p.phase));
    });
  });

  return (
    <group ref={group}>
      {planes.map((p, i) => (
        <mesh key={i} position={[0, p.y, p.z]} rotation={[-Math.PI / 2.06, 0, 0]} renderOrder={2}>
          <planeGeometry args={[p.scale, p.scale * 0.5]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={p.opacity}
            depthWrite={false}
            color="#cfe3f0"
            blending={THREE.NormalBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
