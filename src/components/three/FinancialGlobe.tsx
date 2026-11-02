/**
 * Three.js 3D Interactive Financial Globe.
 * Displayed in the Dashboard Hero.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const FinancialGlobe: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(undefined as unknown as HTMLDivElement);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group containing the sphere and rings
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Wireframe Sphere
    const sphereGeo = new THREE.IcosahedronGeometry(7, 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xE70013,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    // Glowing Node Points
    const pointsGeo = new THREE.IcosahedronGeometry(7.05, 2);
    const pointsMat = new THREE.PointsMaterial({
      color: 0xC5A059, // Gold nodes
      size: 0.35,
      transparent: true,
      opacity: 0.9,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);
    globeGroup.add(points);

    // Orbital Ring 1
    const ring1Geo = new THREE.RingGeometry(8.5, 8.6, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8, // Cyan
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    globeGroup.add(ring1);

    // Orbital Ring 2
    const ring2Geo = new THREE.RingGeometry(9.5, 9.6, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xE70013, // Crimson
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    globeGroup.add(ring2);

    let animationFrameId: number;
    let angle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      angle += 0.008;

      globeGroup.rotation.y = angle;
      globeGroup.rotation.x = Math.sin(angle * 0.5) * 0.2;
      ring1.rotation.z = angle * 0.8;
      ring2.rotation.z = -angle * 0.6;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      sphereGeo.dispose();
      sphereMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={`w-full h-full min-h-[160px] ${className}`} />;
};

