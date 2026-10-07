/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { PresetBar } from './components/PresetBar';
import { SpatialView } from './components/SpatialView';
import { FrequencyView } from './components/FrequencyView';
import { InfoReadout } from './components/InfoReadout';
import { TimelineTransport } from './components/TimelineTransport';
import { AnimationProfileGraph } from './components/AnimationProfileGraph';
import { EffectControls } from './components/EffectControls';
import { ExportModal } from './components/ExportModal';

import { FFTFXEngine, getDefaultEffectConfig, FrameResult } from './fft/engine';
import { renderSampleImage, processLoadedImage, SAMPLE_IMAGES } from './fft/sampleImages';
import { CropMode, SpatialDisplayMode, EffectConfig } from './fft/types';

export default function App() {
  // 1. Source and Image State
  const [fftSize, setFftSize] = useState<number>(256);
  const [sampleId, setSampleId] = useState<string>('geometric_primitives');
  const [isCustomImage, setIsCustomImage] = useState<boolean>(false);
  const [customImageEl, setCustomImageEl] = useState<HTMLImageElement | null>(null);
  const [cropMode, setCropMode] = useState<CropMode>('center_crop');
  const [origResolution, setOrigResolution] = useState<{ w: number; h: number }>({
    w: 256,
    h: 256,
  });

  // Raw source pixels buffer managed in state
  const [rawSourcePixels, setRawSourcePixels] = useState<Float32Array>(() =>
    renderSampleImage('geometric_primitives', 256)
  );

  // 2. Engine and Effect State
  const [config, setConfig] = useState<EffectConfig>(getDefaultEffectConfig());
  const [activePresetId, setActivePresetId] = useState<string | null>('scale_reveal');
  const [spatialDisplayMode, setSpatialDisplayMode] =
    useState<SpatialDisplayMode>('RECONSTRUCTION');

  // 3. Animation and Playback State
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(120);
  const [fps, setFps] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<'loop' | 'ping-pong' | 'once'>('loop');
  const pingPongDirRef = useRef<number>(1);
  const lastFrameTimeRef = useRef<number>(0);

  // 4. Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Instantiate FFTFX Engine with memoization
  const engine = useMemo(() => {
    return new FFTFXEngine(rawSourcePixels, fftSize);
  }, [rawSourcePixels, fftSize]);

  // Frame Result computation
  const currentT = totalFrames > 1 ? currentFrame / (totalFrames - 1) : 0;
  const frameResult: FrameResult = useMemo(() => {
    return engine.renderFrame(currentT, config, currentFrame, totalFrames);
  }, [engine, currentT, config, currentFrame, totalFrames]);

  // Precomputed Animation Profile for Profile Graph
  const profileData = useMemo(() => {
    return engine.computeAnimationProfile(config, 75);
  }, [engine, config]);

  // Playback Loop via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = 0;
      return;
    }

    let animId: number;
    const intervalMs = 1000 / fps;
    lastFrameTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= intervalMs) {
        lastFrameTimeRef.current = now - (elapsed % intervalMs);

        setCurrentFrame((prev) => {
          if (playbackMode === 'ping-pong') {
            let next = prev + pingPongDirRef.current;
            if (next >= totalFrames - 1) {
              next = totalFrames - 1;
              pingPongDirRef.current = -1;
            } else if (next <= 0) {
              next = 0;
              pingPongDirRef.current = 1;
            }
            return next;
          } else if (playbackMode === 'loop') {
            return (prev + 1) % totalFrames;
          } else {
            // 'once'
            if (prev >= totalFrames - 1) {
              setIsPlaying(false);
              return totalFrames - 1;
            }
            return prev + 1;
          }
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, fps, playbackMode, totalFrames]);

  // Source image selection handler
  const handleSelectSample = (id: string) => {
    setSampleId(id);
    setIsCustomImage(false);
    setCustomImageEl(null);
    const pixels = renderSampleImage(id, fftSize);
    setRawSourcePixels(pixels);
    setOrigResolution({ w: fftSize, h: fftSize });
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  // Immediate, deterministic image upload lifecycle (fixes first upload bug)
  const handleUploadImage = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { pixels, origWidth, origHeight } = processLoadedImage(img, fftSize, cropMode);
      setCustomImageEl(img);
      setIsCustomImage(true);
      setOrigResolution({ w: origWidth, h: origHeight });
      setRawSourcePixels(pixels);
      setCurrentFrame(0);
      setIsPlaying(false);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  // Resolution toggle handler (128, 256, 512)
  const handleToggleFftSize = (newSize: number) => {
    setFftSize(newSize);
    if (isCustomImage && customImageEl) {
      const { pixels } = processLoadedImage(customImageEl, newSize, cropMode);
      setRawSourcePixels(pixels);
    } else {
      const pixels = renderSampleImage(sampleId, newSize);
      setRawSourcePixels(pixels);
      setOrigResolution({ w: newSize, h: newSize });
    }
    setCurrentFrame(0);
  };

  // Crop mode toggle handler
  const handleToggleCropMode = (newCropMode: CropMode) => {
    setCropMode(newCropMode);
    if (isCustomImage && customImageEl) {
      const { pixels } = processLoadedImage(customImageEl, fftSize, newCropMode);
      setRawSourcePixels(pixels);
      setCurrentFrame(0);
    }
  };

  const handleApplyPreset = (newConfig: EffectConfig, presetId: string) => {
    setConfig(newConfig);
    setActivePresetId(presetId);
  };

  const handleConfigChange = (newConfig: EffectConfig) => {
    setConfig(newConfig);
    setActivePresetId(null);
  };

  const handleReset = () => {
    setConfig(getDefaultEffectConfig());
    setActivePresetId('scale_reveal');
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  // Get active method name for readout
  const activeMethodName = useMemo(() => {
    if (config.buildProperty === 'MAGNITUDE') {
      return `MAG · ${config.magOrderMethod.replace(/_/g, ' ')}`;
    }
    if (config.buildProperty === 'PHASE') {
      return `PHASE · ${config.phaseRestorationMethod.replace(/_/g, ' ')}`;
    }
    return `COMBINED · ${config.combinedPreset.replace(/_/g, ' ')}`;
  }, [config.buildProperty, config.magOrderMethod, config.phaseRestorationMethod, config.combinedPreset]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none antialiased">
      {/* 1. Header with Source selector & 128²/256²/512² toggle */}
      <Header
        currentSampleId={sampleId}
        onSelectSample={handleSelectSample}
        onUploadImage={handleUploadImage}
        fftSize={fftSize}
        onToggleFftSize={handleToggleFftSize}
        cropMode={cropMode}
        onToggleCropMode={handleToggleCropMode}
        isCustomImage={isCustomImage}
        origResolution={origResolution}
        onReset={handleReset}
        onOpenExport={() => setIsExportModalOpen(true)}
        exposure={config.exposure}
        contrast={config.contrast}
        onChangeExposure={(val) => setConfig({ ...config, exposure: val })}
        onChangeContrast={(val) => setConfig({ ...config, contrast: val })}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-3.5">
        {/* 2. Compact 1-Row Preset Selector */}
        <PresetBar
          currentConfig={config}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
        />

        {/* 3. Primary Two-Domain View (Spatial = LEFT, Frequency = RIGHT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
          {/* Spatial Domain Panel (LEFT) */}
          <SpatialView
            reconstruction={frameResult.reconstruction}
            difference={frameResult.difference}
            currentContribution={frameResult.currentContribution}
            original={engine.originalSpatial}
            n={fftSize}
            displayMode={spatialDisplayMode}
            onChangeDisplayMode={setSpatialDisplayMode}
            frame={currentFrame}
            renderId={frameResult.renderId}
          />

          {/* Frequency Domain Panel (RIGHT) with soft gradient overlay */}
          <FrequencyView
            logMagShifted={engine.analysis.logMagShifted}
            maxLogMag={engine.analysis.maxLogMag}
            freqOverlayShifted={frameResult.frequencyOverlayShifted}
            freqWeightsShifted={frameResult.frequencyWeightsShifted}
            n={fftSize}
            buildProperty={config.buildProperty}
            phaseRestorationMethod={config.phaseRestorationMethod}
            phaseCoherencePercent={frameResult.metrics.phaseCoherencePercent}
            frame={currentFrame}
            renderId={frameResult.renderId}
          />
        </div>

        {/* 4. Constant-Height Status Metrics Strip */}
        <InfoReadout
          metrics={frameResult.metrics}
          buildProperty={config.buildProperty}
          activeMethodName={activeMethodName}
          imaginaryResidualMax={frameResult.imaginaryResidualMax}
        />

        {/* 5. Timeline Transport & Continuous Pointer Scrubbing */}
        <TimelineTransport
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onRestart={() => {
            setCurrentFrame(0);
            pingPongDirRef.current = 1;
          }}
          onStepBack={() => setCurrentFrame((f) => Math.max(0, f - 1))}
          onStepForward={() => setCurrentFrame((f) => Math.min(totalFrames - 1, f + 1))}
          onScrub={(f) => setCurrentFrame(f)}
          playbackMode={playbackMode}
          onChangePlaybackMode={setPlaybackMode}
          fps={fps}
          onChangeFps={setFps}
          onChangeTotalFrames={(total) => {
            setTotalFrames(total);
            if (currentFrame >= total) setCurrentFrame(total - 1);
          }}
        />

        {/* 6. Compact Animation Profile Graph (between Timeline and Effect Controls) */}
        <AnimationProfileGraph
          profileData={profileData}
          currentT={currentT}
          onScrubT={(t) => {
            const frame = Math.max(0, Math.min(totalFrames - 1, Math.round(t * (totalFrames - 1))));
            setCurrentFrame(frame);
          }}
          buildProperty={config.buildProperty}
          timeSkew={config.timeSkew}
        />

        {/* 7. Effect Controls (Build Property, Rotating Aperture, Spiral, Time Skew) */}
        <EffectControls config={config} onChangeConfig={handleConfigChange} />
      </div>

      {/* 8. Export Modal (MP4, GIF, WebM & Spatial View Selector) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        engine={engine}
        config={config}
        currentFrame={currentFrame}
        totalFrames={totalFrames}
        fps={fps}
      />
    </div>
  );
}
