/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { SAMPLE_IMAGES } from '../fft/sampleImages';
import { CropMode } from '../fft/types';
import { Sliders, Download, Upload, RotateCcw, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentSampleId: string;
  onSelectSample: (id: string) => void;
  onUploadImage: (file: File) => void;
  fftSize: number;
  onToggleFftSize: (size: number) => void;
  cropMode: CropMode;
  onToggleCropMode: (mode: CropMode) => void;
  isCustomImage: boolean;
  origResolution: { w: number; h: number };
  onReset: () => void;
  onOpenExport: () => void;
  exposure: number;
  contrast: number;
  onChangeExposure: (val: number) => void;
  onChangeContrast: (val: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSampleId,
  onSelectSample,
  onUploadImage,
  fftSize,
  onToggleFftSize,
  cropMode,
  onToggleCropMode,
  isCustomImage,
  origResolution,
  onReset,
  onOpenExport,
  exposure,
  contrast,
  onChangeExposure,
  onChangeContrast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDisplaySettings, setShowDisplaySettings] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold tracking-tight text-white">
              FFTFX<span className="text-amber-400">forge</span>
            </span>
            <span className="text-xs text-zinc-500 font-mono">v0.1</span>
          </div>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <p className="hidden md:block text-xs text-zinc-400">
            Frequency-Domain Animation & Effects Laboratory
          </p>
        </div>

        {/* Source Image Selector & FFT Specs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Sample Select */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="text-zinc-500 font-medium">Source:</span>
            <select
              value={isCustomImage ? 'custom' : currentSampleId}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  fileInputRef.current?.click();
                } else {
                  onSelectSample(e.target.value);
                }
              }}
              className="bg-transparent text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer"
            >
              {SAMPLE_IMAGES.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-200">
                  {s.name}
                </option>
              ))}
              <option value="custom" className="bg-zinc-900 text-zinc-200">
                {isCustomImage ? 'Custom Upload' : '+ Upload Image...'}
              </option>
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
                fileInputRef.current?.click();
              }}
              title="Upload image"
              className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded transition"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Crop Mode (if custom) */}
          {isCustomImage && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5">
              <button
                onClick={() => onToggleCropMode('center_crop')}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  cropMode === 'center_crop'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Center Crop square"
              >
                Crop
              </button>
              <button
                onClick={() => onToggleCropMode('fit_padding')}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  cropMode === 'fit_padding'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Fit with black padding"
              >
                Fit
              </button>
            </div>
          )}

          {/* FFT Grid Resolution: 128², 256² (default), 512² */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 font-mono">
            <button
              onClick={() => onToggleFftSize(128)}
              className={`px-2 py-0.5 text-xs rounded transition ${
                fftSize === 128
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="High Performance 128x128 FFT (16,384 bins)"
            >
              128²
            </button>
            <button
              onClick={() => onToggleFftSize(256)}
              className={`px-2 py-0.5 text-xs rounded transition ${
                fftSize === 256
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Standard 256x256 FFT (65,536 bins)"
            >
              256²
            </button>
            <button
              onClick={() => onToggleFftSize(512)}
              className={`px-2 py-0.5 text-xs rounded transition ${
                fftSize === 512
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Full Precision 512x512 FFT (262,144 bins)"
            >
              512²
            </button>
          </div>

          {/* Resolution Badge info */}
          <span className="hidden xl:inline text-zinc-500 font-mono text-[11px]">
            Src: {origResolution.w}×{origResolution.h} · FFT: {fftSize}×{fftSize}
          </span>

          {/* Display calibration button */}
          <div className="relative">
            <button
              onClick={() => setShowDisplaySettings(!showDisplaySettings)}
              className={`flex items-center gap-1 px-2 py-1 rounded border transition ${
                showDisplaySettings
                  ? 'bg-zinc-800 border-zinc-700 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Display brightness and contrast adjustments (does not affect FFT coefficients)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Display</span>
            </button>

            {showDisplaySettings && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-2xl z-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-zinc-200">Display Mapping</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Visual Only</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Exposure</span>
                      <span className="font-mono text-zinc-300">{exposure.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={exposure}
                      onChange={(e) => onChangeExposure(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono text-zinc-300">{contrast.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={contrast}
                      onChange={(e) => onChangeContrast(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                    />
                  </div>
                  <button
                    onClick={() => {
                      onChangeExposure(1.0);
                      onChangeContrast(1.0);
                    }}
                    className="w-full py-1 text-[11px] text-zinc-400 hover:text-white bg-zinc-800 rounded transition"
                  >
                    Reset Calibration
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition"
            title="Reset parameters to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Export button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium rounded transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
