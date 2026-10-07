/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NearMissControlPoint } from '../fft/types';

interface NearMissEditorProps {
  preset: string;
  onSelectPreset: (preset: 'FEW_GLIMPSES' | 'SEARCHING' | 'UNSTABLE_LOCK' | 'EVENTUAL_LOCK' | 'NEVER_LOCK') => void;
  controlPoints: NearMissControlPoint[];
  onChangePoints: (points: NearMissControlPoint[]) => void;
}

const PRESET_DEFINITIONS: Record<string, { label: string; points: NearMissControlPoint[] }> = {
  FEW_GLIMPSES: {
    label: 'Few Glimpses',
    points: [
      { t: 0.0, coherence: 0.0 },
      { t: 0.25, coherence: 0.7 },
      { t: 0.35, coherence: 0.1 },
      { t: 0.65, coherence: 0.8 },
      { t: 0.78, coherence: 0.15 },
      { t: 1.0, coherence: 1.0 },
    ],
  },
  SEARCHING: {
    label: 'Searching',
    points: [
      { t: 0.0, coherence: 0.05 },
      { t: 0.15, coherence: 0.35 },
      { t: 0.28, coherence: 0.12 },
      { t: 0.45, coherence: 0.55 },
      { t: 0.6, coherence: 0.25 },
      { t: 0.75, coherence: 0.65 },
      { t: 0.9, coherence: 0.4 },
      { t: 1.0, coherence: 1.0 },
    ],
  },
  UNSTABLE_LOCK: {
    label: 'Unstable Lock',
    points: [
      { t: 0.0, coherence: 0.0 },
      { t: 0.2, coherence: 0.6 },
      { t: 0.4, coherence: 0.85 },
      { t: 0.55, coherence: 0.4 },
      { t: 0.75, coherence: 0.88 },
      { t: 0.88, coherence: 0.5 },
      { t: 1.0, coherence: 0.9 },
    ],
  },
  EVENTUAL_LOCK: {
    label: 'Eventual Lock',
    points: [
      { t: 0.0, coherence: 0.0 },
      { t: 0.12, coherence: 0.28 },
      { t: 0.25, coherence: 0.09 },
      { t: 0.4, coherence: 0.48 },
      { t: 0.55, coherence: 0.22 },
      { t: 0.72, coherence: 0.75 },
      { t: 0.85, coherence: 0.45 },
      { t: 1.0, coherence: 1.0 },
    ],
  },
  NEVER_LOCK: {
    label: 'Never Lock',
    points: [
      { t: 0.0, coherence: 0.0 },
      { t: 0.2, coherence: 0.4 },
      { t: 0.4, coherence: 0.15 },
      { t: 0.6, coherence: 0.55 },
      { t: 0.8, coherence: 0.2 },
      { t: 1.0, coherence: 0.3 },
    ],
  },
};

export const NearMissEditor: React.FC<NearMissEditorProps> = ({
  preset,
  onSelectPreset,
  controlPoints,
  onChangePoints,
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-300">
          Signal Acquisition Trajectory
        </span>
        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {Object.entries(PRESET_DEFINITIONS).map(([key, def]) => (
            <button
              key={key}
              onClick={() => {
                onSelectPreset(key as any);
                onChangePoints(def.points);
              }}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition ${
                preset === key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Curve Preview */}
      <div className="relative h-20 bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Guide gridlines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#27272a" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#27272a" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#27272a" strokeWidth="0.5" />
          
          {/* Path line */}
          <path
            d={controlPoints.reduce((acc, pt, i) => {
              const x = pt.t * 100;
              const y = 100 - pt.coherence * 100;
              return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
            }, '')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
          />

          {/* Points */}
          {controlPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.t * 100}
              cy={100 - pt.coherence * 100}
              r="2.5"
              fill="#fbbf24"
              stroke="#09090b"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Labels */}
        <span className="absolute top-1 left-1.5 text-[9px] font-mono text-zinc-500">100% Lock</span>
        <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-zinc-500">0% Chaos</span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-tight">
        Phase coherence repeatedly waxes and wanes, momentarily resolving recognizable image geometry before dissolving back into spectral noise.
      </p>
    </div>
  );
};
