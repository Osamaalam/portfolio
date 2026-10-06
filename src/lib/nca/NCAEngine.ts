import {
  NCAConfig,
  NCATelemetry,
  OrganismPreset,
  BrushMode,
  DisplayMode,
  RegenSpeed,
  CustomShapeType,
} from "@/types/nca";
import {
  ORGANISM_PRESETS,
  STENCIL_PRESETS,
  generateOrganismTarget,
  generateStencilTarget,
  generateTextTarget,
  generateCanvasTarget,
} from "./presets";
import { ncaSound } from "./NCASound";

export class NCAEngine {
  public config: NCAConfig;
  public organism: OrganismPreset;

  // Grid dimensions
  public readonly width: number;
  public readonly height: number;
  private readonly totalCells: number;

  // Cell state buffers (16 channels per cell)
  private state: Float32Array;
  private nextState: Float32Array;
  private targetState: Float32Array;

  // Telemetry & metrics
  private stepCount: number = 0;
  private isRunning: boolean = true;
  private lastFpsTimestamp: number = performance.now();
  private framesCount: number = 0;
  private currentFps: number = 60;

  // Regeneration tracking
  private isDamaged: boolean = false;
  private damageStartTime: number = 0;
  private recoveryTimeMs: number = 0;
  private lastHealth: number = 100;
  private hadLowHealth: boolean = false;

  // Offscreen rendering buffer for Canvas 2D
  private pixelBuffer: ImageData | null = null;

  // Callback
  private onTelemetryUpdate?: (telemetry: NCATelemetry) => void;

  constructor(
    initialOrganismId: string = "gecko",
    configOverrides?: Partial<NCAConfig>,
    onTelemetryUpdate?: (telemetry: NCATelemetry) => void
  ) {
    this.organism =
      ORGANISM_PRESETS.find((p) => p.id === initialOrganismId) ||
      ORGANISM_PRESETS[0];

    this.width = configOverrides?.gridSize || 76;
    this.height = configOverrides?.gridSize || 76;
    this.totalCells = this.width * this.height;

    this.config = {
      gridSize: this.width,
      speedMultiplier: 1, // Default 1 step per frame for smooth visible biological division
      regenSpeed: "normal", // "gentle" | "normal" | "rapid"
      updateProbability: 0.5,
      aliveThreshold: 0.1,
      brushRadius: 4,
      brushMode: "scalpel",
      displayMode: "rgba",
      activeChannel: 4,
      glowIntensity: 0.45,
      autoDamageInterval: 0,
      soundEnabled: true,
      ...configOverrides,
    };

    this.onTelemetryUpdate = onTelemetryUpdate;

    // Allocate memory buffers
    this.state = new Float32Array(this.totalCells * 16);
    this.nextState = new Float32Array(this.totalCells * 16);
    this.targetState = generateOrganismTarget(this.organism.id, this.width);

    // Plant initial center seed
    this.plantSeed(Math.floor(this.width / 2), Math.floor(this.height / 2), 3);
  }

  /**
   * Set target organism and reinitialize state or morph in-place.
   */
  public setOrganism(organismId: string, morphInPlace: boolean = false) {
    const found = ORGANISM_PRESETS.find((p) => p.id === organismId);
    if (!found) return;
    this.organism = found;
    this.targetState = generateOrganismTarget(found.id, this.width);

    if (!morphInPlace) {
      this.resetToSeed();
    }
  }

  /**
   * Set custom geometric stencil shape (star, heart, butterfly, etc.).
   */
  public setCustomStencil(shape: CustomShapeType, morphInPlace: boolean = true) {
    const stencilMeta = STENCIL_PRESETS.find((s) => s.id === shape);
    this.organism = {
      id: `custom_${shape}`,
      name: stencilMeta?.name || shape.toUpperCase(),
      scientificName: `Morpho ${shape.toUpperCase()}`,
      category: "User-Created",
      icon: stencilMeta?.icon || "🎨",
      description: stencilMeta?.description || "User-customized geometric morphogenetic manifold.",
      accentColor: stencilMeta?.color || "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.4)",
      seedChannels: [0.9, 0.3, 0.8, 1.0, 0.5, 0.5, 0.8, 0.3, 0.9, 0.5, 0.8, 0.4, 0.6, 0.4, 0.8, 0.1],
      palette: [stencilMeta?.color || "#ec4899", "#38bdf8", "#facc15", "#10b981"],
    };
    this.targetState = generateStencilTarget(shape, this.width);

    if (!morphInPlace) {
      this.resetToSeed();
    }
  }

  /**
   * Set custom text / emoji target.
   */
  public setCustomText(
    text: string,
    colorHex: string = "#10b981",
    morphInPlace: boolean = true
  ) {
    this.organism = {
      id: `custom_text_${Date.now()}`,
      name: `"${text}" Glyph`,
      scientificName: `Typo Synthetica [${text}]`,
      category: "User-Created",
      icon: "🔤",
      description: `Living decentralized neural automata synthesized from custom user input "${text}".`,
      accentColor: colorHex,
      glowColor: `${colorHex}66`,
      seedChannels: [0.8, 0.9, 0.2, 1.0, 0.5, 0.5, 0.8, 0.2, 0.9, 0.4, 0.8, 0.3, 0.6, 0.4, 0.8, 0.1],
      palette: [colorHex, "#38bdf8", "#facc15"],
    };
    this.targetState = generateTextTarget(text, this.width, colorHex);

    if (!morphInPlace) {
      this.resetToSeed();
    }
  }

  /**
   * Set custom canvas / uploaded image target.
   */
  public setCustomFromCanvas(
    sourceCanvas: HTMLCanvasElement,
    name: string = "Custom Blueprint",
    morphInPlace: boolean = true
  ) {
    this.organism = {
      id: `custom_img_${Date.now()}`,
      name: name,
      scientificName: "Imago Synthetica",
      category: "User-Created",
      icon: "🖼️",
      description: "Living organism synthesized directly from user-uploaded pixel bitmap.",
      accentColor: "#38bdf8",
      glowColor: "rgba(56, 189, 248, 0.4)",
      seedChannels: [0.5, 0.8, 1.0, 1.0, 0.5, 0.5, 0.8, 0.2, 0.9, 0.4, 0.8, 0.3, 0.6, 0.4, 0.8, 0.1],
      palette: ["#38bdf8", "#ec4899", "#10b981"],
    };
    this.targetState = generateCanvasTarget(sourceCanvas, this.width);

    if (!morphInPlace) {
      this.resetToSeed();
    }
  }

  /**
   * Set current living canvas state as the new ground-truth homeostatic target!
   * Allows users to paint directly on the canvas and lock it into a living organism.
   */
  public bakeCurrentStateAsTarget(name: string = "Painted Organism") {
    this.targetState.set(this.state);
    this.organism = {
      id: `painted_${Date.now()}`,
      name: name,
      scientificName: "Pinacotheca Viva",
      category: "User-Created",
      icon: "🖌️",
      description: "Freehand organism sculpted directly on the bio-canvas by the user.",
      accentColor: "#facc15",
      glowColor: "rgba(250, 204, 21, 0.4)",
      seedChannels: [0.9, 0.8, 0.1, 1.0, 0.5, 0.5, 0.8, 0.2, 0.9, 0.4, 0.8, 0.3, 0.6, 0.4, 0.8, 0.1],
      palette: ["#facc15", "#ec4899", "#38bdf8", "#10b981"],
    };
    this.isDamaged = false;
    this.recoveryTimeMs = 0;
  }

  /**
   * Set regeneration speed: "gentle", "normal", or "rapid".
   */
  public setRegenSpeed(speed: RegenSpeed) {
    this.config.regenSpeed = speed;
  }

  /**
   * Clear the entire grid to empty vacuum.
   */
  public clearGrid() {
    this.state.fill(0);
    this.nextState.fill(0);
    this.stepCount = 0;
    this.isDamaged = false;
    this.recoveryTimeMs = 0;
  }

  /**
   * Reset grid to a single stem cell seed in center.
   */
  public resetToSeed() {
    this.clearGrid();
    this.plantSeed(Math.floor(this.width / 2), Math.floor(this.height / 2), 2);
    ncaSound.playSeedDrop();
  }

  /**
   * Plant a seed at specified cell coordinates.
   */
  public plantSeed(cx: number, cy: number, radius: number = 2) {
    const r2 = radius * radius;
    const seed = this.organism.seedChannels;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const idx = (y * this.width + x) * 16;
            for (let c = 0; c < 16; c++) {
              this.state[idx + c] = seed[c] ?? 0.5;
            }
            // Ensure fully alive alpha
            this.state[idx + 3] = 1.0;
          }
        }
      }
    }
  }

  /**
   * Apply interactive brush tool at normalized or pixel grid coordinates.
   */
  public applyBrush(gridX: number, gridY: number, mode?: BrushMode) {
    const currentMode = mode || this.config.brushMode;
    const radius = this.config.brushRadius;
    const r2 = radius * radius;
    const cx = Math.floor(gridX);
    const cy = Math.floor(gridY);

    if (currentMode === "seed") {
      this.plantSeed(cx, cy, Math.max(1, Math.floor(radius / 2)));
      ncaSound.playSeedDrop();
      return;
    }

    if (currentMode === "scalpel") {
      ncaSound.playScalpelSlice();
      this.isDamaged = true;
      this.hadLowHealth = true;
      this.damageStartTime = performance.now();
    } else if (currentMode === "mutagen") {
      ncaSound.playMutagen();
    } else if (currentMode === "nutrient") {
      ncaSound.playNutrient();
    }

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const idx = (y * this.width + x) * 16;

            if (currentMode === "scalpel" || currentMode === "eraser") {
              // Completely resect / kill cell
              for (let c = 0; c < 16; c++) {
                this.state[idx + c] = 0;
              }
            } else if (currentMode === "mutagen") {
              // Inject stochastic chemical entropy into hidden channels
              for (let c = 4; c < 16; c++) {
                this.state[idx + c] += (Math.random() - 0.5) * 1.5;
              }
              // Distort color
              this.state[idx] = Math.min(1, Math.max(0, this.state[idx] + (Math.random() - 0.5) * 0.4));
              this.state[idx + 1] = Math.min(1, Math.max(0, this.state[idx + 1] + (Math.random() - 0.5) * 0.4));
              this.state[idx + 2] = Math.min(1, Math.max(0, this.state[idx + 2] + (Math.random() - 0.5) * 0.4));
            } else if (currentMode === "nutrient") {
              // Surge in mitotic potential and morphogen activator
              if (this.state[idx + 3] > 0.05) {
                this.state[idx + 6] = Math.min(1, this.state[idx + 6] + 0.6); // Activator
                this.state[idx + 8] = 1.0; // Mitosis
                this.state[idx + 14] = 1.0; // ATP flux
              }
            }
          }
        }
      }
    }
  }

  /**
   * Auto stress test: slices a circular crater in the organism to demonstrate real-time regeneration.
   */
  public triggerStressTest() {
    const cx = Math.floor(this.width / 2) + Math.floor((Math.random() - 0.5) * 14);
    const cy = Math.floor(this.height / 2) + Math.floor((Math.random() - 0.5) * 14);
    const radius = 7;
    this.applyBrush(cx, cy, "scalpel");
  }

  /**
   * Execute simulation step(s).
   */
  public step() {
    const stepsToRun = Math.max(1, this.config.speedMultiplier);
    for (let i = 0; i < stepsToRun; i++) {
      this.singleStep();
    }
    this.calculateTelemetry();
  }

  /**
   * Single biological perception and update cycle.
   * Calibrated with organic, gradual mitosis speed so the user can visibly witness the cells healing!
   */
  private singleStep() {
    this.stepCount++;
    const w = this.width;
    const h = this.height;
    const state = this.state;
    const next = this.nextState;
    const target = this.targetState;
    const updateProb = this.config.updateProbability;
    const aliveThresh = this.config.aliveThreshold;

    // Biological growth calibration based on regenSpeed
    // Gentle: ~0.016 (50-60 frames to regrow, super smooth wave)
    // Normal: ~0.035 (25-30 frames to regrow, clear visible healing)
    // Rapid:  ~0.080 (10-12 frames)
    let baseGrowthRate = 0.035;
    let colorLerp = 0.06;
    if (this.config.regenSpeed === "gentle") {
      baseGrowthRate = 0.016;
      colorLerp = 0.03;
    } else if (this.config.regenSpeed === "rapid") {
      baseGrowthRate = 0.08;
      colorLerp = 0.12;
    }

    // Pre-calculate alive mask across 3x3 neighborhood (max pool of alpha)
    for (let y = 0; y < h; y++) {
      const yUp = y > 0 ? y - 1 : h - 1;
      const yDown = y < h - 1 ? y + 1 : 0;

      for (let x = 0; x < w; x++) {
        const xLeft = x > 0 ? x - 1 : w - 1;
        const xRight = x < w - 1 ? x + 1 : 0;

        const cellIdx = (y * w + x) * 16;
        const alpha = state[cellIdx + 3];

        // Max pool 3x3 neighborhood alpha
        let maxNeighborAlpha = alpha;
        const neighbors = [
          (yUp * w + xLeft) * 16 + 3,
          (yUp * w + x) * 16 + 3,
          (yUp * w + xRight) * 16 + 3,
          (y * w + xLeft) * 16 + 3,
          (y * w + xRight) * 16 + 3,
          (yDown * w + xLeft) * 16 + 3,
          (yDown * w + x) * 16 + 3,
          (yDown * w + xRight) * 16 + 3,
        ];

        for (let i = 0; i < 8; i++) {
          const na = state[neighbors[i]];
          if (na > maxNeighborAlpha) maxNeighborAlpha = na;
        }

        // Cell is alive if max neighbor alpha > aliveThresh
        const isAlive = maxNeighborAlpha > aliveThresh;

        if (!isAlive) {
          // Zero out dead cell
          for (let c = 0; c < 16; c++) {
            next[cellIdx + c] = 0;
          }
          continue;
        }

        // Stochastic update gate
        if (Math.random() > updateProb) {
          // Keep current state
          for (let c = 0; c < 16; c++) {
            next[cellIdx + c] = state[cellIdx + c];
          }
          continue;
        }

        // Perception step: Sobel X, Sobel Y, and Laplacians
        const a_nw = state[(yUp * w + xLeft) * 16 + 3];
        const a_n = state[(yUp * w + x) * 16 + 3];
        const a_ne = state[(yUp * w + xRight) * 16 + 3];
        const a_w = state[(y * w + xLeft) * 16 + 3];
        const a_e = state[(y * w + xRight) * 16 + 3];
        const a_sw = state[(yDown * w + xLeft) * 16 + 3];
        const a_s = state[(yDown * w + x) * 16 + 3];
        const a_se = state[(yDown * w + xRight) * 16 + 3];

        const dAx = (a_ne + 2 * a_e + a_se - (a_nw + 2 * a_w + a_sw)) * 0.125;
        const dAy = (a_sw + 2 * a_s + a_se - (a_nw + 2 * a_n + a_ne)) * 0.125;

        // Target attractors for current cell
        const tR = target[cellIdx];
        const tG = target[cellIdx + 1];
        const tB = target[cellIdx + 2];
        const tA = target[cellIdx + 3];

        // 1. Organic Gradual Mitosis / Blastema crawl:
        let curA = state[cellIdx + 3];
        if (curA < tA) {
          const mitEnergy = state[cellIdx + 8] || 0.5;
          const growthIncrement = baseGrowthRate * (0.8 + mitEnergy * 0.6);
          curA = Math.min(tA, curA + growthIncrement);
        } else if (tA === 0 && curA > 0) {
          curA = Math.max(0.0, curA - baseGrowthRate * 1.5);
        }

        // 2. Pigment synthesis: gradual protein convergence
        const curR = state[cellIdx] + (tR - state[cellIdx]) * colorLerp;
        const curG = state[cellIdx + 1] + (tG - state[cellIdx + 1]) * colorLerp;
        const curB = state[cellIdx + 2] + (tB - state[cellIdx + 2]) * colorLerp;

        // 3. Biochemical hidden channels update
        const curGradX = state[cellIdx + 4] * 0.9 + dAx * 0.4;
        const curGradY = state[cellIdx + 5] * 0.9 + dAy * 0.4;
        const curAct = state[cellIdx + 6] * 0.88 + curA * 0.12;
        const curInh = state[cellIdx + 7] * 0.92 + (1.0 - curA) * 0.08;

        const isBorder = Math.abs(dAx) + Math.abs(dAy) > 0.15;
        const curMit = isBorder ? 0.95 : Math.max(0.2, state[cellIdx + 8] * 0.96);

        // Store into next state
        next[cellIdx] = Math.min(1, Math.max(0, curR));
        next[cellIdx + 1] = Math.min(1, Math.max(0, curG));
        next[cellIdx + 2] = Math.min(1, Math.max(0, curB));
        next[cellIdx + 3] = Math.min(1, Math.max(0, curA));

        next[cellIdx + 4] = curGradX;
        next[cellIdx + 5] = curGradY;
        next[cellIdx + 6] = curAct;
        next[cellIdx + 7] = curInh;
        next[cellIdx + 8] = curMit;

        for (let c = 9; c < 16; c++) {
          const targetVal = target[cellIdx + c];
          next[cellIdx + c] = state[cellIdx + c] * 0.94 + targetVal * 0.06;
        }
      }
    }

    // Swap state buffers
    const temp = this.state;
    this.state = this.nextState;
    this.nextState = temp;
  }

  /**
   * Render current simulation state to an HTML5 Canvas.
   */
  public renderToCanvas(
    canvas: HTMLCanvasElement,
    renderWidth: number,
    renderHeight: number
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (
      !this.pixelBuffer ||
      this.pixelBuffer.width !== this.width ||
      this.pixelBuffer.height !== this.height
    ) {
      this.pixelBuffer = ctx.createImageData(this.width, this.height);
    }

    const imgData = this.pixelBuffer;
    const pixels = imgData.data;
    const state = this.state;
    const mode = this.config.displayMode;
    const activeChan = this.config.activeChannel;
    const total = this.totalCells;

    if (mode === "rgba") {
      for (let i = 0; i < total; i++) {
        const sIdx = i * 16;
        const pIdx = i * 4;
        const a = state[sIdx + 3];

        if (a < 0.05) {
          pixels[pIdx] = 6;
          pixels[pIdx + 1] = 6;
          pixels[pIdx + 2] = 10;
          pixels[pIdx + 3] = 255;
        } else {
          pixels[pIdx] = Math.round(state[sIdx] * 255 * a);
          pixels[pIdx + 1] = Math.round(state[sIdx + 1] * 255 * a);
          pixels[pIdx + 2] = Math.round(state[sIdx + 2] * 255 * a);
          pixels[pIdx + 3] = 255;
        }
      }
    } else if (mode === "channel") {
      for (let i = 0; i < total; i++) {
        const sIdx = i * 16;
        const pIdx = i * 4;
        const a = state[sIdx + 3];
        const val = Math.max(-1, Math.min(1, state[sIdx + activeChan]));
        const norm = (val + 1) * 0.5;

        if (a < 0.05) {
          pixels[pIdx] = 6;
          pixels[pIdx + 1] = 6;
          pixels[pIdx + 2] = 10;
          pixels[pIdx + 3] = 255;
        } else {
          const r = Math.round(Math.sin(norm * Math.PI) * 255);
          const g = Math.round(Math.sin(norm * Math.PI * 1.5) * 230);
          const b = Math.round(Math.cos(norm * Math.PI * 0.5) * 255);

          pixels[pIdx] = r;
          pixels[pIdx + 1] = g;
          pixels[pIdx + 2] = b;
          pixels[pIdx + 3] = 255;
        }
      }
    } else if (mode === "gradient_x" || mode === "gradient_y") {
      const gChan = mode === "gradient_x" ? 4 : 5;
      for (let i = 0; i < total; i++) {
        const sIdx = i * 16;
        const pIdx = i * 4;
        const a = state[sIdx + 3];
        const gVal = state[sIdx + gChan];

        if (a < 0.05) {
          pixels[pIdx] = 6;
          pixels[pIdx + 1] = 6;
          pixels[pIdx + 2] = 10;
          pixels[pIdx + 3] = 255;
        } else {
          if (gVal >= 0) {
            pixels[pIdx] = 6;
            pixels[pIdx + 1] = Math.round(Math.min(1, gVal * 3) * 220);
            pixels[pIdx + 2] = Math.round(Math.min(1, gVal * 3) * 255);
          } else {
            pixels[pIdx] = Math.round(Math.min(1, -gVal * 3) * 240);
            pixels[pIdx + 1] = 10;
            pixels[pIdx + 2] = Math.round(Math.min(1, -gVal * 3) * 180);
          }
          pixels[pIdx + 3] = 255;
        }
      }
    } else {
      for (let i = 0; i < total; i++) {
        const sIdx = i * 16;
        const pIdx = i * 4;
        const a = state[sIdx + 3];
        const mit = state[sIdx + 8];

        if (a < 0.05) {
          pixels[pIdx] = 6;
          pixels[pIdx + 1] = 6;
          pixels[pIdx + 2] = 10;
          pixels[pIdx + 3] = 255;
        } else {
          pixels[pIdx] = Math.round(mit * 255);
          pixels[pIdx + 1] = Math.round((1 - mit * 0.4) * 220);
          pixels[pIdx + 2] = 40;
          pixels[pIdx + 3] = 255;
        }
      }
    }

    ctx.imageSmoothingEnabled = false;

    const offscreen = document.createElement("canvas");
    offscreen.width = this.width;
    offscreen.height = this.height;
    const offCtx = offscreen.getContext("2d");
    if (offCtx) {
      offCtx.putImageData(imgData, 0, 0);

      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, renderWidth, renderHeight);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const step = renderWidth / 16;
      for (let x = 0; x <= renderWidth; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, renderHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= renderHeight; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(renderWidth, y);
        ctx.stroke();
      }

      ctx.drawImage(offscreen, 0, 0, renderWidth, renderHeight);

      if (this.config.glowIntensity > 0 && mode === "rgba") {
        ctx.save();
        ctx.globalAlpha = this.config.glowIntensity * 0.4;
        ctx.filter = "blur(8px)";
        ctx.drawImage(offscreen, 0, 0, renderWidth, renderHeight);
        ctx.restore();
      }
    }
  }

  /**
   * Render 16-channel mosaic grid into an auxiliary canvas.
   */
  public renderMosaicToCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = 4;
    const rows = 4;
    const tileW = Math.floor(canvas.width / cols);
    const tileH = Math.floor(canvas.height / rows);

    const offscreen = document.createElement("canvas");
    offscreen.width = this.width;
    offscreen.height = this.height;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let c = 0; c < 16; c++) {
      const imgData = offCtx.createImageData(this.width, this.height);
      const px = imgData.data;

      for (let i = 0; i < this.totalCells; i++) {
        const sIdx = i * 16;
        const pIdx = i * 4;
        const a = this.state[sIdx + 3];

        if (a < 0.05) {
          px[pIdx] = 10;
          px[pIdx + 1] = 10;
          px[pIdx + 2] = 14;
          px[pIdx + 3] = 255;
        } else {
          const val = (this.state[sIdx + c] + 1) * 0.5;
          px[pIdx] = Math.round(val * 240);
          px[pIdx + 1] = Math.round(Math.sin(val * Math.PI) * 220);
          px[pIdx + 2] = Math.round((1 - val) * 240);
          px[pIdx + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      const col = c % cols;
      const row = Math.floor(c / cols);
      const x = col * tileW;
      const y = row * tileH;

      ctx.drawImage(offscreen, x + 1, y + 1, tileW - 2, tileH - 2);

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(x + 2, y + 2, 28, 11);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 8px monospace";
      ctx.fillText(`C${c}`, x + 4, y + 10);
    }
  }

  /**
   * Calculate live telemetry metrics.
   */
  private calculateTelemetry() {
    this.framesCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTimestamp;
    if (elapsed >= 500) {
      this.currentFps = Math.round((this.framesCount * 1000) / elapsed);
      this.framesCount = 0;
      this.lastFpsTimestamp = now;
    }

    let aliveCount = 0;
    let matchScore = 0;
    let targetCells = 0;
    let totalEntropy = 0;

    const state = this.state;
    const target = this.targetState;
    const total = this.totalCells;

    for (let i = 0; i < total; i++) {
      const sIdx = i * 16;
      const curA = state[sIdx + 3];
      const tarA = target[sIdx + 3];

      if (curA > 0.1) {
        aliveCount++;
        let variance = 0;
        const mean = (state[sIdx] + state[sIdx + 1] + state[sIdx + 2]) / 3;
        variance += Math.pow(state[sIdx] - mean, 2);
        variance += Math.pow(state[sIdx + 1] - mean, 2);
        variance += Math.pow(state[sIdx + 2] - mean, 2);
        totalEntropy += Math.sqrt(variance);
      }

      if (tarA > 0.1) {
        targetCells++;
        if (curA > 0.1) {
          matchScore++;
        }
      }
    }

    const health = targetCells > 0 ? Math.min(100, Math.round((matchScore / targetCells) * 100)) : 100;
    const biomassPercent = Math.round((aliveCount / total) * 100);
    const avgEntropy = aliveCount > 0 ? parseFloat((totalEntropy / aliveCount).toFixed(3)) : 0;

    if (this.hadLowHealth && health >= 92) {
      this.hadLowHealth = false;
      this.isDamaged = false;
      this.recoveryTimeMs = Math.round(now - this.damageStartTime);
      ncaSound.playRegenSuccess();
    }

    this.lastHealth = health;

    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate({
        step: this.stepCount,
        aliveCells: aliveCount,
        totalCells: total,
        biomassPercent,
        averageEntropy: avgEntropy,
        regenerationHealth: health,
        fps: this.currentFps,
        isDamaged: this.isDamaged,
        recoveryTimeMs: this.recoveryTimeMs,
        targetOrganism: this.organism.name,
      });
    }
  }

  public getTelemetry(): NCATelemetry {
    return {
      step: this.stepCount,
      aliveCells: 0,
      totalCells: this.totalCells,
      biomassPercent: 0,
      averageEntropy: 0,
      regenerationHealth: this.lastHealth,
      fps: this.currentFps,
      isDamaged: this.isDamaged,
      recoveryTimeMs: this.recoveryTimeMs,
      targetOrganism: this.organism.name,
    };
  }

  public setRunning(running: boolean) {
    this.isRunning = running;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
