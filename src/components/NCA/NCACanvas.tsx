"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { NCAEngine } from "@/lib/nca/NCAEngine";
import { BrushMode } from "@/types/nca";

interface NCACanvasProps {
  engine: NCAEngine | null;
  isRunning: boolean;
  brushMode: BrushMode;
  brushRadius: number;
}

export const NCACanvas: React.FC<NCACanvasProps> = ({
  engine,
  isRunning,
  brushMode,
  brushRadius,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Convert mouse/touch client coordinates to grid coordinates (0..gridSize-1)
  const getGridCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !engine) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      const gridX = Math.max(0, Math.min(engine.width - 1, normX * engine.width));
      const gridY = Math.max(0, Math.min(engine.height - 1, normY * engine.height));

      return {
        gridX,
        gridY,
        canvasX: clientX - rect.left,
        canvasY: clientY - rect.top,
      };
    },
    [engine]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    const coords = getGridCoords(e.clientX, e.clientY);
    if (coords && engine) {
      engine.applyBrush(coords.gridX, coords.gridY, brushMode);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e.clientX, e.clientY);
    if (coords) {
      setHoverCoords({
        x: Math.floor(coords.gridX),
        y: Math.floor(coords.gridY),
      });
      setCursorPos({ x: coords.canvasX, y: coords.canvasY });

      if (isPointerDownRef.current && engine) {
        engine.applyBrush(coords.gridX, coords.gridY, brushMode);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Safely ignore capture release errors
    }
    isPointerDownRef.current = false;
  };

  const handlePointerLeave = () => {
    isPointerDownRef.current = false;
    setHoverCoords(null);
    setCursorPos(null);
  };

  // Continuous animation and rendering loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (engine && canvasRef.current) {
        if (isRunning) {
          engine.step();
        }
        const canvas = canvasRef.current;
        engine.renderToCanvas(canvas, canvas.width, canvas.height);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [engine, isRunning]);

  // Determine cursor ring visual style based on brush mode
  const getCursorGlow = () => {
    switch (brushMode) {
      case "scalpel":
        return "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] bg-red-500/20";
      case "seed":
        return "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] bg-emerald-400/20";
      case "mutagen":
        return "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] bg-yellow-400/20";
      case "nutrient":
        return "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] bg-cyan-400/20";
      case "eraser":
        return "border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] bg-rose-500/20";
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square max-w-[620px] mx-auto rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/[0.08] bg-[#07070a] shadow-[0_12px_45px_rgba(0,0,0,0.4)] select-none group touch-none"
    >
      <canvas
        ref={canvasRef}
        width={480}
        height={480}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Interactive Brush Reticle Following Mouse */}
      {cursorPos && (
        <div
          className={`absolute rounded-full pointer-events-none transition-transform duration-75 border-2 ${getCursorGlow()}`}
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${Math.max(16, (brushRadius / (engine?.width || 76)) * 480 * 2)}px`,
            height: `${Math.max(16, (brushRadius / (engine?.width || 76)) * 480 * 2)}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Laser Crosshair Center Dot */}
          <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        </div>
      )}

      {/* Top Left Bio-Status Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 border border-white/10 text-zinc-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {engine?.organism.scientificName || "MORPHOGENIC MATRIX"}
        </span>
      </div>

      {/* Bottom Coordinates & Tool Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono pointer-events-none">
        <div className="px-2 py-1 rounded backdrop-blur-md bg-black/60 border border-white/10 text-zinc-400">
          {hoverCoords ? (
            <span>
              CELL: <strong className="text-cyan-400">({hoverCoords.x}, {hoverCoords.y})</strong>
            </span>
          ) : (
            <span>HOVER TO INSPECT CELLS</span>
          )}
        </div>

        <div className="px-2 py-1 rounded backdrop-blur-md bg-black/60 border border-white/10 uppercase tracking-widest text-zinc-300">
          TOOL: <strong className="text-emerald-400">{brushMode}</strong> (R: {brushRadius}px)
        </div>
      </div>
    </div>
  );
};
