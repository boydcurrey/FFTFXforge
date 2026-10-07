/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { SpatialDisplayMode } from '../fft/types';
import { Eye, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

interface SpatialViewProps {
  reconstruction: Float32Array;
  difference: Float32Array;
  currentContribution: Float32Array;
  original: Float32Array;
  n: number;
  displayMode: SpatialDisplayMode;
  onChangeDisplayMode: (mode: SpatialDisplayMode) => void;
  frame?: number;
  renderId?: number;
}

export const SpatialView: React.FC<SpatialViewProps> = ({
  reconstruction,
  difference,
  currentContribution,
  original,
  n,
  displayMode,
  onChangeDisplayMode,
  frame,
  renderId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; val: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  // Render pixels onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== n || canvas.height !== n) {
      canvas.width = n;
      canvas.height = n;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sourceBuffer: Float32Array;
    switch (displayMode) {
      case 'DIFFERENCE':
        sourceBuffer = difference;
        break;
      case 'CURRENT_CONTRIBUTION':
        sourceBuffer = currentContribution;
        break;
      case 'ORIGINAL':
        sourceBuffer = original;
        break;
      case 'RECONSTRUCTION':
      default:
        sourceBuffer = reconstruction;
        break;
    }

    const imgData = ctx.createImageData(n, n);
    const data = imgData.data;

    for (let i = 0; i < n * n; i++) {
      const v = Math.round(sourceBuffer[i] * 255);
      const pixelIdx = i * 4;
      data[pixelIdx] = v;
      data[pixelIdx + 1] = v;
      data[pixelIdx + 2] = v;
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [reconstruction, difference, currentContribution, original, n, displayMode, frame, renderId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor((clientX / rect.width) * n);
    const y = Math.floor((clientY / rect.height) * n);

    if (x >= 0 && x < n && y >= 0 && y < n) {
      const idx = y * n + x;
      let val = reconstruction[idx];
      if (displayMode === 'DIFFERENCE') val = difference[idx];
      else if (displayMode === 'CURRENT_CONTRIBUTION') val = currentContribution[idx];
      else if (displayMode === 'ORIGINAL') val = original[idx];

      setHoverPixel({ x, y, val: Math.round(val * 255) });
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const modes: { id: SpatialDisplayMode; label: string; tooltip: string }[] = [
    { id: 'RECONSTRUCTION', label: 'Reconstruction', tooltip: 'Current IFFT2 result It(x,y)' },
    { id: 'DIFFERENCE', label: 'Difference', tooltip: '|It(x,y) - Iorig(x,y)| error field' },
    { id: 'CURRENT_CONTRIBUTION', label: 'Transitioning', tooltip: 'Spatial structure of active spectral front' },
    { id: 'ORIGINAL', label: 'Original', tooltip: 'Reference ground-truth source image' },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            Spatial Domain <span className="text-zinc-500 font-normal">I(x,y)</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            [{n}×{n}]
          </span>
        </div>

        {/* Display Mode Segmented Control */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-0.5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onChangeDisplayMode(m.id)}
              title={m.tooltip}
              className={`px-2 py-1 text-xs rounded transition ${
                displayMode === m.id
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center p-3 bg-zinc-950/60 overflow-hidden min-h-[300px]">
        {/* Subtle grid background */}
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
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="cursor-crosshair block"
          />

          {/* Hover crosshair HUD */}
          {hoverPixel && (
            <div className="absolute bottom-2 left-2 pointer-events-none bg-zinc-950/90 border border-zinc-700/80 px-2 py-1 rounded text-[11px] font-mono text-zinc-300 shadow-lg backdrop-blur-sm tabular-nums">
              <span className="text-zinc-500">coord:</span> ({hoverPixel.x}, {hoverPixel.y}) ·{' '}
              <span className="text-zinc-500">val:</span>{' '}
              <span className="text-amber-300 font-semibold">{hoverPixel.val}</span>/255
            </div>
          )}
        </div>

        {/* View Zoom controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded p-0.5 backdrop-blur-sm">
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
            className="p-1 text-zinc-400 hover:text-white rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-zinc-400 px-1">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="p-1 text-zinc-400 hover:text-white rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
