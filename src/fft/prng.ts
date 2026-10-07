/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Yields float in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle of an array in place using seeded PRNG.
 */
export function seededShuffle<T>(array: T[], prng: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}
