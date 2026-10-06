"use client";

import React, { useState } from "react";
import { NCATelemetry, OrganismPreset } from "@/types/nca";
import { ORGANISM_PRESETS } from "@/lib/nca/presets";
import { ncaSound } from "@/lib/nca/NCASound";

interface TelemetryPanelProps {
  telemetry: NCATelemetry;
  selectedOrganism: OrganismPreset;
  onSelectOrganism: (organismId: string, morphInPlace: boolean) => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  selectedOrganism,
  onSelectOrganism,
}) => {
  const [morphInPlace, setMorphInPlace] = useState<boolean>(true);

  const isHealthy = telemetry.regenerationHealth >= 90;

  return (
    <div className="sh-dark-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-[#09090d] p-4 text-zinc-100 flex flex-col gap-4 shadow-xl">
      {/* Organism Selector Strip */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold block">
            Morphogenetic Genomes:
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-mono text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={morphInPlace}
              onChange={(e) => setMorphInPlace(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Morph In-Place</span>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ORGANISM_PRESETS.map((org) => {
            const isCurrent = org.id === selectedOrganism.id;
            return (
              <button
                key={org.id}
                onClick={() => {
                  ncaSound.playClick();
                  onSelectOrganism(org.id, morphInPlace);
                }}
                className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  isCurrent
                    ? "bg-white/[0.08] border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200"
                }`}
                style={{
                  borderColor: isCurrent ? org.accentColor : undefined,
                }}
              >
                <span className="text-xl shrink-0">{org.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-xs font-bold text-zinc-100 truncate">
                    {org.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">
                    {org.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Highlight User-Created Custom Organism when active */}
        {selectedOrganism.category === "User-Created" && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl shrink-0">{selectedOrganism.icon}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-xs font-bold text-purple-300 truncate">
                  {selectedOrganism.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-sans truncate">
                  {selectedOrganism.scientificName}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold uppercase tracking-wider shrink-0 border border-purple-500/40">
              Active User Shape
            </span>
          </div>
        )}
      </div>

      {/* Primary Health & Regeneration Bar */}
      <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
              }`}
            />
            {isHealthy ? "Homeostasis Intact" : "Tissue Repairing..."}
          </span>
          <span
            className={`font-mono font-extrabold text-sm ${
              isHealthy ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {telemetry.regenerationHealth}% HEALTH
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isHealthy
                ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            }`}
            style={{ width: `${telemetry.regenerationHealth}%` }}
          />
        </div>

        {/* Recovery Latency Display */}
        {telemetry.recoveryTimeMs > 0 && (
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
            <span>Last Trauma Recovery Time:</span>
            <strong className="text-cyan-400 font-bold">
              {telemetry.recoveryTimeMs} ms
            </strong>
          </div>
        )}
      </div>

      {/* Grid Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col">
          <span className="text-[10px] uppercase text-zinc-500 tracking-wider">Alive Cells</span>
          <span className="text-sm font-bold text-emerald-400 mt-0.5">
            {telemetry.aliveCells}
          </span>
          <span className="text-[9px] text-zinc-500">of {telemetry.totalCells}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col">
          <span className="text-[10px] uppercase text-zinc-500 tracking-wider">Total Biomass</span>
          <span className="text-sm font-bold text-cyan-400 mt-0.5">
            {telemetry.biomassPercent}%
          </span>
          <span className="text-[9px] text-zinc-500">grid coverage</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col">
          <span className="text-[10px] uppercase text-zinc-500 tracking-wider">Step Clock</span>
          <span className="text-sm font-bold text-purple-400 mt-0.5">
            #{telemetry.step}
          </span>
          <span className="text-[9px] text-zinc-500">asynchronous</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col">
          <span className="text-[10px] uppercase text-zinc-500 tracking-wider">Engine Speed</span>
          <span className="text-sm font-bold text-amber-400 mt-0.5">
            {telemetry.fps} FPS
          </span>
          <span className="text-[9px] text-zinc-500">local browser</span>
        </div>
      </div>

      {/* Selected Organism Bio-Summary */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-300 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-zinc-200">
            {selectedOrganism.scientificName}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Seed Channels: 16
          </span>
        </div>
        <p className="text-zinc-400 text-[11px] leading-relaxed">
          {selectedOrganism.description}
        </p>
      </div>
    </div>
  );
};
