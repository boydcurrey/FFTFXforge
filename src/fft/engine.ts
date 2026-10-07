/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConjugatePair,
  SpectralAnalysis,
  buildSpectralAnalysis,
  generateRandomPhaseField,
  generateRandomOrder,
} from './conjugatePairs';
import { fft2d, ifft2d, getImaginaryResidualMax } from './fft2d';
import { mulberry32 } from './prng';
import {
  EffectConfig,
  EasingType,
  MetricReadout,
  SpatialDisplayMode,
  ProfileSamplePoint,
  TransitionEdge,
} from './types';

export interface FrameResult {
  renderId: number;
  reconstruction: Float32Array; // N*N real spatial image
  difference: Float32Array; // N*N difference image
  currentContribution: Float32Array; // N*N current contribution
  // Frequency overlays: 0 = unvisited, 1 = transitioning, 2 = completed
  // Shifted for N*N display matching logMagShifted
  frequencyOverlayShifted: Uint8Array;
  // Exact transition weight in [0, 1] for smooth orange gradient display
  frequencyWeightsShifted: Float32Array;
  metrics: MetricReadout;
  imaginaryResidualMax: number;
}

export function evaluateEasing(x: number, easing: EasingType): number {
  const t = Math.max(0, Math.min(1, x));
  switch (easing) {
    case 'linear':
      return t;
    case 'smoothstep':
      return t * t * (3 - 2 * t);
    case 'smootherstep':
      return t * t * t * (t * (t * 6 - 15) + 10);
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

/**
 * Progression Bias / Time Skew remapping:
 * Maps t in [0, 1] through monotonic power curve parameterized by skew in [-100, 100].
 * Negative skew: lingers longer at low frequencies / slow start.
 * Positive skew: moves rapidly through low frequencies, lingers at high frequencies.
 */
export function applyTimeSkew(t: number, skew: number): number {
  if (skew === 0 || t <= 0 || t >= 1) return t;
  const s = Math.max(-100, Math.min(100, skew)) / 100;
  // Skew exponent: when s = -1, alpha ~ 4.5; when s = +1, alpha ~ 0.22
  const alpha = Math.exp(-s * 1.5);
  return Math.pow(t, alpha);
}

/**
 * Shortest wrapped angular difference between target phi and initial phi0 in [-PI, PI]
 */
export function shortestAngleDelta(targetPhi: number, initialPhi: number): number {
  let delta = (targetPhi - initialPhi) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Pre-cached engine context that does NOT get reallocated each frame
 */
export class FFTFXEngine {
  public n: number;
  public originalSpatial: Float32Array;
  public originalRealFreq: Float32Array;
  public originalImagFreq: Float32Array;
  public analysis: SpectralAnalysis;

  // Working buffers
  private workReal: Float32Array;
  private workImag: Float32Array;
  private contribReal: Float32Array;
  private contribImag: Float32Array;
  private reconstruction: Float32Array;
  private difference: Float32Array;
  private currentContribSpatial: Float32Array;
  private freqOverlayShifted: Uint8Array;
  private freqWeightsShifted: Float32Array;

  // Cached random phases and orders
  private cachedSeed: number = -1;
  private cachedRandomPhase0: Float32Array | null = null;
  private cachedRandomPhaseA: Float32Array | null = null;
  private cachedRandomPhaseB: Float32Array | null = null;
  private cachedRandomOrder: number[] | null = null;

  constructor(originalSpatial: Float32Array, n: number) {
    this.n = n;
    this.originalSpatial = new Float32Array(originalSpatial);

    this.workReal = new Float32Array(n * n);
    this.workImag = new Float32Array(n * n);
    this.contribReal = new Float32Array(n * n);
    this.contribImag = new Float32Array(n * n);
    this.reconstruction = new Float32Array(n * n);
    this.difference = new Float32Array(n * n);
    this.currentContribSpatial = new Float32Array(n * n);
    this.freqOverlayShifted = new Uint8Array(n * n);
    this.freqWeightsShifted = new Float32Array(n * n);

    // Compute original 2D FFT
    this.originalRealFreq = new Float32Array(originalSpatial);
    this.originalImagFreq = new Float32Array(n * n);
    fft2d(this.originalRealFreq, this.originalImagFreq, n);

    // Build spectral metadata and conjugate pair graph
    this.analysis = buildSpectralAnalysis(this.originalRealFreq, this.originalImagFreq, n);
  }

  public updateSource(originalSpatial: Float32Array, n: number) {
    this.n = n;
    this.originalSpatial = new Float32Array(originalSpatial);
    this.workReal = new Float32Array(n * n);
    this.workImag = new Float32Array(n * n);
    this.contribReal = new Float32Array(n * n);
    this.contribImag = new Float32Array(n * n);
    this.reconstruction = new Float32Array(n * n);
    this.difference = new Float32Array(n * n);
    this.currentContribSpatial = new Float32Array(n * n);
    this.freqOverlayShifted = new Uint8Array(n * n);
    this.freqWeightsShifted = new Float32Array(n * n);

    this.originalRealFreq = new Float32Array(originalSpatial);
    this.originalImagFreq = new Float32Array(n * n);
    fft2d(this.originalRealFreq, this.originalImagFreq, n);

    this.analysis = buildSpectralAnalysis(this.originalRealFreq, this.originalImagFreq, n);
    this.cachedSeed = -1;
  }

  private renderCounter: number = 0;

  private ensureCachedRandoms(seed: number) {
    if (this.cachedSeed === seed && this.cachedRandomPhase0) return;
    this.cachedSeed = seed;
    this.cachedRandomPhase0 = generateRandomPhaseField(this.analysis.pairs, seed);
    this.cachedRandomPhaseA = generateRandomPhaseField(this.analysis.pairs, seed + 101);
    this.cachedRandomPhaseB = generateRandomPhaseField(this.analysis.pairs, seed + 202);
    this.cachedRandomOrder = generateRandomOrder(this.analysis.pairs.length, seed);
  }

  /**
   * Renders a frame at animation progress rawT in [0, 1]
   */
  public renderFrame(
    rawT: number,
    config: EffectConfig,
    currentFrame: number,
    totalFrames: number
  ): FrameResult {
    this.ensureCachedRandoms(config.randomSeed);

    // Apply progression bias / time skew
    const t = applyTimeSkew(rawT, config.timeSkew);

    const n = this.n;
    const pairs = this.analysis.pairs;
    const numPairs = pairs.length;

    // Reset frequency buffers
    this.workReal.fill(0);
    this.workImag.fill(0);
    this.contribReal.fill(0);
    this.contribImag.fill(0);
    this.freqOverlayShifted.fill(0);
    this.freqWeightsShifted.fill(0);

    // Determine transition softness width
    let frontWidth = 0.001; // Hard
    if (config.frontSoftness === 'SOFT') frontWidth = 0.08;
    else if (config.frontSoftness === 'VERY_SOFT') frontWidth = 0.22;
    else if (config.frontSoftness === 'CUSTOM') frontWidth = Math.max(0.001, config.customSoftnessWidth);

    // Ordering map or ranking: assign normalized position rank s in [0, 1] to each pair
    const pairRanks = new Float32Array(numPairs);
    this.calculatePairRanks(config, pairRanks);

    let restoredCoefficientsCount = 0;
    let restoredEnergySum = 0;
    let coherenceSum = 0;

    const halfN = n >> 1;

    // Iterate over all atomic conjugate pairs
    for (let pIdx = 0; pIdx < numPairs; pIdx++) {
      const pair = pairs[pIdx];
      const rank = pairRanks[pIdx];

      // Compute magnitude weight (mWeight in [0, 1]) and phase weight (pWeight in [0, overshoot])
      const { mWeight, pWeight, transitionWeight, isTransitioning, isCompleted } = this.calculateWeights(
        t,
        rank,
        pair,
        config,
        frontWidth
      );

      // 1. Target magnitude
      let finalMag = pair.magnitude;
      if (config.buildProperty === 'MAGNITUDE' || config.buildProperty === 'COMBINED') {
        finalMag = pair.magnitude * mWeight;
      }

      // 2. Target phase
      let finalPhase = pair.phase;
      if (config.buildProperty === 'PHASE' || config.buildProperty === 'COMBINED') {
        const phi0 = this.getInitialPhase(pair, pIdx, config);
        const phiTarget = pair.phase;

        if (config.phaseRestorationMethod === 'COHERENCE_PULSE') {
          // Special trajectory: rhoA -> phiOrig -> rhoB
          finalPhase = this.calculatePulsePhase(t, pair, pIdx, config);
        } else {
          const delta = shortestAngleDelta(phiTarget, phi0);
          finalPhase = phi0 + pWeight * config.phaseOvershoot * delta;
        }

        if (pair.isSelfConjugate) {
          // Self-conjugate bins must have phase 0 or PI
          const cosP = Math.cos(finalPhase);
          finalPhase = cosP >= 0 ? 0 : Math.PI;
        }
      }

      // Store in work frequency buffers maintaining Hermitian symmetry
      const cosVal = Math.cos(finalPhase);
      const sinVal = Math.sin(finalPhase);
      const rVal = finalMag * cosVal;
      const iVal = finalMag * sinVal;

      this.workReal[pair.idxA] = rVal;
      this.workImag[pair.idxA] = iVal;

      if (pair.isSelfConjugate) {
        this.workImag[pair.idxA] = 0;
      } else {
        // Conjugate bin has opposite imaginary part
        this.workReal[pair.idxB] = rVal;
        this.workImag[pair.idxB] = -iVal;
      }

      // Contribution buffer (for CURRENT_CONTRIBUTION mode)
      if (isTransitioning) {
        this.contribReal[pair.idxA] = rVal;
        this.contribImag[pair.idxA] = iVal;
        if (!pair.isSelfConjugate) {
          this.contribReal[pair.idxB] = rVal;
          this.contribImag[pair.idxB] = -iVal;
        }
      }

      // Track metrics
      const coeffWeight = pair.isSelfConjugate ? 1 : 2;
      if (isCompleted || mWeight >= 0.99) {
        restoredCoefficientsCount += coeffWeight;
        restoredEnergySum += pair.energy;
      } else if (isTransitioning) {
        restoredCoefficientsCount += coeffWeight * mWeight;
        restoredEnergySum += pair.energy * (mWeight * mWeight);
      }

      const phaseAlignment = Math.cos(finalPhase - pair.phase);
      coherenceSum += phaseAlignment * coeffWeight;

      // Update frequency overlay display mask & exact transition weight
      const overlayState = isCompleted ? 2 : isTransitioning ? 1 : 0;
      if (overlayState > 0) {
        const yA = Math.floor(pair.idxA / n);
        const xA = pair.idxA % n;
        const yAShift = (yA + halfN) % n;
        const xAShift = (xA + halfN) % n;
        const shiftIdxA = yAShift * n + xAShift;
        this.freqOverlayShifted[shiftIdxA] = overlayState;
        this.freqWeightsShifted[shiftIdxA] = transitionWeight;

        if (!pair.isSelfConjugate) {
          const yB = Math.floor(pair.idxB / n);
          const xB = pair.idxB % n;
          const yBShift = (yB + halfN) % n;
          const xBShift = (xB + halfN) % n;
          const shiftIdxB = yBShift * n + xBShift;
          this.freqOverlayShifted[shiftIdxB] = overlayState;
          this.freqWeightsShifted[shiftIdxB] = transitionWeight;
        }
      }
    }

    // Inverse 2D FFT to spatial domain
    const ifftReal = new Float32Array(this.workReal);
    const ifftImag = new Float32Array(this.workImag);
    ifft2d(ifftReal, ifftImag, n);

    const residualMax = getImaginaryResidualMax(ifftImag);

    // Compute current contribution spatial ifft
    const cIfftReal = new Float32Array(this.contribReal);
    const cIfftImag = new Float32Array(this.contribImag);
    ifft2d(cIfftReal, cIfftImag, n);

    // Display scaling: fixed mapping without frame-by-frame auto-normalization
    let sumSqError = 0;
    const exposure = config.exposure;
    const contrast = config.contrast;

    for (let i = 0; i < n * n; i++) {
      let val = ifftReal[i];

      if (exposure !== 1.0 || contrast !== 1.0) {
        val = 0.5 + (val * exposure - 0.5) * contrast;
      }
      this.reconstruction[i] = Math.max(0, Math.min(1, val));

      // Absolute difference from original
      const orig = this.originalSpatial[i];
      const diff = Math.abs(this.reconstruction[i] - orig);
      this.difference[i] = Math.min(1, diff * 2.5);

      // Contribution centered at 0.5 for bipolar visual inspection
      this.currentContribSpatial[i] = Math.max(0, Math.min(1, 0.5 + cIfftReal[i] * 2.0));

      const err = this.reconstruction[i] - orig;
      sumSqError += err * err;
    }

    const rmsError = Math.sqrt(sumSqError / (n * n));
    const coeffRestoredPercent = Math.min(100, (restoredCoefficientsCount / (n * n)) * 100);
    const energyRestoredPercent =
      this.analysis.totalEnergy > 0
        ? Math.min(100, (restoredEnergySum / this.analysis.totalEnergy) * 100)
        : 100;
    const coherencePercent = Math.max(0, Math.min(100, ((coherenceSum / (n * n) + 1) / 2) * 100));

    return {
      renderId: ++this.renderCounter,
      reconstruction: new Float32Array(this.reconstruction),
      difference: new Float32Array(this.difference),
      currentContribution: new Float32Array(this.currentContribSpatial),
      frequencyOverlayShifted: new Uint8Array(this.freqOverlayShifted),
      frequencyWeightsShifted: new Float32Array(this.freqWeightsShifted),
      metrics: {
        frame: currentFrame,
        totalFrames,
        progressPercent: Math.round(rawT * 100),
        coefficientsRestoredPercent: Math.round(coeffRestoredPercent * 10) / 10,
        spectralEnergyRestoredPercent: Math.round(energyRestoredPercent * 10) / 10,
        phaseCoherencePercent: Math.round(coherencePercent * 10) / 10,
        rmsError: Math.round(rmsError * 1000) / 1000,
      },
      imaginaryResidualMax: residualMax,
    };
  }

  /**
   * Assigns normalized rank s in [0, 1] for each pair according to selected order method
   */
  private calculatePairRanks(config: EffectConfig, ranks: Float32Array): void {
    const pairs = this.analysis.pairs;
    const numPairs = pairs.length;
    const prop = config.buildProperty;

    let orderMethod = config.magOrderMethod;
    if (prop === 'PHASE') {
      switch (config.phaseRestorationMethod) {
        case 'RADIAL_LOW_HIGH':
          orderMethod = 'RADIAL_LOW_HIGH';
          break;
        case 'RADIAL_HIGH_LOW':
          orderMethod = 'RADIAL_HIGH_LOW';
          break;
        case 'MAGNITUDE_STRONG_WEAK':
          orderMethod = 'MAGNITUDE_STRONG_WEAK';
          break;
        case 'RANDOM_POPULATION':
          orderMethod = 'RANDOM';
          break;
        case 'ANGULAR_SWEEP':
          orderMethod = 'ANGULAR_SWEEP';
          break;
        case 'RADIAL_BAND_SWEEP':
          orderMethod = 'RADIAL_BAND_SWEEP';
          break;
        case 'ROTATING_APERTURE':
          orderMethod = 'ROTATING_APERTURE';
          break;
        default:
          break;
      }
    }

    if (orderMethod === 'RADIAL_LOW_HIGH') {
      const sorted = this.analysis.sortedRadialLowHigh;
      for (let i = 0; i < numPairs; i++) ranks[sorted[i]] = i / (numPairs - 1);
    } else if (orderMethod === 'RADIAL_HIGH_LOW') {
      const sorted = this.analysis.sortedRadialHighLow;
      for (let i = 0; i < numPairs; i++) ranks[sorted[i]] = i / (numPairs - 1);
    } else if (orderMethod === 'MAGNITUDE_STRONG_WEAK') {
      const sorted = this.analysis.sortedMagStrongWeak;
      for (let i = 0; i < numPairs; i++) ranks[sorted[i]] = i / (numPairs - 1);
    } else if (orderMethod === 'ENERGY_STRONG_WEAK') {
      const sorted = this.analysis.sortedEnergyStrongWeak;
      for (let i = 0; i < numPairs; i++) ranks[sorted[i]] = i / (numPairs - 1);
    } else if (orderMethod === 'RANDOM') {
      const sorted = this.cachedRandomOrder || this.analysis.sortedRadialLowHigh;
      for (let i = 0; i < numPairs; i++) ranks[sorted[i]] = i / (numPairs - 1);
    } else if (orderMethod === 'ANGULAR_SWEEP') {
      const start = config.angularStartAngle;
      const cw = config.angularSweepClockwise;
      for (let i = 0; i < numPairs; i++) {
        let ang = pairs[i].angle - start;
        if (ang < 0) ang += Math.PI;
        if (ang >= Math.PI) ang -= Math.PI;
        let normAng = ang / Math.PI;
        if (!cw) normAng = 1.0 - normAng;
        ranks[i] = normAng;
      }
    } else if (orderMethod === 'RADIAL_BAND_SWEEP') {
      for (let i = 0; i < numPairs; i++) {
        ranks[i] = pairs[i].radiusNorm;
      }
    } else if (orderMethod === 'SPIRAL') {
      const rot = Math.max(1, config.spiralRotations);
      const inward = config.spiralInward;
      for (let i = 0; i < numPairs; i++) {
        const rNorm = pairs[i].radiusNorm;
        const angNorm = pairs[i].angle / Math.PI;
        let s = (rNorm * rot + angNorm) % 1.0;
        if (inward) s = 1.0 - s;
        ranks[i] = s;
      }
    } else if (orderMethod === 'CHECKER_INTERLEAVED') {
      for (let i = 0; i < numPairs; i++) {
        const fx = Math.abs(pairs[i].fx);
        const fy = Math.abs(pairs[i].fy);
        const cell = (Math.floor(fx / 4) + Math.floor(fy / 4)) % 4;
        const subR = pairs[i].radiusNorm;
        ranks[i] = (cell * 0.25 + subR * 0.25) % 1.0;
      }
    } else if (orderMethod === 'ROTATING_APERTURE') {
      // For rotating aperture, rank is normalized angle in [0, 1]
      for (let i = 0; i < numPairs; i++) {
        ranks[i] = pairs[i].angle / Math.PI;
      }
    }
  }

  /**
   * Computes magnitude and phase weights for a conjugate pair at time t
   */
  private calculateWeights(
    t: number,
    rank: number,
    pair: ConjugatePair,
    config: EffectConfig,
    frontWidth: number
  ): { mWeight: number; pWeight: number; transitionWeight: number; isTransitioning: boolean; isCompleted: boolean } {
    const prop = config.buildProperty;

    // Check if current mode is Rotating Angular Aperture
    const isRotatingAperture =
      (prop === 'MAGNITUDE' && config.magOrderMethod === 'ROTATING_APERTURE') ||
      (prop === 'PHASE' && config.phaseRestorationMethod === 'ROTATING_APERTURE');

    if (isRotatingAperture) {
      return this.calculateRotatingApertureWeights(t, pair, config);
    }

    // Helper for sequential frontier progression
    const getFrontierWeight = (currentTime: number, pairRank: number) => {
      if (currentTime <= 0) return 0;
      if (currentTime >= 1) return 1;

      if (frontWidth <= 0.002) {
        return pairRank <= currentTime ? 1 : 0;
      }

      if (pairRank <= currentTime - frontWidth) return 1;
      if (pairRank >= currentTime) return 0;
      const localP = (currentTime - pairRank) / frontWidth;
      return evaluateEasing(localP, config.easing);
    };

    // 1. PURE MAGNITUDE BUILD
    if (prop === 'MAGNITUDE') {
      if (config.magOrderMethod === 'RADIAL_BAND_SWEEP') {
        const bandCenter = evaluateEasing(t, config.easing);
        const bandHalfWidth = Math.max(0.02, config.bandSweepWidth * 0.5);
        const dist = Math.abs(pair.radiusNorm - bandCenter);

        if (config.bandSweepMode === 'band_only') {
          if (dist > bandHalfWidth) {
            return { mWeight: 0, pWeight: 1, transitionWeight: 0, isTransitioning: false, isCompleted: false };
          }
          const w = 1.0 - dist / bandHalfWidth;
          const eased = evaluateEasing(w, config.easing);
          const isComp = eased >= 0.98;
          return { mWeight: eased, pWeight: 1, transitionWeight: eased, isTransitioning: !isComp, isCompleted: isComp };
        } else {
          // cumulative
          if (pair.radiusNorm <= bandCenter) {
            return { mWeight: 1, pWeight: 1, transitionWeight: 1, isTransitioning: false, isCompleted: true };
          }
          if (pair.radiusNorm <= bandCenter + bandHalfWidth) {
            const w = 1.0 - (pair.radiusNorm - bandCenter) / bandHalfWidth;
            const eased = evaluateEasing(w, config.easing);
            return { mWeight: eased, pWeight: 1, transitionWeight: eased, isTransitioning: true, isCompleted: false };
          }
          return { mWeight: 0, pWeight: 1, transitionWeight: 0, isTransitioning: false, isCompleted: false };
        }
      }

      if (config.magOrderMethod === 'SPIRAL') {
        return this.calculateSpiralWeights(t, pair, config);
      }

      const w = getFrontierWeight(t, rank);
      const isTransitioning = w > 0.001 && w < 0.999;
      const isCompleted = w >= 0.999;
      return { mWeight: w, pWeight: 1, transitionWeight: w, isTransitioning, isCompleted };
    }

    // 2. PURE PHASE BUILD
    if (prop === 'PHASE') {
      const mWeight = 1.0; // MAGNITUDES REMAIN CONSTANT!

      if (config.phaseRestorationMethod === 'GLOBAL_COHERENCE') {
        const easedT = evaluateEasing(t, config.easing);
        const isTransitioning = easedT > 0 && easedT < 1;
        const isCompleted = easedT >= 1;
        return { mWeight, pWeight: easedT, transitionWeight: easedT, isTransitioning, isCompleted };
      }

      if (config.phaseRestorationMethod === 'COHERENCE_PULSE') {
        const peak = config.pulsePeakPosition;
        const width = Math.max(0.05, config.pulsePeakWidth);
        const dist = Math.abs(t - peak);
        let coherence = 0;
        if (config.pulseEnvelope === 'gaussian') {
          coherence = Math.exp(-Math.pow(dist / (width * 0.5), 2));
        } else if (config.pulseEnvelope === 'cosine') {
          if (dist < width) coherence = 0.5 * (1 + Math.cos((Math.PI * dist) / width));
        } else {
          coherence = Math.max(0, 1 - dist / width);
        }
        const isCompleted = coherence > 0.98;
        const isTransitioning = coherence > 0.01 && !isCompleted;
        return { mWeight, pWeight: coherence, transitionWeight: coherence, isTransitioning, isCompleted };
      }

      if (config.phaseRestorationMethod === 'NEAR_MISS') {
        const coherence = this.evaluateNearMissCoherence(t, config);
        const isCompleted = coherence >= 0.98;
        const isTransitioning = coherence > 0.01 && !isCompleted;
        return { mWeight, pWeight: coherence, transitionWeight: coherence, isTransitioning, isCompleted };
      }

      if (config.phaseRestorationMethod === 'MULTIBAND') {
        const { pWeight: bWeight, isTransitioning: bTrans, isCompleted: bComp } =
          this.evaluateMultibandPhase(t, pair, config);
        return { mWeight, pWeight: bWeight, transitionWeight: bWeight, isTransitioning: bTrans, isCompleted: bComp };
      }

      if (config.phaseRestorationMethod === 'HARMONIC_PENDULUM') {
        const { pWeight: hWeight, isTransitioning: hTrans, isCompleted: hComp } =
          this.evaluateHarmonicPhase(t, pair, config);
        return { mWeight, pWeight: hWeight, transitionWeight: hWeight, isTransitioning: hTrans, isCompleted: hComp };
      }

      if (config.phaseRestorationMethod === 'RADIAL_BAND_SWEEP') {
        const bandCenter = evaluateEasing(t, config.easing);
        const bandHalfWidth = Math.max(0.04, config.bandSweepWidth * 0.5);
        const dist = Math.abs(pair.radiusNorm - bandCenter);

        if (dist > bandHalfWidth) {
          return { mWeight, pWeight: 0, transitionWeight: 0, isTransitioning: false, isCompleted: false };
        }
        const w = evaluateEasing(1.0 - dist / bandHalfWidth, config.easing);
        return { mWeight, pWeight: w, transitionWeight: w, isTransitioning: w < 0.99, isCompleted: w >= 0.99 };
      }

      // Sequential phase locks
      const pW = getFrontierWeight(t, rank);
      const isTransitioning = pW > 0.001 && pW < 0.999;
      const isCompleted = pW >= 0.999;
      return { mWeight, pWeight: pW, transitionWeight: pW, isTransitioning, isCompleted };
    }

    // 3. COMBINED MAGNITUDE + PHASE
    let mProgress = t;
    let pProgress = t;

    switch (config.combinedPreset) {
      case 'TOGETHER':
        mProgress = t;
        pProgress = t;
        break;
      case 'MAGNITUDE_LEADS':
        mProgress = Math.min(1, t * 1.6);
        pProgress = Math.max(0, (t - 0.3) / 0.7);
        break;
      case 'PHASE_LEADS':
        pProgress = Math.min(1, t * 1.6);
        mProgress = Math.max(0, (t - 0.3) / 0.7);
        break;
      case 'MAGNITUDE_THEN_PHASE':
        if (t < 0.5) {
          mProgress = t * 2;
          pProgress = 0;
        } else {
          mProgress = 1;
          pProgress = (t - 0.5) * 2;
        }
        break;
      case 'PHASE_THEN_MAGNITUDE':
        if (t < 0.5) {
          pProgress = t * 2;
          mProgress = 0;
        } else {
          pProgress = 1;
          mProgress = (t - 0.5) * 2;
        }
        break;
      case 'CROSSOVER':
        mProgress = evaluateEasing(t, 'smoothstep');
        pProgress = evaluateEasing(t, 'easeInOut');
        break;
    }

    const mW = getFrontierWeight(mProgress, rank);
    const pW = getFrontierWeight(pProgress, rank);
    const isTransitioning = (mW > 0.01 && mW < 0.99) || (pW > 0.01 && pW < 0.99);
    const isCompleted = mW >= 0.99 && pW >= 0.99;
    const transitionWeight = Math.max(mW, pW);

    return { mWeight: mW, pWeight: pW, transitionWeight, isTransitioning, isCompleted };
  }

  /**
   * Non-cumulative Rotating Angular Aperture (Rotating Wedge)
   * Automatically covers conjugate pairs in opposing 180° wedges.
   */
  private calculateRotatingApertureWeights(
    t: number,
    pair: ConjugatePair,
    config: EffectConfig
  ): { mWeight: number; pWeight: number; transitionWeight: number; isTransitioning: boolean; isCompleted: boolean } {
    // Current beam center angle in [0, PI)
    const totalRevs = Math.max(0.1, config.apertureRotations);
    let beamAngle = (t * totalRevs * Math.PI) % Math.PI;
    if (!config.apertureClockwise) {
      beamAngle = (Math.PI - beamAngle) % Math.PI;
    }

    // Pair orientation in [0, PI)
    const pairAngle = pair.angle;

    // Angular distance on circle of circumference PI:
    let angleDiff = pairAngle - beamAngle;
    if (angleDiff > Math.PI * 0.5) angleDiff -= Math.PI;
    if (angleDiff < -Math.PI * 0.5) angleDiff += Math.PI;

    // Signed distance: positive means pair is ahead (leading), negative means pair is behind (trailing)
    // Account for rotation direction:
    const signedDiff = config.apertureClockwise ? angleDiff : -angleDiff;
    const absDiff = Math.abs(signedDiff);

    // Half aperture angle in radians (converted from degrees)
    const halfAperture = ((config.apertureAngle * Math.PI) / 180) * 0.5;
    // Transition angle in radians
    const transAngle = Math.max(0.001, (config.apertureTransitionAngle * Math.PI) / 180);

    let weight = 0;
    let isTransitioning = false;
    let isCompleted = false;

    if (absDiff <= halfAperture) {
      // Fully inside aperture
      weight = 1.0;
      isCompleted = true;
    } else {
      // Check transition zones
      const edge = config.apertureTransitionEdge;
      const isLeading = signedDiff > 0;
      const distFromEdge = absDiff - halfAperture;

      const allowsEdge =
        edge === 'BOTH' ||
        (edge === 'LEADING' && isLeading) ||
        (edge === 'TRAILING' && !isLeading);

      if (allowsEdge && distFromEdge <= transAngle) {
        const rawW = 1.0 - distFromEdge / transAngle;
        weight = evaluateEasing(rawW, config.easing);
        isTransitioning = weight > 0.01;
      }
    }

    // Apply Hold Mode: 'ISOLATE' vs 'MODIFY'
    let mWeight = weight;
    let pWeight = weight;

    if (config.apertureHoldMode === 'MODIFY') {
      // In MODIFY mode: full spectrum present (1.0), but aperture applies transform
      mWeight = 1.0 - weight * 0.85; // Dip/disturbance inside aperture
      pWeight = weight;
    }

    if (config.buildProperty === 'PHASE') {
      mWeight = 1.0; // Phase only: magnitude stays 100% constant
    }

    return {
      mWeight,
      pWeight,
      transitionWeight: weight,
      isTransitioning,
      isCompleted,
    };
  }

  /**
   * Spiral Traversal with transition edges and active width
   */
  private calculateSpiralWeights(
    t: number,
    pair: ConjugatePair,
    config: EffectConfig
  ): { mWeight: number; pWeight: number; transitionWeight: number; isTransitioning: boolean; isCompleted: boolean } {
    const rot = Math.max(1, config.spiralRotations);
    const rNorm = pair.radiusNorm;
    const angNorm = pair.angle / Math.PI;
    let spiralCoord = (rNorm * rot + angNorm) % 1.0;
    if (config.spiralInward) spiralCoord = 1.0 - spiralCoord;

    const currentHead = evaluateEasing(t, config.easing);
    let diff = spiralCoord - currentHead;
    if (diff > 0.5) diff -= 1.0;
    if (diff < -0.5) diff += 1.0;

    const absDiff = Math.abs(diff);
    const halfActive = Math.max(0.01, config.spiralActiveWidth * 0.5);
    const transWidth = Math.max(0.001, config.spiralTransitionWidth);

    let weight = 0;
    let isTransitioning = false;
    let isCompleted = false;

    if (absDiff <= halfActive) {
      weight = 1.0;
      isCompleted = true;
    } else {
      const isLeading = diff > 0;
      const distFromEdge = absDiff - halfActive;
      const edge = config.spiralTransitionEdge;

      const allowsEdge =
        edge === 'BOTH' ||
        (edge === 'LEADING' && isLeading) ||
        (edge === 'TRAILING' && !isLeading);

      if (allowsEdge && distFromEdge <= transWidth) {
        const rawW = 1.0 - distFromEdge / transWidth;
        weight = evaluateEasing(rawW, config.easing);
        isTransitioning = weight > 0.01;
      }
    }

    return {
      mWeight: weight,
      pWeight: 1.0,
      transitionWeight: weight,
      isTransitioning,
      isCompleted,
    };
  }

  private getInitialPhase(pair: ConjugatePair, pairIdx: number, config: EffectConfig): number {
    if (config.phaseInitialState === 'ZERO_PHASE') {
      return 0;
    }
    if (config.phaseInitialState === 'OFFSET_ORIGINAL') {
      return pair.phase + config.phaseInitialOffset;
    }
    if (this.cachedRandomPhase0) {
      return this.cachedRandomPhase0[pairIdx];
    }
    return 0;
  }

  private calculatePulsePhase(
    t: number,
    pair: ConjugatePair,
    pairIdx: number,
    config: EffectConfig
  ): number {
    const rhoA = this.cachedRandomPhaseA ? this.cachedRandomPhaseA[pairIdx] : 0;
    const rhoB = this.cachedRandomPhaseB ? this.cachedRandomPhaseB[pairIdx] : 0;
    const origPhi = pair.phase;
    const peak = config.pulsePeakPosition;

    if (t <= peak) {
      const localT = peak > 0 ? t / peak : 1;
      const easedT = evaluateEasing(localT, config.easing);
      const delta = shortestAngleDelta(origPhi, rhoA);
      return rhoA + easedT * delta;
    } else {
      const span = 1.0 - peak;
      const localT = span > 0 ? (t - peak) / span : 1;
      const easedT = evaluateEasing(localT, config.easing);
      const delta = shortestAngleDelta(rhoB, origPhi);
      return origPhi + easedT * delta;
    }
  }

  private evaluateNearMissCoherence(t: number, config: EffectConfig): number {
    const pts = config.nearMissControlPoints;
    if (!pts || pts.length === 0) return t;

    if (t <= pts[0].t) return pts[0].coherence;
    if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].coherence;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (t >= p1.t && t <= p2.t) {
        const segT = (t - p1.t) / (p2.t - p1.t);
        const easedSeg = evaluateEasing(segT, config.easing);
        return p1.coherence + (p2.coherence - p1.coherence) * easedSeg;
      }
    }
    return t;
  }

  private evaluateMultibandPhase(
    t: number,
    pair: ConjugatePair,
    config: EffectConfig
  ): { pWeight: number; isTransitioning: boolean; isCompleted: boolean } {
    const rNorm = pair.radiusNorm;
    const bands = config.bands;
    if (!bands || bands.length === 0) {
      return { pWeight: t, isTransitioning: t > 0 && t < 1, isCompleted: t >= 1 };
    }

    let matchingBand = bands.find((b) => rNorm >= b.minRadiusNorm && rNorm <= b.maxRadiusNorm);
    if (!matchingBand) {
      matchingBand = bands[bands.length - 1];
    }

    const { startT, endT, coherenceCurve } = matchingBand;
    if (t <= startT) {
      return { pWeight: 0, isTransitioning: false, isCompleted: false };
    }
    if (t >= endT) {
      return { pWeight: 1, isTransitioning: false, isCompleted: true };
    }

    const localT = (t - startT) / (endT - startT);
    const eased = evaluateEasing(localT, coherenceCurve);
    return { pWeight: eased, isTransitioning: true, isCompleted: false };
  }

  private evaluateHarmonicPhase(
    t: number,
    pair: ConjugatePair,
    config: EffectConfig
  ): { pWeight: number; isTransitioning: boolean; isCompleted: boolean } {
    const numGroups = Math.max(2, config.harmonicGroups);
    let groupIdx = 0;

    if (config.harmonicGrouping === 'radial') {
      groupIdx = Math.min(numGroups - 1, Math.floor(pair.radiusNorm * numGroups));
    } else if (config.harmonicGrouping === 'angular') {
      groupIdx = Math.min(numGroups - 1, Math.floor((pair.angle / Math.PI) * numGroups));
    } else {
      groupIdx = Math.min(numGroups - 1, Math.floor((pair.magnitude / this.analysis.maxMagnitude) * numGroups));
    }

    const freq = config.harmonicBaseCycle + groupIdx * config.harmonicRatio;
    const wave = 0.5 * (1 + Math.cos(2 * Math.PI * freq * (1 - t)));
    const pWeight = evaluateEasing(wave, config.easing);

    return {
      pWeight,
      isTransitioning: pWeight > 0.05 && pWeight < 0.95,
      isCompleted: pWeight >= 0.95,
    };
  }

  /**
   * Computes pre-sampled animation profile points for the Animation Profile Graph.
   * Samples across t in [0, 1] without running full spatial IFFT for high speed.
   */
  public computeAnimationProfile(config: EffectConfig, sampleCount = 60): ProfileSamplePoint[] {
    this.ensureCachedRandoms(config.randomSeed);

    const points: ProfileSamplePoint[] = [];
    const pairs = this.analysis.pairs;
    const numPairs = pairs.length;
    const totalEnergy = this.analysis.totalEnergy || 1;
    const totalBins = this.analysis.totalCoefficients;

    // Precalculate rankings
    const pairRanks = new Float32Array(numPairs);
    this.calculatePairRanks(config, pairRanks);

    let frontWidth = 0.001;
    if (config.frontSoftness === 'SOFT') frontWidth = 0.08;
    else if (config.frontSoftness === 'VERY_SOFT') frontWidth = 0.22;
    else if (config.frontSoftness === 'CUSTOM') frontWidth = Math.max(0.001, config.customSoftnessWidth);

    // Subsample pairs for instant profile calculation (< 1ms)
    const stride = Math.max(1, Math.floor(numPairs / 800));

    for (let s = 0; s <= sampleCount; s++) {
      const rawT = s / sampleCount;
      const t = applyTimeSkew(rawT, config.timeSkew);

      let sampleCoeffCount = 0;
      let sampleEnergySum = 0;
      let sampleTotalEnergy = 0;
      let sampleTotalBins = 0;
      let sampleTransitionCount = 0;
      let samplePhaseCoherenceSum = 0;

      for (let p = 0; p < numPairs; p += stride) {
        const pair = pairs[p];
        const rank = pairRanks[p];
        const weightInfo = this.calculateWeights(t, rank, pair, config, frontWidth);
        const coeffWeight = pair.isSelfConjugate ? 1 : 2;

        sampleTotalBins += coeffWeight;
        sampleTotalEnergy += pair.energy;

        if (weightInfo.isCompleted || weightInfo.mWeight >= 0.98) {
          sampleCoeffCount += coeffWeight;
          sampleEnergySum += pair.energy;
        } else if (weightInfo.isTransitioning || weightInfo.mWeight > 0.01) {
          sampleCoeffCount += coeffWeight * weightInfo.mWeight;
          sampleEnergySum += pair.energy * (weightInfo.mWeight * weightInfo.mWeight);
          sampleTransitionCount += coeffWeight * weightInfo.transitionWeight;
        }

        // Phase coherence estimate
        let ph = pair.phase;
        if (config.buildProperty === 'PHASE' || config.buildProperty === 'COMBINED') {
          const phi0 = this.getInitialPhase(pair, p, config);
          const delta = shortestAngleDelta(pair.phase, phi0);
          ph = phi0 + weightInfo.pWeight * config.phaseOvershoot * delta;
        }
        const align = Math.cos(ph - pair.phase);
        samplePhaseCoherenceSum += align * coeffWeight;
      }

      const coeffsNorm = sampleTotalBins > 0 ? Math.min(1, sampleCoeffCount / sampleTotalBins) : 0;
      const energyNorm = sampleTotalEnergy > 0 ? Math.min(1, sampleEnergySum / sampleTotalEnergy) : 0;
      const transNorm = sampleTotalBins > 0 ? Math.min(1, sampleTransitionCount / (sampleTotalBins * 0.4)) : 0;
      const phaseNorm = sampleTotalBins > 0 ? Math.max(0, Math.min(1, (samplePhaseCoherenceSum / sampleTotalBins + 1) * 0.5)) : 0;
      const simNorm = Math.min(1, energyNorm * 0.5 + phaseNorm * 0.5);

      points.push({
        t: rawT,
        coeffs: coeffsNorm,
        energy: energyNorm,
        similarity: simNorm,
        transition: transNorm,
        phase: phaseNorm,
      });
    }

    return points;
  }
}

/**
 * Creates default initial EffectConfig
 */
export function getDefaultEffectConfig(): EffectConfig {
  return {
    buildProperty: 'MAGNITUDE',
    timeSkew: 0,

    magOrderMethod: 'RADIAL_LOW_HIGH',
    bandSweepMode: 'cumulative',
    bandSweepWidth: 0.15,
    angularStartAngle: 0,
    angularSweepClockwise: true,
    angularWedgeSoftness: 0.1,

    // Rotating Angular Aperture defaults
    apertureAngle: 30,
    apertureRotations: 1.0,
    apertureClockwise: true,
    apertureTransitionEdge: 'BOTH',
    apertureTransitionAngle: 15,
    apertureHoldMode: 'ISOLATE',

    // Spiral defaults
    spiralRotations: 3,
    spiralInward: false,
    spiralActiveWidth: 0.12,
    spiralTransitionEdge: 'BOTH',
    spiralTransitionWidth: 0.08,

    phaseInitialState: 'RANDOM_PHASE',
    phaseInitialOffset: Math.PI / 4,
    phaseRestorationMethod: 'GLOBAL_COHERENCE',
    phaseOvershoot: 1.0,

    pulsePeakPosition: 0.5,
    pulsePeakWidth: 0.2,
    pulseEnvelope: 'gaussian',

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

    multibandPreset: '3_BAND',
    bands: [
      {
        id: 'low',
        name: 'Low Frequencies (0 - 0.20)',
        minRadiusNorm: 0.0,
        maxRadiusNorm: 0.2,
        phaseOffset: 0,
        coherenceCurve: 'smoothstep',
        startT: 0.0,
        endT: 0.4,
      },
      {
        id: 'mid',
        name: 'Mid Frequencies (0.20 - 0.55)',
        minRadiusNorm: 0.2,
        maxRadiusNorm: 0.55,
        phaseOffset: 0,
        coherenceCurve: 'easeInOut',
        startT: 0.2,
        endT: 0.8,
      },
      {
        id: 'high',
        name: 'High Frequencies (0.55 - 1.0)',
        minRadiusNorm: 0.55,
        maxRadiusNorm: 1.0,
        phaseOffset: 0,
        coherenceCurve: 'smootherstep',
        startT: 0.5,
        endT: 1.0,
      },
    ],

    harmonicGroups: 6,
    harmonicGrouping: 'radial',
    harmonicBaseCycle: 2,
    harmonicRatio: 1.0,

    combinedPreset: 'TOGETHER',

    frontSoftness: 'SOFT',
    customSoftnessWidth: 0.1,
    easing: 'smoothstep',
    randomSeed: 1337,

    exposure: 1.0,
    contrast: 1.0,
  };
}
