"use client";

import { useEffect, useRef } from "react";

const PHI = (1 + Math.sqrt(5)) / 2;
const NORM = Math.sqrt(1 + PHI * PHI);

// Icosahedron vertices (normalized to unit radius)
const VERTS: [number, number, number][] = [
  [0, 1, PHI],
  [0, -1, PHI],
  [0, 1, -PHI],
  [0, -1, -PHI],
  [1, PHI, 0],
  [-1, PHI, 0],
  [1, -PHI, 0],
  [-1, -PHI, 0],
  [PHI, 0, 1],
  [-PHI, 0, 1],
  [PHI, 0, -1],
  [-PHI, 0, -1],
].map(
  ([x, y, z]) => [x / NORM, y / NORM, z / NORM] as [number, number, number],
);

// 30 edges of an icosahedron
const EDGES: [number, number][] = [
  [0, 1],
  [0, 4],
  [0, 5],
  [0, 8],
  [0, 9],
  [1, 6],
  [1, 7],
  [1, 8],
  [1, 9],
  [2, 3],
  [2, 4],
  [2, 5],
  [2, 10],
  [2, 11],
  [3, 6],
  [3, 7],
  [3, 10],
  [3, 11],
  [4, 5],
  [4, 8],
  [4, 10],
  [5, 9],
  [5, 11],
  [6, 7],
  [6, 8],
  [6, 10],
  [7, 9],
  [7, 11],
  [8, 10],
  [9, 11],
];

// Extra long diagonals to make the wireframe more readable at a glance.
const CHORDS: [number, number][] = [
  [0, 3],
  [1, 2],
  [4, 7],
  [5, 6],
  [8, 11],
  [9, 10],
];

const CW = 6;
const CH = 10;
const FONT_PX = 10;
const FRAME_INTERVAL_MS = 1000 / 30;
const EDGE_COLOR = "rgba(150,150,150,0.36)";
const VERTEX_COLOR = "rgba(168,168,168,0.44)";
const SHAPE_CHARS = ["#", "%", "X", "+", "*"];
const VERTEX_SPREAD: [number, number][] = [
  [0, 0],
];

type Vec3 = [number, number, number];

function randomFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rotateY([x, y, z]: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - z * s, y, x * s + z * c];
}

function rotateX([x, y, z]: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

interface CellState {
  char: string;
  isVertex: boolean;
}

function rasterLine(
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  cols: number,
  rows: number,
  set: Set<number>,
) {
  if (
    !Number.isFinite(c0) ||
    !Number.isFinite(r0) ||
    !Number.isFinite(c1) ||
    !Number.isFinite(r1)
  ) {
    return;
  }

  const dc = c1 - c0;
  const dr = r1 - r0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dc), Math.abs(dr)) * 1.6));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = Math.round(c0 + dc * t);
    const r = Math.round(r0 + dr * t);
    if (c >= 0 && c < cols && r >= 0 && r < rows) {
      set.add(r * cols + c);
    }
  }
}

export function AsciiBackground() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
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
    let cols = 0;
    let rows = 0;
    let radiusPx = 0;
    let isDisposed = false;
    let prevCells = new Set<number>();
    const cellStates = new Map<number, CellState>();

    function isEnvironmentEnabled() {
      return (
        desktopMedia.matches &&
        !reducedMotionMedia.matches &&
        !document.hidden
      );
    }

    function setup() {
      if (!canvas || !ctx || !wrapper) return;
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;

      if (w === 0 || h === 0) {
        canvas.width = 0;
        canvas.height = 0;
        canvas.style.width = "0px";
        canvas.style.height = "0px";
        cols = 0;
        rows = 0;
        radiusPx = 0;
        prevCells = new Set();
        cellStates.clear();
        return false;
      }

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      cols = Math.ceil(w / CW) + 1;
      rows = Math.ceil(h / CH) + 1;
      radiusPx = Math.min(w, h) * 0.42;
      prevCells = new Set();
      cellStates.clear();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return true;
    }

    function rasterize(aY: number, aX: number) {
      const fov = radiusPx * 3;
      if (!Number.isFinite(fov) || fov <= 0) {
        return { edgeCells: new Set<number>(), vertexCells: new Set<number>() };
      }

      const midC = cols / 2;
      const midR = rows / 2;

      const gridPts = VERTS.map((v) => {
        const scaled: Vec3 = [
          v[0] * radiusPx,
          v[1] * radiusPx,
          v[2] * radiusPx,
        ];
        const r = rotateX(rotateY(scaled, aY), aX);
        const denom = r[2] + fov;
        if (!Number.isFinite(denom) || denom === 0) {
          return [Number.NaN, Number.NaN] as [number, number];
        }
        const scale = fov / denom;
        if (!Number.isFinite(scale)) {
          return [Number.NaN, Number.NaN] as [number, number];
        }
        return [midC + (r[0] * scale) / CW, midR + (r[1] * scale) / CH] as [
          number,
          number,
        ];
      });

      const edgeCells = new Set<number>();
      for (const [i, j] of EDGES) {
        rasterLine(
          gridPts[i][0],
          gridPts[i][1],
          gridPts[j][0],
          gridPts[j][1],
          cols,
          rows,
          edgeCells,
        );
      }

      for (const [i, j] of CHORDS) {
        rasterLine(
          gridPts[i][0],
          gridPts[i][1],
          gridPts[j][0],
          gridPts[j][1],
          cols,
          rows,
          edgeCells,
        );
      }

      const vertexCells = new Set<number>();
      for (const [cf, rf] of gridPts) {
        if (!Number.isFinite(cf) || !Number.isFinite(rf)) continue;
        const c = Math.round(cf);
        const r = Math.round(rf);
        for (const [dc, dr] of VERTEX_SPREAD) {
          const vc = c + dc;
          const vr = r + dr;
          if (vc >= 0 && vc < cols && vr >= 0 && vr < rows) {
            vertexCells.add(vr * cols + vc);
          }
        }
      }

      return { edgeCells, vertexCells };
    }

    function drawFrame(ts: number) {
      if (!ctx || !canvas || cols === 0 || rows === 0 || radiusPx <= 0) return;

      const angleY = ts * 0.00016;
      const angleX = 0.52 + Math.sin(ts * 0.00005) * 0.03;

      const { edgeCells, vertexCells } = rasterize(angleY, angleX);
      const newCells = new Set<number>([...edgeCells, ...vertexCells]);

      ctx.save();
      ctx.scale(dpr, dpr);

      for (const idx of prevCells) {
        if (!newCells.has(idx)) {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          ctx.clearRect(c * CW, r * CH, CW, CH);
          cellStates.delete(idx);
        }
      }

      ctx.font = `300 ${FONT_PX}px "DM Mono", monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      for (const idx of newCells) {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const isVertex = vertexCells.has(idx);
        let state = cellStates.get(idx);
        let shouldDraw = false;

        if (!state) {
          state = {
            char: randomFrom(SHAPE_CHARS),
            isVertex,
          };
          cellStates.set(idx, state);
          shouldDraw = true;
        } else if (state.isVertex !== isVertex) {
          state.isVertex = isVertex;
          shouldDraw = true;
        }

        if (!prevCells.has(idx)) {
          shouldDraw = true;
        }

        if (shouldDraw && state) {
          ctx.clearRect(c * CW, r * CH, CW, CH);
          ctx.fillStyle = isVertex ? VERTEX_COLOR : EDGE_COLOR;
          ctx.fillText(state.char, c * CW + CW / 2, r * CH + CH / 2);
        }
      }

      ctx.restore();
      prevCells = newCells;
    }

    function frame(ts: number) {
      if (!isRunning) return;
      animId = requestAnimationFrame(frame);
      if (lastFrameTs !== 0 && ts - lastFrameTs < FRAME_INTERVAL_MS) return;
      lastFrameTs = ts;
      drawFrame(ts);
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
      const hasSize = cols > 0 && rows > 0 && radiusPx > 0;
      if (isEnvironmentEnabled() && hasSize) {
        startLoop();
      } else {
        stopLoop();
      }
    }

    function onEnvironmentChange() {
      const hasSize = setup() === true;
      if (!hasSize) {
        stopLoop();
        return;
      }
      syncLoopState();
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    document.fonts.ready.then(() => {
      if (isDisposed) return;
      if (setup() === true) {
        syncLoopState();
      }
    });
    const ro = new ResizeObserver(() => {
      stopLoop();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isDisposed) return;
        const hasSize = setup() === true;
        if (hasSize) {
          syncLoopState();
        }
      }, 200);
    });
    ro.observe(wrapper);

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
      ref={wrapperRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage:
          "radial-gradient(ellipse 74% 74% at 50% 50%, black 50%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 74% 74% at 50% 50%, black 50%, transparent 100%)",
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
