import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Cloud, Clouds } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import Forest from './Forest';
import Grass from './Grass';
import Birds from './Birds';
import { scroll } from '../scroll';

// Camera waypoints, one per section. The rig reads scroll.progress every frame
// and interpolates along these curves — no React state, so no re-renders.
const PATH = [
  { pos: [0, 2.6, 12], look: [0, 3.2, -6] }, // hero: eye level, facing in
  { pos: [-6, 3.4, -2], look: [2, 2.6, -16] }, // about: drift left
  { pos: [7, 2.2, -20], look: [-2, 3.0, -34] }, // editing
  { pos: [-5, 5.5, -40], look: [3, 3.4, -56] }, // motion: lift up
  { pos: [4, 1.8, -62], look: [-4, 2.8, -78] }, // graphic: low + close
  { pos: [-7, 4.2, -86], look: [2, 3.6, -102] }, // web
  { pos: [6, 6.5, -110], look: [-2, 4.0, -128] }, // brand: rise above canopy
  { pos: [0, 9.5, -136], look: [0, 6.0, -165] }, // contact: open sky
];

const curve = (key) =>
  new THREE.CatmullRomCurve3(PATH.map((p) => new THREE.Vector3(...p[key])), false, 'catmullrom', 0.5);

function Rig() {
  const { camera } = useThree();
  const posCurve = useRef(curve('pos')).current;
  const lookCurve = useRef(curve('look')).current;
  const target = useRef(new THREE.Vector3()).current;
  const desired = useRef(new THREE.Vector3()).current;
  const lookAt = useRef(new THREE.Vector3(0, 3, -6)).current;
  const pointer = useRef(new THREE.Vector2()).current;

  useFrame((state, delta) => {
    const t = THREE.MathUtils.clamp(scroll.progress, 0, 1);
    posCurve.getPointAt(t, desired);
    lookCurve.getPointAt(t, target);

    // Parallax: mouse nudges the camera without leaving the path.
    pointer.lerp(state.pointer, 1 - Math.pow(0.001, delta));
    desired.x += pointer.x * 1.6;
    desired.y += pointer.y * 0.8;

    // Frame-rate independent smoothing toward the scroll target.
    const k = 1 - Math.pow(0.0015, delta);
    camera.position.lerp(desired, k);
    lookAt.lerp(target, k);
    camera.lookAt(lookAt);
  });

  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -70]} receiveShadow>
      <planeGeometry args={[420, 420]} />
      <meshStandardMaterial color="#1e2e19" roughness={1} metalness={0} />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 52, near: 0.1, far: 900, position: [0, 2.6, 12] }}
    >
      {/* Dusk palette: a bright midday sky washed out the cream overlay text.
          A low sun keeps the forest readable while the sky stays dark enough
          for light type to sit on top of it. */}
      <color attach="background" args={['#101b23']} />
      <fogExp2 attach="fog" args={['#18262f', 0.015]} />

      {/* Sun pushed just below the horizon: keeps the warm dusk glow but stops
          the sky from being a bright field behind the (now unscrimmed) copy. */}
      <Sky
        sunPosition={[18, 0.35, -80]}
        turbidity={13}
        rayleigh={3.4}
        mieCoefficient={0.008}
        mieDirectionalG={0.88}
      />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#4d6d86', '#1d2b18', 0.6]} />
      <directionalLight
        position={[24, 11, -34]}
        intensity={2.1}
        color="#ffb86b"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={220}
        shadow-bias={-0.0006}
      />

      <Suspense fallback={null}>
        <Ground />
        <Forest />
        <Grass />
        <Birds />
        <Clouds material={THREE.MeshBasicMaterial} limit={60}>
          <Cloud seed={2} position={[-34, 34, -74]} speed={0.12} opacity={0.22} bounds={[18, 4, 12]} color="#8c7f94" />
          <Cloud seed={7} position={[40, 40, -128]} speed={0.1} opacity={0.18} bounds={[22, 5, 14]} color="#7d768f" />
        </Clouds>
      </Suspense>

      <Rig />

      <EffectComposer disableNormalPass>
        <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.6} height={480} />
        <Bloom intensity={0.5} luminanceThreshold={0.62} luminanceSmoothing={0.35} mipmapBlur />
        {/* With the scrim gone the vignette does the heavy lifting: it darkens
            the frame edges where the copy sits, but as a soft optical falloff
            rather than a visible mask. */}
        <Vignette eskil={false} offset={0.06} darkness={1.15} />
      </EffectComposer>
    </Canvas>
  );
}
