import { Fish } from "./Fish";
import {
  Wall,
  SharkState,
  SharkTelemetry,
  SharkKillEvent,
} from "@/types/simulation";
import { distanceToSegment } from "./Collision";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./levels";

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export class Shark {
  public x: number;
  public y: number;
  public velocityX: number;
  public velocityY: number;
  public angle: number;
  public speed: number;
  public radius: number;

  public baseSpeed: number;
  public sprintSpeed: number;
  public turnSpeed: number;

  public targetFishId: number | null;
  public kills: number;
  public totalKills: number;
  public state: SharkState;
  public tailPhase: number;
  public jawOpen: number; // 0 to 1
  public feedCooldown: number;
  public aggression: "normal" | "frenzy" | "patrol";
  public enabled: boolean;

  public detectionRange: number;
  public strikeRange: number;

  public lungeTimer: number;
  public lungeCooldown: number;

  private patrolTarget: { x: number; y: number } | null;
  private patrolTimer: number;

  constructor(
    spawnX: number = 560,
    spawnY: number = 280,
    initialAngle: number = Math.PI,
    enabled: boolean = true
  ) {
    this.x = spawnX;
    this.y = spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.angle = initialAngle;
    this.speed = 0;
    this.radius = 19;

    this.baseSpeed = 2.2;
    this.sprintSpeed = 4.1;
    this.turnSpeed = 0.075;

    this.targetFishId = null;
    this.kills = 0;
    this.totalKills = 0;
    this.state = "PATROLLING";
    this.tailPhase = 0;
    this.jawOpen = 0;
    this.feedCooldown = 0;
    this.lungeTimer = 0;
    this.lungeCooldown = 0;
    this.aggression = "normal";
    this.enabled = enabled;

    this.detectionRange = 320;
    this.strikeRange = 85;

    this.patrolTarget = null;
    this.patrolTimer = 0;
  }

  public reset(spawnX: number = 560, spawnY: number = 280, angle: number = Math.PI): void {
    this.x = spawnX;
    this.y = spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.angle = angle;
    this.speed = 0;
    this.targetFishId = null;
    this.kills = 0;
    this.state = "PATROLLING";
    this.feedCooldown = 0;
    this.lungeTimer = 0;
    this.lungeCooldown = 0;
    this.jawOpen = 0;
    this.patrolTarget = null;
    this.patrolTimer = 0;
  }

  public setPosition(x: number, y: number): void {
    this.x = Math.max(this.radius + 10, Math.min(ARENA_WIDTH - this.radius - 10, x));
    this.y = Math.max(this.radius + 10, Math.min(ARENA_HEIGHT - this.radius - 10, y));
  }

  public step(
    population: Fish[],
    walls: Wall[],
    maxFrames: number,
    targetReachBonus: number,
    arenaW: number = ARENA_WIDTH,
    arenaH: number = ARENA_HEIGHT
  ): SharkKillEvent[] {
    if (!this.enabled) return [];

    const killsThisFrame: SharkKillEvent[] = [];

    // 1. Advance tail wave kinematics proportional to velocity
    this.tailPhase += Math.max(0.6, this.speed) * 0.085;

    // 2. Feeding & Lunge cooldown management
    if (this.feedCooldown > 0) {
      this.feedCooldown--;
      this.jawOpen = Math.max(0, this.jawOpen - 0.07);
      if (this.feedCooldown === 0 && this.state === "FEEDING") {
        this.state = "PATROLLING";
      }
    }
    if (this.lungeCooldown > 0) {
      this.lungeCooldown--;
    }

    // 3. Scan for living prey
    const aliveFish = population.filter((f) => f.alive);
    let targetFish: Fish | null = null;
    let minDist = Infinity;

    if (aliveFish.length > 0 && this.aggression !== "patrol") {
      for (const fish of aliveFish) {
        const d = Math.hypot(fish.x - this.x, fish.y - this.y);
        if (d < minDist) {
          minDist = d;
          targetFish = fish;
        }
      }
    }

    // 4. Determine state, target speed, and desired heading
    let desiredAngle = this.angle;
    let targetSpeed = this.baseSpeed;

    if (this.aggression === "frenzy") {
      targetSpeed = this.sprintSpeed * 1.1;
    }

    if (targetFish && (minDist < this.detectionRange || this.aggression === "frenzy")) {
      this.targetFishId = targetFish.id;

      if (this.state === "LUNGING") {
        // Ongoing charge
        this.lungeTimer--;
        targetSpeed = this.sprintSpeed;
        this.jawOpen = Math.min(1.0, this.jawOpen + 0.15);

        if (this.lungeTimer <= 0) {
          // Lunge missed/overshot! Recovery phase
          this.state = "PATROLLING";
          this.lungeCooldown = 38;
          targetSpeed = this.baseSpeed * 0.75;
        }
      } else if (minDist < this.strikeRange && this.lungeCooldown <= 0) {
        // Trigger high-speed LUNGE
        this.state = "LUNGING";
        this.lungeTimer = 34; // ~0.55s commitment
        targetSpeed = this.sprintSpeed;
        this.jawOpen = 0.5;
      } else {
        // Stalking prey smoothly (or recovering from previous charge)
        if (this.state !== "FEEDING") {
          this.state = this.lungeCooldown > 0 ? "PATROLLING" : "STALKING";
        }
        targetSpeed = this.lungeCooldown > 0 ? this.baseSpeed * 0.8 : this.baseSpeed * 1.15;
        this.jawOpen = Math.max(0, this.jawOpen - 0.05);
      }

      // Lead target fish based on velocity for predictive interception
      const leadFrames = Math.min(8, minDist * 0.08);
      const leadX = targetFish.x + targetFish.velocityX * leadFrames;
      const leadY = targetFish.y + targetFish.velocityY * leadFrames;
      desiredAngle = Math.atan2(leadY - this.y, leadX - this.x);
    } else {
      // Patrolling ambiently
      this.targetFishId = null;
      if (this.state !== "FEEDING") {
        this.state = "PATROLLING";
      }
      this.jawOpen = Math.max(0, this.jawOpen - 0.05);
      targetSpeed = this.baseSpeed * 0.85;

      this.patrolTimer--;
      if (this.patrolTimer <= 0 || !this.patrolTarget) {
        this.patrolTimer = 160 + Math.floor(Math.random() * 100);
        this.patrolTarget = {
          x: 160 + Math.random() * (arenaW - 320),
          y: 90 + Math.random() * (arenaH - 180),
        };
      }

      if (this.patrolTarget) {
        const pDist = Math.hypot(this.patrolTarget.x - this.x, this.patrolTarget.y - this.y);
        if (pDist < 45) {
          this.patrolTimer = 0;
        } else {
          desiredAngle = Math.atan2(this.patrolTarget.y - this.y, this.patrolTarget.x - this.x);
        }
      }
    }

    // 5. Arena Wall and Boundary Avoidance
    const margin = 65;
    let pushX = 0;
    let pushY = 0;
    if (this.x < margin) pushX += (margin - this.x) / margin;
    if (this.x > arenaW - margin) pushX -= (this.x - (arenaW - margin)) / margin;
    if (this.y < margin) pushY += (margin - this.y) / margin;
    if (this.y > arenaH - margin) pushY -= (this.y - (arenaH - margin)) / margin;

    if (pushX !== 0 || pushY !== 0) {
      desiredAngle = Math.atan2(pushY, pushX);
    }

    // Lookahead sensor ahead of shark to glide around obstacles
    const lookaheadDist = 52;
    const probeX = this.x + Math.cos(this.angle) * lookaheadDist;
    const probeY = this.y + Math.sin(this.angle) * lookaheadDist;

    for (const wall of walls) {
      if (wall.type === "outer") continue;
      const distToWall = distanceToSegment(probeX, probeY, wall.x1, wall.y1, wall.x2, wall.y2);
      if (distToWall < this.radius + 18) {
        const wallDx = wall.x2 - wall.x1;
        const wallDy = wall.y2 - wall.y1;
        const normal1 = Math.atan2(-wallDy, wallDx);
        const normal2 = Math.atan2(wallDy, -wallDx);

        const midX = (wall.x1 + wall.x2) / 2;
        const midY = (wall.y1 + wall.y2) / 2;
        const toSharkAngle = Math.atan2(this.y - midY, this.x - midX);

        const diff1 = Math.abs(normalizeAngle(normal1 - toSharkAngle));
        const diff2 = Math.abs(normalizeAngle(normal2 - toSharkAngle));
        desiredAngle = diff1 < diff2 ? normal1 : normal2;
        break;
      }
    }

    // 6. Smooth steering kinematics
    const diff = normalizeAngle(desiredAngle - this.angle);
    // Forward hydrodynamic momentum: while charging at high speed, shark turn radius is wider!
    // This allows dodging fish to cut laterally and cause the shark to overshoot.
    const effectiveTurn = this.state === "LUNGING" ? this.turnSpeed * 0.45 : this.turnSpeed;
    this.angle += Math.max(-effectiveTurn, Math.min(effectiveTurn, diff));

    // 7. Acceleration & drag physics
    const targetVx = Math.cos(this.angle) * targetSpeed;
    const targetVy = Math.sin(this.angle) * targetSpeed;
    const accel = 0.12;
    this.velocityX += (targetVx - this.velocityX) * accel;
    this.velocityY += (targetVy - this.velocityY) * accel;

    this.speed = Math.hypot(this.velocityX, this.velocityY);
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Arena boundary clamp
    this.x = Math.max(this.radius + 5, Math.min(arenaW - this.radius - 5, this.x));
    this.y = Math.max(this.radius + 5, Math.min(arenaH - this.radius - 5, this.y));

    // 8. Chomping / Devouring Fish
    const BITE_RADIUS = this.radius + 5.5 + 4; // Shark radius + fish radius + bite margin
    for (const fish of aliveFish) {
      const dist = Math.hypot(fish.x - this.x, fish.y - this.y);
      if (dist <= BITE_RADIUS) {
        fish.markEaten(maxFrames, targetReachBonus);
        this.kills++;
        this.totalKills++;
        this.state = "FEEDING";
        this.feedCooldown = 22;
        this.lungeTimer = 0;
        this.lungeCooldown = 25;
        this.jawOpen = 1.0;
        this.jawOpen = 1.0;

        killsThisFrame.push({
          fishId: fish.id,
          x: fish.x,
          y: fish.y,
          isElite: fish.isElite,
        });
      }
    }

    return killsThisFrame;
  }

  public getTelemetry(): SharkTelemetry {
    return {
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      angle: this.angle,
      speed: this.speed,
      targetFishId: this.targetFishId,
      kills: this.kills,
      totalKills: this.totalKills,
      state: this.state,
      tailPhase: this.tailPhase,
      jawOpen: this.jawOpen,
      aggression: this.aggression,
      enabled: this.enabled,
      radius: this.radius,
    };
  }
}
