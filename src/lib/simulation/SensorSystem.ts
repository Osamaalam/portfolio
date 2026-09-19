import { RayHit, Wall, Target } from "@/types/simulation";
import { lineIntersection } from "./Collision";

export const SENSOR_LABELS = [
  "bias",
  "dist",
  "dir x",
  "dir y",
  "closing",
  "wall ↑",
  "wall ↖",
  "wall ↗",
] as const;

export const MAX_RAY_DISTANCE = 220;

export interface SensorCalculationResult {
  inputs: number[];
  rays: RayHit[];
  currentDistance: number;
}

/**
 * Calculates intersection between a ray segment and a circular obstacle (such as the shark predator).
 */
export function rayIntersectsCircle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cx: number,
  cy: number,
  radius: number
): { hitX: number; hitY: number; dist: number } | null {
  const dx = endX - startX;
  const dy = endY - startY;
  const fx = startX - cx;
  const fy = startY - cy;

  const a = dx * dx + dy * dy;
  if (a === 0) return null;

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  let t = -1;
  if (t1 >= 0 && t1 <= 1) {
    t = t1;
  } else if (t2 >= 0 && t2 <= 1) {
    t = t2;
  }

  if (t >= 0) {
    const hitX = startX + t * dx;
    const hitY = startY + t * dy;
    const dist = Math.hypot(hitX - startX, hitY - startY);
    return { hitX, hitY, dist };
  }

  return null;
}

/**
 * Casts a single ray from (startX, startY) at a given angle, testing against all walls
 * and optionally against the apex predator shark.
 */
export function castRay(
  startX: number,
  startY: number,
  angle: number,
  walls: Wall[],
  maxDist: number = MAX_RAY_DISTANCE,
  shark?: { x: number; y: number; radius: number; enabled?: boolean }
): RayHit {
  const endX = startX + Math.cos(angle) * maxDist;
  const endY = startY + Math.sin(angle) * maxDist;

  let closestHit: { x: number; y: number; dist: number; type: "wall" | "shark" } | null = null;

  for (const wall of walls) {
    const hit = lineIntersection(
      startX,
      startY,
      endX,
      endY,
      wall.x1,
      wall.y1,
      wall.x2,
      wall.y2
    );

    if (hit) {
      const dist = Math.hypot(hit.x - startX, hit.y - startY);
      if (!closestHit || dist < closestHit.dist) {
        closestHit = { x: hit.x, y: hit.y, dist, type: "wall" };
      }
    }
  }

  // Test against the shark predator as a dynamic environmental hazard
  if (shark && shark.enabled !== false) {
    // Detect shark's physical hull and acoustic wake disturbance zone
    const sensoryRadius = (shark.radius || 19) + 24;
    const sharkHit = rayIntersectsCircle(
      startX,
      startY,
      endX,
      endY,
      shark.x,
      shark.y,
      sensoryRadius
    );
    if (sharkHit) {
      if (!closestHit || sharkHit.dist < closestHit.dist) {
        closestHit = { x: sharkHit.hitX, y: sharkHit.hitY, dist: sharkHit.dist, type: "shark" };
      }
    }
  }

  if (closestHit) {
    return {
      startX,
      startY,
      endX,
      endY,
      hitX: closestHit.x,
      hitY: closestHit.y,
      distance: Math.max(0, Math.min(1, closestHit.dist / maxDist)),
      rawDistance: closestHit.dist,
      hit: true,
      angle,
      hitType: closestHit.type,
    };
  }

  return {
    startX,
    startY,
    endX,
    endY,
    hitX: endX,
    hitY: endY,
    distance: 1.0,
    rawDistance: maxDist,
    hit: false,
    angle,
    hitType: undefined,
  };
}

/**
 * Calculates the 8 neural network inputs and ray details for a fish.
 */
export function calculateFishSensors(
  x: number,
  y: number,
  angle: number,
  prevTargetDist: number,
  target: Target,
  walls: Wall[],
  environmentDiag: number = 1000,
  shark?: { x: number; y: number; radius: number; enabled?: boolean }
): SensorCalculationResult {
  // 1. Bias
  const bias = 1.0;

  // 2. Distance to target
  const dxToTarget = target.x - x;
  const dyToTarget = target.y - y;
  const currentDist = Math.hypot(dxToTarget, dyToTarget);
  const normalizedDist = Math.min(1.0, currentDist / environmentDiag);

  // 3 & 4. Direction to target relative to fish's heading
  // By projecting into fish's local frame:
  // Forward axis is cos(angle), sin(angle).
  // Right axis is -sin(angle), cos(angle).
  const angleToTarget = Math.atan2(dyToTarget, dxToTarget);
  let relativeAngle = angleToTarget - angle;

  // Normalize relative angle to [-PI, PI]
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

  const dirX = Math.cos(relativeAngle); // 1 = straight ahead, -1 = directly behind
  const dirY = Math.sin(relativeAngle); // > 0 = target to right, < 0 = target to left

  // 5. Closing velocity
  // Positive if closing in on the target, negative if getting farther
  const distDelta = prevTargetDist - currentDist;
  // Clamped to [-1, 1]
  const closingVelocity = Math.max(-1.0, Math.min(1.0, distDelta / 5.0));

  // 6, 7, 8. Wall & Hazard Sensors: Ahead (0), Upper-Left (-45 deg), Upper-Right (+45 deg)
  const rayAhead = castRay(x, y, angle, walls, MAX_RAY_DISTANCE, shark);
  const rayLeft = castRay(x, y, angle - Math.PI / 4, walls, MAX_RAY_DISTANCE, shark);
  const rayRight = castRay(x, y, angle + Math.PI / 4, walls, MAX_RAY_DISTANCE, shark);

  let aheadDist = rayAhead.distance;
  let leftDist = rayLeft.distance;
  let rightDist = rayRight.distance;

  // Lateral-line acoustic sensing: if shark is in proximity, modulate sensory inputs with direction
  if (shark && shark.enabled !== false) {
    const dxShark = shark.x - x;
    const dyShark = shark.y - y;
    const distShark = Math.hypot(dxShark, dyShark);

    if (distShark < 135) {
      const angleShark = Math.atan2(dyShark, dxShark);
      let relShark = angleShark - angle;
      while (relShark > Math.PI) relShark -= 2 * Math.PI;
      while (relShark < -Math.PI) relShark += 2 * Math.PI;

      const normalizedSharkDist = Math.max(0.05, distShark / 135);

      if (Math.abs(relShark) < Math.PI / 5) {
        aheadDist = Math.min(aheadDist, normalizedSharkDist);
      } else if (relShark < 0) {
        leftDist = Math.min(leftDist, normalizedSharkDist);
      } else {
        rightDist = Math.min(rightDist, normalizedSharkDist);
      }
    }
  }

  const inputs = [
    bias,
    normalizedDist,
    dirX,
    dirY,
    closingVelocity,
    aheadDist,
    leftDist,
    rightDist,
  ];

  return {
    inputs,
    rays: [rayAhead, rayLeft, rayRight],
    currentDistance: currentDist,
  };
}
