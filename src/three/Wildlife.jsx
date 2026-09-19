import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { MODELS, FLYERS, GROUNDERS, wanderAt, flyAt } from './wildlifePaths';

Object.values(MODELS).forEach((m) => useGLTF.preload(m.url));

/*
  Note: only the Fox is a skinned rig. The birds and horse are morph-target
  animated, so their materials must be left alone — swapping them silently
  freezes the animation mid-flap. Verified by src/checks/wildlife.check.mjs.
*/
function useCritter(modelKey) {
  const { scene, animations } = useGLTF(MODELS[modelKey].url);
  return useMemo(() => {
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
    const actions = {};
    animations.forEach((clip) => {
      actions[clip.name] = mixer.clipAction(clip);
    });
    return { object, mixer, actions, animations };
  }, [scene, animations]);
}

function Flyer({ spec }) {
  const { object, mixer, animations } = useCritter(spec.model);
  const group = useRef();
  const smoothHeading = useRef(0);

  useEffect(() => {
    if (animations[0]) mixer.clipAction(animations[0]).play();
    // Offset the wing cycle so a pair never flaps in sync.
    mixer.setTime(spec.phase * 2.7);
  }, [mixer, animations, spec.phase]);

  useFrame((state, delta) => {
    mixer.update(delta);
    const g = group.current;
    if (!g) return;
    const p = flyAt(spec, state.clock.elapsedTime);
    g.position.set(p.x, p.y, p.z);
    // Smooth the heading so direction changes glide instead of snapping.
    smoothHeading.current = dampAngle(smoothHeading.current, p.heading, 2.5, delta);
    g.rotation.set(0, smoothHeading.current, p.bank);
  });

  return (
    <group ref={group} scale={MODELS[spec.model].scale}>
      <primitive object={object} />
    </group>
  );
}

function Grounder({ spec }) {
  const { object, mixer, actions, animations } = useCritter(spec.model);
  const group = useRef();
  const smoothHeading = useRef(0);
  const current = useRef(null);

  useEffect(() => {
    // Morph-rig animals (the horse) have one clip; just play it.
    if (!spec.walk || !actions[spec.walk]) {
      if (animations[0]) mixer.clipAction(animations[0]).play();
      return;
    }
    actions[spec.walk].play();
    current.current = spec.walk;
  }, [actions, animations, mixer, spec.walk]);

  useFrame((state, delta) => {
    mixer.update(delta);
    const g = group.current;
    if (!g) return;

    const w = wanderAt(spec, state.clock.elapsedTime);
    g.position.set(w.x, 0, w.z);
    smoothHeading.current = dampAngle(smoothHeading.current, w.heading, 3.2, delta);
    g.rotation.y = smoothHeading.current;

    // Cross-fade between walking and idling at each grazing stop. This is the
    // detail that sells it: the fox stops, looks around, then moves on.
    if (spec.walk && spec.idle && actions[spec.walk] && actions[spec.idle]) {
      const want = w.moving ? spec.walk : spec.idle;
      if (want !== current.current) {
        actions[want].reset().play();
        actions[current.current]?.crossFadeTo(actions[want], 0.45, false);
        current.current = want;
      }
    }
  });

  return (
    <group ref={group} scale={MODELS[spec.model].scale}>
      <primitive object={object} />
    </group>
  );
}

// Frame-rate independent angular damping that takes the short way round.
function dampAngle(current, target, lambda, delta) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * delta));
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
