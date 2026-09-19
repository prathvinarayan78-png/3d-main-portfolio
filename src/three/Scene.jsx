import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Cloud, Clouds, AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import Forest from './Forest';
import Grass from './Grass';
import Wildlife from './Wildlife';
import { Motes, Mist } from './Atmosphere';
import { scroll } from '../scroll';

/*
  Camera waypoints, one per section. The rig reads scroll.progress every frame
  and interpolates along a spline through these — no React state, so scrolling
  never triggers a re-render.
*/
const PATH = [
  { pos: [0, 2.4, 14], look: [0, 3.0, -8] }, // hero — eye level, path ahead
  { pos: [-7, 3.2, -4], look: [3, 2.8, -20] }, // about — drift left
  { pos: [8, 2.0, -26], look: [-3, 3.0, -42] }, // editing — low, close to grass
  { pos: [-6, 6.0, -50], look: [4, 3.4, -68] }, // motion — lift into the canopy
  { pos: [5, 1.7, -74], look: [-5, 2.6, -92] }, // graphic — back down low
  { pos: [-8, 4.4, -100], look: [3, 3.6, -120] }, // web
  { pos: [7, 7.5, -128], look: [-2, 4.2, -150] }, // brand — above the canopy
  { pos: [0, 11.0, -158], look: [0, 7.0, -196] }, // contact — open sky
];

const spline = (key) =>
  new THREE.CatmullRomCurve3(
    PATH.map((p) => new THREE.Vector3(...p[key])),
    false,
    'catmullrom',
    0.4
  );

function Rig() {
  const { camera } = useThree();
  const posCurve = useRef(spline('pos')).current;
  const lookCurve = useRef(spline('look')).current;
  const desired = useRef(new THREE.Vector3()).current;
  const target = useRef(new THREE.Vector3()).current;
  const lookAt = useRef(new THREE.Vector3(0, 3, -8)).current;
  const pointer = useRef(new THREE.Vector2()).current;

  useFrame((state, delta) => {
    const t = THREE.MathUtils.clamp(scroll.progress, 0, 1);
    posCurve.getPointAt(t, desired);
    lookCurve.getPointAt(t, target);

    // Parallax — the camera leans with the pointer without leaving the path.
    pointer.lerp(state.pointer, 1 - Math.pow(0.002, delta));
    desired.x += pointer.x * 1.5;
    desired.y += pointer.y * 0.7;
    // A slow float, so the shot is never perfectly static.
    desired.y += Math.sin(state.clock.elapsedTime * 0.28) * 0.14;

    // Frame-rate independent smoothing toward the scroll target.
    const k = 1 - Math.pow(0.0012, delta);
    camera.position.lerp(desired, k);
    lookAt.lerp(target, k);
    camera.lookAt(lookAt);
  });

  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -110]} receiveShadow>
      <planeGeometry args={[620, 620]} />
      {/* Mid-tone earth: dark enough that gaps between blades read as shadow,
          light enough that the ground never crushes to black. */}
      <meshStandardMaterial color="#2e3a1c" roughness={1} metalness={0} />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        // Explicit exposure: overall brightness is one number I can reason
        // about, rather than an emergent product of six settings.
        toneMappingExposure: 1.15,
      }}
      camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 2.4, 14] }}
    >
      <color attach="background" args={['#9bb8cc']} />
      <fogExp2 attach="fog" args={['#a8c2d2', 0.0092]} />

      {/* Sun low but clearly above the horizon — golden hour, not night. */}
      <Sky sunPosition={[34, 15, -96]} turbidity={9} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.86} />

      <ambientLight intensity={0.62} />
      <hemisphereLight args={['#bcd8ee', '#3c4a22', 0.95]} />
      <directionalLight
        position={[40, 24, -60]}
        intensity={2.5}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-far={260}
        shadow-bias={-0.0006}
      />
      {/* Cool rim from behind, so trees separate from the sky. */}
      <directionalLight position={[-30, 14, 40]} intensity={0.5} color="#9fc4e8" />

      <Suspense fallback={null}>
        <Ground />
        <Forest />
        <Grass />
        <Wildlife />
        <Mist />
        <Motes />
        <Clouds material={THREE.MeshBasicMaterial} limit={70}>
          <Cloud seed={3} position={[-46, 40, -92]} speed={0.07} opacity={0.3} bounds={[24, 5, 14]} color="#f2e2d0" />
          <Cloud seed={9} position={[52, 46, -168]} speed={0.06} opacity={0.24} bounds={[28, 6, 16]} color="#e6dbe4" />
        </Clouds>
      </Suspense>

      <Rig />
      <AdaptiveDpr pixelated />

      <EffectComposer disableNormalPass>
        {/* Focus set well into the scene; focusing near the lens blurs
            everything the viewer is actually looking at. */}
        <DepthOfField focusDistance={0.06} focalLength={0.11} bokehScale={2.2} height={480} />
        <Bloom intensity={0.5} luminanceThreshold={0.72} luminanceSmoothing={0.35} mipmapBlur />
        <Vignette eskil={false} offset={0.28} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}
