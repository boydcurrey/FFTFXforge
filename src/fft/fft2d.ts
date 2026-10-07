/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Precomputed bit-reversal and twiddle tables cache for power-of-two sizes (128, 256)
interface TwiddleCache {
  bitRev: Uint32Array;
  cosTable: Float32Array;
  sinTable: Float32Array;
}

const twiddleCacheMap = new Map<number, TwiddleCache>();

function getTwiddleCache(n: number): TwiddleCache {
  let cache = twiddleCacheMap.get(n);
  if (cache) return cache;

  const bitRev = new Uint32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    bitRev[i] = j;
    let bit = n >> 1;
    while (bit > 0 && (j & bit) !== 0) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
  }

  // Twiddle factors: angle = -2 * PI * k / n
  const cosTable = new Float32Array(n / 2);
  const sinTable = new Float32Array(n / 2);
  for (let k = 0; k < n / 2; k++) {
    const angle = (-2 * Math.PI * k) / n;
    cosTable[k] = Math.cos(angle);
    sinTable[k] = Math.sin(angle);
  }

  cache = { bitRev, cosTable, sinTable };
  twiddleCacheMap.set(n, cache);
  return cache;
}

/**
 * 1D Radix-2 Decimation-in-Time FFT
 * @param re Real component array
 * @param im Imaginary component array
 * @param n Length of transform (must be power of 2)
 * @param stride Stride between elements in re and im
 * @param offset Start offset in re and im
 * @param inverse True for inverse FFT
 */
export function fft1d(
  re: Float32Array,
  im: Float32Array,
  n: number,
  stride = 1,
  offset = 0,
  inverse = false
): void {
  const cache = getTwiddleCache(n);
  const bitRev = cache.bitRev;

  // Bit reversal permutation
  for (let i = 0; i < n; i++) {
    const j = bitRev[i];
    if (j > i) {
      const idxI = offset + i * stride;
      const idxJ = offset + j * stride;
      const tmpR = re[idxI];
      re[idxI] = re[idxJ];
      re[idxJ] = tmpR;
      const tmpI = im[idxI];
      im[idxI] = im[idxJ];
      im[idxJ] = tmpI;
    }
  }

  // Butterfly passes
  const sign = inverse ? -1 : 1;
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const tableStep = n / len;

    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < halfLen; k++) {
        const tableIdx = k * tableStep;
        const wReal = cache.cosTable[tableIdx];
        const wImag = sign * cache.sinTable[tableIdx];

        const idxEven = offset + (i + k) * stride;
        const idxOdd = offset + (i + k + halfLen) * stride;

        const uReal = re[idxEven];
        const uImag = im[idxEven];
        const vReal = re[idxOdd];
        const vImag = im[idxOdd];

        // Complex multiplication: (vReal + i*vImag) * (wReal + i*wImag)
        const vTwiddleReal = vReal * wReal - vImag * wImag;
        const vTwiddleImag = vReal * wImag + vImag * wReal;

        re[idxEven] = uReal + vTwiddleReal;
        im[idxEven] = uImag + vTwiddleImag;
        re[idxOdd] = uReal - vTwiddleReal;
        im[idxOdd] = uImag - vTwiddleImag;
      }
    }
  }

  if (inverse) {
    const invN = 1 / n;
    for (let i = 0; i < n; i++) {
      const idx = offset + i * stride;
      re[idx] *= invN;
      im[idx] *= invN;
    }
  }
}

/**
 * 2D Radix-2 FFT (Forward)
 */
export function fft2d(re: Float32Array, im: Float32Array, n: number): void {
  // Rows
  for (let y = 0; y < n; y++) {
    fft1d(re, im, n, 1, y * n, false);
  }
  // Columns
  for (let x = 0; x < n; x++) {
    fft1d(re, im, n, n, x, false);
  }
}

/**
 * 2D Radix-2 IFFT (Inverse)
 */
export function ifft2d(re: Float32Array, im: Float32Array, n: number): void {
  // Rows
  for (let y = 0; y < n; y++) {
    fft1d(re, im, n, 1, y * n, true);
  }
  // Columns
  for (let x = 0; x < n; x++) {
    fft1d(re, im, n, n, x, true);
  }
}

/**
 * Center-shifts or un-shifts 2D spatial / frequency array so that (0,0) moves to (n/2, n/2) or back.
 */
export function fftShift(src: Float32Array, dst: Float32Array, n: number): void {
  const half = n >> 1;
  for (let y = 0; y < n; y++) {
    const yShift = (y + half) % n;
    for (let x = 0; x < n; x++) {
      const xShift = (x + half) % n;
      dst[yShift * n + xShift] = src[y * n + x];
    }
  }
}

/**
 * Validates maximum absolute imaginary component in reconstructed spatial domain
 */
export function getImaginaryResidualMax(im: Float32Array): number {
  let max = 0;
  for (let i = 0; i < im.length; i++) {
    const abs = Math.abs(im[i]);
    if (abs > max) max = abs;
  }
  return max;
}
