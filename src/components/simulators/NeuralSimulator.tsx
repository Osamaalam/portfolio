"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SimulationEngine } from "@/lib/simulation/SimulationEngine";
import { GenerationStats } from "@/types/simulation";
import { ARENA_WIDTH, ARENA_HEIGHT } from "@/lib/simulation/levels";

export default function NeuralSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [cursorMode, setCursorMode] = useState<"crosshair" | "grab" | "grabbing">("crosshair");

  const isDraggingTargetRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const [stats, setStats] = useState<GenerationStats>({
    generation: 1,
    bestFitness: 0,
    averageFitness: 0,
    worstFitness: 0,
    bestDistance: 0,
    survivalRate: 100,
    targetSuccessRate: 0,
    aliveCount: 35,
    totalPopulation: 35,
    level: 1,
    elapsedFrames: 0,
  });

  const getArenaCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const canvasAspect = ARENA_WIDTH / ARENA_HEIGHT;
    const rectAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offX = 0;
    let offY = 0;

    if (rectAspect > canvasAspect) {
      renderH = rect.height;
      renderW = renderH * canvasAspect;
      offX = (rect.width - renderW) / 2;
    } else {
      renderW = rect.width;
      renderH = renderW / canvasAspect;
      offY = (rect.height - renderH) / 2;
    }

    const localX = clientX - rect.left - offX;
    const localY = clientY - rect.top - offY;

    return {
      x: Math.max(0, Math.min(ARENA_WIDTH, (localX / renderW) * ARENA_WIDTH)),
      y: Math.max(0, Math.min(ARENA_HEIGHT, (localY / renderH) * ARENA_HEIGHT)),
    };
  }, []);

  useEffect(() => {
    const engine = new SimulationEngine(
      {
        populationSize: 35,
        mutationRate: 0.08,
        mutationStrength: 0.35,
        speedMultiplier: 1,
        showTrails: true,
        showSensorRays: true,
        sharkEnabled: true,
        sharkAggression: "normal",
      },
      {
        onTick: (currentStats) => {
          setStats(currentStats);
        },
      }
    );

    engineRef.current = engine;
    engine.start();
    setIsPlaying(true);

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      // 1. Advance physics in lockstep if engine is running
      if (engine.isRunning) {
        engine.stepWithSpeed();
      }

      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Subtle technical grid
      const gridSize = 40;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < ARENA_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
      }
      for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
      }
      ctx.stroke();

      // Walls
      for (const w of engine.environment.walls) {
        if (w.type === "outer") {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 3.5;
        }
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
      }

      // Target Checkpoint
      const target = engine.environment.target;
      const t = performance.now() * 0.003;
      const isDragging = isDraggingTargetRef.current;

      ctx.strokeStyle = isDragging ? "#22d3ee" : "#10b981";
      ctx.fillStyle = isDragging ? "rgba(6, 182, 212, 0.25)" : "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = isDragging ? 3 : 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius + Math.sin(t) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Drag tag
      if (isDragging) {
        ctx.save();
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#22d3ee";
        ctx.textAlign = "center";
        ctx.fillText("✦ DRAGGING", target.x, target.y - target.radius - 8);
        ctx.restore();
      }

      // Fish Trails
      ctx.lineWidth = 1;
      for (const fish of engine.population) {
        if (!fish.alive || fish.trail.length < 2) continue;
        ctx.strokeStyle = fish.isElite
          ? "rgba(6, 182, 212, 0.3)"
          : "rgba(244, 63, 94, 0.2)";
        ctx.beginPath();
        ctx.moveTo(fish.trail[0].x, fish.trail[0].y);
        for (let i = 1; i < fish.trail.length; i++) {
          ctx.lineTo(fish.trail[i].x, fish.trail[i].y);
        }
        ctx.stroke();
      }

      // Particles
      for (const p of engine.particles) {
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Fish Agents
      const selFish = engine.getSelectedFish();
      for (const fish of engine.population) {
        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);

        if (!fish.alive) {
          ctx.fillStyle = fish.reachedTarget ? "#10b981" : "#475569";
          ctx.globalAlpha = 0.3;
        } else {
          ctx.fillStyle = fish.isElite ? "#06b6d4" : "#f43f5e";
          ctx.globalAlpha = 1.0;
        }

        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-7, -4.5);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-7, 4.5);
        ctx.closePath();
        ctx.fill();

        // If selected agent, draw glowing highlight ring
        if (selFish && fish.id === selFish.id) {
          ctx.rotate(-fish.angle);
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#facc15";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Selected fish rays
      const sel = engine.getSelectedFish();
      if (sel && sel.alive) {
        ctx.save();
        ctx.strokeStyle = "rgba(6, 182, 212, 0.6)";
        ctx.lineWidth = 1;
        for (const r of sel.lastRays) {
          if (r.hit) {
            ctx.beginPath();
            ctx.moveTo(r.startX, r.startY);
            ctx.lineTo(r.hitX, r.hitY);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Shark Blood Particles
      if (engine.bloodParticles && engine.bloodParticles.length > 0) {
        for (const b of engine.bloodParticles) {
          const alpha = Math.max(0, 1 - b.life / b.maxLife);
          ctx.fillStyle = b.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      // Apex Shark Predator
      if (engine.config.sharkEnabled && engine.shark) {
        const s = engine.shark;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        // Body
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = s.state === "LUNGING" ? "#ef4444" : "#0284c7";
        ctx.lineWidth = 1.5;
        if (s.state === "LUNGING") {
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 10;
        }

        const tailWag = Math.sin(s.tailPhase) * 4;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.quadraticCurveTo(12, -9, 0, -8);
        ctx.lineTo(-16, -3);
        ctx.lineTo(-24, -10 + tailWag);
        ctx.lineTo(-20, tailWag);
        ctx.lineTo(-24, 10 + tailWag);
        ctx.lineTo(-16, 3);
        ctx.quadraticCurveTo(0, 8, 12, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dorsal fin
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(2, -2);
        ctx.lineTo(-3, -11);
        ctx.lineTo(-6, -2);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(12, -4.5, 1.8, 0, Math.PI * 2);
        ctx.arc(12, 4.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      engine.destroy();
    };
  }, []);

  const handleTogglePlay = () => {
    if (!engineRef.current) return;
    const running = engineRef.current.togglePlay();
    setIsPlaying(running);
  };

  const handleNextGen = () => {
    if (engineRef.current) {
      engineRef.current.nextGeneration();
    }
  };

  const handleSwitchLevel = (lvlId: number) => {
    if (!engineRef.current) return;
    engineRef.current.setLevel(lvlId);
    engineRef.current.start();
    setCurrentLevelId(lvlId);
    setIsPlaying(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const coords = getArenaCoords(e.clientX, e.clientY);
    if (!coords) return;

    pointerStartPosRef.current = coords;
    const target = engineRef.current.environment.target;
    const distToTarget = Math.hypot(coords.x - target.x, coords.y - target.y);

    if (distToTarget <= target.radius + 18) {
      isDraggingTargetRef.current = true;
      setCursorMode("grabbing");
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    } else {
      isDraggingTargetRef.current = false;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const coords = getArenaCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (isDraggingTargetRef.current) {
      engineRef.current.setTargetPosition(coords.x, coords.y);
      setCursorMode("grabbing");
    } else {
      const target = engineRef.current.environment.target;
      const distToTarget = Math.hypot(coords.x - target.x, coords.y - target.y);
      if (distToTarget <= target.radius + 18) {
        setCursorMode("grab");
      } else {
        setCursorMode("crosshair");
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const coords = getArenaCoords(e.clientX, e.clientY);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (isDraggingTargetRef.current) {
      isDraggingTargetRef.current = false;
      setCursorMode("crosshair");
    } else if (coords && pointerStartPosRef.current) {
      const movedDist = Math.hypot(
        coords.x - pointerStartPosRef.current.x,
        coords.y - pointerStartPosRef.current.y
      );

      if (movedDist < 8) {
        engineRef.current.selectFishAt(coords.x, coords.y, 40);
      }
    }

    pointerStartPosRef.current = null;
  };

  return (
    <div className="flex-1 flex flex-col justify-between min-h-full font-mono text-xs select-none">
      {/* Title Bar & Status Badges */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.05] gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
            Neural Lab
          </span>
          <span className="text-[10px] text-zinc-500 hidden xl:inline truncate">• Drag beacon</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] whitespace-nowrap shrink-0">
          <span className="text-zinc-400">
            GEN <span className="text-white font-bold">{String(stats.generation).padStart(2, "0")}</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">
            ALIVE <span className="text-emerald-400 font-bold">{stats.aliveCount}</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">
            BEST <span className="text-cyan-400 font-bold">{stats.bestFitness.toFixed(0)}</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-red-400 font-bold flex items-center gap-0.5" title="Devoured by Shark Predator">
            <span>🦈</span>
            <span>{stats.sharkKills ?? 0}</span>
          </span>
        </div>
      </div>

      {/* Mini Simulation Canvas Arena */}
      <div className="relative my-2 w-full h-[190px] rounded-lg overflow-hidden border border-white/[0.06] bg-[#07080c]">
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            isDraggingTargetRef.current = false;
            setCursorMode("crosshair");
          }}
          style={{ cursor: cursorMode }}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Quick Map Selector Overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-md border border-white/[0.08] text-[9px]">
          <span className="text-zinc-500 mr-1">LVL:</span>
          {[1, 2, 3, 5].map((lvl) => (
            <button
              key={lvl}
              onClick={() => handleSwitchLevel(lvl)}
              className={`w-4 h-4 rounded text-[9px] font-bold transition-all ${
                currentLevelId === lvl
                  ? "bg-cyan-500 text-black"
                  : "bg-white/[0.05] text-zinc-400 hover:text-white"
              }`}
            >
              {lvl}
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
            onClick={handleNextGen}
            className="px-2.5 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] transition-all cursor-pointer flex items-center gap-1"
            title="Evolve population to next generation"
          >
            <span>🧬</span>
            <span>Next Gen</span>
          </button>

          <button
            onClick={() => {
              if (engineRef.current) {
                const next = !engineRef.current.config.sharkEnabled;
                engineRef.current.setSharkEnabled(next);
              }
            }}
            className="px-2 py-1.5 rounded bg-red-950/30 text-red-300 border border-red-500/30 hover:bg-red-950/50 text-[10px] transition-all cursor-pointer flex items-center gap-1"
            title="Toggle Apex Shark Predator ON/OFF"
          >
            <span>🦈</span>
            <span className="hidden sm:inline">Shark</span>
          </button>
        </div>

        <Link
          href="/neural-evolution"
          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] sm:text-[11px] transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5"
        >
          <span>Open Full Sandbox</span>
          <span>↗</span>
        </Link>
      </div>
    </div>
  );
}
