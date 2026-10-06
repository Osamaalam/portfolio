export type BrushMode = "seed" | "scalpel" | "mutagen" | "nutrient" | "eraser";

export type RegenSpeed = "gentle" | "normal" | "rapid";

export type CustomShapeType =
  | "star"
  | "heart"
  | "butterfly"
  | "ring"
  | "spiral"
  | "alien"
  | "lightning"
  | "clover";

export type DisplayMode =
  | "rgba"
  | "channel"
  | "mosaic"
  | "gradient_x"
  | "gradient_y"
  | "entropy";

export interface OrganismPreset {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  category: "Bio-Synthetic" | "Cybernetic" | "Quantum" | "Neural" | "Mycelial" | "User-Created";
  icon: string;
  accentColor: string;
  glowColor: string;
  seedChannels: number[];
  palette: string[];
}

export interface NCAConfig {
  gridSize: number;
  speedMultiplier: number;
  regenSpeed: RegenSpeed;
  updateProbability: number;
  aliveThreshold: number;
  brushRadius: number;
  brushMode: BrushMode;
  displayMode: DisplayMode;
  activeChannel: number;
  glowIntensity: number;
  autoDamageInterval: number; // 0 = disabled
  soundEnabled: boolean;
}

export interface NCATelemetry {
  step: number;
  aliveCells: number;
  totalCells: number;
  biomassPercent: number;
  averageEntropy: number;
  regenerationHealth: number; // 0 - 100%
  fps: number;
  isDamaged: boolean;
  recoveryTimeMs: number;
  targetOrganism: string;
}

export interface ChannelInfo {
  index: number;
  name: string;
  role: string;
  category: "Visual" | "Morphogen" | "Polarity" | "Cellular Energy" | "Memory";
  colorHint: string;
}
