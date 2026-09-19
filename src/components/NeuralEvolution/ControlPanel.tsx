"use client";

import React, { useState } from "react";
import { SimulationConfig, SharkTelemetry } from "@/types/simulation";

interface ControlPanelProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onNextGen: () => void;
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  onOpenHowItWorks: () => void;
  sharkTelemetry?: SharkTelemetry | null;
}

const SPEED_OPTIONS = [1, 2, 5, 10];
const POPULATION_OPTIONS = [25, 50, 100];
const SHARK_MODES: Array<{ id: "normal" | "frenzy" | "patrol"; label: string; icon: string }> = [
  { id: "normal", label: "Hunt", icon: "🎯" },
  { id: "frenzy", label: "Frenzy", icon: "⚡" },
  { id: "patrol", label: "Patrol", icon: "🧭" },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  onTogglePlay,
  onReset,
  onNextGen,
  config,
  onChangeConfig,
  onOpenHowItWorks,
  sharkTelemetry,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const isSharkEnabled = config.sharkEnabled ?? true;
  const sharkKills = sharkTelemetry?.kills ?? 0;

  return (
    <div className="sh-dark-card w-full bg-[#08090e] rounded-xl border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-4 flex flex-col gap-3 select-none">
      {/* Primary Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {/* Start / Pause */}
          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              isRunning
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:bg-emerald-400"
            }`}
          >
            <span>{isRunning ? "⏸" : "▶"}</span>
            <span>{isRunning ? "Pause" : "Start"}</span>
          </button>

          {/* Next Gen */}
          <button
            onClick={onNextGen}
            className="px-3 py-2 rounded-lg font-mono text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            title="Step to next evolved generation (Shortcut: N)"
          >
            <span>🧬</span>
            <span>Next Gen</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg font-mono text-xs font-semibold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] transition-all cursor-pointer"
            title="Reset to Generation 1 (Shortcut: R)"
          >
            🔄 Reset
          </button>

          {/* Apex Shark Predator Toggle */}
          <button
            onClick={() => onChangeConfig({ sharkEnabled: !isSharkEnabled })}
            className={`px-3 py-2 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              isSharkEnabled
                ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:bg-red-500/30"
                : "bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border border-white/[0.05]"
            }`}
            title={
              isSharkEnabled
                ? "Apex Predator is actively hunting fish. Click to disable."
                : "Click to release the Apex Shark Predator into the arena!"
            }
          >
            <span>🦈</span>
            <span>Shark: {isSharkEnabled ? "ON" : "OFF"}</span>
            {isSharkEnabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 font-bold ml-0.5">
                {sharkKills > 0 ? `💀 ${sharkKills}` : "HUNT"}
              </span>
            )}
          </button>
        </div>

        {/* Speed & How It Works */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.04]">
            <span className="text-[10px] text-zinc-400 px-1.5">Speed:</span>
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeConfig({ speedMultiplier: speed })}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  config.speedMultiplier === speed
                    ? "bg-cyan-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={onOpenHowItWorks}
            className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
          >
            <span>💡</span>
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>

      {/* Quick Controls: Population & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 uppercase">Agents:</span>
          <div className="flex items-center gap-1">
            {POPULATION_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => onChangeConfig({ populationSize: size })}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  config.populationSize === size
                    ? "bg-purple-500 text-white"
                    : "bg-white/[0.04] text-zinc-400 hover:text-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Shark Mode Selector (when predator is active) */}
        {isSharkEnabled && (
          <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-500/25 px-2 py-1 rounded-lg">
            <span className="text-[10px] text-red-400 uppercase font-bold flex items-center gap-1">
              <span>🦈</span>
              <span>Mode:</span>
            </span>
            <div className="flex items-center gap-1">
              {SHARK_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangeConfig({ sharkAggression: m.id })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    (config.sharkAggression ?? "normal") === m.id
                      ? "bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : "text-zinc-400 hover:text-red-300 hover:bg-red-500/10"
                  }`}
                  title={`Shark Mode: ${m.label}`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={config.showSensorRays}
              onChange={(e) => onChangeConfig({ showSensorRays: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span>Rays</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={config.showTrails}
              onChange={(e) => onChangeConfig({ showTrails: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span>Trails</span>
          </label>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[10px] text-zinc-400 hover:text-cyan-400 transition-colors ml-1"
          >
            {showAdvanced ? "▲ Less" : "▼ Tuning"}
          </button>
        </div>
      </div>

      {/* Collapsible Tuning Sliders */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.04] text-xs font-mono">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-400">Mutation Rate</span>
              <span className="text-cyan-400 font-bold">
                {(config.mutationRate * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={Math.round(config.mutationRate * 100)}
              onChange={(e) =>
                onChangeConfig({ mutationRate: Number(e.target.value) / 100 })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1 bg-zinc-800 rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-400">Mutation Strength</span>
              <span className="text-pink-400 font-bold">
                {(config.mutationStrength * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={Math.round(config.mutationStrength * 100)}
              onChange={(e) =>
                onChangeConfig({ mutationStrength: Number(e.target.value) / 100 })
              }
              className="w-full accent-pink-400 cursor-pointer h-1 bg-zinc-800 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
