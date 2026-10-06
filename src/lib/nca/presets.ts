import { OrganismPreset, CustomShapeType } from "@/types/nca";

export const ORGANISM_PRESETS: OrganismPreset[] = [
  {
    id: "gecko",
    name: "Cyber Gecko",
    scientificName: "Lacerta Synthetica v4",
    category: "Bio-Synthetic",
    icon: "🦎",
    description:
      "Iconic Distill morphogenetic model. High regenerative plasticity — severe caudal cuts and limb amputations trigger immediate blastema regrowth.",
    accentColor: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.4)",
    seedChannels: [0.1, 0.9, 0.6, 1.0, 0.5, 0.5, 0.8, 0.2, 0.9, 0.4, 0.7, 0.3, 0.8, 0.5, 0.9, 0.1],
    palette: ["#10b981", "#06b6d4", "#34d399", "#facc15", "#047857"],
  },
  {
    id: "blossom",
    name: "Prismatic Cyber Blossom",
    scientificName: "Rosa Cybernetica",
    category: "Cybernetic",
    icon: "🌸",
    description:
      "Octagonal radial morphogenesis. Secretes vivid anthocyanin and carotenoid analogs to produce hyper-saturated petal gradients.",
    accentColor: "#ec4899",
    glowColor: "rgba(236, 72, 153, 0.4)",
    seedChannels: [0.95, 0.2, 0.7, 1.0, 0.6, 0.4, 0.9, 0.3, 0.7, 0.6, 0.8, 0.4, 0.9, 0.2, 0.8, 0.05],
    palette: ["#ec4899", "#a855f7", "#fbbf24", "#22d3ee", "#f43f5e"],
  },
  {
    id: "neural_brain",
    name: "Neural Nexus Cortex",
    scientificName: "Cerebrum Synaptica",
    category: "Neural",
    icon: "🧠",
    description:
      "Decentralized bio-computational cortical manifold. Axonal channels propagate simulated bio-electric action potentials across hemispheres.",
    accentColor: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.4)",
    seedChannels: [0.4, 0.6, 1.0, 1.0, 0.5, 0.7, 0.7, 0.4, 0.85, 0.5, 0.6, 0.9, 0.3, 0.8, 0.7, 0.1],
    palette: ["#8b5cf6", "#38bdf8", "#f43f5e", "#6366f1", "#c084fc"],
  },
  {
    id: "jellyfish",
    name: "Bioluminescent Medusa",
    scientificName: "Aurelia Photogenica",
    category: "Bio-Synthetic",
    icon: "🪼",
    description:
      "Deep-sea cnidarian morphology with translucent gelatinous umbrella and trailing rhythmic tentacles sustained by hydro-dynamic Turing waves.",
    accentColor: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.45)",
    seedChannels: [0.1, 0.85, 0.95, 1.0, 0.5, 0.8, 0.6, 0.5, 0.9, 0.3, 0.7, 0.7, 0.2, 0.9, 0.6, 0.08],
    palette: ["#06b6d4", "#7c3aed", "#fb7185", "#38bdf8", "#67e8f9"],
  },
  {
    id: "quantum_heart",
    name: "Quantum Bio-Pacer",
    scientificName: "Cor Artificialis α",
    category: "Quantum",
    icon: "🫀",
    description:
      "Autonomous cardiovascular organ model. Exhibits rhythmic systolic-diastolic contractions driven by pacemaker morphogens in Channel 11.",
    accentColor: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.45)",
    seedChannels: [0.95, 0.15, 0.3, 1.0, 0.5, 0.6, 0.85, 0.3, 0.9, 0.7, 0.8, 0.85, 0.7, 0.6, 0.9, 0.1],
    palette: ["#ef4444", "#f43f5e", "#06b6d4", "#f59e0b", "#991b1b"],
  },
  {
    id: "coral_fungus",
    name: "Alien Mycelium Reef",
    scientificName: "Physarum Chondrus",
    category: "Mycelial",
    icon: "🪸",
    description:
      "Self-routing labyrinthine plasmodium with vascular cytoplasmic shuttling, forming resilient fractal loops and nutrient bridges.",
    accentColor: "#eab308",
    glowColor: "rgba(234, 179, 8, 0.45)",
    seedChannels: [0.85, 0.9, 0.1, 1.0, 0.4, 0.5, 0.75, 0.35, 0.8, 0.6, 0.9, 0.5, 0.4, 0.8, 0.85, 0.1],
    palette: ["#22c55e", "#eab308", "#a855f7", "#14b8a6", "#84cc16"],
  },
];

export interface StencilItem {
  id: CustomShapeType;
  name: string;
  icon: string;
  category: string;
  color: string;
  description: string;
}

export const STENCIL_PRESETS: StencilItem[] = [
  {
    id: "star",
    name: "Supernova Star",
    icon: "⭐",
    category: "Cosmic",
    color: "#facc15",
    description: "5-pointed stellated polygon with glowing solar core and radiant coronal flares.",
  },
  {
    id: "heart",
    name: "Bio-Luminescent Heart",
    icon: "💖",
    category: "Organ",
    color: "#ec4899",
    description: "Cardioid silhouette with vibrant arterial crimson and hot pink auroral aura.",
  },
  {
    id: "butterfly",
    name: "Morpho Butterfly",
    icon: "🦋",
    category: "Fauna",
    color: "#06b6d4",
    description: "Bilateral wing manifold with iridescent electric cyan and ultraviolet margins.",
  },
  {
    id: "ring",
    name: "Quantum Ring",
    icon: "🪐",
    category: "Geometric",
    color: "#38bdf8",
    description: "Concentric toroidal ring exhibiting continuous harmonic boundary waves.",
  },
  {
    id: "spiral",
    name: "Logarithmic Spiral",
    icon: "🌀",
    category: "Natural",
    color: "#a855f7",
    description: "Archimedean chiral vortex reflecting Fibonacci biological shell morphogenesis.",
  },
  {
    id: "alien",
    name: "Cyber Invader",
    icon: "👾",
    category: "Synthetic",
    color: "#22c55e",
    description: "Pixel-art cybernetic alien entity with phosphor-green bio-chassis.",
  },
  {
    id: "lightning",
    name: "Electric Bolt",
    icon: "⚡",
    category: "Energetic",
    color: "#38bdf8",
    description: "Jagged plasma discharge channel carrying simulated electrostatic potentials.",
  },
  {
    id: "clover",
    name: "Four-Leaf Clover",
    icon: "🍀",
    category: "Flora",
    color: "#10b981",
    description: "Tetrahedral botanical foliage with vibrant lime-emerald chloroplast gradients.",
  },
];

/**
 * Generate ground truth procedural organism RGBA templates for any grid size N x N.
 */
export function generateOrganismTarget(
  id: string,
  gridSize: number
): Float32Array {
  const target = new Float32Array(gridSize * gridSize * 16);
  const cx = gridSize / 2;
  const cy = gridSize / 2;
  const scale = gridSize / 72;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * 16;
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      let r = 0, g = 0, b = 0, a = 0;
      const gradX = (x / gridSize) * 2 - 1;
      const gradY = (y / gridSize) * 2 - 1;

      if (id === "gecko") {
        const bodyDist = Math.hypot(dx * 1.6, dy * 0.7);
        const headDist = Math.hypot(dx - 16, dy);
        const tailDist = Math.hypot(dx + 18 + Math.sin(dy * 0.2) * 5, dy * 1.8);
        const paw1 = Math.hypot(dx - 8, dy - 12);
        const paw2 = Math.hypot(dx - 8, dy + 12);
        const paw3 = Math.hypot(dx + 8, dy - 13);
        const paw4 = Math.hypot(dx + 8, dy + 13);

        const isHead = headDist < 7;
        const isBody = bodyDist < 14;
        const isTail = tailDist < 12 && dx < -5;
        const isPaw = paw1 < 5.5 || paw2 < 5.5 || paw3 < 5.5 || paw4 < 5.5;

        if (isHead || isBody || isTail || isPaw) {
          a = 1.0;
          const spine = Math.abs(dy);
          if (spine < 2.5 && !isPaw) {
            r = 0.98; g = 0.85; b = 0.15;
          } else if (isHead && Math.hypot(dx - 18, Math.abs(dy) - 2.5) < 1.4) {
            r = 0.1; g = 0.95; b = 1.0;
          } else if (isPaw) {
            r = 0.05; g = 0.85; b = 0.75;
          } else {
            r = 0.06 + Math.sin(dx * 0.3) * 0.04;
            g = 0.82 + Math.cos(dy * 0.2) * 0.15;
            b = 0.52 + Math.sin(dist * 0.1) * 0.2;
          }
        }
      } else if (id === "blossom") {
        const petals = Math.cos(angle * 8);
        const petalDist = 18 + petals * 7;
        const coreDist = 7;

        if (dist < petalDist) {
          a = 1.0;
          if (dist < coreDist) {
            r = 0.99; g = 0.82; b = 0.15;
          } else {
            const t = (dist - coreDist) / (petalDist - coreDist);
            r = 0.95 * (1 - t * 0.5) + 0.1 * t;
            g = 0.2 * (1 - t) + 0.85 * t;
            b = 0.65 * (1 - t) + 0.95 * t;
          }
        }
      } else if (id === "neural_brain") {
        const lobeLeft = Math.hypot(dx + 6, dy * 0.85);
        const lobeRight = Math.hypot(dx - 6, dy * 0.85);
        const fissure = Math.abs(dx);

        const inBrain = (lobeLeft < 17 || lobeRight < 17) && fissure > 1.2 && dist < 22;
        if (inBrain) {
          a = 1.0;
          const sulcus = Math.sin(dx * 0.8) * Math.cos(dy * 0.8);
          if (sulcus > 0.4) {
            r = 0.96; g = 0.25; b = 0.58;
          } else {
            r = 0.35 + (x / gridSize) * 0.2;
            g = 0.38 + sulcus * 0.2;
            b = 0.98;
          }
        }
      } else if (id === "jellyfish") {
        const bellY = dy + 5;
        const bell = Math.hypot(dx * 1.1, bellY * 1.6);
        const inBell = bell < 18 && bellY < 8;

        const inTentacle =
          bellY >= 7 &&
          bellY < 26 &&
          Math.abs(dx) < 16 &&
          (Math.abs(Math.sin(dy * 0.4 + dx * 0.5)) < 0.28 || Math.abs(dx) % 4 < 1.2);

        if (inBell || inTentacle) {
          a = inBell ? 0.95 : 0.75;
          if (inBell) {
            r = 0.1 + (bell / 18) * 0.4;
            g = 0.75 + Math.sin(dx * 0.2) * 0.2;
            b = 0.98;
          } else {
            r = 0.98; g = 0.4; b = 0.65;
          }
        }
      } else if (id === "quantum_heart") {
        const heartDist = Math.hypot(dx * 1.1, dy * 1.1 - Math.sqrt(Math.abs(dx)) * 2.2);
        if (heartDist < 18 && dy < 15) {
          a = 1.0;
          if (Math.hypot(dx, dy) < 6) {
            r = 0.1; g = 0.95; b = 0.98;
          } else if (Math.abs(dx * dy) < 8 && dy < 0) {
            r = 0.98; g = 0.75; b = 0.1;
          } else {
            r = 0.94; g = 0.12; b = 0.28;
          }
        }
      } else {
        // Coral Fungus
        const rings = Math.sin(dist * 0.5) + Math.cos(angle * 6);
        if (dist < 22 && rings > -0.2) {
          a = 1.0;
          r = 0.15 + Math.sin(angle * 3) * 0.3;
          g = 0.88 + Math.cos(dist * 0.4) * 0.12;
          b = 0.35 + Math.sin(dist * 0.3) * 0.4;
        }
      }

      target[idx] = r;
      target[idx + 1] = g;
      target[idx + 2] = b;
      target[idx + 3] = a;

      target[idx + 4] = gradX;
      target[idx + 5] = gradY;
      target[idx + 6] = a * (0.5 + Math.sin(dx * 0.3) * 0.5);
      target[idx + 7] = a * (0.5 + Math.cos(dy * 0.3) * 0.5);
      target[idx + 8] = a * 0.85;
      target[idx + 9] = a * (1 - dist / (gridSize / 2));
      target[idx + 10] = a * 0.9;
      target[idx + 11] = a * Math.sin(dist * 0.6);
      target[idx + 12] = a * (dist > 12 ? 1.0 : 0.0);
      target[idx + 13] = a * (dist <= 12 ? 1.0 : 0.0);
      target[idx + 14] = a * 0.75;
      target[idx + 15] = 0.0;
    }
  }

  return target;
}

/**
 * Generate a target from a custom geometric stencil shape (Star, Heart, Butterfly, Ring, etc.).
 */
export function generateStencilTarget(
  shape: CustomShapeType,
  gridSize: number
): Float32Array {
  const target = new Float32Array(gridSize * gridSize * 16);
  const cx = gridSize / 2;
  const cy = gridSize / 2;
  const scale = gridSize / 72;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * 16;
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      let r = 0, g = 0, b = 0, a = 0;
      const gradX = (x / gridSize) * 2 - 1;
      const gradY = (y / gridSize) * 2 - 1;

      switch (shape) {
        case "star": {
          // 5-pointed star
          const armAngle = (Math.PI * 2) / 5;
          const aMod = ((angle + Math.PI / 2 + Math.PI * 2) % armAngle) - armAngle / 2;
          const starR = 9 / Math.cos(aMod);
          const outerR = 19;
          const isStar = dist < outerR && (Math.cos(angle * 5) * 6 + 13) > dist;
          if (isStar) {
            a = 1.0;
            // Solar gold core with flaming orange-rose tips
            const t = dist / outerR;
            r = 0.98;
            g = 0.85 * (1 - t * 0.7);
            b = 0.15 + t * 0.6;
          }
          break;
        }

        case "heart": {
          // Double-lobe cardioid
          const hDist = Math.hypot(dx * 1.1, dy * 1.1 - Math.sqrt(Math.abs(dx)) * 2.3);
          if (hDist < 19 && dy < 16) {
            a = 1.0;
            const t = hDist / 19;
            r = 0.95;
            g = 0.18 + (1 - t) * 0.3;
            b = 0.55 + Math.sin(angle * 2) * 0.3;
          }
          break;
        }

        case "butterfly": {
          // Bilateral wing lobes
          const wingUpper = Math.hypot(Math.abs(dx) - 11, dy + 5);
          const wingLower = Math.hypot(Math.abs(dx) - 8, dy - 9);
          const body = Math.hypot(dx * 3, dy);
          if (wingUpper < 13 || wingLower < 9 || body < 15) {
            a = 1.0;
            if (body < 14) {
              r = 0.1; g = 0.95; b = 1.0;
            } else {
              r = 0.15 + Math.sin(dist * 0.3) * 0.4;
              g = 0.65 + Math.cos(angle * 4) * 0.3;
              b = 0.98;
            }
          }
          break;
        }

        case "ring": {
          // Concentric portal ring
          if (dist > 9 && dist < 21) {
            a = 1.0;
            const ringPos = (dist - 9) / 12;
            r = 0.1 + Math.sin(ringPos * Math.PI) * 0.6;
            g = 0.85;
            b = 0.98;
          }
          break;
        }

        case "spiral": {
          // Archimedean spiral arms
          const arm = (angle + dist * 0.7) % (Math.PI * 2);
          if (dist < 23 && (Math.abs(arm - Math.PI) < 0.75 || Math.abs(arm) < 0.75)) {
            a = 1.0;
            r = 0.65 + Math.sin(dist * 0.2) * 0.3;
            g = 0.2 + (dist / 23) * 0.5;
            b = 0.95;
          }
          break;
        }

        case "alien": {
          // Space invader block silhouette
          const gx = Math.round(Math.abs(dx));
          const gy = Math.round(dy);
          const isAlien =
            (gy === -7 && (gx === 2 || gx === 3)) ||
            (gy === -6 && (gx === 1 || gx === 4)) ||
            (gy === -5 && gx <= 5) ||
            (gy === -4 && (gx <= 1 || gx === 3 || gx === 4 || gx === 5)) ||
            (gy === -3 && gx <= 6) ||
            (gy === -2 && (gx === 0 || gx >= 2)) ||
            (gy === -1 && (gx === 0 || gx === 5)) ||
            (gy === 0 && (gx === 1 || gx === 2)) ||
            (gy === 1 && (gx === 2 || gx === 3));
          if (isAlien && Math.hypot(dx, dy) < 22) {
            a = 1.0;
            r = 0.15;
            g = 0.95;
            b = 0.45 + (gx / 6) * 0.5;
          }
          break;
        }

        case "lightning": {
          // Jagged electric bolt
          const bolt =
            (dy < -3 && Math.abs(dx - (dy * 0.5 - 3)) < 4.5) ||
            (dy >= -4 && dy < 4 && Math.abs(dx + 2) < 9) ||
            (dy >= 3 && Math.abs(dx - (dy * 0.6 + 2)) < 4.5);
          if (bolt && Math.abs(dy) < 20) {
            a = 1.0;
            r = 0.3 + (1 - Math.abs(dx) / 8) * 0.6;
            g = 0.85;
            b = 1.0;
          }
          break;
        }

        case "clover": {
          // 4-leaf clover
          const cloverPetals = Math.cos(angle * 4);
          const cloverDist = 17 + cloverPetals * 5;
          if (dist < cloverDist) {
            a = 1.0;
            r = 0.08 + (dist / 20) * 0.2;
            g = 0.88;
            b = 0.35 + Math.sin(angle * 4) * 0.25;
          }
          break;
        }
      }

      target[idx] = r;
      target[idx + 1] = g;
      target[idx + 2] = b;
      target[idx + 3] = a;

      target[idx + 4] = gradX;
      target[idx + 5] = gradY;
      target[idx + 6] = a * (0.5 + Math.sin(dx * 0.3) * 0.5);
      target[idx + 7] = a * (0.5 + Math.cos(dy * 0.3) * 0.5);
      target[idx + 8] = a * 0.85;
      target[idx + 9] = a * (1 - dist / (gridSize / 2));
      target[idx + 10] = a * 0.9;
      target[idx + 11] = a * Math.sin(dist * 0.6);
      target[idx + 12] = a * (dist > 12 ? 1.0 : 0.0);
      target[idx + 13] = a * (dist <= 12 ? 1.0 : 0.0);
      target[idx + 14] = a * 0.75;
      target[idx + 15] = 0.0;
    }
  }

  return target;
}

/**
 * Generate 16-channel target from custom user text / emoji.
 */
export function generateTextTarget(
  text: string,
  gridSize: number,
  colorTheme: string = "#10b981"
): Float32Array {
  const target = new Float32Array(gridSize * gridSize * 16);
  if (typeof document === "undefined") return target;

  const canvas = document.createElement("canvas");
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return target;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, gridSize, gridSize);

  // Parse colorTheme hex to RGB
  let tr = 0.1, tg = 0.9, tb = 0.5;
  if (colorTheme.startsWith("#") && colorTheme.length >= 7) {
    tr = parseInt(colorTheme.slice(1, 3), 16) / 255;
    tg = parseInt(colorTheme.slice(3, 5), 16) / 255;
    tb = parseInt(colorTheme.slice(5, 7), 16) / 255;
  }

  // Draw text
  const cleanText = text.trim().slice(0, 8);
  const fontSize = cleanText.length <= 2 ? Math.floor(gridSize * 0.48) : Math.floor(gridSize * 0.28);
  ctx.font = `bold ${fontSize}px monospace, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cleanText, gridSize / 2, gridSize / 2);

  const imgData = ctx.getImageData(0, 0, gridSize, gridSize);
  const px = imgData.data;

  const cx = gridSize / 2;
  const cy = gridSize / 2;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * 16;
      const pIdx = (y * gridSize + x) * 4;
      const brightness = px[pIdx] / 255; // White text

      if (brightness > 0.25) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);

        target[idx] = tr * brightness;
        target[idx + 1] = tg * brightness;
        target[idx + 2] = tb * brightness;
        target[idx + 3] = 1.0;

        target[idx + 4] = (x / gridSize) * 2 - 1;
        target[idx + 5] = (y / gridSize) * 2 - 1;
        target[idx + 6] = 0.8;
        target[idx + 7] = 0.3;
        target[idx + 8] = 0.85;
        target[idx + 9] = 1 - dist / (gridSize / 2);
        target[idx + 10] = 0.9;
        target[idx + 11] = Math.sin(dist * 0.5);
        target[idx + 12] = 0.5;
        target[idx + 13] = 0.5;
        target[idx + 14] = 0.8;
        target[idx + 15] = 0.0;
      }
    }
  }

  return target;
}

/**
 * Generate 16-channel target from custom uploaded image or canvas.
 */
export function generateCanvasTarget(
  sourceCanvas: HTMLCanvasElement,
  gridSize: number
): Float32Array {
  const target = new Float32Array(gridSize * gridSize * 16);
  if (typeof document === "undefined") return target;

  const offscreen = document.createElement("canvas");
  offscreen.width = gridSize;
  offscreen.height = gridSize;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return target;

  ctx.drawImage(sourceCanvas, 0, 0, gridSize, gridSize);
  const imgData = ctx.getImageData(0, 0, gridSize, gridSize);
  const px = imgData.data;

  const cx = gridSize / 2;
  const cy = gridSize / 2;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * 16;
      const pIdx = (y * gridSize + x) * 4;

      const r = px[pIdx] / 255;
      const g = px[pIdx + 1] / 255;
      const b = px[pIdx + 2] / 255;
      const a = px[pIdx + 3] / 255;

      if (a > 0.15) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);

        target[idx] = r;
        target[idx + 1] = g;
        target[idx + 2] = b;
        target[idx + 3] = a;

        target[idx + 4] = (x / gridSize) * 2 - 1;
        target[idx + 5] = (y / gridSize) * 2 - 1;
        target[idx + 6] = 0.8;
        target[idx + 7] = 0.3;
        target[idx + 8] = 0.85;
        target[idx + 9] = 1 - dist / (gridSize / 2);
        target[idx + 10] = 0.9;
        target[idx + 11] = Math.sin(dist * 0.5);
        target[idx + 12] = 0.5;
        target[idx + 13] = 0.5;
        target[idx + 14] = 0.8;
        target[idx + 15] = 0.0;
      }
    }
  }

  return target;
}
