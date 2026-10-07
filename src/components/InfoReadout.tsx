/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MetricReadout, BuildProperty } from '../fft/types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface InfoReadoutProps {
  metrics: MetricReadout;
  buildProperty: BuildProperty;
  activeMethodName: string;
  imaginaryResidualMax: number;
}

export const InfoReadout: React.FC<InfoReadoutProps> = ({
  metrics,
  buildProperty,
  activeMethodName,
  imaginaryResidualMax,
}) => {
  const isHermitianValid = imaginaryResidualMax < 1e-4;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 h-10 min-h-[40px] max-h-[40px] flex items-center overflow-hidden text-xs text-zinc-300">
      <div className="w-full flex items-center justify-between gap-4 overflow-hidden">
        {/* Active Method & Frame */}
        <div className="flex items-center gap-2.5 shrink-0 overflow-hidden">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
              Mode:
            </span>
            <span className="font-mono text-zinc-100 font-medium truncate max-w-[170px] sm:max-w-[240px]">
              {activeMethodName}
            </span>
          </div>
          <span className="text-zinc-700 hidden sm:inline">·</span>
          <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] tabular-nums shrink-0">
            <span className="text-zinc-500">Frame:</span>
            <span className="text-amber-400 font-semibold w-7 text-right inline-block">
              {metrics.frame}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 w-7 text-left inline-block">
              {metrics.totalFrames}
            </span>
            <span className="text-zinc-500 w-11 text-right inline-block">
              ({metrics.progressPercent}%)
            </span>
          </div>
        </div>

        {/* Core Metrics with strict fixed widths and tabular numbers */}
        <div className="flex items-center gap-3 md:gap-4 font-mono text-[11px] tabular-nums shrink-0">
          {/* Coefficients */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Coeff:</span>
            <span className="text-zinc-200 w-12 text-right inline-block">
              {metrics.coefficientsRestoredPercent.toFixed(1)}%
            </span>
          </div>

          {/* Spectral Energy */}
          {(buildProperty === 'MAGNITUDE' || buildProperty === 'COMBINED') && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Energy:</span>
              <span className="text-emerald-400 font-medium w-12 text-right inline-block">
                {metrics.spectralEnergyRestoredPercent.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Phase Coherence */}
          {(buildProperty === 'PHASE' || buildProperty === 'COMBINED') && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Lock:</span>
              <span className="text-cyan-400 font-medium w-12 text-right inline-block">
                {metrics.phaseCoherencePercent.toFixed(1)}%
              </span>
            </div>
          )}

          {/* RMS Error */}
          <div className="hidden lg:flex items-center gap-1">
            <span className="text-zinc-500">RMS:</span>
            <span className="text-zinc-300 w-12 text-right inline-block">
              {metrics.rmsError.toFixed(3)}
            </span>
          </div>

          {/* Hermitian Verification */}
          <div
            className="hidden xl:flex items-center gap-1 text-[10px] pl-1"
            title={`Hermitian Symmetry Verification: Max Im residual = ${imaginaryResidualMax.toExponential(2)}`}
          >
            {isHermitianValid ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-zinc-500">Real</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-amber-400">Im &gt; 1e-4</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
