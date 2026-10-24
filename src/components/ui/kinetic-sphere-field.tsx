'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function KineticSphereField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webGLSupported) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Responsive Sphere Count
    const isMobile = window.innerWidth < 768;
    const sphereCount = isMobile ? 14 : 32;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Lighting (Warm champagne and obsidian reflections)
    const ambientLight = new THREE.AmbientLight(0x20281f, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xf1ebdd, 1.6);
    dirLight1.position.set(12, 18, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc2a878, 1.2);
    dirLight2.position.set(-15, -10, 10);
    scene.add(dirLight2);

    const goldPointLight = new THREE.PointLight(0xe0cda7, 2.2, 28);
    goldPointLight.position.set(0, 0, 8);
    scene.add(goldPointLight);

    // Shared Geometries & Curated Luxury Materials
    const baseGeometry = new THREE.SphereGeometry(1, 32, 32);

    // 1. Warm Ivory Pearl
    const ivoryMat = new THREE.MeshStandardMaterial({
      color: 0xf1ebdd,
      roughness: 0.18,
      metalness: 0.15,
    });

    // 2. Champagne Gold Satin
    const champagneMat = new THREE.MeshStandardMaterial({
      color: 0xc2a878,
      roughness: 0.22,
      metalness: 0.88,
    });

    // 3. Obsidian Gloss Glass
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x111210,
      roughness: 0.08,
      metalness: 0.95,
    });

    // 4. Soft Gold Highlight
    const softGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe0cda7,
      roughness: 0.28,
      metalness: 0.55,
    });

    const materials = [ivoryMat, champagneMat, obsidianMat, softGoldMat];

    interface SphereData {
      mesh: THREE.Mesh;
      baseX: number;
      baseY: number;
      baseZ: number;
      radius: number;
      speed: number;
      freqX: number;
      freqY: number;
      freqZ: number;
      phase: number;
    }

    const spheres: SphereData[] = [];

    // Spread spheres in an architectural orbital formation
    for (let i = 0; i < sphereCount; i++) {
      const mat = materials[i % materials.length];
      const mesh = new THREE.Mesh(baseGeometry, mat);

      // Deterministic pseudo-random generation for stable composition
      const angle = (i / sphereCount) * Math.PI * 2;
      const spreadRadius = 4.5 + ((i * 1.7) % 7.5);
      const zDepth = -6 + ((i * 3.3) % 11);

      const x = Math.cos(angle) * spreadRadius;
      const y = Math.sin(angle) * (spreadRadius * 0.65);
      const z = zDepth;

      const scale = 0.45 + ((i * 0.37) % 0.85);
      mesh.scale.set(scale, scale, scale);

      mesh.position.set(x, y, z);
      scene.add(mesh);

      spheres.push({
        mesh,
        baseX: x,
        baseY: y,
        baseZ: z,
        radius: scale,
        speed: 0.4 + ((i * 0.15) % 0.6),
        freqX: 0.3 + ((i * 0.08) % 0.5),
        freqY: 0.25 + ((i * 0.07) % 0.4),
        freqZ: 0.2 + ((i * 0.05) % 0.3),
        phase: (i * Math.PI) / 4,
      });
    }

    // Pointer Interaction State
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = normX;
      targetMouseY = normY;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Animation Loop with Visibility & Reduced-Motion Handling
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        clock.getDelta(); // reset delta after sleep
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = () => {
      if (!isTabVisible) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const elapsed = clock.getElapsedTime();

      // Smooth mouse damping
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Subtle camera parallax
      camera.position.x = currentMouseX * 1.8;
      camera.position.y = currentMouseY * 1.2;
      camera.lookAt(0, 0, 0);

      // Light orbit
      goldPointLight.position.x = Math.sin(elapsed * 0.5) * 4 + currentMouseX * 3;
      goldPointLight.position.y = Math.cos(elapsed * 0.4) * 3 + currentMouseY * 2;

      // Update sphere physics if reduced motion is not requested
      if (!prefersReducedMotion) {
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          const t = elapsed * s.speed + s.phase;

          // Natural harmonic drifting
          const driftX = Math.sin(t * s.freqX) * 0.8;
          const driftY = Math.cos(t * s.freqY) * 0.6;
          const driftZ = Math.sin(t * s.freqZ) * 0.5;

          // Interactive subtle deflection from cursor
          const targetX = s.baseX + driftX + currentMouseX * (s.baseZ > 0 ? 1.2 : -0.6);
          const targetY = s.baseY + driftY + currentMouseY * (s.baseZ > 0 ? 0.9 : -0.4);
          const targetZ = s.baseZ + driftZ;

          s.mesh.position.x += (targetX - s.mesh.position.x) * 0.04;
          s.mesh.position.y += (targetY - s.mesh.position.y) * 0.04;
          s.mesh.position.z += (targetZ - s.mesh.position.z) * 0.04;

          // Gentle rotation
          s.mesh.rotation.x += 0.003;
          s.mesh.rotation.y += 0.004;
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup & Resource Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      baseGeometry.dispose();
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [webGLSupported]);

  if (!webGLSupported) {
    return (
      <div className="absolute inset-0 bg-radial from-regent-charcoal/80 via-regent-obsidian to-regent-obsidian pointer-events-none" />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-85"
      aria-hidden="true"
    />
  );
}
