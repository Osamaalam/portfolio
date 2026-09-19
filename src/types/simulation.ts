import { NeuralNetwork } from "@/lib/neural/NeuralNetwork";

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: "outer" | "obstacle";
}

export interface Target {
  x: number;
  y: number;
  radius: number;
}

export interface RayHit {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hitX: number;
  hitY: number;
  distance: number; // 0 to 1 normalized
  rawDistance: number;
  hit: boolean;
  angle: number;
  hitType?: "wall" | "shark";
}

export type AgentState = "SEARCHING" | "TARGET_REACHED" | "CRASHED" | "TIMEOUT" | "EATEN";

export interface FishAgentData {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  alive: boolean;
  age: number;
  fitness: number;
  distanceTravelled: number;
  targetDistance: number;
  initialTargetDistance: number;
  bestTargetDistance: number;
  reachedTarget: boolean;
  state: AgentState;
  color: string;
  isElite?: boolean;
}

export interface SelectedAgentTelemetry extends FishAgentData {
  inputs: number[];
  outputs: number[];
  activations: number[][];
  rays: RayHit[];
  weights: number[][][];
  biases: number[][];
  layerSizes: number[];
}

export type SharkState = "PATROLLING" | "STALKING" | "LUNGING" | "FEEDING";

export interface SharkTelemetry {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  targetFishId: number | null;
  kills: number;
  totalKills: number;
  state: SharkState;
  tailPhase: number;
  jawOpen: number;
  aggression: "normal" | "frenzy" | "patrol";
  enabled: boolean;
  radius: number;
}

export interface SharkKillEvent {
  fishId: number;
  x: number;
  y: number;
  isElite?: boolean;
}

export interface GenerationStats {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  worstFitness: number;
  bestDistance: number;
  survivalRate: number;       // percentage 0 - 100
  targetSuccessRate: number;  // percentage 0 - 100
  aliveCount: number;
  totalPopulation: number;
  level: number;
  elapsedFrames: number;
  sharkKills?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  walls: Wall[];
  spawnArea: {
    x: number;
    y: number;
    radius: number;
    angle: number; // default heading
  };
  target: Target;
  maxFrames: number;
  targetReachBonus: number;
}

export interface SimulationConfig {
  populationSize: number;
  mutationRate: number;      // 0.01 to 0.5 (default 0.08)
  mutationStrength: number;  // 0.05 to 1.0 (default 0.35)
  eliteCount: number;
  speedMultiplier: number;   // 0.5, 1, 2, 5, 10
  showNetwork: boolean;
  showSensorRays: boolean;
  showTrails: boolean;
  showDebug: boolean;
  autoProgressLevel: boolean;
  sharkEnabled?: boolean;
  sharkSpeed?: number;
  sharkAggression?: "normal" | "frenzy" | "patrol";
}
