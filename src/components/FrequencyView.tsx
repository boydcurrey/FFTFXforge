/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { BuildProperty, PhaseRestorationMethod } from '../fft/types';
import { Layers, Crosshair } from 'lucide-react';

interface FrequencyViewProps {
  logMagShifted: Float32Array;
  maxLogMag: number;
  freqOverlayShifted: Uint8Array;
  freqWeightsShifted: Float32Array;
  n: number;
  buildProperty: BuildProperty;
  phaseRestorationMethod: PhaseRestorationMethod;
  phaseCoherencePercent: number;
  frame?: number;
  renderId?: number;
}

export const FrequencyView: React.FC<FrequencyViewProps> = ({
  logMagShifted,
  maxLogMag,
  freqOverlayShifted,
  freqWeightsShifted,
  n,
  buildProperty,
  phaseRestorationMethod,
  phaseCoherencePercent,
  frame,
  renderId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverBin, setHoverBin] = useState<{
    fx: number;
    fy: number;
    rNorm: number;
    angleDeg: number;
    state: string;
  } | null>(null);
  const [showRings, setShowRings] = useState(true);

  const isGlobalPhaseMode =
    buildProperty === 'PHASE' && phaseRestorationMethod === 'GLOBAL_COHERENCE';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== n || canvas.height !== n) {
      canvas.width = n;
      canvas.height = n;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(n, n);
    const data = imgData.data;
    const invMax = maxLogMag > 0 ? 1.0 / maxLogMag : 1;

    for (let i = 0; i < n * n; i++) {
      const magNorm = Math.min(1, logMagShifted[i] * invMax);
      // Spectral base intensity in clean monochrome tone preserving full underlying structure
      const baseGray = Math.round(magNorm * 235);
      const pixelIdx = i * 4;

      const overlay = isGlobalPhaseMode ? 0 : freqOverlayShifted[i];
      const w = freqWeightsShifted ? freqWeightsShifted[i] : 0;

      if (overlay === 2) {
        // Completed/restored: semi-transparent green tint preserving underlying spectrum
        data[pixelIdx] = Math.round(baseGray * 0.65);
        data[pixelIdx + 1] = Math.min(255, Math.round(baseGray * 0.75 + 55));
        data[pixelIdx + 2] = Math.round(baseGray * 0.65);
      } else if (overlay === 1 || (w > 0.01 && overlay !== 2)) {
        // Transitioning: orange opacity strictly corresponds to actual transition weight w
        const orangeAlpha = Math.min(1, Math.max(0, w));
        data[pixelIdx] = Math.min(255, Math.round(baseGray * (1 - 0.25 * orangeAlpha) + 120 * orangeAlpha));
        data[pixelIdx + 1] = Math.min(255, Math.round(baseGray * (1 - 0.35 * orangeAlpha) + 70 * orangeAlpha));
        data[pixelIdx + 2] = Math.round(baseGray * (1 - 0.65 * orangeAlpha) + 10 * orangeAlpha);
      } else {
        // Normal unprocessed spectrum: clean monochrome with subtle cool slate balance
        data[pixelIdx] = Math.round(baseGray * 0.88);
        data[pixelIdx + 1] = Math.round(baseGray * 0.96);
        data[pixelIdx + 2] = Math.round(baseGray * 1.04);
      }
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);

    // Optional ring overlays
    if (showRings) {
      const half = n / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;

      // Crosshair axes through DC
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, n);
      ctx.moveTo(0, half);
      ctx.lineTo(n, half);
      ctx.stroke();

      // Concentric circles at 0.25, 0.50, 0.75 of Nyquist
      const maxR = half;
      [0.25, 0.5, 0.75].forEach((frac) => {
        ctx.beginPath();
        ctx.arc(half, half, maxR * frac, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }
  }, [
    logMagShifted,
    maxLogMag,
    freqOverlayShifted,
    freqWeightsShifted,
    n,
    showRings,
    isGlobalPhaseMode,
    renderId,
    frame,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor((clientX / rect.width) * n);
    const y = Math.floor((clientY / rect.height) * n);

    if (x >= 0 && x < n && y >= 0 && y < n) {
      const half = n / 2;
      const fx = x - half;
      const fy = y - half;
      const r = Math.sqrt(fx * fx + fy * fy);
      const maxR = Math.SQRT2 * half;
      const rNorm = Math.min(1, r / maxR);
      let angleDeg = (Math.atan2(fy, fx) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 180;

      const idx = y * n + x;
      const overlay = freqOverlayShifted[idx];
      const weight = freqWeightsShifted ? freqWeightsShifted[idx] : 0;
      let state = 'Unprocessed';
      if (isGlobalPhaseMode) {
        state = `Global Coherence (${Math.round(phaseCoherencePercent)}%)`;
      } else if (overlay === 2) {
        state = 'Completed';
      } else if (overlay === 1 || weight > 0.01) {
        state = `Transition (${Math.round(weight * 100)}%)`;
      }

      setHoverBin({ fx, fy, rNorm: Math.round(rNorm * 100) / 100, angleDeg: Math.round(angleDeg * 10) / 10, state });
    }
  };

  const handleMouseLeave = () => {
    setHoverBin(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            Fourier Domain <span className="text-zinc-500 font-normal">F(u,v)</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            [log(1 + M)]
          </span>
        </div>

        {/* Legend / Rings toggle */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowRings(!showRings)}
            className={`px-2 py-0.5 rounded border text-[11px] font-mono transition ${
              showRings
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle polar grid / Nyquist rings"
          >
            Grid
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center p-3 bg-zinc-950/60 overflow-hidden min-h-[300px]">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="relative shadow-2xl border border-zinc-800 bg-black flex items-center justify-center max-w-full max-h-full aspect-square">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              imageRendering: 'pixelated',
              width: '100%',
              height: '100%',
              maxWidth: '440px',
              maxHeight: '440px',
            }}
            className="cursor-crosshair block"
          />

          {/* Hover Frequency Inspector */}
          {hoverBin && (
            <div className="absolute bottom-2 left-2 pointer-events-none bg-zinc-950/90 border border-zinc-700/80 px-2 py-1 rounded text-[11px] font-mono text-zinc-300 shadow-lg backdrop-blur-sm tabular-nums">
              <span className="text-zinc-500">freq:</span> ({hoverBin.fx}, {hoverBin.fy}) ·{' '}
              <span className="text-zinc-500">r:</span> {hoverBin.rNorm.toFixed(2)} ·{' '}
              <span className="text-zinc-500">θ:</span> {hoverBin.angleDeg.toFixed(1)}° ·{' '}
              <span
                className={`font-semibold ${
                  hoverBin.state.includes('Completed')
                    ? 'text-emerald-400'
                    : hoverBin.state.includes('Transition')
                    ? 'text-amber-400'
                    : 'text-zinc-400'
                }`}
              >
                {hoverBin.state}
              </span>
            </div>
          )}

          {/* Global Coherence Badge for global mode */}
          {isGlobalPhaseMode && (
            <div className="absolute top-2 left-2 pointer-events-none bg-zinc-950/90 border border-emerald-500/40 px-2 py-1 rounded text-[11px] font-mono text-emerald-300 shadow-lg backdrop-blur-sm flex items-center gap-1.5 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Global Coherence: {Math.round(phaseCoherencePercent)}%</span>
            </div>
          )}
        </div>

        {/* Legend indicator bar */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-zinc-950/90 border border-zinc-800 px-2.5 py-1 rounded text-[11px] font-mono text-zinc-400 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-zinc-600 inline-block" />
            <span>Unprocessed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />
            <span>Transition (gradient)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />
            <span>Restored</span>
          </div>
        </div>
      </div>
    </div>
  );
};
