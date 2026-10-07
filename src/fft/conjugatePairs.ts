/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mulberry32, seededShuffle } from './prng';

export interface ConjugatePair {
  id: number;
  idxA: number; // Flat index of primary bin
  idxB: number; // Flat index of conjugate bin (idxB === idxA for self-conjugate)
  isSelfConjugate: boolean;
  fx: number; // Centered frequency x in [-N/2, N/2]
  fy: number; // Centered frequency y in [-N/2, N/2]
  radius: number; // Absolute radius in frequency space
  radiusNorm: number; // Radius normalized to [0, 1]
  angle: number; // Orientation in [0, PI)
  magnitude: number; // Original magnitude
  phase: number; // Original phase of bin A
  energy: number; // Total energy for this pair (M^2 * weight)
}

export interface SpectralAnalysis {
  n: number;
  pairs: ConjugatePair[];
  totalEnergy: number;
  totalCoefficients: number; // N * N
  maxMagnitude: number;
  maxLogMag: number;
  logMagShifted: Float32Array; // N*N shifted log magnitude for right-hand canvas
  
  // Pre-sorted pair index arrays
  sortedRadialLowHigh: number[];
  sortedRadialHighLow: number[];
  sortedMagStrongWeak: number[];
  sortedEnergyStrongWeak: number[];
  sortedAngular: number[];
}

/**
 * Builds the complete spectral analysis and conjugate pairs metadata from 2D FFT coefficients
 */
export function buildSpectralAnalysis(
  re: Float32Array,
  im: Float32Array,
  n: number
): SpectralAnalysis {
  const pairs: ConjugatePair[] = [];
  const maxRadius = Math.SQRT2 * (n / 2);
  let totalEnergy = 0;
  let maxMagnitude = 0;

  const halfN = n >> 1;
  let pairId = 0;

  for (let y = 0; y < n; y++) {
    const yConj = (n - y) % n;
    for (let x = 0; x < n; x++) {
      const xConj = (n - x) % n;

      const idxA = y * n + x;
      const idxB = yConj * n + xConj;

      // Only process primary element of each pair to avoid duplicates
      if (idxA > idxB) continue;

      const isSelfConj = idxA === idxB;

      // For self-conjugate bins, force imag = 0 to ensure strict Hermitian validity
      let realVal = re[idxA];
      let imagVal = isSelfConj ? 0 : im[idxA];
      if (isSelfConj) {
        im[idxA] = 0;
      }

      const mag = Math.sqrt(realVal * realVal + imagVal * imagVal);
      if (mag > maxMagnitude) maxMagnitude = mag;

      let ph = Math.atan2(imagVal, realVal);
      if (isSelfConj) {
        ph = realVal >= 0 ? 0 : Math.PI;
      }

      // Centered coordinates
      const fx = x < halfN ? x : x - n;
      const fy = y < halfN ? y : y - n;
      const radius = Math.sqrt(fx * fx + fy * fy);
      const radiusNorm = Math.min(1, radius / maxRadius);

      let angle = Math.atan2(fy, fx);
      if (angle < 0) angle += Math.PI;
      if (angle >= Math.PI) angle -= Math.PI;

      const weight = isSelfConj ? 1 : 2;
      const energy = mag * mag * weight;
      totalEnergy += energy;

      pairs.push({
        id: pairId++,
        idxA,
        idxB,
        isSelfConjugate: isSelfConj,
        fx,
        fy,
        radius,
        radiusNorm,
        angle,
        magnitude: mag,
        phase: ph,
        energy,
      });
    }
  }

  // Generate shifted log magnitude spectrum for frequency domain visualization
  const logMagShifted = new Float32Array(n * n);
  let maxLogMag = 0;

  for (let y = 0; y < n; y++) {
    const yShift = (y + halfN) % n;
    for (let x = 0; x < n; x++) {
      const xShift = (x + halfN) % n;
      const idx = y * n + x;
      const mag = Math.sqrt(re[idx] * re[idx] + im[idx] * im[idx]);
      const logVal = Math.log1p(mag);
      logMagShifted[yShift * n + xShift] = logVal;
      if (logVal > maxLogMag) maxLogMag = logVal;
    }
  }

  // Pre-sort indices for instant playback scrubbing
  const pairIndices = Array.from({ length: pairs.length }, (_, i) => i);

  const sortedRadialLowHigh = [...pairIndices].sort(
    (a, b) => pairs[a].radius - pairs[b].radius
  );

  const sortedRadialHighLow = [...pairIndices].sort(
    (a, b) => pairs[b].radius - pairs[a].radius
  );

  const sortedMagStrongWeak = [...pairIndices].sort(
    (a, b) => pairs[b].magnitude - pairs[a].magnitude
  );

  const sortedEnergyStrongWeak = [...pairIndices].sort(
    (a, b) => pairs[b].energy - pairs[a].energy
  );

  const sortedAngular = [...pairIndices].sort(
    (a, b) => pairs[a].angle - pairs[b].angle
  );

  return {
    n,
    pairs,
    totalEnergy,
    totalCoefficients: n * n,
    maxMagnitude,
    maxLogMag: maxLogMag > 0 ? maxLogMag : 1,
    logMagShifted,
    sortedRadialLowHigh,
    sortedRadialHighLow,
    sortedMagStrongWeak,
    sortedEnergyStrongWeak,
    sortedAngular,
  };
}

/**
 * Creates random conjugate-symmetric phase array for all pairs
 */
export function generateRandomPhaseField(
  pairs: ConjugatePair[],
  seed: number
): Float32Array {
  const prng = mulberry32(seed);
  const phases = new Float32Array(pairs.length);

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.isSelfConjugate) {
      // Self-conjugate bins must have phase 0 or PI
      phases[i] = prng() < 0.5 ? 0 : Math.PI;
    } else {
      // Random phase in [-PI, PI]
      phases[i] = (prng() * 2 - 1) * Math.PI;
    }
  }

  return phases;
}

/**
 * Generates deterministic random ordering of pair indices
 */
export function generateRandomOrder(pairsCount: number, seed: number): number[] {
  const indices = Array.from({ length: pairsCount }, (_, i) => i);
  const prng = mulberry32(seed);
  return seededShuffle(indices, prng);
}
