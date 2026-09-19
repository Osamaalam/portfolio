"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { SimulationEngine } from "@/lib/simulation/SimulationEngine";
import { Fish } from "@/lib/simulation/Fish";
import { Shark } from "@/lib/simulation/Shark";
import { ARENA_WIDTH, ARENA_HEIGHT } from "@/lib/simulation/levels";

interface SimulationCanvasProps {
  engine: SimulationEngine | null;
  onSelectFish?: (id: number) => void;
  selectedFishId: number | null;
  showSensorRays: boolean;
  showTrails: boolean;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  engine,
  onSelectFish,
  selectedFishId,
  showSensorRays,
  showTrails,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cursorMode, setCursorMode] = useState<"crosshair" | "grab" | "grabbing">("crosshair");

  const isDraggingTargetRef = useRef<boolean>(false);
  const isHoveringTargetRef = useRef<boolean>(false);
  const isDraggingSharkRef = useRef<boolean>(false);
  const isHoveringSharkRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Exact Aspect-Ratio coordinate projection accounting for letterboxing / scaling
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
      // Pillarboxed (empty bars on left/right)
      renderH = rect.height;
      renderW = renderH * canvasAspect;
      offX = (rect.width - renderW) / 2;
    } else {
      // Letterboxed (empty bars on top/bottom)
      renderW = rect.width;
      renderH = renderW / canvasAspect;
      offY = (rect.height - renderH) / 2;
    }

    const localX = clientX - rect.left - offX;
    const localY = clientY - rect.top - offY;

    const arenaX = (localX / renderW) * ARENA_WIDTH;
    const arenaY = (localY / renderH) * ARENA_HEIGHT;

    return {
      x: Math.max(0, Math.min(ARENA_WIDTH, arenaX)),
      y: Math.max(0, Math.min(ARENA_HEIGHT, arenaY)),
    };
  }, []);

  // Unified render and physics tick loop
  useEffect(() => {
    if (!engine) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const render = () => {
      // 1. Advance physics in lockstep if simulation is active
      if (engine.isRunning) {
        engine.stepWithSpeed();
      }

      // 2. Clear with deep dark futuristic background
      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // 3. Technical subtle grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      ctx.beginPath();
      for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
      }
      for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
      }
      ctx.stroke();

      const walls = engine.environment.walls;
      const target = engine.environment.target;
      const spawn = engine.environment.spawnArea;
      const isDragging = isDraggingTargetRef.current;
      const isHovering = isHoveringTargetRef.current;

      // 4. Draw Spawn Area
      ctx.save();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(spawn.x, spawn.y, spawn.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(16, 185, 129, 0.04)";
      ctx.fill();

      // Heading arrow indicator at spawn
      const arrowLen = 18;
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.beginPath();
      ctx.moveTo(spawn.x, spawn.y);
      ctx.lineTo(
        spawn.x + Math.cos(spawn.angle) * arrowLen,
        spawn.y + Math.sin(spawn.angle) * arrowLen
      );
      ctx.stroke();
      ctx.restore();

      // 5. Draw Target Checkpoint (With Interactive Drag & Hover States)
      ctx.save();
      const time = performance.now() * 0.003;
      const pulse = Math.sin(time) * 3;

      // Outer target glow ring
      const targetGrad = ctx.createRadialGradient(
        target.x,
        target.y,
        5,
        target.x,
        target.y,
        target.radius + 14 + pulse + (isDragging ? 10 : 0)
      );
      targetGrad.addColorStop(0, isDragging ? "rgba(6, 182, 212, 0.65)" : "rgba(6, 182, 212, 0.35)");
      targetGrad.addColorStop(0.6, "rgba(16, 185, 129, 0.2)");
      targetGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
      ctx.fillStyle = targetGrad;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius + 16 + pulse + (isDragging ? 10 : 0), 0, Math.PI * 2);
      ctx.fill();

      // Interactive Hover / Drag grab ring
      if (isHovering || isDragging) {
        ctx.strokeStyle = isDragging ? "#22d3ee" : "rgba(6, 182, 212, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Interactive Tooltip Tag
        ctx.save();
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        const tagText = isDragging
          ? `✦ MOVING: X:${Math.round(target.x)} Y:${Math.round(target.y)}`
          : "✦ DRAG TARGET BEACON";
        
        const tagY = target.y - target.radius - 14;
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(target.x - 65, tagY - 10, 130, 15);
        ctx.strokeStyle = isDragging ? "#22d3ee" : "#06b6d4";
        ctx.lineWidth = 1;
        ctx.strokeRect(target.x - 65, tagY - 10, 130, 15);

        ctx.fillStyle = isDragging ? "#22d3ee" : "#a5f3fc";
        ctx.fillText(tagText, target.x, tagY + 1);
        ctx.restore();
      }

      // Target circular borders
      ctx.strokeStyle = isDragging ? "#22d3ee" : "#06b6d4";
      ctx.lineWidth = isDragging ? 3 : 2;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = isDragging ? 18 : 10;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Target inner pulsing core
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(target.x, target.y, 6 + Math.sin(time * 2) * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Radar crosshairs
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(target.x - target.radius - 8, target.y);
      ctx.lineTo(target.x + target.radius + 8, target.y);
      ctx.moveTo(target.x, target.y - target.radius - 8);
      ctx.lineTo(target.x, target.y + target.radius + 8);
      ctx.stroke();
      ctx.restore();

      // 6. Draw Walls & Obstacles
      ctx.save();
      for (const wall of walls) {
        if (wall.type === "outer") {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wall.x1, wall.y1);
          ctx.lineTo(wall.x2, wall.y2);
          ctx.stroke();
        } else {
          // Internal obstacle wall with sleek cyan neon highlight
          ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.shadowColor = "rgba(6, 182, 212, 0.6)";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(wall.x1, wall.y1);
          ctx.lineTo(wall.x2, wall.y2);
          ctx.stroke();

          // Core bright center line
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(wall.x1, wall.y1);
          ctx.lineTo(wall.x2, wall.y2);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 7. Draw Fish Trails
      if (showTrails) {
        ctx.save();
        for (const fish of engine.population) {
          if (!fish.alive || fish.trail.length < 2) continue;
          ctx.strokeStyle = fish.isElite
            ? "rgba(6, 182, 212, 0.25)"
            : "rgba(244, 63, 94, 0.18)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(fish.trail[0].x, fish.trail[0].y);
          for (let i = 1; i < fish.trail.length; i++) {
            ctx.lineTo(fish.trail[i].x, fish.trail[i].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8. Draw Target Particles (bursts)
      if (engine.particles.length > 0) {
        ctx.save();
        for (const p of engine.particles) {
          const alpha = Math.max(0, 1 - p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 8b. Draw Shark Blood Spray Particles
      if (engine.bloodParticles && engine.bloodParticles.length > 0) {
        ctx.save();
        for (const b of engine.bloodParticles) {
          const alpha = Math.max(0, 1 - b.life / b.maxLife);
          ctx.fillStyle = b.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 8c. Draw Shockwaves
      if (engine.shockwaves && engine.shockwaves.length > 0) {
        ctx.save();
        for (const s of engine.shockwaves) {
          const alpha = Math.max(0, 1 - s.life / s.maxLife);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8d. Draw Floating Combat Text
      if (engine.chompEffects && engine.chompEffects.length > 0) {
        ctx.save();
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        for (const c of engine.chompEffects) {
          const alpha = Math.max(0, 1 - c.life / c.maxLife);
          ctx.fillStyle = c.color;
          ctx.globalAlpha = alpha;
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 8;
          ctx.fillText(c.text, c.x, c.y);
        }
        ctx.restore();
      }

      // 9. Draw Fish Agents
      const activeId = selectedFishId ?? engine.selectedFishId;
      const selectedFish = engine.population.find(
        (f) => f.id === activeId
      );

      for (const fish of engine.population) {
        drawFish(ctx, fish, fish.id === activeId);
      }

      // 10. Draw Sensor Rays for Selected Fish
      if (selectedFish && selectedFish.alive && showSensorRays) {
        drawSensorRays(ctx, selectedFish, target);
      }

      // 11. Draw Apex Predator Shark
      if (engine.config.sharkEnabled && engine.shark) {
        drawShark(
          ctx,
          engine.shark,
          isHoveringSharkRef.current,
          isDraggingSharkRef.current
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine, selectedFishId, showSensorRays, showTrails]);

  // Pointer Down (Mouse & Touch with Pointer Capture)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    const coords = getArenaCoords(e.clientX, e.clientY);
    if (!coords) return;

    pointerStartPosRef.current = coords;

    // Check if dragging Shark Predator
    if (engine.config.sharkEnabled && engine.shark) {
      const distToShark = Math.hypot(coords.x - engine.shark.x, coords.y - engine.shark.y);
      if (distToShark <= engine.shark.radius + 18) {
        isDraggingSharkRef.current = true;
        isHoveringSharkRef.current = true;
        setCursorMode("grabbing");
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        return;
      }
    }

    const target = engine.environment.target;
    const distToTarget = Math.hypot(coords.x - target.x, coords.y - target.y);

    // Hitbox: target.radius + 20 (approx 46px radius for very easy grabbing)
    if (distToTarget <= target.radius + 20) {
      isDraggingTargetRef.current = true;
      isHoveringTargetRef.current = true;
      setCursorMode("grabbing");
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    } else {
      isDraggingTargetRef.current = false;
    }
  };

  // Pointer Move (Mouse & Touch)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    const coords = getArenaCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (isDraggingSharkRef.current) {
      engine.setSharkPosition(coords.x, coords.y);
      setCursorMode("grabbing");
      return;
    }

    if (isDraggingTargetRef.current) {
      engine.setTargetPosition(coords.x, coords.y);
      setCursorMode("grabbing");
      return;
    }

    // Check shark hover
    if (engine.config.sharkEnabled && engine.shark) {
      const distToShark = Math.hypot(coords.x - engine.shark.x, coords.y - engine.shark.y);
      if (distToShark <= engine.shark.radius + 18) {
        isHoveringSharkRef.current = true;
        isHoveringTargetRef.current = false;
        setCursorMode("grab");
        return;
      } else {
        isHoveringSharkRef.current = false;
      }
    }

    const target = engine.environment.target;
    const distToTarget = Math.hypot(coords.x - target.x, coords.y - target.y);

    if (distToTarget <= target.radius + 20) {
      isHoveringTargetRef.current = true;
      setCursorMode("grab");
    } else {
      isHoveringTargetRef.current = false;
      setCursorMode("crosshair");
    }
  };

  // Pointer Up (Mouse & Touch)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    const coords = getArenaCoords(e.clientX, e.clientY);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (isDraggingSharkRef.current) {
      isDraggingSharkRef.current = false;
      setCursorMode("crosshair");
    } else if (isDraggingTargetRef.current) {
      isDraggingTargetRef.current = false;
      const target = engine.environment.target;
      if (coords && Math.hypot(coords.x - target.x, coords.y - target.y) <= target.radius + 20) {
        setCursorMode("grab");
      } else {
        setCursorMode("crosshair");
      }
    } else if (coords && pointerStartPosRef.current) {
      const movedDist = Math.hypot(
        coords.x - pointerStartPosRef.current.x,
        coords.y - pointerStartPosRef.current.y
      );

      // Distinguish clean click/tap from drag
      if (movedDist < 8) {
        const selectedId = engine.selectFishAt(coords.x, coords.y, 40);
        if (selectedId !== null && onSelectFish) {
          onSelectFish(selectedId);
        }
      }
    }

    pointerStartPosRef.current = null;
  };

  return (
    <div className="relative w-full aspect-[960/560] max-h-[560px] flex items-center justify-center bg-[#07080c] select-none rounded-xl overflow-hidden border border-zinc-200/20 dark:border-white/[0.08] shadow-[0_15px_45px_rgba(0,0,0,0.6)]">
      <canvas
        ref={canvasRef}
        width={ARENA_WIDTH}
        height={ARENA_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          isDraggingTargetRef.current = false;
          isHoveringTargetRef.current = false;
          isDraggingSharkRef.current = false;
          isHoveringSharkRef.current = false;
          setCursorMode("crosshair");
        }}
        style={{ cursor: cursorMode }}
        className="w-full h-full object-contain block touch-none"
      />
    </div>
  );
};

/**
 * Draws a streamlined, glowing autonomous fish agent.
 */
function drawFish(
  ctx: CanvasRenderingContext2D,
  fish: Fish,
  isSelected: boolean
): void {
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(fish.angle);

  // Visual styling based on agent state
  let fillColor = fish.color;
  let strokeColor = "#ffffff";
  let glowColor = fish.color;
  let opacity = 1.0;

  if (!fish.alive) {
    if (fish.state === "TARGET_REACHED") {
      fillColor = "#10b981";
      glowColor = "#10b981";
      opacity = 0.9;
    } else if (fish.state === "EATEN") {
      fillColor = "#dc2626";
      strokeColor = "#ef4444";
      glowColor = "#ef4444";
      opacity = 0.25;
    } else {
      // Crashed or timed out
      fillColor = "#475569";
      strokeColor = "#64748b";
      glowColor = "transparent";
      opacity = 0.35;
    }
  }

  ctx.globalAlpha = opacity;

  // Selected agent glowing ring and ID label
  if (isSelected) {
    ctx.save();
    ctx.rotate(-fish.angle); // Keep ring & tag level
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Reticle crosshair notches
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -16);
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 20);
    ctx.moveTo(-20, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();

    // ID Tag
    ctx.font = "9px monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "center";
    ctx.fillText(`#${fish.id}${fish.isElite ? " (ELITE)" : ""}`, 0, -23);
    ctx.restore();
  }

  // Draw organic streamlined fish body
  if (glowColor !== "transparent" && fish.alive) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isSelected ? 12 : 6;
  }

  // Body polygon: nose forward at +x, tail at -x
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.0;

  ctx.beginPath();
  // Nose tip
  ctx.moveTo(9, 0);
  // Upper dorsal curve
  ctx.quadraticCurveTo(2, -5.5, -6, -4);
  // Tail base upper
  ctx.lineTo(-7, -2);
  // Tail fin upper tip
  ctx.lineTo(-11, -5.5);
  // Tail fin center notch
  ctx.lineTo(-9, 0);
  // Tail fin lower tip
  ctx.lineTo(-11, 5.5);
  // Tail base lower
  ctx.lineTo(-7, 2);
  // Lower ventral curve
  ctx.quadraticCurveTo(2, 5.5, 9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  if (fish.alive) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(4, -1.8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws active sensor rays and target guide for the selected fish.
 */
function drawSensorRays(
  ctx: CanvasRenderingContext2D,
  fish: Fish,
  target: { x: number; y: number }
): void {
  ctx.save();

  // 1. Subtle dotted line toward target
  ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(fish.x, fish.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();

  // 2. Sensor rays
  ctx.setLineDash([]);
  for (const ray of fish.lastRays) {
    if (ray.hit) {
      const isSharkHit = ray.hitType === "shark";

      let dangerColor: string;
      if (isSharkHit) {
        // Vivid crimson red predator alarm ray
        dangerColor = "rgba(239, 68, 68, 0.95)";
      } else {
        dangerColor =
          ray.distance < 0.25
            ? "rgba(239, 68, 68, 0.85)"
            : ray.distance < 0.55
            ? "rgba(234, 179, 8, 0.8)"
            : "rgba(6, 182, 212, 0.65)";
      }

      ctx.strokeStyle = dangerColor;
      ctx.lineWidth = isSharkHit ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.moveTo(ray.startX, ray.startY);
      ctx.lineTo(ray.hitX, ray.hitY);
      ctx.stroke();

      // Hit point glowing dot
      ctx.fillStyle = dangerColor;
      ctx.shadowColor = dangerColor;
      ctx.shadowBlur = isSharkHit ? 12 : 6;
      ctx.beginPath();
      ctx.arc(ray.hitX, ray.hitY, isSharkHit ? 4.0 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing threat ring if detecting predator shark
      if (isSharkHit) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ray.hitX, ray.hitY, 8.0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Ray is completely clear
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(ray.startX, ray.startY);
      ctx.lineTo(ray.endX, ray.endY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws the menacing, lifelike Apex Cyber Shark Predator.
 */
function drawShark(
  ctx: CanvasRenderingContext2D,
  shark: Shark,
  isHovered: boolean,
  isDragged: boolean
): void {
  if (!shark.enabled) return;

  const { x, y, angle, state, jawOpen, speed, tailPhase } = shark;

  ctx.save();

  // 1. Predatory Sonar Danger Perimeter
  const isHunting = state === "STALKING" || state === "LUNGING";
  const dangerRadius = isHunting ? 90 : 70;
  const pulse = Math.sin(performance.now() * 0.005) * 5;

  const sonarGrad = ctx.createRadialGradient(x, y, 10, x, y, dangerRadius + pulse);
  sonarGrad.addColorStop(0, "rgba(239, 68, 68, 0.14)");
  sonarGrad.addColorStop(0.65, isHunting ? "rgba(239, 68, 68, 0.06)" : "rgba(239, 68, 68, 0.02)");
  sonarGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
  ctx.fillStyle = sonarGrad;
  ctx.beginPath();
  ctx.arc(x, y, dangerRadius + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Rotating target lock reticle when lunging
  if (state === "LUNGING") {
    ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Interactive Hover / Drag grab ring
  if (isHovered || isDragged) {
    ctx.strokeStyle = isDragged ? "#ef4444" : "rgba(239, 68, 68, 0.85)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(x, y, shark.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Interactive Tooltip Tag
    ctx.save();
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    const tagText = isDragged
      ? `✦ MOVING SHARK: X:${Math.round(x)} Y:${Math.round(y)}`
      : "✦ DRAG SHARK PREDATOR";
    const tagY = y - shark.radius - 16;
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(x - 70, tagY - 10, 140, 15);
    ctx.strokeStyle = isDragged ? "#ef4444" : "#f87171";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 70, tagY - 10, 140, 15);
    ctx.fillStyle = isDragged ? "#ef4444" : "#fca5a5";
    ctx.fillText(tagText, x, tagY + 1);
    ctx.restore();
  }

  // 2. Position and rotate shark coordinate space
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Dynamic articulated tail sway calculation
  const tailSway = Math.sin(tailPhase) * (speed > 3.0 ? 8 : 5);
  const finSway = Math.sin(tailPhase - 0.7) * (speed > 3.0 ? 12 : 8);

  // 3. Pectoral Fins (Flanking the shark like fighter jets)
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.2;

  // Left pectoral fin
  ctx.beginPath();
  ctx.moveTo(4, -10);
  ctx.quadraticCurveTo(-6, -22, -18, -26);
  ctx.lineTo(-12, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right pectoral fin
  ctx.beginPath();
  ctx.moveTo(4, 10);
  ctx.quadraticCurveTo(-6, 22, -18, 26);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Caudal (Tail) Fin with realistic heterocercal shark lobes
  ctx.save();
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.2;

  const tbx = -24;
  const tby = tailSway * 0.5;
  const cpx = -36;
  const cpy = tailSway;

  ctx.beginPath();
  // Caudal notch / hinge
  ctx.moveTo(tbx, tby - 4);
  ctx.lineTo(cpx, cpy);
  // Large upper lobe (sweeping high & back)
  ctx.quadraticCurveTo(cpx - 6, cpy - 14 + finSway * 0.3, cpx - 16, cpy - 18 + finSway);
  ctx.lineTo(cpx - 10, cpy - 5 + finSway * 0.5);
  // Fork notch
  ctx.lineTo(cpx - 6, cpy + finSway * 0.3);
  // Lower lobe (shorter)
  ctx.lineTo(cpx - 12, cpy + 12 + finSway);
  ctx.quadraticCurveTo(cpx - 4, cpy + 10 + finSway * 0.3, cpx, cpy + 2);
  ctx.lineTo(tbx, tby + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 5. Streamlined Shark Torpedo Body
  const bodyGrad = ctx.createLinearGradient(28, 0, -26, 0);
  bodyGrad.addColorStop(0, "#334155"); // Snout
  bodyGrad.addColorStop(0.3, "#1e293b"); // Midsection
  bodyGrad.addColorStop(0.8, "#0f172a"); // Rear
  bodyGrad.addColorStop(1, "#090d16"); // Tail base

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = state === "LUNGING" ? "#ef4444" : "#0284c7";
  ctx.lineWidth = 1.6;
  if (state === "LUNGING" || state === "FEEDING") {
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 14;
  } else {
    ctx.shadowColor = "#0284c7";
    ctx.shadowBlur = 6;
  }

  ctx.beginPath();
  // Snout tip
  ctx.moveTo(28, 0);
  // Upper dorsal ridge
  ctx.quadraticCurveTo(16, -12, 0, -11);
  ctx.quadraticCurveTo(-14, -9, tbx, tby - 4);
  // Tail base join
  ctx.lineTo(tbx, tby + 4);
  // Lower ventral curve
  ctx.quadraticCurveTo(-14, 9, 0, 11);
  ctx.quadraticCurveTo(16, 12, 28, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 6. Dorsal Fin (Iconic shark dorsal triangle on back)
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.lineTo(-4, -14);
  ctx.quadraticCurveTo(-3, -7, -8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 7. Cyber Gill Slits (3 glowing neon crimson vents on each side)
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.2;
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 4;
  for (let g = 0; g < 3; g++) {
    const gx = 2 - g * 3.5;
    // Top gills
    ctx.beginPath();
    ctx.moveTo(gx, -6);
    ctx.lineTo(gx - 1, -9.5);
    ctx.stroke();
    // Bottom gills
    ctx.beginPath();
    ctx.moveTo(gx, 6);
    ctx.lineTo(gx - 1, 9.5);
    ctx.stroke();
  }

  // 8. Menacing Red Predatory Eyes
  ctx.fillStyle = "#ef4444";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 8;
  // Left eye
  ctx.beginPath();
  ctx.arc(16, -6, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.arc(16, 6, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Inner white pupil gleam
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(16.5, -6, 0.8, 0, Math.PI * 2);
  ctx.arc(16.5, 6, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // 9. Jaws & Teeth (Dynamic chomping animation when lunging/feeding)
  if (jawOpen > 0.15) {
    ctx.save();
    const mouthWidth = jawOpen * 6.5;
    ctx.fillStyle = "#7f1d1d"; // Deep mouth cavity
    ctx.beginPath();
    ctx.ellipse(22, 0, 5, mouthWidth, 0, 0, Math.PI * 2);
    ctx.fill();

    // Razor Sharp White Teeth
    ctx.fillStyle = "#ffffff";
    const teethCount = 5;
    for (let t = 0; t < teethCount; t++) {
      const toothY = -mouthWidth + (t + 0.5) * ((mouthWidth * 2) / teethCount);
      ctx.beginPath();
      ctx.moveTo(25, toothY);
      ctx.lineTo(21, toothY - 1.2);
      ctx.lineTo(21, toothY + 1.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 10. Holographic Predator HUD Tag above shark
  ctx.rotate(-angle); // Keep HUD upright
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.shadowBlur = 0;

  const hudY = -shark.radius - 15;
  let statusText = "HUNTING";
  let statusColor = "#38bdf8";

  if (state === "LUNGING") {
    statusText = "LUNGING ⚡";
    statusColor = "#ef4444";
  } else if (state === "FEEDING") {
    statusText = "CHOMP! 🩸";
    statusColor = "#dc2626";
  } else if (state === "PATROLLING") {
    statusText = "PATROLLING";
    statusColor = "#94a3b8";
  }

  ctx.fillStyle = "rgba(7, 8, 12, 0.85)";
  ctx.fillRect(-48, hudY - 9, 96, 14);
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(-48, hudY - 9, 96, 14);

  ctx.fillStyle = statusColor;
  ctx.fillText(`🦈 ${statusText}`, 0, hudY + 2);

  if (shark.kills > 0) {
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#ef4444";
    ctx.fillText(`💀 ${shark.kills} KILLS`, 0, hudY + 13);
  }

  ctx.restore();
}
