"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { NCAEngine } from "@/lib/nca/NCAEngine";
import { ORGANISM_PRESETS, STENCIL_PRESETS } from "@/lib/nca/presets";
import { NCATelemetry, CustomShapeType } from "@/types/nca";

export default function NCASimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<NCAEngine | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentId, setCurrentId] = useState<string>("gecko");
  const [telemetry, setTelemetry] = useState<NCATelemetry>({
    step: 0,
    aliveCells: 0,
    totalCells: 5776,
    biomassPercent: 0,
    averageEntropy: 0,
    regenerationHealth: 100,
    fps: 60,
    isDamaged: false,
    recoveryTimeMs: 0,
    targetOrganism: "Cyber Gecko",
  });

  // Coordinate mapper
  const getGridCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const normX = (clientX - rect.left) / rect.width;
    const normY = (clientY - rect.top) / rect.height;

    const gridX = Math.max(0, Math.min(engine.width - 1, normX * engine.width));
    const gridY = Math.max(0, Math.min(engine.height - 1, normY * engine.height));

    return { gridX, gridY };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    const coords = getGridCoords(e.clientX, e.clientY);
    if (coords && engineRef.current) {
      engineRef.current.applyBrush(coords.gridX, coords.gridY, "scalpel");
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPointerDownRef.current && engineRef.current) {
      const coords = getGridCoords(e.clientX, e.clientY);
      if (coords) {
        engineRef.current.applyBrush(coords.gridX, coords.gridY, "scalpel");
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Safely ignore
    }
    isPointerDownRef.current = false;
  };

  // Initialize engine with organic biological healing rate
  useEffect(() => {
    const engine = new NCAEngine(
      "gecko",
      {
        gridSize: 76,
        speedMultiplier: 1, // Single step per frame for smooth visible mitosis
        regenSpeed: "gentle", // Gentle healing speed so visitors clearly watch tissue self-repair!
        brushRadius: 4,
        brushMode: "scalpel",
        displayMode: "rgba",
        glowIntensity: 0.45,
        soundEnabled: false,
      },
      (newTel) => {
        setTelemetry(newTel);
      }
    );

    engineRef.current = engine;
    setIsPlaying(true);

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      if (engine.getIsRunning()) {
        engine.step();
      }
      engine.renderToCanvas(canvas, canvas.width, canvas.height);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      engine.setRunning(false);
    };
  }, []);

  const handleTogglePlay = () => {
    if (!engineRef.current) return;
    const next = !isPlaying;
    setIsPlaying(next);
    engineRef.current.setRunning(next);
  };

  const handleSlice = () => {
    if (!engineRef.current) return;
    engineRef.current.triggerStressTest();
  };

  const handleSwitchTarget = (id: string, isStencil: boolean = false) => {
    if (!engineRef.current) return;
    setCurrentId(id);
    if (isStencil) {
      engineRef.current.setCustomStencil(id as CustomShapeType, true);
    } else {
      engineRef.current.setOrganism(id, true);
    }
  };

  const handlePlantSeed = () => {
    if (!engineRef.current) return;
    engineRef.current.resetToSeed();
  };

  const isHealthy = telemetry.regenerationHealth >= 90;

  // Presets list for quick switching
  const quickItems = [
    { id: "gecko", icon: "🦎", name: "Gecko", isStencil: false },
    { id: "blossom", icon: "🌸", name: "Blossom", isStencil: false },
    { id: "star", icon: "⭐", name: "Star", isStencil: true },
    { id: "heart", icon: "💖", name: "Heart", isStencil: true },
    { id: "alien", icon: "👾", name: "Alien", isStencil: true },
  ];

  return (
    <div className="flex flex-col justify-between h-full font-mono text-xs select-none">
      {/* Telemetry Header */}
      <div className="grid grid-cols-4 gap-2 pb-2.5 border-b border-white/[0.06] text-center">
        <div className="flex flex-col bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-500 uppercase">Organism</span>
          <span className="font-bold text-zinc-200 truncate mt-0.5">
            {quickItems.find((p) => p.id === currentId)?.icon || "🧫"}{" "}
            {quickItems.find((p) => p.id === currentId)?.name || currentId}
          </span>
        </div>

        <div className="flex flex-col bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-500 uppercase">Regeneration</span>
          <span
            className={`font-bold mt-0.5 ${
              isHealthy ? "text-emerald-400" : "text-amber-400 animate-pulse"
            }`}
          >
            {telemetry.regenerationHealth}%
          </span>
        </div>

        <div className="flex flex-col bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-500 uppercase">Biomass</span>
          <span className="font-bold text-cyan-400 mt-0.5">
            {telemetry.biomassPercent}%
          </span>
        </div>

        <div className="flex flex-col bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
          <span className="text-[9px] text-zinc-500 uppercase">Speed</span>
          <span className="font-bold text-purple-400 mt-0.5">
            {telemetry.fps} FPS
          </span>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="relative w-full h-[185px] my-1 rounded-xl overflow-hidden border border-white/[0.06] bg-[#07070a] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={185}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full object-contain block touch-none cursor-crosshair"
        />

        {/* Scalpel Drag Hint Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[9px] border border-white/10 text-zinc-300 pointer-events-none">
          <span className="text-red-400">🔪</span>
          <span>Click & Drag to slice tissue</span>
        </div>

        {/* Quick Organism / Shape Selector Overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm p-1 rounded-md border border-white/[0.08] text-[9px]">
          {quickItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSwitchTarget(item.id, item.isStencil)}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                currentId === item.id
                  ? "bg-emerald-500 text-black font-bold shadow-sm"
                  : "bg-white/[0.05] text-zinc-400 hover:text-white"
              }`}
              title={item.name}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Action Controls & Deep Dive Button */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTogglePlay}
            className="px-2.5 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.06] text-[10px] transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{isPlaying ? "⏸" : "▶"}</span>
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={handleSlice}
            className="px-2.5 py-1.5 rounded bg-red-950/30 text-red-300 border border-red-500/30 hover:bg-red-950/50 text-[10px] transition-all cursor-pointer flex items-center gap-1"
            title="Slice tissue to test self-healing"
          >
            <span>🔪</span>
            <span>Slice</span>
          </button>

          <button
            onClick={handlePlantSeed}
            className="px-2 py-1.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/50 text-[10px] transition-all cursor-pointer flex items-center gap-1"
            title="Restart organism from a single seed"
          >
            <span>🌱</span>
            <span className="hidden sm:inline">Seed</span>
          </button>
        </div>

        <Link
          href="/nca"
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] sm:text-[11px] transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-1.5"
        >
          <span>Open Full Bio-Lab</span>
          <span>↗</span>
        </Link>
      </div>
    </div>
  );
}
