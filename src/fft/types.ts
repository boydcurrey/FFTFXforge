/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BuildProperty = 'MAGNITUDE' | 'PHASE' | 'COMBINED';

export type MagnitudeOrderMethod =
  | 'RADIAL_LOW_HIGH'
  | 'RADIAL_HIGH_LOW'
  | 'MAGNITUDE_STRONG_WEAK'
  | 'ENERGY_STRONG_WEAK'
  | 'RANDOM'
  | 'ANGULAR_SWEEP'
  | 'RADIAL_BAND_SWEEP'
  | 'ROTATING_APERTURE'
  | 'SPIRAL'
  | 'CHECKER_INTERLEAVED';

export type PhaseInitialState = 'RANDOM_PHASE' | 'ZERO_PHASE' | 'OFFSET_ORIGINAL';

export type PhaseRestorationMethod =
  | 'GLOBAL_COHERENCE'
  | 'RADIAL_LOW_HIGH'
  | 'RADIAL_HIGH_LOW'
  | 'MAGNITUDE_STRONG_WEAK'
  | 'RANDOM_POPULATION'
  | 'ANGULAR_SWEEP'
  | 'RADIAL_BAND_SWEEP'
  | 'ROTATING_APERTURE'
  | 'COHERENCE_PULSE'
  | 'NEAR_MISS'
  | 'MULTIBAND'
  | 'HARMONIC_PENDULUM';

export type CombinedPreset =
  | 'TOGETHER'
  | 'MAGNITUDE_LEADS'
  | 'PHASE_LEADS'
  | 'MAGNITUDE_THEN_PHASE'
  | 'PHASE_THEN_MAGNITUDE'
  | 'CROSSOVER';

export type FrontSoftness = 'HARD' | 'SOFT' | 'VERY_SOFT' | 'CUSTOM';

export type TransitionEdge = 'NONE' | 'LEADING' | 'TRAILING' | 'BOTH';

export type EasingType =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut';

export type SpatialDisplayMode =
  | 'RECONSTRUCTION'
  | 'DIFFERENCE'
  | 'CURRENT_CONTRIBUTION'
  | 'ORIGINAL';

export type CropMode = 'center_crop' | 'fit_padding';

export interface NearMissControlPoint {
  t: number; // 0 to 1
  coherence: number; // 0 to 1
}

export interface RadialBandConfig {
  id: string;
  name: string;
  minRadiusNorm: number; // 0 to 1
  maxRadiusNorm: number; // 0 to 1
  phaseOffset: number; // -pi to pi
  coherenceCurve: EasingType;
  startT: number;
  endT: number;
}

export interface EffectConfig {
  buildProperty: BuildProperty;

  // Progression Bias / Time Skew: -100 to +100 (0 = neutral)
  timeSkew: number;

  // Magnitude settings
  magOrderMethod: MagnitudeOrderMethod;
  bandSweepMode: 'cumulative' | 'band_only';
  bandSweepWidth: number; // in normalized radius [0..1]
  angularStartAngle: number; // radians
  angularSweepClockwise: boolean;
  angularWedgeSoftness: number; // 0 to 1

  // Rotating Angular Aperture settings
  apertureAngle: number; // degrees [1..180], default 30
  apertureRotations: number; // revolutions [0.25..8], default 1.0
  apertureClockwise: boolean;
  apertureTransitionEdge: TransitionEdge; // NONE, LEADING, TRAILING, BOTH
  apertureTransitionAngle: number; // degrees [0..90], default 15
  apertureHoldMode: 'ISOLATE' | 'MODIFY'; // ISOLATE = only aperture contributes, MODIFY = full spectrum with aperture active

  // Spiral settings (enhanced with transition edge and active width)
  spiralRotations: number;
  spiralInward: boolean;
  spiralActiveWidth: number; // normalized width around spiral trajectory [0.02..0.5]
  spiralTransitionEdge: TransitionEdge; // NONE, LEADING, TRAILING, BOTH
  spiralTransitionWidth: number; // normalized transition width [0..0.3]

  // Phase settings
  phaseInitialState: PhaseInitialState;
  phaseInitialOffset: number; // radians
  phaseRestorationMethod: PhaseRestorationMethod;
  phaseOvershoot: number; // 1.0 = 100%, up to 2.0

  // Coherence Pulse settings
  pulsePeakPosition: number; // 0 to 1 (default 0.5)
  pulsePeakWidth: number; // 0.05 to 0.5 (default 0.2)
  pulseEnvelope: 'gaussian' | 'cosine' | 'linear';

  // Near-miss settings
  nearMissPreset: 'FEW_GLIMPSES' | 'SEARCHING' | 'UNSTABLE_LOCK' | 'EVENTUAL_LOCK' | 'NEVER_LOCK' | 'CUSTOM';
  nearMissControlPoints: NearMissControlPoint[];

  // Multiband settings
  multibandPreset: '3_BAND' | '5_BAND' | 'OCTAVE' | 'CUSTOM';
  bands: RadialBandConfig[];

  // Harmonic / Pendulum settings
  harmonicGroups: number; // e.g. 8
  harmonicGrouping: 'radial' | 'angular' | 'magnitude';
  harmonicBaseCycle: number; // frequency cycles
  harmonicRatio: number;

  // Combined settings
  combinedPreset: CombinedPreset;

  // Common transitions & front
  frontSoftness: FrontSoftness;
  customSoftnessWidth: number; // normalized [0.001..0.5]
  easing: EasingType;
  randomSeed: number;

  // Display adjustment
  exposure: number; // 0.5 to 2.0
  contrast: number; // 0.5 to 2.0
}

export interface ImageMetadata {
  name: string;
  originalWidth: number;
  originalHeight: number;
  fftSize: number; // 128, 256, or 512
}

export interface MetricReadout {
  frame: number;
  totalFrames: number;
  progressPercent: number;
  coefficientsRestoredPercent: number;
  spectralEnergyRestoredPercent: number;
  phaseCoherencePercent: number;
  rmsError: number;
}

// Animation Profile Graph Types
export type ProfileViewMode = 'RECONSTRUCTION' | 'DIFFERENCE' | 'TRANSITIONING';

export interface ProfileSeriesToggles {
  coeffs: boolean;
  energy: boolean;
  similarity: boolean;
  transition: boolean;
  phase: boolean;
}

export interface ProfileSamplePoint {
  t: number; // 0.0 to 1.0
  coeffs: number; // 0.0 to 1.0
  energy: number; // 0.0 to 1.0
  similarity: number; // 0.0 to 1.0
  transition: number; // 0.0 to 1.0
  phase: number; // 0.0 to 1.0
}
