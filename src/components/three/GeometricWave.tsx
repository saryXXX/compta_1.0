/**
 * Interactive Three.js 3D Geometric Wave Animation.
 * Used as dynamic background on the Login Page.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const GeometricWave: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(undefined as unknown as HTMLDivElement);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 40, 70);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particle Wave Geometry
    const SEPARATION = 3.5;
    const AMOUNTX = 45;
    const AMOUNTY = 45;
    const numParticles = AMOUNTX * AMOUNTY;

    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);

    let i = 0;
    let j = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2; // x
        positions[i + 1] = 0; // y
        positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2; // z
        scales[j] = 1;
        i += 3;
        j++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle Material with subtle crimson/gold accents
    const material = new THREE.PointsMaterial({
      color: 0xE70013, // Tunisian Red accent
      size: 1.5,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Subtle grid plane
    const gridHelper = new THREE.GridHelper(160, 40, 0xC5A059, 0x334155);
    gridHelper.position.y = -5;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Mouse movement perspective
    let mouseX = 0;
    let mouseY = 0;
    let windowHalfX = width / 2;
    let windowHalfY = height / 2;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - windowHalfX) * 0.05;
      mouseY = (event.clientY - windowHalfY) * 0.05;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      windowHalfX = w / 2;
      windowHalfY = h / 2;
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let count = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      camera.position.x += (mouseX - camera.position.x) * 0.03;
      camera.position.y += (-mouseY + 40 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      const posArray = particles.geometry.attributes.position.array as Float32Array;
      let idx = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          posArray[idx + 1] =
            Math.sin((ix + count) * 0.3) * 4 +
            Math.sin((iy + count) * 0.5) * 4;
          idx += 3;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      particles.rotation.y = count * 0.05;
      gridHelper.rotation.y = -count * 0.02;

      renderer.render(scene, camera);
      count += 0.04;
    };

    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`} />;
};

