import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

/*
  Animated wildlife from two well-known open repos:
    Flamingo / Parrot / Stork / Horse — mrdoob/three.js examples (MIT)
    Fox                              — KhronosGroup/glTF-Sample-Assets (CC0)

  All five models are authored at roughly centimetre scale (bbox ~100-300
  units), so each gets an explicit metre-scale factor below rather than a
  shared guess.
*/

const MODELS = {
  Flamingo: { url: '/models/Flamingo.glb', scale: 0.022, yaw: 0 },
  Parrot: { url: '/models/Parrot.glb', scale: 0.019, yaw: 0 },
  Stork: { url: '/models/Stork.glb', scale: 0.02, yaw: 0 },
  Horse: { url: '/models/Horse.glb', scale: 0.016, yaw: 0 },
  Fox: { url: '/models/Fox.glb', scale: 0.033, yaw: 0 },
};

Object.values(MODELS).forEach((m) => useGLTF.preload(m.url));

/*
  Placements are hand-authored, not random — the brief was explicitly "don't
  cluster it". Each entry is spaced along the 190m corridor the camera flies
  down, alternating sides, with no two animals sharing a scroll section.
  `z` roughly maps to sections: 0=hero ... -136=contact.
*/
const FLYERS = [
  // Flamingo pair crossing the hero sky, high and slow. They fly as a loose
  // pair by design — the only two animals intentionally near each other.
  { model: 'Flamingo', path: [-58, 27, -44], radius: 30, speed: 0.052, phase: 0.0, bank: 0.34 },
  { model: 'Flamingo', path: [-52, 29, -50], radius: 30, speed: 0.052, phase: 0.22, bank: 0.34 },
  // Parrot, low and quick, over the graphic/web stretch.
  { model: 'Parrot', path: [-34, 13, -110], radius: 22, speed: 0.085, phase: 3.1, bank: 0.42 },
  // Large stork high over the closing sky — the contact section looks straight
  // down this corridor, so the last shot isn't empty.
  { model: 'Stork', path: [26, 30, -170], radius: 44, speed: 0.036, phase: 4.4, bank: 0.24 },
];

const GROUNDERS = [
  // Fox trotting a slow loop in a clearing, left of the path (about section).
  { model: 'Fox', clip: 'Walk', at: [-15.5, 0, -12], radius: 6.5, speed: 0.12, phase: 0.0 },
  // Horse walking a wide circle, right side, mid-journey.
  { model: 'Horse', clip: null, at: [19, 0, -80], radius: 9, speed: 0.085, phase: 2.2 },
  // Second fox further down, opposite side, idling rather than walking.
  { model: 'Fox', clip: 'Survey', at: [13.5, 0, -140], radius: 3.2, speed: 0.05, phase: 1.1 },
];

// One shared AnimationMixer per instance; SkeletonUtils.clone is required
// because skinned meshes can't be reused with <primitive> directly.
function useCritter(modelKey, clipName) {
  const { scene, animations } = useGLTF(MODELS[modelKey].url);

  return useMemo(() => {
    // SkeletonUtils.clone handles the Fox's skinned rig; the four birds/horse
    // are morph-target animated and clone fine either way.
    const object = cloneSkinned(scene);
    object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // Animated bounds aren't recomputed per frame, so culling can pop.
        o.frustumCulled = false;
      }
    });

    const mixer = new THREE.AnimationMixer(object);
    const clip =
      (clipName && animations.find((a) => a.name === clipName)) || animations[0];
    if (clip) mixer.clipAction(clip).play();
    return { object, mixer };
  }, [scene, animations, clipName]);
}

function Flyer({ spec }) {
  const { model, path, radius, speed, phase, bank } = spec;
  const { object, mixer } = useCritter(model, null);
  const group = useRef();

  // Desynchronise the wing cycle so a pair never flaps in lockstep.
  useEffect(() => {
    mixer.setTime(phase * 2.4);
  }, [mixer, phase]);

  useFrame((state, delta) => {
    mixer.update(delta);
    const g = group.current;
    if (!g) return;
    const a = state.clock.elapsedTime * speed + phase;
    // Ellipse, wider than deep, so birds cross the view rather than orbit it.
    g.position.set(
      path[0] + Math.cos(a) * radius,
      path[1] + Math.sin(a * 1.7) * 1.8,
      path[2] + Math.sin(a) * radius * 0.62
    );
    // Face along the tangent of travel.
    g.rotation.y = -a + Math.PI / 2;
    g.rotation.z = Math.cos(a) * bank;
  });

  return (
    <group ref={group} scale={MODELS[model].scale}>
      <primitive object={object} />
    </group>
  );
}

function Grounder({ spec }) {
  const { model, clip, at, radius, speed, phase } = spec;
  const { object, mixer } = useCritter(model, clip);
  const group = useRef();

  useEffect(() => {
    mixer.setTime(phase * 1.7);
  }, [mixer, phase]);

  useFrame((state, delta) => {
    mixer.update(delta);
    const g = group.current;
    if (!g) return;
    const a = state.clock.elapsedTime * speed + phase;
    g.position.set(at[0] + Math.cos(a) * radius, at[1], at[2] + Math.sin(a) * radius);
    // Tangent of a circle, so the animal always faces where it's walking.
    g.rotation.y = -a;
  });

  return (
    <group ref={group} scale={MODELS[model].scale}>
      <primitive object={object} />
    </group>
  );
}

export default function Wildlife() {
  return (
    <group>
      {FLYERS.map((spec, i) => (
        <Flyer key={`f${i}`} spec={spec} />
      ))}
      {GROUNDERS.map((spec, i) => (
        <Grounder key={`g${i}`} spec={spec} />
      ))}
    </group>
  );
}
