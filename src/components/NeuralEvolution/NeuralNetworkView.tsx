"use client";

import React, { useRef, useEffect } from "react";
import { SelectedAgentTelemetry, SharkTelemetry } from "@/types/simulation";

interface NeuralNetworkViewProps {
  telemetry: SelectedAgentTelemetry | null;
  sharkTelemetry?: SharkTelemetry | null;
}

const OUTPUT_LABELS = ["turn", "thrust"];

export const NeuralNetworkView: React.FC<NeuralNetworkViewProps> = ({
  telemetry,
  sharkTelemetry,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef<SelectedAgentTelemetry | null>(telemetry);
  const sharkTelemetryRef = useRef<SharkTelemetry | null>(sharkTelemetry ?? null);

  // Keep telemetry refs in sync so animation loop runs smoothly at 60 FPS without tearing down
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  useEffect(() => {
    sharkTelemetryRef.current = sharkTelemetry ?? null;
  }, [sharkTelemetry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const currentTel = telemetryRef.current;

      // 1. Clear background
      ctx.fillStyle = "#08090e";
      ctx.fillRect(0, 0, width, height);

      // Subtle background grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      if (!currentTel || !currentTel.weights || currentTel.weights.length === 0) {
        ctx.fillStyle = "#71717a";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("AWAITING AGENT NEURAL TELEMETRY...", width / 2, height / 2);
        animId = requestAnimationFrame(render);
        return;
      }

      const layerSizes = currentTel.layerSizes || [8, 8, 6, 2];
      const activations = currentTel.activations || [];
      const weights = currentTel.weights;
      const rays = currentTel.rays || [];

      const currentShark = sharkTelemetryRef.current;

      // Distance to predator shark
      let isSharkThreat = false;
      if (currentTel && currentShark && currentShark.enabled) {
        const d = Math.hypot(currentShark.x - currentTel.x, currentShark.y - currentTel.y);
        isSharkThreat = d < 135;
      }

      // Check if rays detect shark or if in close acoustic threat range
      const isSharkAhead = rays[0]?.hitType === "shark" || (isSharkThreat && (currentTel.inputs[5] ?? 1) < 0.35);
      const isSharkLeft = rays[1]?.hitType === "shark" || (isSharkThreat && (currentTel.inputs[6] ?? 1) < 0.35);
      const isSharkRight = rays[2]?.hitType === "shark" || (isSharkThreat && (currentTel.inputs[7] ?? 1) < 0.35);

      // 4 layers layout
      const layerCount = layerSizes.length;
      const marginX = 145;
      const availableWidth = width - marginX * 2;
      const layerSpacing = availableWidth / (layerCount - 1);

      const nodeCoords: Array<Array<{ x: number; y: number }>> = [];

      for (let l = 0; l < layerCount; l++) {
        const count = layerSizes[l];
        const x = marginX + l * layerSpacing;
        const availableHeight = height - 50;
        const spacingY = availableHeight / (count + 1);
        const layerNodes: Array<{ x: number; y: number }> = [];

        for (let i = 0; i < count; i++) {
          const y = 25 + (i + 1) * spacingY;
          layerNodes.push({ x, y });
        }
        nodeCoords.push(layerNodes);
      }

      const now = performance.now() * 0.003;
      const isAlive = currentTel.alive;

      // 2. Render Synaptic Connections (Weights)
      for (let l = 0; l < weights.length; l++) {
        const fromLayer = nodeCoords[l];
        const toLayer = nodeCoords[l + 1];
        const layerWeights = weights[l];
        const fromActivations = activations[l] || [];

        for (let j = 0; j < layerWeights.length; j++) {
          const toNode = toLayer[j];
          const neuronWeights = layerWeights[j];

          for (let i = 0; i < neuronWeights.length; i++) {
            const fromNode = fromLayer[i];
            const weight = neuronWeights[i];
            const fromAct = fromActivations[i] ?? 0;

            const isPositive = weight >= 0;
            const absWeight = Math.abs(weight);
            const absAct = Math.abs(fromAct);

            // Signal transmission activity
            const signalStrength = absAct * absWeight;
            const alpha = isAlive
              ? Math.min(0.85, 0.08 + absWeight * 0.18 + signalStrength * 0.4)
              : 0.1;
            const lineWidth = Math.max(0.6, Math.min(3.0, 0.5 + absWeight * 0.7));

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);

            if (isPositive) {
              ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            } else {
              ctx.strokeStyle = `rgba(236, 72, 153, ${alpha})`;
            }

            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Draw traveling signal pulse if strong transmission and fish is alive
            if (isAlive && signalStrength > 0.4) {
              const pulsePos = (now * 2 + (i * 0.2 + j * 0.3)) % 1;
              const px = fromNode.x + (toNode.x - fromNode.x) * pulsePos;
              const py = fromNode.y + (toNode.y - fromNode.y) * pulsePos;

              ctx.fillStyle = isPositive ? "#22d3ee" : "#f472b6";
              ctx.shadowColor = isPositive ? "#22d3ee" : "#f472b6";
              ctx.shadowBlur = 6;
              ctx.beginPath();
              ctx.arc(px, py, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }
      }

      // 3. Render Neurons
      for (let l = 0; l < layerCount; l++) {
        const coords = nodeCoords[l];
        const layerActivations = activations[l] || [];

        for (let i = 0; i < coords.length; i++) {
          const { x, y } = coords[i];
          const act = layerActivations[i] ?? 0;
          const absAct = Math.abs(act);

          // Check if this input neuron is in predator danger
          const isDangerNeuron =
            l === 0 &&
            ((i === 5 && isSharkAhead) ||
              (i === 6 && isSharkLeft) ||
              (i === 7 && isSharkRight));

          ctx.save();

          // Outer Glow for active neurons
          if (isDangerNeuron) {
            ctx.shadowBlur = 16;
            ctx.shadowColor = "#ef4444";
          } else if (isAlive && absAct > 0.15) {
            ctx.shadowBlur = Math.min(18, 4 + absAct * 14);
            ctx.shadowColor = act >= 0 ? "#06b6d4" : "#ec4899";
          } else {
            ctx.shadowBlur = 0;
          }

          // Node Circle Fill
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);

          if (isDangerNeuron) {
            ctx.fillStyle = "#ef4444"; // Red alert for predator proximity
          } else if (!isAlive) {
            ctx.fillStyle = "#27272a"; // Dim gray if dead
          } else if (absAct < 0.08) {
            ctx.fillStyle = "#18181b"; // Inactive charcoal
          } else if (act >= 0) {
            // Active Positive: Bright Cyan
            const r = Math.floor(6 + absAct * 28);
            const g = Math.floor(182 + absAct * 30);
            const b = Math.floor(212);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          } else {
            // Active Negative: Vibrant Magenta
            const r = Math.floor(236);
            const g = Math.floor(72 + (1 - absAct) * 40);
            const b = Math.floor(153 + (1 - absAct) * 40);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          }
          ctx.fill();

          // Border ring
          ctx.strokeStyle = isDangerNeuron
            ? "#f87171"
            : absAct > 0.3 && isAlive
            ? "#ffffff"
            : "#3f3f46";
          ctx.lineWidth = isDangerNeuron ? 1.8 : 1.2;
          ctx.stroke();

          // Inner core dot
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = Math.max(0.2, absAct);
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // Labels for Input Layer (Left side)
          if (l === 0) {
            let labelText = "in " + i;
            let isAlert = false;

            if (i === 0) labelText = "bias";
            else if (i === 1) labelText = "dist";
            else if (i === 2) labelText = "dir x";
            else if (i === 3) labelText = "dir y";
            else if (i === 4) labelText = "closing";
            else if (i === 5) {
              labelText = isSharkAhead ? "SHARK ↑" : "wall ↑";
              isAlert = isSharkAhead;
            } else if (i === 6) {
              labelText = isSharkLeft ? "SHARK ↖" : "wall ↖";
              isAlert = isSharkLeft;
            } else if (i === 7) {
              labelText = isSharkRight ? "SHARK ↗" : "wall ↗";
              isAlert = isSharkRight;
            }

            ctx.save();
            ctx.font = isAlert ? "bold 10px monospace" : "10px monospace";
            ctx.textAlign = "right";
            ctx.fillStyle = isAlert
              ? "#ef4444"
              : absAct > 0.4 && isAlive
              ? "#22d3ee"
              : "#71717a";
            ctx.fillText(labelText, x - 18, y + 3);

            // Numeric value
            ctx.fillStyle = isAlert ? "#fca5a5" : "#a1a1aa";
            ctx.font = "9px monospace";
            ctx.fillText(act.toFixed(2), x - 68, y + 3);
            ctx.restore();
          }

          // Labels for Output Layer (Right side)
          if (l === layerCount - 1) {
            const label = OUTPUT_LABELS[i] || `out ${i}`;
            ctx.save();
            ctx.font = "11px monospace";
            ctx.textAlign = "left";
            ctx.fillStyle = i === 0 ? "#38bdf8" : "#34d399";
            ctx.fillText(label.toUpperCase(), x + 18, y + 3);

            // Numeric output value
            ctx.fillStyle = "#ffffff";
            ctx.font = "10px monospace";
            ctx.fillText(act >= 0 ? `+${act.toFixed(2)}` : act.toFixed(2), x + 74, y + 3);

            // Mini visual gauge bar
            const barW = 38;
            const barH = 5;
            const barX = x + 122;
            const barY = y - 2;

            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(barX, barY, barW, barH);

            if (i === 0) {
              // Turn [-1, 1] center zero bar
              const midX = barX + barW / 2;
              const fillW = (act / 1) * (barW / 2);
              ctx.fillStyle = act >= 0 ? "#38bdf8" : "#ec4899";
              ctx.fillRect(midX, barY, fillW, barH);
            } else {
              // Thrust [0, 1] left-to-right bar
              const fillW = Math.max(0, Math.min(1, act)) * barW;
              ctx.fillStyle = "#34d399";
              ctx.fillRect(barX, barY, fillW, barH);
            }

            ctx.restore();
          }
        }
      }

      // 4. Layer Architecture Header Badges
      ctx.save();
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";

      const titles = [
        "INPUT (8)",
        "HIDDEN 1 (8)",
        "HIDDEN 2 (6)",
        "OUTPUT (2)",
      ];

      for (let l = 0; l < layerCount; l++) {
        const x = nodeCoords[l][0].x;
        ctx.fillText(titles[l], x, 14);
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Agent State badge styling
  let stateBadge = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  let stateText = telemetry?.state ?? "IDLE";
  if (telemetry) {
    if (telemetry.state === "SEARCHING" && telemetry.alive) {
      stateBadge = "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
      stateText = "LIVE FIRING";
    } else if (telemetry.state === "TARGET_REACHED") {
      stateBadge = "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
      stateText = "TARGET SOLVED";
    } else if (telemetry.state === "CRASHED") {
      stateBadge = "text-red-400 bg-red-400/10 border-red-400/30";
      stateText = "CRASHED";
    } else if (telemetry.state === "EATEN") {
      stateBadge = "text-red-500 bg-red-500/20 border-red-500/40";
      stateText = "DEVOURED";
    } else if (telemetry.state === "TIMEOUT") {
      stateBadge = "text-zinc-400 bg-zinc-400/10 border-zinc-400/30";
      stateText = "TIMEOUT";
    }
  }

  // Shark threat telemetry for selected agent
  const sharkDist =
    sharkTelemetry && sharkTelemetry.enabled && telemetry
      ? Math.hypot(sharkTelemetry.x - telemetry.x, sharkTelemetry.y - telemetry.y)
      : null;
  const isSharkLocked =
    sharkTelemetry && sharkTelemetry.enabled && sharkTelemetry.targetFishId === telemetry?.id;

  return (
    <div className="sh-dark-card w-full bg-[#08090e] rounded-xl border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_10px_35px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      {/* Network Header with live telemetry badge */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0c0d14] text-xs font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-zinc-300 font-semibold tracking-wider uppercase text-[11px]">
            Selected Agent Neural Matrix
          </span>
          <span className="text-zinc-500 text-[10px] hidden sm:inline">
            [8 → 8 → 6 → 2 • 124 Weights • 16 Biases]
          </span>
          {sharkDist !== null && sharkDist < 135 && (
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${
                isSharkLocked
                  ? "bg-red-500/25 border-red-500/50 text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  : "bg-red-950/30 border-red-500/30 text-red-400"
              }`}
            >
              <span>🦈</span>
              <span>
                {isSharkLocked ? `PREDATOR LOCK-ON (${sharkDist.toFixed(0)}px)` : `SHARK: ${sharkDist.toFixed(0)}px`}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[10px]">
          <div className="hidden md:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-cyan-400"></span>
            <span className="text-zinc-400">+ Weight</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-pink-500"></span>
            <span className="text-zinc-400">- Weight</span>
          </div>
          <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded border border-white/[0.05] text-zinc-300">
            ID: <span className="text-yellow-400 font-bold">#{telemetry?.id ?? "--"}</span>
            {telemetry?.isElite && <span className="text-cyan-400 font-bold ml-0.5">★</span>}
          </div>
          <div className={`px-2 py-0.5 rounded border uppercase font-bold text-[9px] ${stateBadge}`}>
            {stateText}
          </div>
        </div>
      </div>

      {/* Network Canvas */}
      <div className="relative w-full h-[220px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={880}
          height={220}
          className="w-full h-full object-contain block"
        />
      </div>
    </div>
  );
};
