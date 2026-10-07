/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  ArrowLeftRight,
} from 'lucide-react';

interface TimelineTransportProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onScrub: (frame: number) => void;
  playbackMode: 'loop' | 'ping-pong' | 'once';
  onChangePlaybackMode: (mode: 'loop' | 'ping-pong' | 'once') => void;
  fps: number;
  onChangeFps: (fps: number) => void;
  onChangeTotalFrames: (total: number) => void;
}

export const TimelineTransport: React.FC<TimelineTransportProps> = ({
  currentFrame,
  totalFrames,
  isPlaying,
  onTogglePlay,
  onRestart,
  onStepBack,
  onStepForward,
  onScrub,
  playbackMode,
  onChangePlaybackMode,
  fps,
  onChangeFps,
  onChangeTotalFrames,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const progressRatio = totalFrames > 1 ? currentFrame / (totalFrames - 1) : 0;
  const durationSec = (totalFrames / fps).toFixed(1);

  const updateFrameFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    const targetFrame = Math.max(0, Math.min(totalFrames - 1, Math.round(ratio * (totalFrames - 1))));
    onScrub(targetFrame);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateFrameFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      updateFrameFromPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-300">
      <div className="flex flex-col gap-2.5">
        {/* Scrubber Bar with Pointer Events Continuous Scrubbing */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-400 w-12 text-right tabular-nums">
            {String(currentFrame).padStart(3, ' ')}
          </span>

          <div
            ref={progressBarRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none' }}
            className="relative flex-1 h-4 bg-zinc-900 border border-zinc-800 rounded cursor-pointer group select-none py-0.5"
          >
            {/* Progress Fill */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-amber-500/50 rounded pointer-events-none"
              style={{ width: `${progressRatio * 100}%` }}
            />

            {/* Playhead thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-400 border border-zinc-950 rounded-full shadow-lg pointer-events-none group-hover:scale-110"
              style={{ left: `calc(${progressRatio * 100}% - 8px)` }}
            />
          </div>

          <span className="font-mono text-xs text-zinc-500 w-12 tabular-nums">
            {String(totalFrames - 1).padStart(3, ' ')}
          </span>
        </div>

        {/* Transport Buttons & Secondary Config */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Main Playback controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRestart}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
              title="Restart (Frame 0)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onStepBack}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
              title="Previous Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePlay}
              className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition shadow-sm ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={onStepForward}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
              title="Next Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Loop / Ping-Pong Modes */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5">
            <button
              onClick={() => onChangePlaybackMode('loop')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition ${
                playbackMode === 'loop'
                  ? 'bg-zinc-800 text-amber-300 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Loop continuously"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop</span>
            </button>
            <button
              onClick={() => onChangePlaybackMode('ping-pong')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition ${
                playbackMode === 'ping-pong'
                  ? 'bg-zinc-800 text-amber-300 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Ping-pong (oscillate forward/backward)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Ping-Pong</span>
            </button>
            <button
              onClick={() => onChangePlaybackMode('once')}
              className={`px-2.5 py-1 text-xs rounded transition ${
                playbackMode === 'once'
                  ? 'bg-zinc-800 text-amber-300 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Stop at end"
            >
              Once
            </button>
          </div>

          {/* Frame count & FPS selectors */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {/* Total Frames */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
              <span className="text-zinc-500">Frames:</span>
              <select
                value={totalFrames}
                onChange={(e) => onChangeTotalFrames(parseInt(e.target.value, 10))}
                className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value={60} className="bg-zinc-900">60</option>
                <option value={90} className="bg-zinc-900">90</option>
                <option value={120} className="bg-zinc-900">120 (default)</option>
                <option value={180} className="bg-zinc-900">180</option>
                <option value={240} className="bg-zinc-900">240</option>
              </select>
            </div>

            {/* Playback FPS */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
              <span className="text-zinc-500">FPS:</span>
              <select
                value={fps}
                onChange={(e) => onChangeFps(parseInt(e.target.value, 10))}
                className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value={15} className="bg-zinc-900">15</option>
                <option value={24} className="bg-zinc-900">24</option>
                <option value={30} className="bg-zinc-900">30</option>
                <option value={60} className="bg-zinc-900">60</option>
              </select>
            </div>

            {/* Duration estimate */}
            <span className="text-zinc-500 text-[11px] hidden sm:inline tabular-nums">
              ({durationSec}s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
