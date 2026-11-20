"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function BloomScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0.2, 8.4);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };

    // ---------- Flower ----------
    const root = new THREE.Group();
    scene.add(root);
    const bloom = new THREE.Group();
    bloom.position.y = 0.35;
    root.add(bloom);

    const petalGeometry = track(new THREE.SphereGeometry(0.73, 32, 24));
    petalGeometry.scale(0.5, 1.2, 0.22);
    petalGeometry.translate(0, 0.72, 0);

    const outerMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0xd8102a, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.2, sheen: 1, sheenColor: new THREE.Color(0xff5a6c), emissive: 0x4a0008, emissiveIntensity: 0.35 }));
    const innerMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffd6db) }));

    type Petal = { pivot: THREE.Group; openAngle: number; phase: number };
    const petals: Petal[] = [];
    const makeRing = (count: number, material: THREE.Material, scale: number, openAngle: number, offset: number, z: number) => {
      for (let index = 0; index < count; index += 1) {
        const holder = new THREE.Group();
        holder.rotation.z = (index / count) * Math.PI * 2 + offset;
        holder.position.z = z;
        const pivot = new THREE.Group();
        const petal = new THREE.Mesh(petalGeometry, material);
        petal.scale.setScalar(scale);
        pivot.add(petal);
        holder.add(pivot);
        bloom.add(holder);
        pivot.rotation.x = 1.35; // closed bud
        petals.push({ pivot, openAngle, phase: index * 0.7 + offset });
      }
    };
    makeRing(9, outerMaterial, 1, 0.22, 0, -0.08);
    makeRing(7, innerMaterial, 0.72, 0.62, Math.PI / 7, 0.06);

    const centerMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.2, metalness: 0.4, clearcoat: 1 }));
    const center = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.42, 3)), centerMaterial);
    center.scale.set(1, 1, 0.7);
    center.position.z = 0.15;
    bloom.add(center);

    const seedGeometry = track(new THREE.SphereGeometry(0.035, 8, 6));
    const seedMaterial = track(new THREE.MeshStandardMaterial({ color: 0xff3b4f, roughness: 0.4, emissive: 0xff1a33, emissiveIntensity: 0.6 }));
    for (let index = 0; index < 34; index += 1) {
      const angle = index * 2.39996;
      const radius = 0.055 * Math.sqrt(index) * 1.25;
      const seed = new THREE.Mesh(seedGeometry, seedMaterial);
      seed.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.43 - radius * 0.35);
      bloom.add(seed);
    }

    const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.1, -0.15), new THREE.Vector3(0.12, -1.1, -0.15), new THREE.Vector3(-0.08, -2.2, -0.1), new THREE.Vector3(0.05, -3.4, -0.1)]);
    const stem = new THREE.Mesh(track(new THREE.TubeGeometry(stemCurve, 40, 0.055, 10)), track(new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.5, metalness: 0.3 })));
    root.add(stem);

    const leafGeometry = track(new THREE.SphereGeometry(0.45, 24, 16));
    leafGeometry.scale(1.35, 0.46, 0.18);
    leafGeometry.translate(0.55, 0, 0);
    const leafMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, roughness: 0.3, metalness: 0.35, clearcoat: 0.8 }));
    const leaves = [
      { y: -1.25, side: -1, tilt: 0.5 },
      { y: -2.05, side: 1, tilt: 0.35 },
    ].map(({ y, side, tilt }) => {
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.set(0.05, y, -0.12);
      leaf.rotation.set(0.2, side < 0 ? Math.PI : 0, tilt);
      root.add(leaf);
      return leaf;
    });

    // ---------- Orbiting orbs ----------
    const orbs = [
      { color: 0xff3b4f, radius: 2.05, size: 0.13, speed: 0.5, tilt: 0.5, phase: 0 },
      { color: 0xffffff, radius: 2.4, size: 0.09, speed: -0.35, tilt: -0.35, phase: 2 },
      { color: 0xff3b4f, radius: 1.75, size: 0.07, speed: 0.75, tilt: 0.9, phase: 4 },
    ].map((config) => {
      const mesh = new THREE.Mesh(track(new THREE.SphereGeometry(config.size, 24, 16)), track(new THREE.MeshPhysicalMaterial({ color: config.color, roughness: 0.15, clearcoat: 1, emissive: config.color, emissiveIntensity: 0.55 })));
      scene.add(mesh);
      return { mesh, ...config };
    });

    // ---------- Pollen particles ----------
    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount);
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 6;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 3;
      seeds[index] = Math.random() * Math.PI * 2;
    }
    const particleGeometry = track(new THREE.BufferGeometry());
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.35, "rgba(255,80,100,.85)");
      gradient.addColorStop(1, "rgba(255,40,70,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    const particleTexture = track(new THREE.CanvasTexture(canvas));
    const particleMaterial = track(new THREE.PointsMaterial({ size: 0.12, map: particleTexture, transparent: true, depthWrite: false, opacity: 0.9, color: 0xffffff, blending: THREE.AdditiveBlending }));
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ---------- Lights ----------
    scene.add(new THREE.HemisphereLight(0xffffff, 0x220308, 1.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(3, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xff2a40, 28, 12);
    rimLight.position.set(-3, 1, -2);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0xffffff, 8, 10);
    fillLight.position.set(2.5, -2, 3);
    scene.add(fillLight);

    root.rotation.z = -0.1;
    root.scale.setScalar(0.92);

    // ---------- Interaction ----------
    const pointer = { x: 0, y: 0 };
    const smoothPointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(mount);

    const start = performance.now();
    let frame = 0;
    const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (!visible) return;
      const elapsed = (performance.now() - start) / 1000;
      const time = reduceMotion ? 0 : elapsed;
      const openProgress = reduceMotion ? 1 : Math.min(elapsed / 2.2, 1);
      const open = easeOutBack(openProgress);

      petals.forEach(({ pivot, openAngle, phase }) => {
        pivot.rotation.x = 1.35 + (openAngle - 1.35) * open + Math.sin(time * 1.4 + phase) * 0.035;
      });
      center.scale.setScalar(0.4 + 0.6 * Math.min(openProgress * 1.4, 1));
      center.scale.z *= 0.7;

      smoothPointer.x += (pointer.x - smoothPointer.x) * 0.05;
      smoothPointer.y += (pointer.y - smoothPointer.y) * 0.05;
      root.rotation.y = Math.sin(time * 0.45) * 0.22 + smoothPointer.x * 0.35;
      root.rotation.x = Math.sin(time * 0.65) * 0.05 + smoothPointer.y * 0.18;
      root.position.y = Math.sin(time * 0.9) * 0.08;
      bloom.rotation.z = time * 0.08;
      leaves.forEach((leaf, index) => { leaf.rotation.x = 0.2 + Math.sin(time * 1.2 + index) * 0.12; });

      orbs.forEach(({ mesh, radius, speed, tilt, phase }) => {
        const angle = time * speed + phase;
        mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * Math.sin(tilt) * 0.6 + 0.3, Math.sin(angle) * radius * 0.5);
      });

      const attribute = particleGeometry.getAttribute("position") as THREE.BufferAttribute;
      for (let index = 0; index < particleCount; index += 1) {
        let y = attribute.getY(index) + 0.004 + Math.sin(time + seeds[index]) * 0.002;
        if (y > 2.6) y = -2.6;
        attribute.setY(index, y);
        attribute.setX(index, attribute.getX(index) + Math.sin(time * 0.6 + seeds[index]) * 0.0015);
      }
      attribute.needsUpdate = true;
      particles.rotation.y = smoothPointer.x * 0.15;

      camera.position.x = smoothPointer.x * 0.25;
      camera.position.y = 0.2 - smoothPointer.y * 0.15;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="bloom-scene" ref={mountRef} aria-hidden="true" />;
}
