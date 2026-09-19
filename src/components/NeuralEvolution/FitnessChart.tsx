"use client";

import React, { useRef, useEffect } from "react";
import { GenerationStats } from "@/types/simulation";

interface FitnessChartProps {
  history: GenerationStats[];
  currentStats: GenerationStats;
}

export const FitnessChart: React.FC<FitnessChartProps> = ({
  history,
  currentStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear background
    ctx.fillStyle = "#08090e";
    ctx.fillRect(0, 0, width, height);

    // Combine history with live generation stats for continuous real-time graph
    const dataPoints: Array<{ gen: number; best: number; avg: number }> = [
      ...history.map((h) => ({
        gen: h.generation,
        best: h.bestFitness,
        avg: h.averageFitness,
      })),
      {
        gen: currentStats.generation,
        best: currentStats.bestFitness,
        avg: currentStats.averageFitness,
      },
    ];

    const padding = { top: 25, right: 25, bottom: 25, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Grid lines & Axis labels
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    // Find max fitness across history
    let maxFitness = 100;
    for (const d of dataPoints) {
      if (d.best > maxFitness) maxFitness = d.best;
    }
    // Round up max to clean nice number
    maxFitness = Math.ceil((maxFitness * 1.15) / 50) * 50;

    // Horizontal grid lines & Y labels
    const ySteps = 4;
    ctx.font = "9px monospace";
    ctx.fillStyle = "#71717a";
    ctx.textAlign = "right";

    for (let i = 0; i <= ySteps; i++) {
      const yVal = (maxFitness / ySteps) * i;
      const yPos = padding.top + chartH - (i / ySteps) * chartH;

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.fillText(yVal.toFixed(0), padding.left - 6, yPos + 3);
    }

    // X Axis ticks
    const maxGen = Math.max(5, dataPoints[dataPoints.length - 1].gen);
    ctx.textAlign = "center";
    const xSteps = Math.min(maxGen, 6);
    for (let i = 0; i <= xSteps; i++) {
      const genNum = Math.max(1, Math.round((maxGen / xSteps) * i));
      const xPos = padding.left + (genNum / maxGen) * chartW;

      ctx.fillText(`G${genNum}`, xPos, height - 8);
    }

    if (dataPoints.length < 2) {
      // Just one point yet
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "COLLECTING GENERATION DATA...",
        padding.left + chartW / 2,
        padding.top + chartH / 2
      );
      return;
    }

    const getX = (gen: number) => padding.left + (gen / maxGen) * chartW;
    const getY = (val: number) =>
      padding.top + chartH - (Math.max(0, val) / maxFitness) * chartH;

    // 2. Draw Average Fitness Line & Area (Purple)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(getX(dataPoints[0].gen), getY(dataPoints[0].avg));
    for (let i = 1; i < dataPoints.length; i++) {
      ctx.lineTo(getX(dataPoints[i].gen), getY(dataPoints[i].avg));
    }
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Area fill
    ctx.lineTo(getX(dataPoints[dataPoints.length - 1].gen), padding.top + chartH);
    ctx.lineTo(getX(dataPoints[0].gen), padding.top + chartH);
    ctx.closePath();
    const avgGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    avgGrad.addColorStop(0, "rgba(168, 85, 247, 0.15)");
    avgGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = avgGrad;
    ctx.fill();
    ctx.restore();

    // 3. Draw Best Fitness Line & Area (Cyan)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(getX(dataPoints[0].gen), getY(dataPoints[0].best));
    for (let i = 1; i < dataPoints.length; i++) {
      ctx.lineTo(getX(dataPoints[i].gen), getY(dataPoints[i].best));
    }
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Area fill
    ctx.lineTo(getX(dataPoints[dataPoints.length - 1].gen), padding.top + chartH);
    ctx.lineTo(getX(dataPoints[0].gen), padding.top + chartH);
    ctx.closePath();
    const bestGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    bestGrad.addColorStop(0, "rgba(6, 182, 212, 0.25)");
    bestGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
    ctx.fillStyle = bestGrad;
    ctx.fill();

    // Point dots along best curve
    for (const p of dataPoints) {
      const px = getX(p.gen);
      const py = getY(p.best);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [history, currentStats]);

  return (
    <div className="sh-dark-card w-full bg-[#08090e] rounded-xl border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-4 flex flex-col gap-2 select-none">
      {/* Header with Legend */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider">
            Evolutionary Progress Graph
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-cyan-400"></span>
            <span className="text-cyan-400 font-semibold">Best Fitness</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-purple-400"></span>
            <span className="text-purple-400 font-semibold">Avg Fitness</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full h-[140px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full h-full object-contain block"
        />
      </div>
    </div>
  );
};
