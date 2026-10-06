"use client";

import React from "react";
import { NCAEngine } from "@/lib/nca/NCAEngine";
import { BrushMode, RegenSpeed } from "@/types/nca";
import { ncaSound } from "@/lib/nca/NCASound";

interface ToolPaletteProps {
  engine: NCAEngine | null;
  isRunning: boolean;
  onToggleRunning: () => void;
  onStep: () => void;
  brushMode: BrushMode;
  onChangeBrushMode: (mode: BrushMode) => void;
  brushRadius: number;
  onChangeBrushRadius: (radius: number) => void;
  speedMultiplier: number;
  onChangeSpeed: (speed: number) => void;
  regenSpeed: RegenSpeed;
  onChangeRegenSpeed: (speed: RegenSpeed) => void;
  onResetSeed: () => void;
  onClear: () => void;
  onStressTest: () => void;
  onOpenCustomModal: () => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  isRunning,
  onToggleRunning,
  onStep,
  brushMode,
  onChangeBrushMode,
  brushRadius,
  onChangeBrushRadius,
  speedMultiplier,
  onChangeSpeed,
  regenSpeed,
  onChangeRegenSpeed,
  onResetSeed,
  onClear,
  onStressTest,
  onOpenCustomModal,
}) => {
  const tools: {
    id: BrushMode;
    label: string;
    icon: string;
    desc: string;
    color: string;
    activeClass: string;
  }[] = [
    {
      id: "scalpel",
      label: "Laser Scalpel",
      icon: "🔪",
      desc: "Dissect or slice living tissue to provoke autonomous biological self-healing",
      color: "text-red-400",
      activeClass: "bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
    },
    {
      id: "seed",
      label: "Stem Seed",
      icon: "🟢",
      desc: "Plant pluripotent stem cells that divide and differentiate locally",
      color: "text-emerald-400",
      activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    },
    {
      id: "mutagen",
      label: "Mutagen / Entropy",
      icon: "🧪",
      desc: "Inject chaotic chemical noise into hidden channels to test homeostasis",
      color: "text-yellow-400",
      activeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]",
    },
    {
      id: "nutrient",
      label: "Nutrient Spray",
      icon: "⚡",
      desc: "Hyper-accelerate local mitosis and activator morphogen synthesis",
      color: "text-cyan-400",
      activeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]",
    },
    {
      id: "eraser",
      label: "Cryo Eraser",
      icon: "🧽",
      desc: "Wipe cells clean to clear space",
      color: "text-zinc-400",
      activeClass: "bg-zinc-700/40 text-zinc-200 border-zinc-500/50",
    },
  ];

  return (
    <div className="sh-dark-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-[#09090d] p-4 text-zinc-100 flex flex-col gap-4 shadow-xl">
      {/* Header & Playback Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            onClick={() => {
              ncaSound.playClick();
              onToggleRunning();
            }}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              isRunning
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-500/30"
            }`}
          >
            <span>{isRunning ? "⏸ PAUSE" : "▶ RUN BIO-LOOP"}</span>
          </button>

          {/* Single Step Button */}
          <button
            onClick={() => {
              ncaSound.playClick();
              onStep();
            }}
            disabled={isRunning}
            className={`px-3 py-2 rounded-xl font-mono text-xs font-semibold border transition-all ${
              isRunning
                ? "opacity-40 cursor-not-allowed border-white/[0.05] text-zinc-500"
                : "bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-zinc-200 cursor-pointer"
            }`}
            title="Advance exactly 1 morphogenetic step"
          >
            ⏭ STEP
          </button>
        </div>

        {/* Healing / Regeneration Speed & Clock Speed Multiplier */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Healing Rate Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] text-xs font-mono">
            <span className="text-[10px] text-zinc-500 px-1.5 uppercase font-semibold">
              Healing Rate:
            </span>
            <button
              onClick={() => {
                ncaSound.playClick();
                onChangeRegenSpeed("gentle");
              }}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                regenSpeed === "gentle"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Gradual step-by-step biological mitosis — watch cells regrow slowly layer by layer!"
            >
              🐢 Gentle
            </button>
            <button
              onClick={() => {
                ncaSound.playClick();
                onChangeRegenSpeed("normal");
              }}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                regenSpeed === "normal"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Balanced biological tissue repair rate"
            >
              🌿 Bio-Rate
            </button>
            <button
              onClick={() => {
                ncaSound.playClick();
                onChangeRegenSpeed("rapid");
              }}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                regenSpeed === "rapid"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Fast acceleration recovery"
            >
              ⚡ Rapid
            </button>
          </div>

          {/* Engine Multiplier */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] text-xs font-mono">
            <span className="text-[10px] text-zinc-500 px-1.5 uppercase font-semibold">Clock:</span>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  ncaSound.playClick();
                  onChangeSpeed(spd);
                }}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  speedMultiplier === spd
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Bio-Intervention Tools */}
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold mb-2 block">
          Interactive Bio-Tools (Click & Drag on Canvas):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {tools.map((t) => {
            const isActive = brushMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  ncaSound.playClick();
                  onChangeBrushMode(t.id);
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                  isActive
                    ? t.activeClass
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                }`}
                title={t.desc}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="font-mono text-xs font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brush Radius Slider & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
        {/* Brush Radius */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
            Brush Radius: <strong className="text-emerald-400 font-bold">{brushRadius}px</strong>
          </span>
          <input
            type="range"
            min="1"
            max="12"
            value={brushRadius}
            onChange={(e) => onChangeBrushRadius(Number(e.target.value))}
            className="w-28 accent-emerald-400 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Custom Shape / Text Input Studio Trigger */}
          <button
            onClick={() => {
              ncaSound.playClick();
              onOpenCustomModal();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 hover:from-emerald-500/30 hover:to-purple-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            title="Create custom shape, text glyph, or upload an image to turn into a living organism"
          >
            <span>🎨</span>
            <span>Input Shape / Text</span>
          </button>

          {/* Stress Test */}
          <button
            onClick={() => {
              ncaSound.playScalpelSlice();
              onStressTest();
            }}
            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-mono text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
            title="Automatically resect a tissue lesion to benchmark real-time regeneration"
          >
            <span>💥</span>
            <span>Slice Tissue</span>
          </button>

          {/* Reset Seed */}
          <button
            onClick={() => {
              ncaSound.playClick();
              onResetSeed();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-300 font-mono text-xs font-semibold transition-all cursor-pointer"
            title="Restart organism from a single stem cell seed"
          >
            🌱 Plant Seed
          </button>

          {/* Clear */}
          <button
            onClick={() => {
              ncaSound.playClick();
              onClear();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 font-mono text-xs font-semibold transition-all cursor-pointer"
            title="Wipe canvas completely"
          >
            🧹 Clear
          </button>
        </div>
      </div>
    </div>
  );
};
