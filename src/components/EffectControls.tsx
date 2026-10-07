/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EffectConfig,
  BuildProperty,
  MagnitudeOrderMethod,
  PhaseInitialState,
  PhaseRestorationMethod,
  CombinedPreset,
  FrontSoftness,
  EasingType,
  TransitionEdge,
} from '../fft/types';
import { NearMissEditor } from './NearMissEditor';
import { MultibandEditor } from './MultibandEditor';
import { Dna, Shuffle, Waves, Compass, Activity, Sliders, Disc } from 'lucide-react';

interface EffectControlsProps {
  config: EffectConfig;
  onChangeConfig: (newConfig: EffectConfig) => void;
}

export const EffectControls: React.FC<EffectControlsProps> = ({ config, onChangeConfig }) => {
  const update = (partial: Partial<EffectConfig>) => {
    onChangeConfig({ ...config, ...partial });
  };

  const randomizeSeed = () => {
    update({ randomSeed: Math.floor(Math.random() * 100000) });
  };

  // Determine contextual labels for Time Skew
  const isRadialLowHigh =
    (config.buildProperty === 'MAGNITUDE' && config.magOrderMethod === 'RADIAL_LOW_HIGH') ||
    (config.buildProperty === 'PHASE' && config.phaseRestorationMethod === 'RADIAL_LOW_HIGH');

  const skewLeftLabel = isRadialLowHigh ? 'LOW FREQ EMPHASIS' : 'EARLY EMPHASIS';
  const skewRightLabel = isRadialLowHigh ? 'HIGH FREQ EMPHASIS' : 'LATE EMPHASIS';

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4 text-xs text-zinc-300">
      {/* 1. PRIMARY BUILD PROPERTY SELECTOR */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
            Build Property
          </label>
          <span className="text-[11px] text-zinc-500">
            {config.buildProperty === 'MAGNITUDE'
              ? 'Which spectral ingredients have arrived?'
              : config.buildProperty === 'PHASE'
              ? 'Ingredients present. When do they become organised?'
              : 'Independent dual trajectories'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-md">
          {(['MAGNITUDE', 'PHASE', 'COMBINED'] as BuildProperty[]).map((prop) => (
            <button
              key={prop}
              onClick={() => update({ buildProperty: prop })}
              className={`py-2 text-xs font-medium rounded transition flex items-center justify-center gap-1.5 ${
                config.buildProperty === prop
                  ? 'bg-amber-500 text-zinc-950 shadow font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {prop === 'MAGNITUDE' && <Waves className="w-3.5 h-3.5" />}
              {prop === 'PHASE' && <Compass className="w-3.5 h-3.5" />}
              {prop === 'COMBINED' && <Dna className="w-3.5 h-3.5" />}
              <span>{prop === 'COMBINED' ? 'MAGNITUDE + PHASE' : prop}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. PROPERTY SPECIFIC CONTROLS */}
      {/* --- A. MAGNITUDE BUILD CONTROLS --- */}
      {config.buildProperty === 'MAGNITUDE' && (
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">
              Magnitude Order Method
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
            {[
              { id: 'RADIAL_LOW_HIGH', label: 'Radial: Low → High' },
              { id: 'RADIAL_HIGH_LOW', label: 'Radial: High → Low' },
              { id: 'MAGNITUDE_STRONG_WEAK', label: 'Magnitude: Strong → Weak' },
              { id: 'ENERGY_STRONG_WEAK', label: 'Energy: Strong → Weak' },
              { id: 'ROTATING_APERTURE', label: 'Rotating Angular Aperture' },
              { id: 'ANGULAR_SWEEP', label: 'Angular Sector Sweep' },
              { id: 'RADIAL_BAND_SWEEP', label: 'Radial Band Scanner' },
              { id: 'SPIRAL', label: 'Spiral Traversal' },
              { id: 'RANDOM', label: 'Random Deterministic' },
              { id: 'CHECKER_INTERLEAVED', label: 'Interleaved Cells' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => update({ magOrderMethod: m.id as MagnitudeOrderMethod })}
                className={`px-2.5 py-1.5 text-left text-[11px] rounded border transition truncate ${
                  config.magOrderMethod === m.id
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Rotating Angular Aperture Sub-controls */}
          {config.magOrderMethod === 'ROTATING_APERTURE' && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rotating Angular Aperture Parameters</span>
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Dual 180° Conjugate Wedges
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Aperture Angle */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Aperture Angle</span>
                    <span className="font-mono text-zinc-300">{config.apertureAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="180"
                    step="1"
                    value={config.apertureAngle}
                    onChange={(e) => update({ apertureAngle: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                {/* Rotations */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Revolutions</span>
                    <span className="font-mono text-zinc-300">{config.apertureRotations} rev</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="8"
                    step="0.25"
                    value={config.apertureRotations}
                    onChange={(e) => update({ apertureRotations: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                {/* Direction */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Rotation Direction</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[11px]">
                    <button
                      onClick={() => update({ apertureClockwise: true })}
                      className={`flex-1 py-1 rounded transition ${
                        config.apertureClockwise
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Clockwise
                    </button>
                    <button
                      onClick={() => update({ apertureClockwise: false })}
                      className={`flex-1 py-1 rounded transition ${
                        !config.apertureClockwise
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Counter-CW
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                {/* Transition Edge */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Transition Edge</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[10px]">
                    {(['NONE', 'LEADING', 'TRAILING', 'BOTH'] as TransitionEdge[]).map((edge) => (
                      <button
                        key={edge}
                        onClick={() => update({ apertureTransitionEdge: edge })}
                        className={`flex-1 py-1 rounded transition ${
                          config.apertureTransitionEdge === edge
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {edge}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transition Angle */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Transition Angle</span>
                    <span className="font-mono text-zinc-300">{config.apertureTransitionAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={config.apertureTransitionAngle}
                    onChange={(e) => update({ apertureTransitionAngle: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                {/* Hold Mode */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Aperture Mode</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[11px]">
                    <button
                      onClick={() => update({ apertureHoldMode: 'ISOLATE' })}
                      className={`flex-1 py-1 rounded transition ${
                        config.apertureHoldMode === 'ISOLATE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                      title="Only aperture contributes to reconstruction"
                    >
                      Isolate
                    </button>
                    <button
                      onClick={() => update({ apertureHoldMode: 'MODIFY' })}
                      className={`flex-1 py-1 rounded transition ${
                        config.apertureHoldMode === 'MODIFY'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                      title="Full spectrum present, aperture modifies coefficients"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Radial Band Sweep Options */}
          {config.magOrderMethod === 'RADIAL_BAND_SWEEP' && (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Mode:</span>
                <button
                  onClick={() => update({ bandSweepMode: 'band_only' })}
                  className={`px-2 py-0.5 rounded text-xs ${
                    config.bandSweepMode === 'band_only'
                      ? 'bg-zinc-800 text-amber-300 border border-zinc-700'
                      : 'text-zinc-500'
                  }`}
                >
                  Band-Only
                </button>
                <button
                  onClick={() => update({ bandSweepMode: 'cumulative' })}
                  className={`px-2 py-0.5 rounded text-xs ${
                    config.bandSweepMode === 'cumulative'
                      ? 'bg-zinc-800 text-amber-300 border border-zinc-700'
                      : 'text-zinc-500'
                  }`}
                >
                  Cumulative
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <span className="text-zinc-400">Band Width:</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.01"
                  value={config.bandSweepWidth}
                  onChange={(e) => update({ bandSweepWidth: parseFloat(e.target.value) })}
                  className="flex-1 accent-amber-400 h-1 bg-zinc-700 rounded"
                />
                <span className="font-mono text-zinc-400 w-10">
                  {Math.round(config.bandSweepWidth * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Spiral Traversal Options */}
          {config.magOrderMethod === 'SPIRAL' && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Spiral Rotations</span>
                    <span className="font-mono text-zinc-300">{config.spiralRotations}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={config.spiralRotations}
                    onChange={(e) => update({ spiralRotations: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Active Width</span>
                    <span className="font-mono text-zinc-300">{Math.round(config.spiralActiveWidth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.4"
                    step="0.01"
                    value={config.spiralActiveWidth}
                    onChange={(e) => update({ spiralActiveWidth: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Direction</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[11px]">
                    <button
                      onClick={() => update({ spiralInward: false })}
                      className={`flex-1 py-1 rounded transition ${
                        !config.spiralInward
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Outward
                    </button>
                    <button
                      onClick={() => update({ spiralInward: true })}
                      className={`flex-1 py-1 rounded transition ${
                        config.spiralInward
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Inward
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Transition Edge</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[10px]">
                    {(['NONE', 'LEADING', 'TRAILING', 'BOTH'] as TransitionEdge[]).map((edge) => (
                      <button
                        key={edge}
                        onClick={() => update({ spiralTransitionEdge: edge })}
                        className={`flex-1 py-1 rounded transition ${
                          config.spiralTransitionEdge === edge
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {edge}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Transition Width</span>
                    <span className="font-mono text-zinc-300">{Math.round(config.spiralTransitionWidth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.25"
                    step="0.01"
                    value={config.spiralTransitionWidth}
                    onChange={(e) => update({ spiralTransitionWidth: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- B. PHASE BUILD CONTROLS --- */}
      {config.buildProperty === 'PHASE' && (
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-md space-y-3">
          {/* Phase Initial State */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-200">
              Initial Phase State (Magnitude 100% Constant)
            </span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              {(
                [
                  { id: 'RANDOM_PHASE', label: 'Random Phase' },
                  { id: 'ZERO_PHASE', label: 'Zero Phase' },
                  { id: 'OFFSET_ORIGINAL', label: 'Phase Offset' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => update({ phaseInitialState: s.id })}
                  className={`px-2 py-1 rounded transition ${
                    config.phaseInitialState === s.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Phase Restoration Methods */}
          <div>
            <span className="text-xs font-semibold text-zinc-200 block mb-2">
              Phase Restoration Method
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
              {[
                { id: 'GLOBAL_COHERENCE', label: 'Global Coherence' },
                { id: 'RADIAL_LOW_HIGH', label: 'Radial Low → High Lock' },
                { id: 'RADIAL_HIGH_LOW', label: 'Radial High → Low Lock' },
                { id: 'ROTATING_APERTURE', label: 'Rotating Angular Aperture' },
                { id: 'MAGNITUDE_STRONG_WEAK', label: 'Dominant Mag Lock' },
                { id: 'COHERENCE_PULSE', label: 'Coherence Pulse (Signature)' },
                { id: 'NEAR_MISS', label: 'Signal Search (Near-Miss)' },
                { id: 'MULTIBAND', label: 'Multiband Partitioning' },
                { id: 'HARMONIC_PENDULUM', label: 'Harmonic Pendulum' },
                { id: 'ANGULAR_SWEEP', label: 'Angular Sector Lock' },
                { id: 'RADIAL_BAND_SWEEP', label: 'Travelling Lock Annulus' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => update({ phaseRestorationMethod: m.id as PhaseRestorationMethod })}
                  className={`px-2.5 py-1.5 text-left text-[11px] rounded border transition truncate ${
                    config.phaseRestorationMethod === m.id
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotating Aperture controls for Phase */}
          {config.phaseRestorationMethod === 'ROTATING_APERTURE' && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rotating Phase Beam Parameters</span>
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Dual 180° Conjugate Wedges
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Aperture Angle</span>
                    <span className="font-mono text-zinc-300">{config.apertureAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="180"
                    step="1"
                    value={config.apertureAngle}
                    onChange={(e) => update({ apertureAngle: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Revolutions</span>
                    <span className="font-mono text-zinc-300">{config.apertureRotations} rev</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="8"
                    step="0.25"
                    value={config.apertureRotations}
                    onChange={(e) => update({ apertureRotations: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Direction</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[11px]">
                    <button
                      onClick={() => update({ apertureClockwise: true })}
                      className={`flex-1 py-1 rounded transition ${
                        config.apertureClockwise
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Clockwise
                    </button>
                    <button
                      onClick={() => update({ apertureClockwise: false })}
                      className={`flex-1 py-1 rounded transition ${
                        !config.apertureClockwise
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Counter-CW
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Transition Edge</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[10px]">
                    {(['NONE', 'LEADING', 'TRAILING', 'BOTH'] as TransitionEdge[]).map((edge) => (
                      <button
                        key={edge}
                        onClick={() => update({ apertureTransitionEdge: edge })}
                        className={`flex-1 py-1 rounded transition ${
                          config.apertureTransitionEdge === edge
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {edge}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Transition Angle</span>
                    <span className="font-mono text-zinc-300">{config.apertureTransitionAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={config.apertureTransitionAngle}
                    onChange={(e) => update({ apertureTransitionAngle: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Coherence Pulse Sub-controls */}
          {config.phaseRestorationMethod === 'COHERENCE_PULSE' && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-200">Coherence Pulse Envelope</span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Disorder A → Original → Disorder B
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Peak Position</span>
                    <span className="font-mono text-zinc-300">{Math.round(config.pulsePeakPosition * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={config.pulsePeakPosition}
                    onChange={(e) => update({ pulsePeakPosition: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Peak Width</span>
                    <span className="font-mono text-zinc-300">{config.pulsePeakWidth.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.45"
                    step="0.02"
                    value={config.pulsePeakWidth}
                    onChange={(e) => update({ pulsePeakWidth: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Envelope</span>
                    <span className="font-mono text-zinc-300">{config.pulseEnvelope}</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[11px]">
                    {(['gaussian', 'cosine', 'linear'] as const).map((env) => (
                      <button
                        key={env}
                        onClick={() => update({ pulseEnvelope: env })}
                        className={`px-2 py-0.5 rounded transition ${
                          config.pulseEnvelope === env
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Near Miss Editor */}
          {config.phaseRestorationMethod === 'NEAR_MISS' && (
            <NearMissEditor
              preset={config.nearMissPreset}
              onSelectPreset={(p) => update({ nearMissPreset: p })}
              controlPoints={config.nearMissControlPoints}
              onChangePoints={(pts) => update({ nearMissControlPoints: pts })}
            />
          )}

          {/* Multiband Editor */}
          {config.phaseRestorationMethod === 'MULTIBAND' && (
            <MultibandEditor
              preset={config.multibandPreset}
              onSelectPreset={(p) => update({ multibandPreset: p })}
              bands={config.bands}
              onChangeBands={(b) => update({ bands: b })}
            />
          )}

          {/* Harmonic Pendulum Controls */}
          {config.phaseRestorationMethod === 'HARMONIC_PENDULUM' && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-2.5">
              <span className="font-semibold text-zinc-200">Harmonic Oscillations</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Harmonic Groups</span>
                    <span className="font-mono text-zinc-300">{config.harmonicGroups}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="16"
                    step="1"
                    value={config.harmonicGroups}
                    onChange={(e) => update({ harmonicGroups: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Base Cycle Multiplier</span>
                    <span className="font-mono text-zinc-300">{config.harmonicBaseCycle}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={config.harmonicBaseCycle}
                    onChange={(e) => update({ harmonicBaseCycle: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Grouping Domain</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[11px]">
                    {(['radial', 'angular', 'magnitude'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => update({ harmonicGrouping: g })}
                        className={`px-2 py-0.5 rounded transition ${
                          config.harmonicGrouping === g
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phase Overshoot Slider */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Phase Overshoot / Exaggeration:</span>
              <span className="font-mono text-amber-400">{config.phaseOvershoot.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={config.phaseOvershoot}
              onChange={(e) => update({ phaseOvershoot: parseFloat(e.target.value) })}
              className="w-48 accent-amber-400 h-1 bg-zinc-700 rounded"
            />
          </div>
        </div>
      )}

      {/* --- C. COMBINED MAGNITUDE + PHASE CONTROLS --- */}
      {config.buildProperty === 'COMBINED' && (
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-md space-y-3">
          <span className="text-xs font-semibold text-zinc-200">
            Combined Dynamics Presets
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
            {[
              { id: 'TOGETHER', label: 'Together (Synchronous)' },
              { id: 'MAGNITUDE_LEADS', label: 'Magnitude Leads' },
              { id: 'PHASE_LEADS', label: 'Phase Leads' },
              { id: 'MAGNITUDE_THEN_PHASE', label: 'Magnitude Then Phase' },
              { id: 'PHASE_THEN_MAGNITUDE', label: 'Phase Then Magnitude' },
              { id: 'CROSSOVER', label: 'Crossover Flow' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => update({ combinedPreset: p.id as CombinedPreset })}
                className={`px-2.5 py-1.5 text-left text-[11px] rounded border transition truncate ${
                  config.combinedPreset === p.id
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. TIME SKEW / PROGRESSION BIAS CONTROL */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-md space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Progression Bias / Time Skew</span>
          </div>
          <span className="font-mono text-amber-400 tabular-nums">
            {config.timeSkew > 0 ? `+${config.timeSkew}` : config.timeSkew}
          </span>
        </div>

        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={config.timeSkew}
          onChange={(e) => update({ timeSkew: parseInt(e.target.value, 10) })}
          className="w-full accent-amber-400 h-1.5 bg-zinc-700 rounded cursor-pointer"
        />

        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-0.5">
          <span>{skewLeftLabel}</span>
          <span
            onClick={() => update({ timeSkew: 0 })}
            className="cursor-pointer hover:text-zinc-300 transition"
            title="Reset to Neutral (0)"
          >
            NEUTRAL (0)
          </span>
          <span>{skewRightLabel}</span>
        </div>
      </div>

      {/* 4. UNIVERSAL TRANSITION, EASING & SEED CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Front Softness */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-2.5 rounded">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-zinc-400 font-semibold">Transition Front</span>
            <span className="font-mono text-zinc-500 text-[11px]">{config.frontSoftness}</span>
          </div>
          <div className="flex gap-1 font-mono text-[11px]">
            {(['HARD', 'SOFT', 'VERY_SOFT'] as FrontSoftness[]).map((f) => (
              <button
                key={f}
                onClick={() => update({ frontSoftness: f })}
                className={`flex-1 py-1 rounded transition ${
                  config.frontSoftness === f
                    ? 'bg-zinc-800 text-amber-300 border border-zinc-700 font-semibold'
                    : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Easing */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-2.5 rounded">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-zinc-400 font-semibold">Temporal Easing</span>
            <span className="font-mono text-zinc-500 text-[11px]">{config.easing}</span>
          </div>
          <select
            value={config.easing}
            onChange={(e) => update({ easing: e.target.value as EasingType })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded py-1 px-2 text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value="smoothstep">Smoothstep (default)</option>
            <option value="smootherstep">Smootherstep (S-curve)</option>
            <option value="linear">Linear</option>
            <option value="easeIn">Ease In (Accelerate)</option>
            <option value="easeOut">Ease Out (Decelerate)</option>
            <option value="easeInOut">Ease In Out</option>
          </select>
        </div>

        {/* Random Seed */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-2.5 rounded">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-zinc-400 font-semibold">Random Seed</span>
            <span className="font-mono text-zinc-500 text-[11px]">Deterministic PRNG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={config.randomSeed}
              onChange={(e) => update({ randomSeed: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded py-1 px-2 text-zinc-200 font-mono text-xs focus:outline-none tabular-nums"
            />
            <button
              onClick={randomizeSeed}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition font-mono whitespace-nowrap"
              title="Generate new random seed"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
