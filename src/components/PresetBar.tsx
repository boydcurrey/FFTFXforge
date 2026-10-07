/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PRESETS, applyPreset } from '../fft/presets';
import { EffectConfig } from '../fft/types';
import { Sparkles } from 'lucide-react';

interface PresetBarProps {
  currentConfig: EffectConfig;
  onApplyPreset: (newConfig: EffectConfig, presetId: string) => void;
  activePresetId: string | null;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  currentConfig,
  onApplyPreset,
  activePresetId,
}) => {
  const magnitudePresets = PRESETS.filter((p) => p.category === 'MAGNITUDE');
  const phasePresets = PRESETS.filter((p) => p.category === 'PHASE');
  const combinedPresets = PRESETS.filter((p) => p.category === 'COMBINED');

  const activePreset = PRESETS.find((p) => p.id === activePresetId);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const next = applyPreset(val, currentConfig);
    onApplyPreset(next, val);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Preset Category Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5 text-zinc-400 font-semibold mr-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">Presets:</span>
          </div>

          {/* Magnitude Dropdown */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 shrink-0" />
            <select
              value={activePreset?.category === 'MAGNITUDE' ? activePreset.id : ''}
              onChange={handleSelect}
              className="bg-transparent text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-500">
                Magnitude Preset...
              </option>
              {magnitudePresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phase Dropdown */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 shrink-0" />
            <select
              value={activePreset?.category === 'PHASE' ? activePreset.id : ''}
              onChange={handleSelect}
              className="bg-transparent text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-500">
                Phase Preset...
              </option>
              {phasePresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Combined Dropdown */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 shrink-0" />
            <select
              value={activePreset?.category === 'COMBINED' ? activePreset.id : ''}
              onChange={handleSelect}
              className="bg-transparent text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-500">
                Combined Preset...
              </option>
              {combinedPresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact active preset description */}
        {activePreset && (
          <span className="text-[11px] text-zinc-400 italic truncate max-w-sm hidden xl:inline">
            &ldquo;{activePreset.description}&rdquo;
          </span>
        )}
      </div>
    </div>
  );
};
