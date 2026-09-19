import { Point, Wall } from "@/types/simulation";

/**
 * Checks if two 2D line segments intersect: (p1 -> p2) and (p3 -> p4).
 * Returns the intersection point or null.
 */
export function lineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): Point | null {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-6) {
    return null; // Lines are parallel
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
    };
  }

  return null;
}

/**
 * Calculates distance from a point to a line segment.
 */
export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  // Project point onto line segment
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  return Math.hypot(px - projX, py - projY);
}

/**
 * Checks if a circle (agent) collides with a wall segment.
 */
export function circleCollidesWithWall(
  cx: number,
  cy: number,
  radius: number,
  wall: Wall
): boolean {
  const dist = distanceToSegment(cx, cy, wall.x1, wall.y1, wall.x2, wall.y2);
  return dist <= radius;
}

/**
 * Checks if a circle (agent) reached a circular target.
 */
export function circleCollidesWithCircle(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy <= (r1 + r2) * (r1 + r2);
}
