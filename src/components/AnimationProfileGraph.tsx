/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  ProfileSamplePoint,
  ProfileViewMode,
  ProfileSeriesToggles,
  BuildProperty,
} from '../fft/types';
import { Activity, Eye } from 'lucide-react';

interface AnimationProfileGraphProps {
  profileData: ProfileSamplePoint[];
  currentT: number;
  onScrubT: (t: number) => void;
  buildProperty: BuildProperty;
  timeSkew: number;
}

export const AnimationProfileGraph: React.FC<AnimationProfileGraphProps> = ({
  profileData,
  currentT,
  onScrubT,
  buildProperty,
  timeSkew,
}) => {
  const [viewMode, setViewMode] = useState<ProfileViewMode>('RECONSTRUCTION');
  const [toggles, setToggles] = useState<ProfileSeriesToggles>(() => {
    if (buildProperty === 'PHASE') {
      return { coeffs: false, energy: true, similarity: true, transition: false, phase: true };
    }
    return { coeffs: true, energy: true, similarity: true, transition: true, phase: false };
  });

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Interpolate current values at currentT
  const currentValues = React.useMemo(() => {
    if (!profileData || profileData.length === 0) {
      return { t: currentT, coeffs: 0, energy: 0, similarity: 0, transition: 0, phase: 0 };
    }
    const idx = Math.max(
      0,
      Math.min(profileData.length - 1, Math.round(currentT * (profileData.length - 1)))
    );
    const pt = profileData[idx];

    if (viewMode === 'DIFFERENCE') {
      return {
        t: currentT,
        coeffs: 1 - pt.coeffs,
        energy: 1 - pt.energy,
        similarity: 1 - pt.similarity, // Difference amount
        transition: pt.transition,
        phase: 1 - pt.phase,
      };
    }
    if (viewMode === 'TRANSITIONING') {
      return {
        t: currentT,
        coeffs: pt.transition,
        energy: pt.transition * pt.energy,
        similarity: pt.similarity,
        transition: pt.transition,
        phase: pt.phase,
      };
    }
    return {
      t: currentT,
      coeffs: pt.coeffs,
      energy: pt.energy,
      similarity: pt.similarity,
      transition: pt.transition,
      phase: pt.phase,
    };
  }, [profileData, currentT, viewMode]);

  // Pointer event handlers for graph scrubbing
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      updateFromPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = graphContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const t = x / rect.width;
    onScrubT(t);
  };

  // SVG path generator
  const createPath = (getter: (p: ProfileSamplePoint) => number) => {
    if (!profileData || profileData.length === 0) return '';
    return profileData.reduce((acc, p, i) => {
      let val = getter(p);
      if (viewMode === 'DIFFERENCE') {
        val = 1 - val;
      } else if (viewMode === 'TRANSITIONING') {
        val = p.transition;
      }
      val = Math.max(0, Math.min(1, val));
      const x = p.t * 100;
      const y = (1 - val) * 100;
      return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  const playheadX = Math.max(0, Math.min(100, currentT * 100));

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-300">
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        {/* Left: Interactive 200px Graph */}
        <div className="flex-1 flex flex-col space-y-1.5 min-w-[220px]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Animation Profile Graph</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              Normalized (0.0 → 1.0)
            </span>
          </div>

          <div
            ref={graphContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none' }}
            className="relative h-36 bg-zinc-900/90 border border-zinc-800 rounded cursor-crosshair select-none overflow-hidden group"
          >
            {/* SVG Plot */}
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Gridlines */}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="25" y1="0" x2="25" y2="100" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="75" y1="0" x2="75" y2="100" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 2" />

              {/* Series Curves */}
              {toggles.coeffs && (
                <path d={createPath((p) => p.coeffs)} fill="none" stroke="#06b6d4" strokeWidth="1.6" />
              )}
              {toggles.energy && (
                <path d={createPath((p) => p.energy)} fill="none" stroke="#10b981" strokeWidth="1.6" />
              )}
              {toggles.similarity && (
                <path d={createPath((p) => p.similarity)} fill="none" stroke="#3b82f6" strokeWidth="1.6" />
              )}
              {toggles.transition && (
                <path d={createPath((p) => p.transition)} fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="3 2" />
              )}
              {toggles.phase && (
                <path d={createPath((p) => p.phase)} fill="none" stroke="#a855f7" strokeWidth="1.6" />
              )}

              {/* Synchronized Vertical Playhead Line */}
              <line
                x1={playheadX}
                y1="0"
                x2={playheadX}
                y2="100"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
            </svg>

            {/* Playhead thumb indicator */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: `calc(${playheadX}% - 1px)` }}
            >
              <div className="w-2 h-2 -ml-0.5 bg-amber-400 rotate-45 border border-zinc-950 shadow" />
            </div>

            {/* Axis labels */}
            <span className="absolute top-1 left-1.5 text-[9px] font-mono text-zinc-600 pointer-events-none">
              1.0
            </span>
            <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-zinc-600 pointer-events-none">
              0.0
            </span>
            <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-zinc-600 pointer-events-none">
              t=1.0
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Tap or scrub graph to seek</span>
            {timeSkew !== 0 && (
              <span className="text-amber-400/90 font-medium">
                Skew: {timeSkew > 0 ? `+${timeSkew}` : timeSkew} (remaps timeline)
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls & Instant Tabular Readout */}
        <div className="w-full md:w-64 flex flex-col justify-between space-y-2 border-t md:border-t-0 md:border-l border-zinc-800/80 pt-2 md:pt-0 md:pl-4 text-xs">
          {/* Profile View Mode */}
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
              Profile Mode
            </span>
            <div className="grid grid-cols-3 gap-1 font-mono text-[11px]">
              {(['RECONSTRUCTION', 'DIFFERENCE', 'TRANSITIONING'] as ProfileViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`py-1 rounded text-center transition truncate ${
                    viewMode === mode
                      ? 'bg-zinc-800 text-amber-300 font-semibold border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={mode}
                >
                  {mode === 'RECONSTRUCTION' ? 'Recon' : mode === 'DIFFERENCE' ? 'Diff' : 'Trans'}
                </button>
              ))}
            </div>
          </div>

          {/* Series Toggles */}
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
              Active Series
            </span>
            <div className="flex flex-wrap gap-1 font-mono text-[11px]">
              <button
                onClick={() => setToggles({ ...toggles, coeffs: !toggles.coeffs })}
                className={`px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  toggles.coeffs
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800 font-medium'
                    : 'bg-zinc-900/40 text-zinc-600 border-zinc-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Coeffs</span>
              </button>
              <button
                onClick={() => setToggles({ ...toggles, energy: !toggles.energy })}
                className={`px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  toggles.energy
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 font-medium'
                    : 'bg-zinc-900/40 text-zinc-600 border-zinc-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Energy</span>
              </button>
              <button
                onClick={() => setToggles({ ...toggles, similarity: !toggles.similarity })}
                className={`px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  toggles.similarity
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800 font-medium'
                    : 'bg-zinc-900/40 text-zinc-600 border-zinc-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Similar</span>
              </button>
              <button
                onClick={() => setToggles({ ...toggles, transition: !toggles.transition })}
                className={`px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  toggles.transition
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800 font-medium'
                    : 'bg-zinc-900/40 text-zinc-600 border-zinc-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Trans</span>
              </button>
              <button
                onClick={() => setToggles({ ...toggles, phase: !toggles.phase })}
                className={`px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  toggles.phase
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800 font-medium'
                    : 'bg-zinc-900/40 text-zinc-600 border-zinc-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Phase</span>
              </button>
            </div>
          </div>

          {/* Current Values Readout at Playhead */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded p-2 space-y-1 font-mono text-[11px] tabular-nums">
            <div className="flex justify-between items-center text-zinc-400">
              <span>t (progress):</span>
              <span className="text-amber-400 font-semibold">{currentValues.t.toFixed(3)}</span>
            </div>
            {toggles.coeffs && (
              <div className="flex justify-between items-center text-cyan-400/90">
                <span>Coeff Pop:</span>
                <span>{currentValues.coeffs.toFixed(3)}</span>
              </div>
            )}
            {toggles.energy && (
              <div className="flex justify-between items-center text-emerald-400/90">
                <span>Energy:</span>
                <span>{currentValues.energy.toFixed(3)}</span>
              </div>
            )}
            {toggles.similarity && (
              <div className="flex justify-between items-center text-blue-400/90">
                <span>Similarity:</span>
                <span>{currentValues.similarity.toFixed(3)}</span>
              </div>
            )}
            {toggles.transition && (
              <div className="flex justify-between items-center text-amber-400/90">
                <span>Activity:</span>
                <span>{currentValues.transition.toFixed(3)}</span>
              </div>
            )}
            {toggles.phase && (
              <div className="flex justify-between items-center text-purple-400/90">
                <span>Phase Lock:</span>
                <span>{currentValues.phase.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
