"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AsciiRuntimeEnvironment,
  readEnvironment,
  shouldUseThreeAscii,
} from "@/lib/visual-runtime-guards";

const FRAME_INTERVAL_MS = 1000 / 30;
const MAX_PIXEL_RATIO = 1.5;
const ASCII_CHARSET = " .:-=+*#%@";
const ASCII_RESOLUTION = 0.22;
const BASE_ROTATION_X = 0.28;
const ROTATION_Y_SPEED = 0.00005;
const CAMERA_BASE_Z = 5.4;
const CAMERA_ORBIT_X_AMPLITUDE = 0.1;
const CAMERA_ORBIT_Y_AMPLITUDE = 0.06;
const CAMERA_ORBIT_SPEED = 0.00004;

interface AsciiBackgroundThreeProps {
  onUnavailable: () => void;
}

function isPermanentlyEligible(env: AsciiRuntimeEnvironment): boolean {
  return shouldUseThreeAscii({ ...env, isDocumentHidden: false });
}

const CUBE_BASE = 0.38;
const CUBE_GAP = 0.07;
const GRID_SIZE = 9;
const MIN_HEIGHT = 0.2;
const MAX_HEIGHT = 2.0;

function buildingHeight(col: number, row: number, size: number): number {
  const cx = col - (size - 1) / 2;
  const cz = row - (size - 1) / 2;
  const maxDist = (size - 1) / 2;
  const dist = Math.sqrt(cx * cx + cz * cz) / maxDist;

  const base = 1 - dist * 0.7;
  const variation =
    Math.sin(col * 2.3 + row * 1.7) * 0.25 +
    Math.cos(col * 1.1 - row * 2.9) * 0.2;

  const t = Math.max(0, Math.min(1, base + variation));
  return MIN_HEIGHT + t * (MAX_HEIGHT - MIN_HEIGHT);
}

function buildShape(THREE: typeof import("three")) {
  const group = new THREE.Group();
  const geometries: import("three").BufferGeometry[] = [];
  const materials: import("three").MeshStandardMaterial[] = [];

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0,
  });
  materials.push(material);

  const unitGeo = new THREE.BoxGeometry(CUBE_BASE, 1, CUBE_BASE);
  geometries.push(unitGeo);

  const spacing = CUBE_BASE + CUBE_GAP;
  const offset = ((GRID_SIZE - 1) * spacing) / 2;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const h = buildingHeight(col, row, GRID_SIZE);
      const cube = new THREE.Mesh(unitGeo, material);
      cube.scale.y = h;
      cube.position.set(col * spacing - offset, h / 2, row * spacing - offset);
      cube.castShadow = true;
      cube.receiveShadow = true;
      group.add(cube);
    }
  }

  return { group, geometries, materials };
}

export function AsciiBackgroundThree({
  onUnavailable,
}: AsciiBackgroundThreeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    const wrapperCurrent = wrapperRef.current;
    if (!wrapperCurrent) return;
    const wrapperElement: HTMLDivElement = wrapperCurrent;

    const desktopMedia = window.matchMedia("(min-width: 768px)");
    const reducedMotionMedia = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let isDisposed = false;
    let unavailableTriggered = false;
    let animId = 0;
    let isRunning = false;
    let lastFrameTs = 0;
    let hasRenderedFrame = false;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    let renderer: import("three").WebGLRenderer | null = null;
    let scene: import("three").Scene | null = null;
    let camera: import("three").PerspectiveCamera | null = null;
    let shapeGroup: import("three").Group | null = null;
    let shapeGeometries: import("three").BufferGeometry[] = [];
    let shapeMaterials: import("three").MeshStandardMaterial[] = [];
    let effect:
      | import("three/examples/jsm/effects/AsciiEffect.js").AsciiEffect
      | null = null;

    function stopLoop() {
      isRunning = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    }

    function disposeThree() {
      stopLoop();

      if (shapeGroup && scene) {
        scene.remove(shapeGroup);
      }

      for (const m of shapeMaterials) m.dispose();
      for (const g of shapeGeometries) g.dispose();
      renderer?.dispose();
      if (renderer?.forceContextLoss) {
        renderer.forceContextLoss();
      }

      if (effect?.domElement && wrapperElement.contains(effect.domElement)) {
        wrapperElement.removeChild(effect.domElement);
      }

      shapeGroup = null;
      shapeGeometries = [];
      shapeMaterials = [];
      camera = null;
      scene = null;
      effect = null;
      renderer = null;
    }

    function triggerUnavailable() {
      if (unavailableTriggered || isDisposed) return;
      unavailableTriggered = true;
      disposeThree();
      onUnavailableRef.current();
    }

    function resizeRenderer(): boolean {
      if (!renderer || !camera || !effect) return false;

      const width = wrapperElement.clientWidth;
      const height = wrapperElement.clientHeight;
      if (width === 0 || height === 0) {
        return false;
      }

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
      );
      renderer.setSize(width, height, false);
      effect.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      return true;
    }

    function drawFrame(ts: number) {
      if (!effect || !scene || !camera || !shapeGroup) return;

      shapeGroup.rotation.x = BASE_ROTATION_X;
      shapeGroup.rotation.y = ts * ROTATION_Y_SPEED;

      camera.position.x =
        Math.sin(ts * CAMERA_ORBIT_SPEED) * CAMERA_ORBIT_X_AMPLITUDE;
      camera.position.y =
        Math.cos(ts * CAMERA_ORBIT_SPEED * 1.2) * CAMERA_ORBIT_Y_AMPLITUDE;
      camera.position.z = CAMERA_BASE_Z;
      camera.lookAt(0, 0.7, 0);

      effect.render(scene, camera);
      if (!hasRenderedFrame) {
        hasRenderedFrame = true;
        setIsReady(true);
      }
    }

    function frame(ts: number) {
      if (!isRunning || isDisposed || unavailableTriggered) return;
      animId = requestAnimationFrame(frame);
      if (lastFrameTs !== 0 && ts - lastFrameTs < FRAME_INTERVAL_MS) return;
      lastFrameTs = ts;
      drawFrame(ts);
    }

    function startLoop() {
      if (isRunning || isDisposed || unavailableTriggered) return;
      isRunning = true;
      lastFrameTs = 0;
      animId = requestAnimationFrame(frame);
    }

    function onEnvironmentChange() {
      if (isDisposed || unavailableTriggered) return;
      const env = readEnvironment();
      if (!isPermanentlyEligible(env)) {
        triggerUnavailable();
        return;
      }

      if (env.isDocumentHidden) {
        stopLoop();
        return;
      }

      const hasSize = resizeRenderer();
      if (hasSize) {
        startLoop();
      } else {
        stopLoop();
      }
    }

    async function initThree() {
      const env = readEnvironment();
      if (!isPermanentlyEligible(env)) {
        triggerUnavailable();
        return;
      }

      const [THREE, asciiModule] = await Promise.all([
        import("three"),
        import("three/examples/jsm/effects/AsciiEffect.js"),
      ]);
      if (isDisposed || unavailableTriggered) return;

      const latestEnv = readEnvironment();
      if (!isPermanentlyEligible(latestEnv)) {
        triggerUnavailable();
        return;
      }

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.z = CAMERA_BASE_Z;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setClearColor(0x000000, 1);
      renderer.shadowMap.enabled = true;

      effect = new asciiModule.AsciiEffect(renderer, ASCII_CHARSET, {
        invert: true,
        resolution: ASCII_RESOLUTION,
      });

      effect.domElement.style.pointerEvents = "none";
      effect.domElement.style.color = "rgba(162,162,162,0.48)";
      effect.domElement.style.backgroundColor = "transparent";
      effect.domElement.style.fontFamily = '"DM Mono", monospace';
      effect.domElement.style.fontWeight = "300";
      effect.domElement.style.lineHeight = "0.92";
      effect.domElement.style.display = "block";
      effect.domElement.style.width = "100%";
      effect.domElement.style.height = "100%";
      wrapperElement.replaceChildren(effect.domElement);

      const shape = buildShape(THREE);
      shapeGroup = shape.group;
      shapeGeometries = shape.geometries;
      shapeMaterials = shape.materials;
      scene.add(shapeGroup);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
      const topLight = new THREE.DirectionalLight(0xffffff, 1.3);
      topLight.position.set(1, 6, 3);
      topLight.castShadow = true;
      topLight.shadow.mapSize.width = 1024;
      topLight.shadow.mapSize.height = 1024;
      topLight.shadow.camera.near = 0.5;
      topLight.shadow.camera.far = 15;
      topLight.shadow.camera.left = -4;
      topLight.shadow.camera.right = 4;
      topLight.shadow.camera.top = 4;
      topLight.shadow.camera.bottom = -4;
      const sideLight = new THREE.DirectionalLight(0xffffff, 0.5);
      sideLight.position.set(5, 2, 3);
      const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
      backLight.position.set(-3, 1, -2);
      scene.add(ambientLight, topLight, sideLight, backLight);

      const hasSize = resizeRenderer();
      if (!hasSize) {
        // Layout can temporarily report zero size during route transitions.
        // Keep the component alive and let ResizeObserver retry.
        stopLoop();
        return;
      }

      if (!document.hidden) {
        startLoop();
      }
    }

    const ro = new ResizeObserver(() => {
      stopLoop();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isDisposed || unavailableTriggered) return;

        const env = readEnvironment();
        if (!isPermanentlyEligible(env)) {
          triggerUnavailable();
          return;
        }

        const hasSize = resizeRenderer();
        if (hasSize && !env.isDocumentHidden) {
          startLoop();
        }
      }, 200);
    });

    document.fonts.ready.then(() => {
      if (isDisposed || unavailableTriggered) return;
      initThree();
    });

    ro.observe(wrapperElement);
    document.addEventListener("visibilitychange", onEnvironmentChange);
    desktopMedia.addEventListener("change", onEnvironmentChange);
    reducedMotionMedia.addEventListener("change", onEnvironmentChange);

    return () => {
      isDisposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onEnvironmentChange);
      desktopMedia.removeEventListener("change", onEnvironmentChange);
      reducedMotionMedia.removeEventListener("change", onEnvironmentChange);
      ro.disconnect();
      disposeThree();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ease-out"
      style={{
        opacity: isReady ? 1 : 0,
        maskImage:
          "radial-gradient(ellipse 74% 74% at 50% 50%, black 50%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 74% 74% at 50% 50%, black 50%, transparent 100%)",
      }}
    />
  );
}
