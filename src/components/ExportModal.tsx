/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FFTFXEngine } from '../fft/engine';
import { EffectConfig } from '../fft/types';
import { SimpleGifEncoder } from '../fft/gifEncoder';
import { X, Download, Film, Image as ImageIcon, Loader2, Info } from 'lucide-react';

export type ExportFormat = 'mp4' | 'gif' | 'webm';
export type ExportContentMode = 'reconstruction' | 'difference' | 'transitioning';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: FFTFXEngine;
  config: EffectConfig;
  currentFrame: number;
  totalFrames: number;
  fps: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  engine,
  config,
  currentFrame,
  totalFrames,
  fps,
}) => {
  const [outputFormat, setOutputFormat] = useState<ExportFormat>('mp4');
  const [contentMode, setContentMode] = useState<ExportContentMode>('reconstruction');
  const [exportMode, setExportMode] = useState<'forward' | 'ping-pong'>('forward');
  const [upscale, setUpscale] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  if (!isOpen) return null;

  const n = engine.n;

  // Check MP4 MediaRecorder browser support
  const isMp4Supported =
    typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"') ||
      MediaRecorder.isTypeSupported('video/mp4') ||
      MediaRecorder.isTypeSupported('video/mp4;codecs=h264'));

  // Get active spatial buffer for a given frame result
  const getSelectedBuffer = (res: ReturnType<typeof engine.renderFrame>) => {
    switch (contentMode) {
      case 'difference':
        return res.difference;
      case 'transitioning':
        return res.currentContribution;
      case 'reconstruction':
      default:
        return res.reconstruction;
    }
  };

  // 1. Export Current Frame as PNG
  const handleExportCurrentPng = () => {
    const t = totalFrames > 1 ? currentFrame / (totalFrames - 1) : 0;
    const res = engine.renderFrame(t, config, currentFrame, totalFrames);
    const buffer = getSelectedBuffer(res);

    const outSize = n * upscale;
    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const v = Math.round(buffer[i] * 255);
      const idx = i * 4;
      imgData.data[idx] = v;
      imgData.data[idx + 1] = v;
      imgData.data[idx + 2] = v;
      imgData.data[idx + 3] = 255;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = n;
    tempCanvas.height = n;
    tempCanvas.getContext('2d')!.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, outSize, outSize);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `fftfxforge-${contentMode}-frame-${currentFrame}.png`;
    a.click();
  };

  // 2. Export Animation (MP4 / GIF / WebM)
  const handleExportAnimation = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const outSize = n * upscale;

      // Determine frame indices (forward or ping-pong)
      const frameIndices: number[] = [];
      for (let f = 0; f < totalFrames; f++) frameIndices.push(f);
      if (exportMode === 'ping-pong') {
        for (let f = totalFrames - 2; f > 0; f--) frameIndices.push(f);
      }
      const totalRenderFrames = frameIndices.length;

      // --- BRANCH A: ANIMATED GIF EXPORT ---
      if (outputFormat === 'gif' || (outputFormat === 'mp4' && !isMp4Supported)) {
        // GIF export: pure TS, universal iOS/iPadOS compatibility
        const encoder = new SimpleGifEncoder(outSize, outSize, fps, 0);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = n;
        tempCanvas.height = n;
        const tempCtx = tempCanvas.getContext('2d')!;
        const tempImgData = tempCtx.createImageData(n, n);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outSize;
        outCanvas.height = outSize;
        const outCtx = outCanvas.getContext('2d')!;
        outCtx.imageSmoothingEnabled = false;

        const grayPixels = new Uint8Array(outSize * outSize);

        for (let i = 0; i < totalRenderFrames; i++) {
          const f = frameIndices[i];
          const t = totalFrames > 1 ? f / (totalFrames - 1) : 0;
          const res = engine.renderFrame(t, config, f, totalFrames);
          const buffer = getSelectedBuffer(res);

          for (let p = 0; p < n * n; p++) {
            const v = Math.round(buffer[p] * 255);
            const pIdx = p * 4;
            tempImgData.data[pIdx] = v;
            tempImgData.data[pIdx + 1] = v;
            tempImgData.data[pIdx + 2] = v;
            tempImgData.data[pIdx + 3] = 255;
          }
          tempCtx.putImageData(tempImgData, 0, 0);
          outCtx.drawImage(tempCanvas, 0, 0, outSize, outSize);

          const outImgData = outCtx.getImageData(0, 0, outSize, outSize).data;
          for (let p = 0; p < outSize * outSize; p++) {
            grayPixels[p] = outImgData[p * 4];
          }

          encoder.addFrame(grayPixels);
          setExportProgress(Math.round(((i + 1) / totalRenderFrames) * 100));

          // Yield thread briefly for smooth progress updates
          if (i % 3 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        const blob = encoder.finish();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const actualExt = outputFormat === 'gif' ? 'gif' : 'gif';
        a.download = `fftfxforge-${contentMode}-${exportMode}.${actualExt}`;
        a.click();
        return;
      }

      // --- BRANCH B: VIDEO RECORDER (MP4 or WebM) ---
      const canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = n;
      tempCanvas.height = n;
      const tempCtx = tempCanvas.getContext('2d')!;
      const tempImgData = tempCtx.createImageData(n, n);

      let mimeType = 'video/webm';
      let fileExt = 'webm';

      if (outputFormat === 'mp4' && isMp4Supported) {
        if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"')) {
          mimeType = 'video/mp4; codecs="avc1.42E01E"';
        } else {
          mimeType = 'video/mp4';
        }
        fileExt = 'mp4';
      } else {
        if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
          mimeType = 'video/webm; codecs=vp9';
        } else {
          mimeType = 'video/webm';
        }
        fileExt = 'webm';
      }

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fftfxforge-${contentMode}-${exportMode}.${fileExt}`;
          a.click();
          resolve();
        };
      });

      recorder.start();
      const frameDurationMs = 1000 / fps;

      for (let i = 0; i < totalRenderFrames; i++) {
        const f = frameIndices[i];
        const t = totalFrames > 1 ? f / (totalFrames - 1) : 0;
        const res = engine.renderFrame(t, config, f, totalFrames);
        const buffer = getSelectedBuffer(res);

        for (let p = 0; p < n * n; p++) {
          const v = Math.round(buffer[p] * 255);
          const pIdx = p * 4;
          tempImgData.data[pIdx] = v;
          tempImgData.data[pIdx + 1] = v;
          tempImgData.data[pIdx + 2] = v;
          tempImgData.data[pIdx + 3] = 255;
        }
        tempCtx.putImageData(tempImgData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, outSize, outSize);

        setExportProgress(Math.round(((i + 1) / totalRenderFrames) * 100));
        await new Promise((r) => setTimeout(r, Math.max(8, frameDurationMs * 0.4)));
      }

      recorder.stop();
      await recordPromise;
    } catch (err) {
      console.error('Export animation error:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const currentExtension =
    outputFormat === 'mp4'
      ? isMp4Supported
        ? '.mp4'
        : '.gif (fallback)'
      : outputFormat === 'gif'
      ? '.gif'
      : '.webm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide">Export Animation &amp; Frames</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3.5 text-xs">
          {/* 1. Output Format */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-zinc-400 font-semibold">Output Format</label>
              <span className="font-mono text-[11px] text-amber-400 font-semibold">
                {currentExtension}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono">
              <button
                onClick={() => setOutputFormat('mp4')}
                className={`py-1.5 px-2 rounded border transition text-center ${
                  outputFormat === 'mp4'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                MP4 (H.264)
              </button>
              <button
                onClick={() => setOutputFormat('gif')}
                className={`py-1.5 px-2 rounded border transition text-center ${
                  outputFormat === 'gif'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Animated GIF
              </button>
              <button
                onClick={() => setOutputFormat('webm')}
                className={`py-1.5 px-2 rounded border transition text-center ${
                  outputFormat === 'webm'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                WebM
              </button>
            </div>

            {/* iOS Compatibility / Browser Note */}
            {outputFormat === 'mp4' && !isMp4Supported && (
              <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-300/90 leading-tight">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Native MP4 MediaRecorder is unavailable in this browser engine. Animation will encode into Animated GIF (.gif) for full iOS / iPad playback compatibility.
                </span>
              </div>
            )}
          </div>

          {/* 2. Animation Content (Spatial View selection) */}
          <div>
            <label className="text-zinc-400 block mb-1 font-semibold">Animation Content</label>
            <div className="grid grid-cols-3 gap-2 font-mono">
              {[
                { id: 'reconstruction', label: 'Reconstruction' },
                { id: 'difference', label: 'Difference' },
                { id: 'transitioning', label: 'Transitioning' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setContentMode(opt.id as ExportContentMode)}
                  className={`py-1.5 px-2 rounded border transition text-center truncate ${
                    contentMode === opt.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Export Upscale Resolution */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-zinc-400 font-semibold">Export Resolution</label>
              <span className="font-mono text-[11px] text-zinc-500">
                Native FFT: {n}×{n}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono">
              {[
                { val: 1, label: `${n}×${n} (Native)` },
                { val: 2, label: `${n * 2}×${n * 2} (2×)` },
                { val: 4, label: `${n * 4}×${n * 4} (4×)` },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setUpscale(opt.val)}
                  className={`py-1.5 rounded border transition text-center ${
                    upscale === opt.val
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Animation Trajectory */}
          <div>
            <label className="text-zinc-400 block mb-1 font-semibold">Trajectory</label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                onClick={() => setExportMode('forward')}
                className={`py-1.5 rounded border transition ${
                  exportMode === 'forward'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Forward (0 → 1)
              </button>
              <button
                onClick={() => setExportMode('ping-pong')}
                className={`py-1.5 rounded border transition ${
                  exportMode === 'ping-pong'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Ping-Pong (0 → 1 → 0)
              </button>
            </div>
          </div>

          {/* Details info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-2.5 space-y-1 font-mono text-[11px] text-zinc-400 tabular-nums">
            <div className="flex justify-between">
              <span>Sequence Frames:</span>
              <span className="text-zinc-200">
                {exportMode === 'forward' ? totalFrames : totalFrames * 2 - 2} frames @ {fps} FPS
              </span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="text-zinc-200">
                {(
                  (exportMode === 'forward' ? totalFrames : totalFrames * 2 - 2) /
                  fps
                ).toFixed(1)}
                s
              </span>
            </div>
            <div className="flex justify-between">
              <span>Output File:</span>
              <span className="text-amber-400 font-semibold">
                *{currentExtension}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <button
            onClick={handleExportCurrentPng}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded font-medium transition text-xs"
          >
            <ImageIcon className="w-4 h-4 text-zinc-400" />
            <span>Download Current Frame (PNG)</span>
          </button>

          <button
            onClick={handleExportAnimation}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold rounded transition text-xs shadow-md"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  Rendering {outputFormat.toUpperCase()} ({exportProgress}%)
                </span>
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                <span>
                  Render &amp; Download Animation ({currentExtension})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
