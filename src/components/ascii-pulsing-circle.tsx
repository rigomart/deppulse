"use client";

import { useEffect, useRef } from "react";

interface AsciiPulsingCircleProps {
  size?: number;
}

const FRAME_INTERVAL_MS = 1000 / 30;
const BEAT_PERIOD = 2400;
const ASCII_CHARSET = " .:-=+*#%@";
const CELL_W = 6;
const CELL_H = 10;

function heartbeatScale(t: number): number {
  const phase = (t % BEAT_PERIOD) / BEAT_PERIOD;
  if (phase > 0.3) return 1;
  // Full sine curve over 30% of cycle — smooth rise and fall, no hard cutoff
  return 1 + 0.05 * Math.sin((phase / 0.3) * Math.PI);
}

function waveIntensity(distNormalized: number, t: number): number {
  const phase = (t % BEAT_PERIOD) / BEAT_PERIOD;
  const wavePos = phase * 1.4;
  const dist = Math.abs(distNormalized - wavePos);
  const width = 0.22;
  const edgeFade = Math.max(0, 1 - wavePos * 0.6);
  return Math.max(0, (1 - dist / width) * edgeFade);
}

function edgeFade(distNorm: number): number {
  if (distNorm < 0.5) return 1;
  const t = (distNorm - 0.5) / 0.5;
  return 1 - t * t;
}

export function AsciiPulsingCircle({ size = 400 }: AsciiPulsingCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    // Offscreen canvas for drawing the dot spiral
    const offscreen = document.createElement("canvas");
    const offW = 200;
    const offH = 200;
    offscreen.width = offW;
    offscreen.height = offH;
    const maybeOffCtx = offscreen.getContext("2d");
    if (!maybeOffCtx) return;
    const offCtx: CanvasRenderingContext2D = maybeOffCtx;

    // ASCII grid dimensions
    const cols = Math.floor(size / CELL_W);
    const rows = Math.floor(size / CELL_H);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cols * CELL_W * dpr;
    canvas.height = rows * CELL_H * dpr;
    ctx.scale(dpr, dpr);

    let animId = 0;
    let lastFrameTs = 0;

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const dotCount = 500;
    const offCx = offW / 2;
    const offCy = offH / 2;
    const offRadius = offW * 0.44;

    function drawDotsToOffscreen(ts: number) {
      offCtx.clearRect(0, 0, offW, offH);
      offCtx.save();

      const scale = heartbeatScale(ts);
      offCtx.translate(offCx, offCy);
      offCtx.scale(scale, scale);
      offCtx.translate(-offCx, -offCy);

      for (let i = 1; i < dotCount; i++) {
        const r = Math.sqrt(i / dotCount) * offRadius * 0.95;
        const theta = i * goldenAngle;
        const x = offCx + r * Math.cos(theta);
        const y = offCy + r * Math.sin(theta);

        const distNorm = r / offRadius;
        const wave = waveIntensity(distNorm, ts);
        const fade = edgeFade(distNorm);
        const brightness = Math.min(
          1,
          ((0.3 + distNorm * 0.4) * fade + wave * 0.5 * fade) * 1.2,
        );
        const dotRadius = (1.2 + distNorm * 2) * (1 + wave * 0.3);
        const gray = Math.floor(brightness * 255);

        offCtx.beginPath();
        offCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
        offCtx.fillStyle = `rgb(${gray},${gray},${gray})`;
        offCtx.fill();
      }

      offCtx.restore();
    }

    function frame(ts: number) {
      animId = requestAnimationFrame(frame);
      if (lastFrameTs !== 0 && ts - lastFrameTs < FRAME_INTERVAL_MS) return;
      lastFrameTs = ts;

      // Draw dots to offscreen
      drawDotsToOffscreen(ts);

      // Sample offscreen and convert to ASCII
      const imageData = offCtx.getImageData(0, 0, offW, offH);
      const pixels = imageData.data;

      ctx.clearRect(0, 0, cols * CELL_W, rows * CELL_H);
      ctx.font = '10px "DM Mono", monospace';
      ctx.textBaseline = "top";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Map ASCII grid cell to offscreen pixel
          const sampleX = Math.floor((col / cols) * offW);
          const sampleY = Math.floor((row / rows) * offH);
          const idx = (sampleY * offW + sampleX) * 4;

          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          if (brightness < 0.01) continue;

          const charIdx = Math.min(
            Math.floor(brightness * ASCII_CHARSET.length),
            ASCII_CHARSET.length - 1,
          );
          const char = ASCII_CHARSET[charIdx];
          if (char === " ") continue;

          const alpha = 0.2 + brightness * 0.5;
          ctx.fillStyle = `rgba(162,162,162,${alpha})`;
          ctx.fillText(char, col * CELL_W, row * CELL_H);
        }
      }
    }

    // Wait for DM Mono to load
    document.fonts.ready.then(() => {
      animId = requestAnimationFrame(frame);
    });

    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: Math.floor(size / CELL_W) * CELL_W,
        height: Math.floor(size / CELL_H) * CELL_H,
      }}
      className="block"
    />
  );
}
