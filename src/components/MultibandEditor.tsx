/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RadialBandConfig } from '../fft/types';

interface MultibandEditorProps {
  preset: string;
  onSelectPreset: (preset: '3_BAND' | '5_BAND' | 'OCTAVE') => void;
  bands: RadialBandConfig[];
  onChangeBands: (bands: RadialBandConfig[]) => void;
}

export const MultibandEditor: React.FC<MultibandEditorProps> = ({
  preset,
  onSelectPreset,
  bands,
  onChangeBands,
}) => {
  const handlePresetSelect = (p: '3_BAND' | '5_BAND' | 'OCTAVE') => {
    onSelectPreset(p);
    if (p === '3_BAND') {
      onChangeBands([
        {
          id: 'b1',
          name: 'Low Frequencies',
          minRadiusNorm: 0.0,
          maxRadiusNorm: 0.25,
          phaseOffset: 0,
          coherenceCurve: 'smoothstep',
          startT: 0.0,
          endT: 0.45,
        },
        {
          id: 'b2',
          name: 'Mid Frequencies',
          minRadiusNorm: 0.25,
          maxRadiusNorm: 0.6,
          phaseOffset: 0,
          coherenceCurve: 'easeInOut',
          startT: 0.25,
          endT: 0.8,
        },
        {
          id: 'b3',
          name: 'High Frequencies',
          minRadiusNorm: 0.6,
          maxRadiusNorm: 1.0,
          phaseOffset: 0,
          coherenceCurve: 'smootherstep',
          startT: 0.55,
          endT: 1.0,
        },
      ]);
    } else if (p === '5_BAND') {
      onChangeBands([
        { id: 'b1', name: 'Band 1 (Sub-DC)', minRadiusNorm: 0.0, maxRadiusNorm: 0.15, phaseOffset: 0, coherenceCurve: 'smoothstep', startT: 0.0, endT: 0.3 },
        { id: 'b2', name: 'Band 2 (Low)', minRadiusNorm: 0.15, maxRadiusNorm: 0.35, phaseOffset: 0, coherenceCurve: 'smoothstep', startT: 0.15, endT: 0.5 },
        { id: 'b3', name: 'Band 3 (Mid)', minRadiusNorm: 0.35, maxRadiusNorm: 0.6, phaseOffset: 0, coherenceCurve: 'easeInOut', startT: 0.3, endT: 0.7 },
        { id: 'b4', name: 'Band 4 (Mid-High)', minRadiusNorm: 0.6, maxRadiusNorm: 0.8, phaseOffset: 0, coherenceCurve: 'easeInOut', startT: 0.5, endT: 0.88 },
        { id: 'b5', name: 'Band 5 (Nyquist)', minRadiusNorm: 0.8, maxRadiusNorm: 1.0, phaseOffset: 0, coherenceCurve: 'smootherstep', startT: 0.7, endT: 1.0 },
      ]);
    } else {
      // OCTAVE
      onChangeBands([
        { id: 'b1', name: 'Octave 0', minRadiusNorm: 0.0, maxRadiusNorm: 0.125, phaseOffset: 0, coherenceCurve: 'smoothstep', startT: 0.0, endT: 0.35 },
        { id: 'b2', name: 'Octave 1', minRadiusNorm: 0.125, maxRadiusNorm: 0.25, phaseOffset: 0, coherenceCurve: 'smoothstep', startT: 0.2, endT: 0.55 },
        { id: 'b3', name: 'Octave 2', minRadiusNorm: 0.25, maxRadiusNorm: 0.5, phaseOffset: 0, coherenceCurve: 'easeInOut', startT: 0.4, endT: 0.75 },
        { id: 'b4', name: 'Octave 3', minRadiusNorm: 0.5, maxRadiusNorm: 1.0, phaseOffset: 0, coherenceCurve: 'smootherstep', startT: 0.6, endT: 1.0 },
      ]);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-300">
          Multiband Spectral Partitioning
        </span>
        <div className="flex items-center gap-1">
          {(['3_BAND', '5_BAND', 'OCTAVE'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePresetSelect(p)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition ${
                preset === p
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Band timelines */}
      <div className="space-y-1.5 pt-1">
        {bands.map((band, idx) => (
          <div key={band.id} className="flex items-center gap-2 text-[11px] font-mono">
            <span className="w-24 text-zinc-400 truncate text-[10px]">{band.name}</span>
            <div className="relative flex-1 h-3.5 bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/30 border-l border-r border-emerald-400/60"
                style={{
                  left: `${band.startT * 100}%`,
                  width: `${Math.max(2, (band.endT - band.startT) * 100)}%`,
                }}
              />
            </div>
            <span className="text-zinc-500 text-[10px] w-20 text-right">
              t: {band.startT.toFixed(2)}→{band.endT.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
