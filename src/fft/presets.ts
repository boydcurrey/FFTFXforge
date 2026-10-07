/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EffectConfig } from './types';
import { getDefaultEffectConfig } from './engine';

export interface PresetDef {
  id: string;
  name: string;
  category: 'MAGNITUDE' | 'PHASE' | 'COMBINED';
  description: string;
  config: Partial<EffectConfig>;
}

export const PRESETS: PresetDef[] = [
  // --- MAGNITUDE PRESETS ---
  {
    id: 'scale_reveal',
    name: 'Scale Reveal',
    category: 'MAGNITUDE',
    description: 'Radial low -> high: mean field emerges first, followed by broad forms, contours, and fine spatial details.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'RADIAL_LOW_HIGH',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'detail_first_mag',
    name: 'Detail First',
    category: 'MAGNITUDE',
    description: 'Radial high -> low: fine texture/noise-like structure appears first, followed progressively by larger organising forms.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'RADIAL_HIGH_LOW',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'strongest_voices',
    name: 'Strongest Voices',
    category: 'MAGNITUDE',
    description: 'Sorts by coefficient magnitude: dominant Fourier components appear first, showing rapid semantic recognition.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'MAGNITUDE_STRONG_WEAK',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'energy_dominance',
    name: 'Energy Dominance',
    category: 'MAGNITUDE',
    description: 'Order using pair energy (magnitude squared): reveals minimal spectral energy needed for perception.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'ENERGY_STRONG_WEAK',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'orientation_sweep',
    name: 'Orientation Sweep',
    category: 'MAGNITUDE',
    description: 'Conjugate-safe angular sweep: structures associated with specific spatial orientations appear sequentially.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'ANGULAR_SWEEP',
      angularStartAngle: 0,
      angularSweepClockwise: true,
      angularWedgeSoftness: 0.15,
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'band_scanner',
    name: 'Band Scanner (Annulus)',
    category: 'MAGNITUDE',
    description: 'Moving annular active band: reveals structures belonging predominantly to particular spatial scales.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'RADIAL_BAND_SWEEP',
      bandSweepMode: 'band_only',
      bandSweepWidth: 0.18,
      frontSoftness: 'VERY_SOFT',
      easing: 'easeInOut',
    },
  },
  {
    id: 'spiral_traversal',
    name: 'Dispersive Spiral',
    category: 'MAGNITUDE',
    description: 'Simultaneous radial and angular traversal sweeping through frequency space in tight spirals.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'SPIRAL',
      spiralRotations: 4,
      spiralInward: false,
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'stochastic_emergence',
    name: 'Stochastic Emergence',
    category: 'MAGNITUDE',
    description: 'Random deterministic ordering of conjugate pairs: distributed crystalline emergence.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'RANDOM',
      frontSoftness: 'HARD',
      easing: 'linear',
    },
  },
  {
    id: 'spectral_beam',
    name: 'Spectral Beam (Rotating Wedge)',
    category: 'MAGNITUDE',
    description: 'Rotating angular aperture shining like a beacon through frequency space, revealing orientation families.',
    config: {
      buildProperty: 'MAGNITUDE',
      magOrderMethod: 'ROTATING_APERTURE',
      apertureAngle: 25,
      apertureRotations: 1.0,
      apertureClockwise: true,
      apertureTransitionEdge: 'BOTH',
      apertureTransitionAngle: 15,
      apertureHoldMode: 'ISOLATE',
      easing: 'linear',
    },
  },

  // --- PHASE PRESETS ---
  {
    id: 'emergence_global',
    name: 'Global Emergence',
    category: 'PHASE',
    description: 'Random phase -> original: magnitude is 100% constant; spatial organisation condenses simultaneously across the entire spectrum.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'GLOBAL_COHERENCE',
      phaseOvershoot: 1.0,
      easing: 'smoothstep',
    },
  },
  {
    id: 'structure_first_phase',
    name: 'Structure First (Radial Lock)',
    category: 'PHASE',
    description: 'Radial low -> high phase lock: low-frequency structure locks while high frequencies remain present as incoherent speckle.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'RADIAL_LOW_HIGH',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'detail_first_phase',
    name: 'Detail First (High Lock)',
    category: 'PHASE',
    description: 'Radial high -> low phase lock: fine contours and texture lock while broad illumination remains chaotic.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'RADIAL_HIGH_LOW',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'coherence_pulse',
    name: 'Coherence Pulse (Signature)',
    category: 'PHASE',
    description: 'Disorder A -> Original Image -> Disorder B: image condenses from spectral chaos, exists briefly, then dissolves into new chaos.',
    config: {
      buildProperty: 'PHASE',
      phaseRestorationMethod: 'COHERENCE_PULSE',
      pulsePeakPosition: 0.5,
      pulsePeakWidth: 0.22,
      pulseEnvelope: 'gaussian',
      easing: 'smoothstep',
    },
  },
  {
    id: 'signal_search',
    name: 'Signal Search (Near-Miss)',
    category: 'PHASE',
    description: 'Garbled transmission trajectory: coherence repeatedly rises, glimpses recognizable forms, dissolves, and eventually locks.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'NEAR_MISS',
      nearMissPreset: 'EVENTUAL_LOCK',
      nearMissControlPoints: [
        { t: 0.0, coherence: 0.0 },
        { t: 0.12, coherence: 0.28 },
        { t: 0.25, coherence: 0.09 },
        { t: 0.4, coherence: 0.48 },
        { t: 0.55, coherence: 0.22 },
        { t: 0.72, coherence: 0.75 },
        { t: 0.85, coherence: 0.45 },
        { t: 1.0, coherence: 1.0 },
      ],
      easing: 'smoothstep',
    },
  },
  {
    id: 'unstable_transmission',
    name: 'Unstable Interception',
    category: 'PHASE',
    description: 'Phase search trajectory that flutters around 30-70% coherence without ever achieving complete lock.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'NEAR_MISS',
      nearMissPreset: 'UNSTABLE_LOCK',
      nearMissControlPoints: [
        { t: 0.0, coherence: 0.1 },
        { t: 0.2, coherence: 0.65 },
        { t: 0.35, coherence: 0.3 },
        { t: 0.5, coherence: 0.72 },
        { t: 0.68, coherence: 0.4 },
        { t: 0.82, coherence: 0.68 },
        { t: 1.0, coherence: 0.45 },
      ],
      easing: 'smoothstep',
    },
  },
  {
    id: 'ghost_multiband',
    name: 'Ghost Transmission (Multiband)',
    category: 'PHASE',
    description: 'Low frequencies lock early and remain stable; mid frequencies fluctuate; high frequencies converge at the finale.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'MULTIBAND',
      multibandPreset: '3_BAND',
      bands: [
        {
          id: 'low',
          name: 'Low Frequencies',
          minRadiusNorm: 0.0,
          maxRadiusNorm: 0.25,
          phaseOffset: 0,
          coherenceCurve: 'smoothstep',
          startT: 0.0,
          endT: 0.45,
        },
        {
          id: 'mid',
          name: 'Mid Frequencies',
          minRadiusNorm: 0.25,
          maxRadiusNorm: 0.6,
          phaseOffset: 0,
          coherenceCurve: 'easeInOut',
          startT: 0.3,
          endT: 0.85,
        },
        {
          id: 'high',
          name: 'High Frequencies',
          minRadiusNorm: 0.6,
          maxRadiusNorm: 1.0,
          phaseOffset: 0,
          coherenceCurve: 'smootherstep',
          startT: 0.6,
          endT: 1.0,
        },
      ],
    },
  },
  {
    id: 'harmonic_convergence',
    name: 'Harmonic Convergence (Pendulum)',
    category: 'PHASE',
    description: 'Harmonic wave coherence: different spectral groups oscillate at musical frequency ratios, periodically aligning.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'HARMONIC_PENDULUM',
      harmonicGroups: 7,
      harmonicGrouping: 'radial',
      harmonicBaseCycle: 2,
      harmonicRatio: 1.0,
      easing: 'easeInOut',
    },
  },
  {
    id: 'phase_overshoot',
    name: 'Hyper-Phase (160% Overshoot)',
    category: 'PHASE',
    description: 'Trajectory passes directly through the exact image at progress 62% and exaggerates beyond into solarized inversion.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'GLOBAL_COHERENCE',
      phaseOvershoot: 1.6,
      easing: 'linear',
    },
  },
  {
    id: 'phase_beam',
    name: 'Phase Beam (Rotating Wedge)',
    category: 'PHASE',
    description: 'Rotating angular beam restoring spatial phase coherence along rotating orientation slices.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'ROTATING_APERTURE',
      apertureAngle: 30,
      apertureRotations: 1.5,
      apertureClockwise: true,
      apertureTransitionEdge: 'BOTH',
      apertureTransitionAngle: 15,
      apertureHoldMode: 'ISOLATE',
      easing: 'linear',
    },
  },
  {
    id: 'dream_sweep',
    name: 'Dream Sweep (Perceptual Dissolve)',
    category: 'PHASE',
    description: 'Wide rotating wedge with trailing transition zone: orientational structures resolve and dissolve in a dream-like perceptual flow.',
    config: {
      buildProperty: 'PHASE',
      phaseInitialState: 'RANDOM_PHASE',
      phaseRestorationMethod: 'ROTATING_APERTURE',
      apertureAngle: 45,
      apertureRotations: 2.0,
      apertureClockwise: true,
      apertureTransitionEdge: 'TRAILING',
      apertureTransitionAngle: 30,
      apertureHoldMode: 'ISOLATE',
      easing: 'smoothstep',
    },
  },

  // --- COMBINED PRESETS ---
  {
    id: 'assembly_together',
    name: 'Assembly (Symmetric)',
    category: 'COMBINED',
    description: 'Magnitude energy and phase coherence restore synchronously in lockstep.',
    config: {
      buildProperty: 'COMBINED',
      combinedPreset: 'TOGETHER',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'energy_before_order',
    name: 'Energy Before Order',
    category: 'COMBINED',
    description: 'Spectral power arrives early (producing high-energy noise texture), while phase subsequently locks into picture.',
    config: {
      buildProperty: 'COMBINED',
      combinedPreset: 'MAGNITUDE_LEADS',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'order_before_energy',
    name: 'Order Before Energy',
    category: 'COMBINED',
    description: 'Phase organization locks early in faint contrast, after which spectral magnitude amplifies to full saturation.',
    config: {
      buildProperty: 'COMBINED',
      combinedPreset: 'PHASE_LEADS',
      frontSoftness: 'SOFT',
      easing: 'smoothstep',
    },
  },
  {
    id: 'crossover_flow',
    name: 'Crossover Flow',
    category: 'COMBINED',
    description: 'Non-linear crossover between magnitude growth and phase convergence curves.',
    config: {
      buildProperty: 'COMBINED',
      combinedPreset: 'CROSSOVER',
      frontSoftness: 'VERY_SOFT',
      easing: 'easeInOut',
    },
  },
];

export function applyPreset(presetId: string, current: EffectConfig): EffectConfig {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return current;
  return {
    ...current,
    ...preset.config,
  };
}
