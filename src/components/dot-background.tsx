"use client";

import { useEffect, useRef } from "react";

const CW = 14;
const CH = 20;
const FONT_PX = 11;
const FRAME_INTERVAL_MS = 1000 / 30;
const BASE_ALPHA = 0.1;
const TWINKLE_MIN_GAP = 320; // ms
const TWINKLE_MAX_GAP = 760; // ms
const TWINKLE_DURATION_MIN = 1300; // ms
const TWINKLE_DURATION_MAX = 2400; // ms
const TWINKLE_RADIUS_MIN = 24; // px
const TWINKLE_RADIUS_MAX = 52; // px
const TWINKLE_PEAK_MIN = 0.06;
const TWINKLE_PEAK_MAX = 0.24;
const TWINKLE_CLUSTER_SPREAD = 124; // px
const TWINKLE_CLUSTER_NODE_MIN = 3;
const TWINKLE_CLUSTER_NODE_MAX = 9;
const MAX_ACTIVE_CLUSTERS = 6;
const MASK_GRADIENT =
  "radial-gradient(ellipse 90% 80% at 55% 35%, black 10%, transparent 100%)";

interface TwinkleNode {
  x: number;
  y: number;
  radius: number;
  peak: number;
}

interface TwinkleCluster {
  start: number;
  duration: number;
  nodes: TwinkleNode[];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const desktopMedia = window.matchMedia("(min-width: 768px)");
    const reducedMotionMedia = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let animId = 0;
    let isRunning = false;
    let lastFrameTs = 0;
    let fontsReady = false;
    let offscreen: HTMLCanvasElement | null = null;
    let w = 0;
    let h = 0;
    let isDisposed = false;
    let cols = 0;
    let rows = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const clusters: TwinkleCluster[] = [];
    let nextTwinkleTime = 0;

    function isEnvironmentEnabled() {
      return (
        desktopMedia.matches && !reducedMotionMedia.matches && !document.hidden
      );
    }

    function buildOffscreen() {
      if (!canvas) return;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      if (!offscreen) offscreen = document.createElement("canvas");
      offscreen.width = w * dpr;
      offscreen.height = h * dpr;
      const ox = offscreen.getContext("2d");
      if (!ox) return;

      cols = Math.ceil(w / CW) + 1;
      rows = Math.ceil(h / CH) + 1;

      ox.save();
      ox.scale(dpr, dpr);
      ox.font = `300 ${FONT_PX}px "DM Mono", monospace`;
      ox.textBaseline = "middle";
      ox.textAlign = "center";
      ox.fillStyle = "rgb(120,120,120)";

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ox.fillText("\u00B7", c * CW + CW / 2, r * CH + CH / 2);
        }
      }
      ox.restore();
    }

    function spawnCluster(ts: number) {
      if (cols === 0 || rows === 0) return;

      const centerCol = Math.floor(Math.random() * cols);
      const centerRow = Math.floor(Math.random() * rows);
      const centerX = centerCol * CW + CW / 2;
      const centerY = centerRow * CH + CH / 2;
      const nodeCount =
        TWINKLE_CLUSTER_NODE_MIN +
        Math.floor(
          Math.random() *
            (TWINKLE_CLUSTER_NODE_MAX - TWINKLE_CLUSTER_NODE_MIN + 1),
        );

      const nodes: TwinkleNode[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = rand(0, TWINKLE_CLUSTER_SPREAD);
        const x = centerX + Math.cos(angle) * dist;
        const y = centerY + Math.sin(angle) * dist;
        nodes.push({
          x: Math.max(0, Math.min(w, x)) * dpr,
          y: Math.max(0, Math.min(h, y)) * dpr,
          radius: rand(TWINKLE_RADIUS_MIN, TWINKLE_RADIUS_MAX) * dpr,
          peak: rand(TWINKLE_PEAK_MIN, TWINKLE_PEAK_MAX),
        });
      }

      clusters.push({
        start: ts,
        duration: rand(TWINKLE_DURATION_MIN, TWINKLE_DURATION_MAX),
        nodes,
      });
      if (clusters.length > MAX_ACTIVE_CLUSTERS) {
        clusters.shift();
      }
    }

    function frame(ts: number) {
      if (!isRunning) return;
      animId = requestAnimationFrame(frame);
      if (lastFrameTs !== 0 && ts - lastFrameTs < FRAME_INTERVAL_MS) return;
      lastFrameTs = ts;
      if (!ctx || !canvas || !offscreen) return;

      if (ts >= nextTwinkleTime) {
        spawnCluster(ts);
        nextTwinkleTime = ts + rand(TWINKLE_MIN_GAP, TWINKLE_MAX_GAP);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base dots
      ctx.globalAlpha = BASE_ALPHA;
      ctx.drawImage(offscreen, 0, 0);

      for (let i = clusters.length - 1; i >= 0; i--) {
        const cluster = clusters[i];
        const progress = (ts - cluster.start) / cluster.duration;

        if (progress >= 1) {
          clusters.splice(i, 1);
          continue;
        }

        const envelope = Math.sin(progress * Math.PI);
        if (envelope <= 0) continue;

        for (const node of cluster.nodes) {
          const alpha = node.peak * envelope;
          if (alpha <= 0.002) continue;
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.globalAlpha = alpha;
          ctx.drawImage(offscreen, 0, 0);
          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
    }

    function startLoop() {
      if (isRunning) return;
      isRunning = true;
      lastFrameTs = 0;
      animId = requestAnimationFrame(frame);
    }

    function stopLoop() {
      isRunning = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    }

    function syncLoopState() {
      const hasGrid = cols > 0 && rows > 0;
      if (fontsReady && isEnvironmentEnabled() && hasGrid && offscreen) {
        startLoop();
      } else {
        stopLoop();
      }
    }

    function resetTwinkles() {
      clusters.length = 0;
      nextTwinkleTime = performance.now() + rand(220, 560);
    }

    function onEnvironmentChange() {
      if (isDisposed) return;
      if (!isEnvironmentEnabled()) {
        stopLoop();
        return;
      }
      if (!fontsReady) return;
      buildOffscreen();
      resetTwinkles();
      syncLoopState();
    }

    document.fonts.ready.then(() => {
      if (isDisposed) return;
      fontsReady = true;
      buildOffscreen();
      resetTwinkles();
      syncLoopState();
    });

    const ro = new ResizeObserver(() => {
      stopLoop();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isDisposed) return;
        if (!fontsReady) return;
        buildOffscreen();
        resetTwinkles();
        syncLoopState();
      }, 200);
    });
    ro.observe(document.documentElement);
    desktopMedia.addEventListener("change", onEnvironmentChange);
    reducedMotionMedia.addEventListener("change", onEnvironmentChange);
    document.addEventListener("visibilitychange", onEnvironmentChange);

    return () => {
      isDisposed = true;
      stopLoop();
      ro.disconnect();
      desktopMedia.removeEventListener("change", onEnvironmentChange);
      reducedMotionMedia.removeEventListener("change", onEnvironmentChange);
      document.removeEventListener("visibilitychange", onEnvironmentChange);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-1 hidden md:block"
      style={{
        maskImage: MASK_GRADIENT,
        WebkitMaskImage: MASK_GRADIENT,
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
