import { Fish } from "./Fish";
import { Environment } from "./Environment";
import { Evolution } from "./Evolution";
import { LEVELS } from "./levels";
import { Shark } from "./Shark";
import {
  SimulationConfig,
  GenerationStats,
  SelectedAgentTelemetry,
  FishAgentData,
  Point,
  SharkTelemetry,
} from "@/types/simulation";

export interface TargetParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface ChompEffect {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export type EngineEventCallback = {
  onTick?: (
    stats: GenerationStats,
    selectedTelemetry: SelectedAgentTelemetry | null,
    sharkTelemetry?: SharkTelemetry | null
  ) => void;
  onGenerationComplete?: (stats: GenerationStats, history: GenerationStats[]) => void;
  onLevelChange?: (levelId: number) => void;
  onTargetReached?: (fishId: number) => void;
  onSharkKill?: (fishId: number, sharkKills: number, x: number, y: number) => void;
};

export class SimulationEngine {
  public environment: Environment;
  public population: Fish[];
  public shark: Shark;
  public generation: number;
  public currentFrame: number;
  public isRunning: boolean;
  public config: SimulationConfig;

  public selectedFishId: number | null;
  public userSelectedFishId: number | null;
  public generationHistory: GenerationStats[];
  public particles: TargetParticle[];
  public bloodParticles: BloodParticle[];
  public chompEffects: ChompEffect[];
  public shockwaves: Shockwave[];

  private callbacks: EngineEventCallback;
  private animationFrameId: number | null;
  private lastUiEmitTime: number;
  private frameAccumulator: number;

  constructor(
    initialConfig?: Partial<SimulationConfig>,
    callbacks: EngineEventCallback = {}
  ) {
    this.config = {
      populationSize: 50,
      mutationRate: 0.08,
      mutationStrength: 0.35,
      eliteCount: 5,
      speedMultiplier: 1,
      showNetwork: true,
      showSensorRays: true,
      showTrails: true,
      showDebug: false,
      autoProgressLevel: false,
      sharkEnabled: true,
      sharkAggression: "normal",
      ...initialConfig,
    };

    this.callbacks = callbacks;
    this.environment = new Environment(1);
    this.population = [];
    this.generation = 1;
    this.currentFrame = 0;
    this.isRunning = false;
    this.selectedFishId = 1;
    this.userSelectedFishId = null;
    this.generationHistory = [];
    this.particles = [];
    this.bloodParticles = [];
    this.chompEffects = [];
    this.shockwaves = [];
    this.animationFrameId = null;
    this.lastUiEmitTime = 0;
    this.frameAccumulator = 0;

    // Initialize Apex Predator Shark positioned strategically across the arena
    this.shark = new Shark(
      560,
      280,
      Math.PI,
      this.config.sharkEnabled ?? true
    );
    if (this.config.sharkAggression) {
      this.shark.aggression = this.config.sharkAggression;
    }

    this.initPopulation();
  }

  public initPopulation(): void {
    this.population = [];
    const spawn = this.environment.spawnArea;

    for (let i = 0; i < this.config.populationSize; i++) {
      const fish = new Fish(
        i + 1,
        spawn.x,
        spawn.y,
        spawn.angle,
        undefined, // random brain
        false
      );
      fish.initDistances(this.environment.target);
      this.population.push(fish);
    }

    // Reset shark position for fresh round
    const defaultSharkX = Math.min(
      this.environment.width - 150,
      Math.max(480, this.environment.width * 0.58)
    );
    const defaultSharkY = this.environment.height * 0.5;
    this.shark.reset(defaultSharkX, defaultSharkY, Math.PI);
    this.shark.enabled = this.config.sharkEnabled ?? true;

    this.currentFrame = 0;
    // Strictly preserve user selection across population reseeds (e.g. level changes)
    const targetId = this.userSelectedFishId ?? this.selectedFishId;
    if (
      targetId !== null &&
      targetId >= 1 &&
      targetId <= this.config.populationSize
    ) {
      this.selectedFishId = targetId;
    } else {
      this.selectedFishId = this.population[0]?.id ?? 1;
      if (
        this.userSelectedFishId !== null &&
        this.userSelectedFishId > this.config.populationSize
      ) {
        this.userSelectedFishId = this.selectedFishId;
      }
    }
  }

  public setLevel(levelId: number): void {
    const wasRunning = this.isRunning;
    this.environment.setLevel(levelId);
    this.reset(false); // reseed population for new level
    if (wasRunning) {
      this.start();
    }
    if (this.callbacks.onLevelChange) {
      this.callbacks.onLevelChange(levelId);
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public pause(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public togglePlay(): boolean {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  public reset(clearHistory: boolean = true): void {
    this.pause();
    if (clearHistory) {
      this.generation = 1;
      this.generationHistory = [];
    }
    this.currentFrame = 0;
    this.particles = [];
    this.initPopulation();
    this.emitUiUpdate(true);
  }

  public setSpeed(multiplier: number): void {
    this.config.speedMultiplier = multiplier;
  }

  public setPopulationSize(size: number): void {
    this.config.populationSize = size;
    // Reseed fresh population
    this.reset(false);
  }

  public setMutationRate(rate: number): void {
    this.config.mutationRate = Math.max(0.005, Math.min(0.5, rate));
  }

  public setMutationStrength(strength: number): void {
    this.config.mutationStrength = Math.max(0.05, Math.min(1.0, strength));
  }

  public selectFishById(id: number | null): void {
    this.selectedFishId = id;
    this.userSelectedFishId = id;
    this.emitUiUpdate(true);
  }

  public setTargetPosition(x: number, y: number): void {
    this.environment.setTargetPosition(x, y);
    this.emitUiUpdate(true);
  }

  public resetTargetPosition(): void {
    this.environment.resetTargetPosition();
    this.emitUiUpdate(true);
  }

  public isTargetCustom(): boolean {
    return this.environment.isTargetCustom();
  }

  public selectFishAt(clickX: number, clickY: number, tolerance: number = 35): number | null {
    let closest: Fish | null = null;
    let minDist = tolerance;

    for (const fish of this.population) {
      const dist = Math.hypot(fish.x - clickX, fish.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closest = fish;
      }
    }

    if (closest) {
      this.selectedFishId = closest.id;
      this.userSelectedFishId = closest.id;
      this.emitUiUpdate(true);
      return closest.id;
    }

    return null;
  }

  public nextGeneration(): void {
    // 1. Calculate fitness for all fish in case any are still alive
    for (const fish of this.population) {
      if (fish.alive) {
        fish.alive = false;
        fish.state = "TIMEOUT";
        fish.fitness = fish.calculateFitness(
          this.environment.maxFrames,
          this.environment.targetReachBonus
        );
      }
    }

    // Determine current effective selected agent ID
    const activeSelectedId = this.userSelectedFishId ?? this.selectedFishId ?? 1;

    // 2. Perform evolution, preserving the selected agent's lineage directly at its slot ID
    const { nextPopulation, stats } = Evolution.evolveGeneration(
      this.population,
      this.environment.currentLevel,
      this.generation,
      this.config.mutationRate,
      this.config.mutationStrength,
      this.config.eliteCount,
      Math.random,
      activeSelectedId
    );

    this.generationHistory.push(stats);
    if (this.callbacks.onGenerationComplete) {
      this.callbacks.onGenerationComplete(stats, [...this.generationHistory]);
    }

    // Check auto-progress
    if (this.config.autoProgressLevel && stats.targetSuccessRate >= 60) {
      if (this.environment.currentLevel.id < LEVELS.length) {
        this.setLevel(this.environment.currentLevel.id + 1);
        return;
      }
    }

    // 3. Increment generation & replace population
    this.generation++;
    this.currentFrame = 0;
    this.population = nextPopulation;

    // CRITICAL: Strictly retain the selected agent through each gen!
    // NEVER revert to Agent 1 unless user explicitly selects another agent.
    if (
      activeSelectedId !== null &&
      this.population.some((f) => f.id === activeSelectedId)
    ) {
      this.selectedFishId = activeSelectedId;
      this.userSelectedFishId = activeSelectedId;
    } else {
      this.selectedFishId = this.population[0]?.id ?? 1;
    }
    this.particles = [];

    this.emitUiUpdate(true);
  }

  /**
   * Main simulation tick
   */
  public step(): void {
    this.currentFrame++;

    const target = this.environment.target;
    const walls = this.environment.walls;
    const diag = this.environment.diagonal;
    const maxFrames = this.environment.maxFrames;
    const reachBonus = this.environment.targetReachBonus;

    // 1. Advance the Apex Predator Shark if enabled
    if (this.config.sharkEnabled) {
      this.shark.enabled = true;
      const sharkKills = this.shark.step(
        this.population,
        walls,
        maxFrames,
        reachBonus,
        this.environment.width,
        this.environment.height
      );

      for (const kill of sharkKills) {
        this.spawnSharkKillBurst(kill.x, kill.y, kill.isElite);
        if (this.callbacks.onSharkKill) {
          this.callbacks.onSharkKill(kill.fishId, this.shark.kills, kill.x, kill.y);
        }
      }
    } else {
      this.shark.enabled = false;
    }

    const sharkHazard = this.config.sharkEnabled
      ? { x: this.shark.x, y: this.shark.y, radius: this.shark.radius, enabled: true }
      : undefined;

    let anyAlive = false;

    // 2. Advance all fish agents
    for (const fish of this.population) {
      if (fish.alive) {
        const wasReached = fish.reachedTarget;
        fish.step(target, walls, diag, maxFrames, reachBonus, sharkHazard);

        if (!wasReached && fish.reachedTarget) {
          this.spawnTargetBurst(fish.x, fish.y);
          if (this.callbacks.onTargetReached) {
            this.callbacks.onTargetReached(fish.id);
          }
        }

        if (fish.alive) {
          anyAlive = true;
        }
      }
    }

    // Update active particles, blood effects, and shockwaves
    this.updateParticles();

    // If all fish died or generation max lifespan reached, advance generation
    if (!anyAlive || this.currentFrame >= maxFrames) {
      this.nextGeneration();
    }
  }

  private updateParticles(): void {
    // Target Beacon particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Shark Blood Spray particles
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const b = this.bloodParticles[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.94;
      b.vy *= 0.94;
      b.life++;
      if (b.life >= b.maxLife) {
        this.bloodParticles.splice(i, 1);
      }
    }

    // Shockwave ripples
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life++;
      s.radius += (s.maxRadius - s.radius) * 0.16;
      if (s.life >= s.maxLife) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Floating combat text
    for (let i = this.chompEffects.length - 1; i >= 0; i--) {
      const c = this.chompEffects[i];
      c.y -= 0.6; // gently float upward
      c.life++;
      if (c.life >= c.maxLife) {
        this.chompEffects.splice(i, 1);
      }
    }
  }

  public spawnSharkKillBurst(x: number, y: number, isElite?: boolean): void {
    // 1. Visceral blood spray particles
    const bloodCount = 24;
    const bloodColors = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#fca5a5"];
    for (let i = 0; i < bloodCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 4.2;
      this.bloodParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 26 + Math.floor(Math.random() * 22),
        size: 1.8 + Math.random() * 2.8,
        color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
      });
    }

    // 2. Shockwave ripple
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: 38,
      life: 0,
      maxLife: 22,
      color: "rgba(239, 68, 68, 0.75)",
    });

    // 3. Floating combat text
    const texts = ["CHOMP! 🦈", "DEVOUR! -60", "CRUNCH! 🩸", "APEX BITE!"];
    const chosenText = isElite ? "ELITE DEVOUR! 🦈" : texts[Math.floor(Math.random() * texts.length)];
    this.chompEffects.push({
      x,
      y: y - 10,
      text: chosenText,
      color: isElite ? "#f43f5e" : "#ef4444",
      life: 0,
      maxLife: 38,
    });
  }

  private spawnTargetBurst(x: number, y: number): void {
    const count = 24;
    const colors = ["#06b6d4", "#10b981", "#ec4899", "#facc15", "#ffffff"];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const speed = 1.5 + Math.random() * 4.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 20),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  public stepWithSpeed(): void {
    if (!this.isRunning) return;

    if (this.config.speedMultiplier < 1) {
      this.frameAccumulator += this.config.speedMultiplier;
      if (this.frameAccumulator >= 1.0) {
        this.frameAccumulator -= 1.0;
        this.step();
      }
    } else {
      const steps = Math.floor(this.config.speedMultiplier);
      for (let i = 0; i < steps; i++) {
        this.step();
      }
    }

    this.emitUiUpdate();
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.stepWithSpeed();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private emitUiUpdate(force: boolean = false): void {
    const now = performance.now();
    // Throttle UI callbacks to ~25 FPS to ensure buttery performance
    if (!force && now - this.lastUiEmitTime < 40) {
      return;
    }
    this.lastUiEmitTime = now;

    if (this.callbacks.onTick) {
      const stats = this.getCurrentStats();
      const telemetry = this.getSelectedTelemetry();
      const sharkTelemetry = this.shark.getTelemetry();
      this.callbacks.onTick(stats, telemetry, sharkTelemetry);
    }
  }

  public setSharkEnabled(enabled: boolean): void {
    this.config.sharkEnabled = enabled;
    this.shark.enabled = enabled;
    this.emitUiUpdate(true);
  }

  public setSharkAggression(aggression: "normal" | "frenzy" | "patrol"): void {
    this.config.sharkAggression = aggression;
    this.shark.aggression = aggression;
    this.emitUiUpdate(true);
  }

  public setSharkPosition(x: number, y: number): void {
    this.shark.setPosition(x, y);
    this.emitUiUpdate(true);
  }

  public getSelectedTelemetry(): SelectedAgentTelemetry | null {
    const targetId = this.userSelectedFishId ?? this.selectedFishId;
    if (targetId !== null) {
      const fish = this.population.find((f) => f.id === targetId);
      if (fish) return fish.getTelemetry();
    }

    const aliveFish = this.population.find((f) => f.alive);
    const fallback = aliveFish || this.population[0];
    return fallback ? fallback.getTelemetry() : null;
  }

  public getSelectedFish(): Fish | null {
    const targetId = this.userSelectedFishId ?? this.selectedFishId;
    if (targetId !== null) {
      const fish = this.population.find((f) => f.id === targetId);
      if (fish) return fish;
    }
    return this.population[0] || null;
  }

  public getCurrentStats(): GenerationStats {
    const totalPop = this.population.length;
    const aliveCount = this.population.filter((f) => f.alive).length;
    const reachedCount = this.population.filter((f) => f.reachedTarget).length;

    let bestFit = 0;
    let worstFit = Infinity;
    let totalFit = 0;
    let bestDist = Infinity;

    for (const f of this.population) {
      if (f.fitness > bestFit) bestFit = f.fitness;
      if (f.fitness < worstFit) worstFit = f.fitness;
      totalFit += f.fitness;
      if (f.bestTargetDistance < bestDist) bestDist = f.bestTargetDistance;
    }

    const avgFit = totalPop > 0 ? totalFit / totalPop : 0;
    const successRate = totalPop > 0 ? (reachedCount / totalPop) * 100 : 0;
    const survivalRate = totalPop > 0 ? (aliveCount / totalPop) * 100 : 0;

    return {
      generation: this.generation,
      bestFitness: Number(bestFit.toFixed(2)),
      averageFitness: Number(avgFit.toFixed(2)),
      worstFitness: worstFit === Infinity ? 0 : Number(worstFit.toFixed(2)),
      bestDistance: bestDist === Infinity ? 0 : Number(bestDist.toFixed(1)),
      survivalRate: Number(survivalRate.toFixed(1)),
      targetSuccessRate: Number(successRate.toFixed(1)),
      aliveCount,
      totalPopulation: totalPop,
      level: this.environment.currentLevel.id,
      elapsedFrames: this.currentFrame,
      sharkKills: this.shark.kills,
    };
  }

  public destroy(): void {
    this.pause();
    this.callbacks = {};
  }
}
