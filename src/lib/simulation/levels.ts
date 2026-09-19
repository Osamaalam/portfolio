import { LevelConfig, Wall } from "@/types/simulation";

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 560;

function createOuterWalls(): Wall[] {
  return [
    { x1: 0, y1: 0, x2: ARENA_WIDTH, y2: 0, type: "outer" },
    { x1: ARENA_WIDTH, y1: 0, x2: ARENA_WIDTH, y2: ARENA_HEIGHT, type: "outer" },
    { x1: ARENA_WIDTH, y1: ARENA_HEIGHT, x2: 0, y2: ARENA_HEIGHT, type: "outer" },
    { x1: 0, y1: ARENA_HEIGHT, x2: 0, y2: 0, type: "outer" },
  ];
}

export const LEVELS: LevelConfig[] = [
  // LEVEL 1: Open Environment
  {
    id: 1,
    name: "Level 1 / 6",
    subtitle: "Open Field",
    description: "Wide unobstructed arena. Teaches agents basic heading and thrust control.",
    walls: [
      ...createOuterWalls(),
    ],
    spawnArea: {
      x: 120,
      y: 280,
      radius: 35,
      angle: 0, // heading right
    },
    target: {
      x: 820,
      y: 280,
      radius: 26,
    },
    maxFrames: 650,
    targetReachBonus: 1200,
  },

  // LEVEL 2: Basic Walls
  {
    id: 2,
    name: "Level 2 / 6",
    subtitle: "Divided Channel",
    description: "Central barrier wall with two wide bypass channels on top and bottom.",
    walls: [
      ...createOuterWalls(),
      // Vertical barrier in middle leaving top and bottom gaps
      { x1: 480, y1: 150, x2: 480, y2: 410, type: "obstacle" },
    ],
    spawnArea: {
      x: 120,
      y: 280,
      radius: 35,
      angle: 0,
    },
    target: {
      x: 820,
      y: 280,
      radius: 26,
    },
    maxFrames: 700,
    targetReachBonus: 1400,
  },

  // LEVEL 3: Maze & Staggered Barriers
  {
    id: 3,
    name: "Level 3 / 6",
    subtitle: "Staggered Gates",
    description: "Alternating top and bottom barriers creating an S-curve navigation path.",
    walls: [
      ...createOuterWalls(),
      // First barrier drops from top
      { x1: 340, y1: 0, x2: 340, y2: 340, type: "obstacle" },
      // Second barrier rises from bottom
      { x1: 620, y1: 220, x2: 620, y2: 560, type: "obstacle" },
    ],
    spawnArea: {
      x: 120,
      y: 280,
      radius: 35,
      angle: 0,
    },
    target: {
      x: 840,
      y: 120,
      radius: 26,
    },
    maxFrames: 750,
    targetReachBonus: 1600,
  },

  // LEVEL 4: Narrow Passages
  {
    id: 4,
    name: "Level 4 / 6",
    subtitle: "Choke Point",
    description: "Funneled walls narrowing into a tight precision transit corridor.",
    walls: [
      ...createOuterWalls(),
      // Slanted funnel top
      { x1: 320, y1: 0, x2: 480, y2: 220, type: "obstacle" },
      // Slanted funnel bottom
      { x1: 320, y1: 560, x2: 480, y2: 340, type: "obstacle" },
      // Horizontal constriction rails
      { x1: 480, y1: 220, x2: 620, y2: 220, type: "obstacle" },
      { x1: 480, y1: 340, x2: 620, y2: 340, type: "obstacle" },
    ],
    spawnArea: {
      x: 120,
      y: 280,
      radius: 30,
      angle: 0,
    },
    target: {
      x: 840,
      y: 280,
      radius: 26,
    },
    maxFrames: 800,
    targetReachBonus: 1800,
  },

  // LEVEL 5: Complex Walls (from visual reference: "Level 5 / 6 • walls")
  {
    id: 5,
    name: "Level 5 / 6",
    subtitle: "Segmented Matrix",
    description: "Complex multi-chamber layout requiring active sensor-driven wall avoidance.",
    walls: [
      ...createOuterWalls(),
      // Left vertical divider with center window
      { x1: 280, y1: 0, x2: 280, y2: 200, type: "obstacle" },
      { x1: 280, y1: 360, x2: 280, y2: 560, type: "obstacle" },
      // Central floating diamond / block
      { x1: 460, y1: 200, x2: 560, y2: 200, type: "obstacle" },
      { x1: 560, y1: 200, x2: 560, y2: 360, type: "obstacle" },
      { x1: 560, y1: 360, x2: 460, y2: 360, type: "obstacle" },
      { x1: 460, y1: 360, x2: 460, y2: 200, type: "obstacle" },
      // Right vertical divider
      { x1: 720, y1: 140, x2: 720, y2: 420, type: "obstacle" },
    ],
    spawnArea: {
      x: 100,
      y: 280,
      radius: 35,
      angle: 0,
    },
    target: {
      x: 850,
      y: 280,
      radius: 26,
    },
    maxFrames: 850,
    targetReachBonus: 2000,
  },

  // LEVEL 6: Advanced Maze
  {
    id: 6,
    name: "Level 6 / 6",
    subtitle: "Labyrinth Core",
    description: "Deep multi-turn labyrinth challenging advanced spatial policy generalization.",
    walls: [
      ...createOuterWalls(),
      // Left barrier
      { x1: 220, y1: 120, x2: 220, y2: 560, type: "obstacle" },
      // Top horizontal passage divider
      { x1: 220, y1: 120, x2: 540, y2: 120, type: "obstacle" },
      // Center column
      { x1: 540, y1: 120, x2: 540, y2: 420, type: "obstacle" },
      // Bottom bridge
      { x1: 380, y1: 420, x2: 540, y2: 420, type: "obstacle" },
      // Right barrier with lower opening
      { x1: 720, y1: 0, x2: 720, y2: 380, type: "obstacle" },
    ],
    spawnArea: {
      x: 90,
      y: 450,
      radius: 30,
      angle: -Math.PI / 2, // heading up
    },
    target: {
      x: 850,
      y: 460,
      radius: 26,
    },
    maxFrames: 900,
    targetReachBonus: 2500,
  },
];
