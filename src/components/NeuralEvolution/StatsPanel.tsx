"use client";

import React from "react";
import { GenerationStats, LevelConfig, SharkTelemetry } from "@/types/simulation";

interface StatsPanelProps {
  stats: GenerationStats;
  currentLevel: LevelConfig;
  onLevelChange: (levelId: number) => void;
  levels: LevelConfig[];
  onResetTarget?: () => void;
  isTargetCustom?: boolean;
  sharkTelemetry?: SharkTelemetry | null;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  currentLevel,
  onLevelChange,
  levels,
  onResetTarget,
  isTargetCustom,
  sharkTelemetry,
}) => {
  return (
    <div className="sh-dark-card w-full bg-[#08090e] rounded-xl border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_6px_25px_rgba(0,0,0,0.35)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none font-mono">
      {/* Level Selector and Subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            LEVEL {currentLevel.id} / 6
          </span>
          <span className="text-zinc-300 text-xs font-semibold hidden sm:inline uppercase">
            • {currentLevel.subtitle}
          </span>
        </div>

        {/* Level Switcher buttons */}
        <div className="flex items-center gap-1">
          {levels.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => onLevelChange(lvl.id)}
              className={`w-6 h-6 rounded text-[11px] font-bold transition-all ${
                lvl.id === currentLevel.id
                  ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
              title={`Level ${lvl.id}: ${lvl.subtitle}`}
            >
              {lvl.id}
            </button>
          ))}
        </div>

        {/* Reset Beacon button if moved */}
        {isTargetCustom && onResetTarget && (
          <button
            onClick={onResetTarget}
            className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ml-1"
            title="Reset target beacon back to level default coordinate"
          >
            <span>↺</span>
            <span>Reset Beacon</span>
          </button>
        )}
      </div>

      {/* Clean Key Stats Summary */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-zinc-400 uppercase">Gen:</span>
          <span className="text-white font-bold">{String(stats.generation).padStart(2, "0")}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-zinc-400 uppercase">Alive:</span>
          <span className="text-emerald-400 font-bold">{stats.aliveCount}</span>
          <span className="text-[10px] text-zinc-400">/{stats.totalPopulation}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-zinc-400 uppercase">Best:</span>
          <span className="text-cyan-400 font-bold">{stats.bestFitness.toFixed(0)}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-zinc-400 uppercase">Solved:</span>
          <span className="text-purple-400 font-bold">{stats.targetSuccessRate}%</span>
        </div>

        {/* Live Shark Predator Metric */}
        {sharkTelemetry && sharkTelemetry.enabled && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/30 border border-red-500/30">
            <span className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1">
              <span>🦈</span>
              <span>Kills:</span>
            </span>
            <span className="text-red-300 font-bold">{sharkTelemetry.kills}</span>
            <span className="text-[9px] text-red-400/70 font-mono hidden md:inline">
              [{sharkTelemetry.state}]
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
