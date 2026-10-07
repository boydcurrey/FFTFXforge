/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CropMode } from './types';

export interface SampleImageDef {
  id: string;
  name: string;
  category: string;
  spectralCharacteristics: string;
  generate: (ctx: CanvasRenderingContext2D, size: number) => void;
}

export const SAMPLE_IMAGES: SampleImageDef[] = [
  {
    id: 'geometric_primitives',
    name: 'Geometric Primitives',
    category: 'Sharp Edges & Geometry',
    spectralCharacteristics: 'Strong directional sinc lobes, orthogonal cruciform axes, sharp edge energy.',
    generate: (ctx, size) => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, size, size);

      // Large central circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.5, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Inner hollow circle
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.5, size * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Rotated square
      ctx.save();
      ctx.translate(size * 0.5, size * 0.5);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(-size * 0.08, -size * 0.08, size * 0.16, size * 0.16);
      ctx.restore();

      // Satellite geometric marks
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size * 0.12, size * 0.12, size * 0.14, size * 0.14);
      ctx.beginPath();
      ctx.arc(size * 0.82, size * 0.18, size * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // Slanted bars
      ctx.lineWidth = size * 0.025;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(size * 0.1, size * 0.85);
      ctx.lineTo(size * 0.88, size * 0.85);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size * 0.75, size * 0.45);
      ctx.lineTo(size * 0.92, size * 0.7);
      ctx.stroke();
    },
  },
  {
    id: 'repeating_pattern',
    name: 'Repeating Grid & Chevron',
    category: 'Periodic Harmonics',
    spectralCharacteristics: 'Discrete harmonic Dirac delta impulses, periodic lattice peaks.',
    generate: (ctx, size) => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, size, size);

      // Grid frequencies
      const step = size / 16;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }

      for (let y = 0; y <= size; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }

      // Checkerboard tiles
      ctx.fillStyle = '#999999';
      for (let y = 0; y < 16; y += 2) {
        for (let x = 0; x < 16; x += 2) {
          ctx.fillRect(x * step + 2, y * step + 2, step - 4, step - 4);
        }
      }

      // Diagonal cross-hatches
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 1;
      for (let d = -size; d <= size * 2; d += step * 1.5) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + size, size);
        ctx.stroke();
      }
    },
  },
  {
    id: 'natural_texture',
    name: 'Natural Fractal Texture',
    category: 'Isotropic 1/f Power Law',
    spectralCharacteristics: 'Continuous pink noise 1/f^α falloff, organic isotropic roughness.',
    generate: (ctx, size) => {
      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;

      // 4-octave value noise synthesis
      const octaves = 5;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let value = 0;
          let amp = 0.5;
          let freq = 0.02;
          for (let o = 0; o < octaves; o++) {
            const nx = x * freq;
            const ny = y * freq;
            // Analytical smooth noise function
            const n =
              Math.sin(nx * 1.7 + Math.cos(ny * 2.1)) *
              Math.cos(ny * 1.9 + Math.sin(nx * 1.4));
            value += n * amp;
            amp *= 0.55;
            freq *= 2.1;
          }
          const norm = Math.max(0, Math.min(255, (value + 0.7) * 160));
          const idx = (y * size + x) * 4;
          data[idx] = norm;
          data[idx + 1] = norm;
          data[idx + 2] = norm;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    },
  },
  {
    id: 'face_portrait',
    name: 'Stylized Portrait',
    category: 'Semantic Form & Detail',
    spectralCharacteristics: 'Strong low-frequency head mass, mid-frequency facial contours, high-frequency eye/hair features.',
    generate: (ctx, size) => {
      ctx.fillStyle = '#101015';
      ctx.fillRect(0, 0, size, size);

      const cx = size * 0.5;
      const cy = size * 0.52;

      // Neck & shoulders
      ctx.fillStyle = '#22222a';
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.25, size);
      ctx.lineTo(cx - size * 0.08, cy + size * 0.22);
      ctx.lineTo(cx + size * 0.08, cy + size * 0.22);
      ctx.lineTo(cx + size * 0.25, size);
      ctx.closePath();
      ctx.fill();

      // Head oval
      ctx.fillStyle = '#dddddd';
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.22, size * 0.29, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair silhouette
      ctx.fillStyle = '#1e1e24';
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.08, size * 0.24, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#18181f';
      ctx.beginPath();
      ctx.ellipse(cx - size * 0.08, cy - size * 0.02, size * 0.035, size * 0.02, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + size * 0.08, cy - size * 0.02, size * 0.035, size * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - size * 0.08, cy - size * 0.02, size * 0.012, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.08, cy - size * 0.02, size * 0.012, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows
      ctx.strokeStyle = '#18181f';
      ctx.lineWidth = size * 0.012;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.12, cy - size * 0.07);
      ctx.quadraticCurveTo(cx - size * 0.08, cy - size * 0.09, cx - size * 0.04, cy - size * 0.07);
      ctx.moveTo(cx + size * 0.04, cy - size * 0.07);
      ctx.quadraticCurveTo(cx + size * 0.08, cy - size * 0.09, cx + size * 0.12, cy - size * 0.07);
      ctx.stroke();

      // Nose bridge and tip
      ctx.lineWidth = size * 0.009;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.03);
      ctx.lineTo(cx - size * 0.015, cy + size * 0.08);
      ctx.lineTo(cx + size * 0.02, cy + size * 0.08);
      ctx.stroke();

      // Mouth
      ctx.fillStyle = '#3a2028';
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.16, size * 0.05, size * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'architecture',
    name: 'Brutalist Architecture',
    category: 'High-Contrast Directional Edges',
    spectralCharacteristics: 'Prominent horizontal/vertical cross spectra, stepped shadow gradients.',
    generate: (ctx, size) => {
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, size * 0.6);
      skyGrad.addColorStop(0, '#0a0d12');
      skyGrad.addColorStop(1, '#65707d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, size, size);

      // Building towers
      ctx.fillStyle = '#1c1e22';
      ctx.fillRect(size * 0.1, size * 0.25, size * 0.35, size * 0.75);

      ctx.fillStyle = '#32363e';
      ctx.fillRect(size * 0.45, size * 0.15, size * 0.42, size * 0.85);

      // Shadow side
      ctx.fillStyle = '#141619';
      ctx.fillRect(size * 0.7, size * 0.15, size * 0.17, size * 0.85);

      // Window grid slits
      ctx.fillStyle = '#e8edf5';
      const winW = size * 0.02;
      const winH = size * 0.03;
      for (let row = 0; row < 12; row++) {
        const wy = size * 0.25 + row * size * 0.055;
        for (let col = 0; col < 4; col++) {
          const wx = size * 0.14 + col * size * 0.065;
          ctx.fillRect(wx, wy, winW, winH);
        }
        for (let col = 0; col < 3; col++) {
          const wx = size * 0.49 + col * size * 0.065;
          ctx.fillRect(wx, wy - size * 0.05, winW, winH);
        }
      }

      // Angled concrete cantilever
      ctx.fillStyle = '#9ea7b3';
      ctx.beginPath();
      ctx.moveTo(size * 0.05, size * 0.6);
      ctx.lineTo(size * 0.5, size * 0.5);
      ctx.lineTo(size * 0.5, size * 0.55);
      ctx.lineTo(size * 0.05, size * 0.65);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'broad_tonal',
    name: 'Broad Tonal Landscape',
    category: 'Dominant Low-Frequency Tones',
    spectralCharacteristics: 'Very high DC and low-frequency energy concentration, soft continuous transitions.',
    generate: (ctx, size) => {
      // Twilight sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, size);
      sky.addColorStop(0, '#0d131f');
      sky.addColorStop(0.4, '#243b55');
      sky.addColorStop(0.7, '#8f7b76');
      sky.addColorStop(1, '#c5b5a8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, size, size);

      // Luminous celestial body / moon
      const glow = ctx.createRadialGradient(
        size * 0.75,
        size * 0.25,
        0,
        size * 0.75,
        size * 0.25,
        size * 0.18
      );
      glow.addColorStop(0, 'rgba(255, 255, 240, 0.9)');
      glow.addColorStop(0.4, 'rgba(255, 240, 200, 0.3)');
      glow.addColorStop(1, 'rgba(255, 240, 200, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Mountain layers (distant soft to near sharp)
      // Distant ridge
      ctx.fillStyle = '#413a48';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.65);
      ctx.lineTo(size * 0.3, size * 0.52);
      ctx.lineTo(size * 0.6, size * 0.6);
      ctx.lineTo(size * 0.85, size * 0.48);
      ctx.lineTo(size, size * 0.55);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fill();

      // Mid-ground ridge
      ctx.fillStyle = '#262330';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.75);
      ctx.lineTo(size * 0.2, size * 0.68);
      ctx.lineTo(size * 0.5, size * 0.72);
      ctx.lineTo(size * 0.75, size * 0.62);
      ctx.lineTo(size, size * 0.7);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fill();

      // Foreground hill
      ctx.fillStyle = '#100e16';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.88);
      ctx.quadraticCurveTo(size * 0.4, size * 0.82, size, size * 0.92);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fill();
    },
  },
];

/**
 * Renders sample image to Float32Array normalized [0, 1]
 */
export function renderSampleImage(sampleId: string, size: number): Float32Array {
  const sample = SAMPLE_IMAGES.find((s) => s.id === sampleId) || SAMPLE_IMAGES[0];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  sample.generate(ctx, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const gray = new Float32Array(size * size);

  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Standard perceptual luminance
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  }

  return gray;
}

/**
 * Processes an uploaded image element onto target size using specified CropMode
 */
export function processLoadedImage(
  img: HTMLImageElement,
  targetSize: number,
  cropMode: CropMode
): { pixels: Float32Array; origWidth: number; origHeight: number } {
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetSize, targetSize);

  let sx = 0;
  let sy = 0;
  let sWidth = origWidth;
  let sHeight = origHeight;
  let dx = 0;
  let dy = 0;
  let dWidth = targetSize;
  let dHeight = targetSize;

  if (cropMode === 'center_crop') {
    if (origWidth > origHeight) {
      sWidth = origHeight;
      sHeight = origHeight;
      sx = (origWidth - origHeight) / 2;
      sy = 0;
    } else {
      sWidth = origWidth;
      sHeight = origWidth;
      sx = 0;
      sy = (origHeight - origWidth) / 2;
    }
  } else {
    // fit_padding
    const aspect = origWidth / origHeight;
    if (aspect > 1) {
      dWidth = targetSize;
      dHeight = Math.round(targetSize / aspect);
      dx = 0;
      dy = Math.round((targetSize - dHeight) / 2);
    } else {
      dHeight = targetSize;
      dWidth = Math.round(targetSize * aspect);
      dy = 0;
      dx = Math.round((targetSize - dWidth) / 2);
    }
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imgData.data;
  const gray = new Float32Array(targetSize * targetSize);

  for (let i = 0; i < targetSize * targetSize; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  }

  return { pixels: gray, origWidth, origHeight };
}
