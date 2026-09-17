import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Cloud, Clouds } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import Forest from './Forest';
import Grass from './Grass';
import Birds from './Birds';
import Wildlife from './Wildlife';
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
      <planeGeometry args={[520, 520]} />
      {/* Slightly darker than the grass so gaps read as shadowed earth -- but
          #111d0e was near-black and turned every gap into a hole. */}
      <meshStandardMaterial color="#38491f" roughness={1} metalness={0} />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      // ACES (the r3f default) rolls highlights off hard and compounded every
      // other darkening change. Exposure is now explicit so brightness is a
      // single tunable number rather than an emergent accident.
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.35,
      }}
      camera={{ fov: 52, near: 0.1, far: 900, position: [0, 2.6, 12] }}
    >
      {/* Golden hour, not night. The sun had crept to 0.25 degrees of
          elevation, which makes the Sky shader output almost no light at all;
          combined with ACES tone mapping the whole frame crushed to black.
          ~7 degrees keeps the warm dusk mood while actually lighting the scene. */}
      <color attach="background" args={['#2c4152']} />
      <fogExp2 attach="fog" args={['#3c5364', 0.0085]} />

      <Sky
        sunPosition={[18, 10, -80]}
        turbidity={9}
        rayleigh={2.2}
        mieCoefficient={0.007}
        mieDirectionalG={0.84}
      />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#8fb6d8', '#3d5228', 1.15]} />
      <directionalLight
        position={[26, 20, -34]}
        intensity={3.1}
        color="#ffc98a"
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
        {/* Tiny silhouettes, pushed far out — these read as distant specks and
            give the sky depth behind the detailed models. */}
        <Birds count={14} />
        <Wildlife />
        <Clouds material={THREE.MeshBasicMaterial} limit={60}>
          <Cloud seed={2} position={[-34, 34, -74]} speed={0.12} opacity={0.22} bounds={[18, 4, 12]} color="#8c7f94" />
          <Cloud seed={7} position={[40, 40, -128]} speed={0.1} opacity={0.18} bounds={[22, 5, 14]} color="#7d768f" />
        </Clouds>
      </Suspense>

      <Rig />

      <EffectComposer disableNormalPass>
        {/* focusDistance 0.012 focused ~1m from the lens, so everything the
            camera actually looks at was blurred into mush. */}
        <DepthOfField focusDistance={0.055} focalLength={0.18} bokehScale={1.8} height={480} />
        <Bloom intensity={0.55} luminanceThreshold={0.55} luminanceSmoothing={0.35} mipmapBlur />
        {/* Was 1.15 (effectively max) with a 0.06 offset, which crushed the
            frame edges to pure black -- exactly where the copy sits. */}
        <Vignette eskil={false} offset={0.28} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}
