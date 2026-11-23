import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colors, slots, turn } from '../cube.js';

const spacing = 1.03;

export default function Cube3D({ facelets, animation, onTurnEnd, viewReset }) {
  const host = useRef(null);
  const view = useRef(null);
  const frameState = useRef({ facelets, animation, onTurnEnd });
  const [unavailable, setUnavailable] = useState(false);
  useLayoutEffect(() => {
    frameState.current = { facelets, animation, onTurnEnd };
  }, [facelets, animation, onTurnEnd]);

  useEffect(() => {
    const element = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUnavailable(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D cube. Drag to orbit and scroll to zoom.');
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(6.2, 4.8, 8.3);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 7;
    controls.maxDistance = 18;
    controls.saveState();
    view.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x828699, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(-3, 7, 5);
    scene.add(light);

    const cube = new THREE.Group();
    const pivot = new THREE.Group();
    scene.add(cube, pivot);
    const body = new RoundedBoxGeometry(0.99, 0.99, 0.99, 3, 0.075);
    const tile = new RoundedBoxGeometry(0.84, 0.84, 0.035, 3, 0.017);
    const plastic = new THREE.MeshStandardMaterial({ color: 0x161b26, roughness: 0.48 });
    const materials = Object.fromEntries(Object.entries(colors).map(([face, color]) =>
      [face, new THREE.MeshStandardMaterial({ color, roughness: 0.48 })]));
    const cubies = new Map();
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue;
          const position = [x, y, z];
          const mesh = new THREE.Mesh(body, plastic);
          mesh.position.fromArray(position).multiplyScalar(spacing);
          cube.add(mesh);
          cubies.set(position.join(','), { mesh, position });
        }
      }
    }
    const stickers = slots.map(({ position, normal }) => {
      const sticker = new THREE.Mesh(tile, materials.U);
      sticker.position.fromArray(normal).multiplyScalar(0.5);
      sticker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal));
      cubies.get(position.join(',')).mesh.add(sticker);
      return sticker;
    });

    const observer = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1 ? 34 / camera.aspect : 34;
      camera.updateProjectionMatrix();
    });
    observer.observe(element);

    let currentAnimation;
    let painted;
    let started;
    let completed;
    renderer.setAnimationLoop(time => {
      const state = frameState.current;
      if (state.animation !== currentAnimation) {
        pivot.rotation.set(0, 0, 0);
        for (const { mesh } of cubies.values()) cube.add(mesh);
        currentAnimation = state.animation;
        started = time;
        completed = false;
        if (currentAnimation) {
          const { axis, layer } = turn(currentAnimation.move);
          for (const { mesh, position } of cubies.values()) {
            if (position[axis] === layer) pivot.add(mesh);
          }
        }
      }
      if (painted !== state.facelets) {
        stickers.forEach((sticker, index) => { sticker.material = materials[state.facelets[index]]; });
        painted = state.facelets;
      }
      if (currentAnimation && !completed) {
        const { axis, quarters } = turn(currentAnimation.move);
        const progress = Math.min(1, (time - started) / currentAnimation.duration);
        pivot.rotation[['x', 'y', 'z'][axis]] = quarters * Math.PI / 2 * (1 - (1 - progress) ** 3);
        if (progress === 1) {
          completed = true;
          state.onTurnEnd(currentAnimation);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      view.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      for (const resource of [body, tile, plastic, ...Object.values(materials)]) resource.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => { view.current?.reset(); }, [viewReset]);

  useEffect(() => {
    if (unavailable && animation) onTurnEnd(animation);
  }, [unavailable, animation, onTurnEnd]);

  return (
    <div className="cube-surface" ref={host}>
      {unavailable && <div className="cube-net" aria-label="Cube facelets">
        {Object.keys(colors).map((face, index) => <div key={face} aria-label={face}>
          {[...facelets.slice(index * 9, index * 9 + 9)].map((color, cell) =>
            <span key={cell} style={{ background: colors[color] }} aria-label={color} />)}
        </div>)}
      </div>}
    </div>
  );
}
