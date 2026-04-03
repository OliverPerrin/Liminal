"use client";

import { useEffect, useRef } from "react";
import { NeuralCanvas } from "@/components/neural-canvas";

export function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animId: number;
    let renderer: import("three").WebGLRenderer | null = null;

    async function init() {
      try {
        const THREE = await import("three");

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(mount!.offsetWidth, mount!.offsetHeight);
        mount!.appendChild(renderer.domElement);

        // Scene + Camera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          50,
          mount!.offsetWidth / mount!.offsetHeight,
          0.1,
          100
        );
        camera.position.set(0, 0.5, 13);

        // Neural network layout: 4 layers
        const layerZ = [-5, -1.5, 1.5, 5];
        const layerCounts = [4, 8, 8, 4];
        const layerColors = [0x10b981, 0x2dd4bf, 0x818cf8, 0xc084fc];

        // Build node positions per layer
        const layerNodes = layerCounts.map((count, li) => {
          const nodes: InstanceType<typeof THREE.Vector3>[] = [];
          const spreadY = (count - 1) * 0.85;
          for (let i = 0; i < count; i++) {
            const y = -spreadY / 2 + i * (spreadY / Math.max(count - 1, 1));
            // Slight x jitter for visual depth
            const x = (li % 2 === 0 ? -0.3 : 0.3) + (i % 2 === 0 ? 0.15 : -0.15);
            nodes.push(new THREE.Vector3(x, y, layerZ[li]));
          }
          return nodes;
        });

        // Sphere geometry shared across all nodes
        const sphereGeo = new THREE.SphereGeometry(0.13, 12, 8);

        // Node meshes with per-layer color and pulse phase
        type NodeMesh = InstanceType<typeof THREE.Mesh> & { _phase: number; _layerColor: number };
        const nodeMeshes: NodeMesh[] = [];

        layerNodes.forEach((nodes, li) => {
          const color = layerColors[li];
          nodes.forEach((pos, ni) => {
            const mat = new THREE.MeshStandardMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.6,
              roughness: 0.4,
              metalness: 0.1,
            });
            const mesh = new THREE.Mesh(sphereGeo, mat) as unknown as NodeMesh;
            mesh.position.copy(pos);
            mesh._phase = (li * layerCounts[li] + ni) * 0.47;
            mesh._layerColor = color;
            scene.add(mesh);
            nodeMeshes.push(mesh);
          });
        });

        // Edges between adjacent layers
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.07,
        });

        for (let li = 0; li < layerNodes.length - 1; li++) {
          const from = layerNodes[li];
          const to = layerNodes[li + 1];
          for (const a of from) {
            for (const b of to) {
              const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
              scene.add(new THREE.Line(geo, edgeMat));
            }
          }
        }

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        // Group to rotate
        const group = new THREE.Group();
        scene.children.slice().forEach((c) => group.add(c));
        scene.add(group);

        // Resize handler
        function onResize() {
          if (!mount || !renderer) return;
          camera.aspect = mount.offsetWidth / mount.offsetHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(mount.offsetWidth, mount.offsetHeight);
        }
        const ro = new ResizeObserver(onResize);
        ro.observe(mount!);

        let t = 0;
        function animate() {
          animId = requestAnimationFrame(animate);
          t += 0.008;

          // Slow y-rotation
          group.rotation.y = t * 0.25;

          // Node pulse — scale oscillates per node phase
          nodeMeshes.forEach((m) => {
            const s = 1 + 0.12 * Math.sin(t * 1.8 + m._phase);
            m.scale.setScalar(s);
          });

          renderer!.render(scene, camera);
        }
        animate();

        return () => {
          cancelAnimationFrame(animId);
          ro.disconnect();
          renderer!.dispose();
          if (mount && renderer!.domElement.parentNode === mount) {
            mount.removeChild(renderer!.domElement);
          }
        };
      } catch {
        // WebGL unavailable — mark fallback flag
        fallbackRef.current = true;
      }
    }

    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, []);

  if (fallbackRef.current) {
    return <NeuralCanvas />;
  }

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
