"use client";

import React from "react";
import { SelectedAgentTelemetry, SharkTelemetry } from "@/types/simulation";
import { SENSOR_LABELS } from "@/lib/simulation/SensorSystem";

interface AgentPanelProps {
  telemetry: SelectedAgentTelemetry | null;
  onSelectAgent?: (id: number) => void;
  totalPopulation?: number;
  sharkTelemetry?: SharkTelemetry | null;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  telemetry,
  onSelectAgent,
  totalPopulation = 50,
  sharkTelemetry,
}) => {
  const currentId = telemetry?.id ?? 1;

  const handlePrev = () => {
    if (!onSelectAgent) return;
    const prevId = currentId > 1 ? currentId - 1 : totalPopulation;
    onSelectAgent(prevId);
  };

  const handleNext = () => {
    if (!onSelectAgent) return;
    const nextId = currentId < totalPopulation ? currentId + 1 : 1;
    onSelectAgent(nextId);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onSelectAgent) return;
    const id = parseInt(e.target.value, 10);
    if (!isNaN(id)) {
      onSelectAgent(id);
    }
  };

  if (!telemetry) {
    return (
      <div className="sh-dark-card w-full bg-[#08090e] rounded-xl border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-4 flex flex-col justify-center items-center text-center font-mono text-zinc-400 text-xs">
        <span className="text-zinc-400">NO AGENT SELECTED</span>
        <span className="text-[10px] text-zinc-400 mt-1">
          Click any fish in the simulation arena or choose an agent below.
        </span>
        {onSelectAgent && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onSelectAgent(1)}
              className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
            >
              Select Agent #1
            </button>
          </div>
        )}
      </div>
    );
  }

  const turnOutput = telemetry.outputs[0] ?? 0;
  const thrustOutput = telemetry.outputs[1] ?? 0;

  // State color badge
  let stateBadgeColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  let stateLabel = telemetry.state.replace("_", " ");
  if (telemetry.state === "TARGET_REACHED") {
    stateBadgeColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    stateLabel = "REACHED BEACON";
  } else if (telemetry.state === "EATEN") {
    stateBadgeColor = "text-red-400 bg-red-500/25 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
    stateLabel = "DEVOURED BY SHARK 🦈";
  } else if (telemetry.state === "CRASHED") {
    stateBadgeColor = "text-red-400 bg-red-400/10 border-red-400/30";
    stateLabel = "CRASHED INTO WALL";
  } else if (telemetry.state === "TIMEOUT") {
    stateBadgeColor = "text-zinc-400 bg-zinc-400/10 border-zinc-400/30";
  }

  // Distance to predator shark
  const distToShark =
    sharkTelemetry && sharkTelemetry.enabled
      ? Math.hypot(sharkTelemetry.x - telemetry.x, sharkTelemetry.y - telemetry.y)
      : null;
  const isTargetOfShark =
    sharkTelemetry?.enabled && sharkTelemetry?.targetFishId === telemetry.id;

  return (
    <div className="sh-dark-card w-full bg-[#08090e] rounded-xl border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-4 flex flex-col gap-3 font-mono text-xs select-none">
      {/* Panel Header with Agent Selector Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider">
            Agent:
          </span>

          {/* Quick Prev / Next & Select Dropdown */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded border border-white/[0.08]">
            {onSelectAgent && (
              <button
                onClick={handlePrev}
                className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded transition-all cursor-pointer text-[10px]"
                title="Previous Agent"
              >
                ◀
              </button>
            )}

            <select
              value={currentId}
              onChange={handleSelectChange}
              className="bg-transparent text-yellow-400 font-bold text-xs px-1 py-0.5 cursor-pointer outline-none border-none"
              title="Select specific agent to track across generations"
            >
              {Array.from({ length: totalPopulation }, (_, idx) => idx + 1).map((id) => (
                <option
                  key={id}
                  value={id}
                  className="bg-[#08090e] text-zinc-300 py-1"
                >
                  Agent #{id} {id === currentId && telemetry.isElite ? "(Elite)" : ""}
                </option>
              ))}
            </select>

            {onSelectAgent && (
              <button
                onClick={handleNext}
                className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded transition-all cursor-pointer text-[10px]"
                title="Next Agent"
              >
                ▶
              </button>
            )}
          </div>

          {telemetry.isElite && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
              ELITE
            </span>
          )}

          <span
            className="text-[9px] text-zinc-500 hidden sm:inline"
            title="Your selected agent stays selected through each generation"
          >
            • Locked across gens
          </span>
        </div>

        <div
          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${stateBadgeColor}`}
        >
          {stateLabel}
        </div>
      </div>

      {/* Shark Predator Proximity Alert Banner */}
      {sharkTelemetry && sharkTelemetry.enabled && (
        <div
          className={`p-2 rounded border flex items-center justify-between text-[11px] transition-colors ${
            isTargetOfShark
              ? "bg-red-950/40 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse"
              : distToShark !== null && distToShark < 120
              ? "bg-red-950/20 border-red-500/30 text-red-400"
              : "bg-[#0c0d14] border-white/[0.04] text-zinc-400"
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span>🦈</span>
            <span>
              {isTargetOfShark
                ? `⚠️ SHARK LOCKED ON AGENT #${telemetry.id}!`
                : "Predator Radar:"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className={isTargetOfShark ? "text-red-200 font-bold" : "text-zinc-300"}>
              {distToShark !== null ? `${distToShark.toFixed(0)} px away` : "Tracking"}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400">
              [{sharkTelemetry.state}]
            </span>
          </div>
        </div>
      )}

      {/* Real-time Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {/* Fitness */}
        <div className="bg-[#0c0d14] p-2 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-400 uppercase">Fitness</span>
          <div className="text-cyan-400 font-bold text-sm mt-0.5">
            {telemetry.fitness.toFixed(1)}
          </div>
        </div>

        {/* Speed */}
        <div className="bg-[#0c0d14] p-2 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-400 uppercase">Speed</span>
          <div className="text-white font-bold text-sm mt-0.5">
            {telemetry.speed.toFixed(2)} <span className="text-[9px] text-zinc-400">px/f</span>
          </div>
        </div>

        {/* Target Distance */}
        <div className="bg-[#0c0d14] p-2 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-400 uppercase">Target Dist</span>
          <div className="text-emerald-400 font-bold text-sm mt-0.5">
            {telemetry.targetDistance.toFixed(0)} <span className="text-[9px] text-zinc-400">px</span>
          </div>
        </div>

        {/* Age / Survival Frames */}
        <div className="bg-[#0c0d14] p-2 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-400 uppercase">Age</span>
          <div className="text-purple-400 font-bold text-sm mt-0.5">
            {telemetry.age} <span className="text-[9px] text-zinc-400">frames</span>
          </div>
        </div>
      </div>

      {/* Network Actuator Outputs */}
      <div className="bg-[#0c0d14] p-2.5 rounded border border-white/[0.04] flex flex-col gap-2">
        <span className="text-[9px] text-zinc-400 uppercase tracking-wider">
          Neural Motor Actuators
        </span>
        <div className="grid grid-cols-2 gap-3">
          {/* Turn */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-400">Steer (Turn):</span>
              <span className={turnOutput >= 0 ? "text-cyan-400" : "text-pink-400"}>
                {turnOutput >= 0 ? `+${turnOutput.toFixed(2)}` : turnOutput.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden relative">
              <div
                className={`absolute top-0 bottom-0 ${
                  turnOutput >= 0 ? "bg-cyan-400" : "bg-pink-500"
                }`}
                style={{
                  left: turnOutput >= 0 ? "50%" : `${50 + turnOutput * 50}%`,
                  width: `${Math.abs(turnOutput) * 50}%`,
                }}
              />
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2" />
            </div>
          </div>

          {/* Thrust */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-400">Propulsion (Thrust):</span>
              <span className="text-emerald-400">
                {(thrustOutput * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-75"
                style={{ width: `${Math.max(0, Math.min(100, thrustOutput * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 8 Sensor Ray Inputs */}
      <div className="bg-[#0c0d14] p-2.5 rounded border border-white/[0.04] flex flex-col gap-1.5">
        <span className="text-[9px] text-zinc-400 uppercase tracking-wider">
          8-Point Environmental Sensor Array
        </span>
        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
          {SENSOR_LABELS.map((label, idx) => {
            const val = telemetry.inputs[idx] ?? 0;
            return (
              <div
                key={label}
                className="bg-zinc-950/60 p-1.5 rounded border border-white/[0.03] flex flex-col"
              >
                <span className="text-zinc-400 text-[9px]">{label}</span>
                <span className="text-cyan-300 font-bold">
                  {val >= 0 ? val.toFixed(2) : val.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
