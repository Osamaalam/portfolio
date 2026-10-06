"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { NCAEngine } from "@/lib/nca/NCAEngine";
import { NCACanvas } from "@/components/NCA/NCACanvas";
import { ToolPalette } from "@/components/NCA/ToolPalette";
import { ChannelInspector } from "@/components/NCA/ChannelInspector";
import { TelemetryPanel } from "@/components/NCA/TelemetryPanel";
import { InfoModal } from "@/components/NCA/InfoModal";
import { CustomShapeModal } from "@/components/NCA/CustomShapeModal";
import { ORGANISM_PRESETS } from "@/lib/nca/presets";
import { ncaSound } from "@/lib/nca/NCASound";
import {
  BrushMode,
  DisplayMode,
  NCATelemetry,
  OrganismPreset,
  RegenSpeed,
  CustomShapeType,
} from "@/types/nca";

export default function NCAPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Smart state initializer prevents SSR flashes and respects localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("portfolio-theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  // Theme synchronization effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("portfolio-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("portfolio-theme", "light");
      }
    }
  }, [isDarkMode]);

  // NCA Engine & State
  const [engine, setEngine] = useState<NCAEngine | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [selectedOrganism, setSelectedOrganism] = useState<OrganismPreset>(
    ORGANISM_PRESETS[0]
  );
  const [brushMode, setBrushMode] = useState<BrushMode>("scalpel");
  const [brushRadius, setBrushRadius] = useState<number>(4);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [regenSpeed, setRegenSpeed] = useState<RegenSpeed>("normal");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("rgba");
  const [activeChannel, setActiveChannel] = useState<number>(4);
  const [glowIntensity, setGlowIntensity] = useState<number>(0.45);

  const [telemetry, setTelemetry] = useState<NCATelemetry>({
    step: 0,
    aliveCells: 0,
    totalCells: 5776,
    biomassPercent: 0,
    averageEntropy: 0,
    regenerationHealth: 100,
    fps: 60,
    isDamaged: false,
    recoveryTimeMs: 0,
    targetOrganism: ORGANISM_PRESETS[0].name,
  });

  // Sound toggle handler
  const handleToggleSound = useCallback(() => {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    ncaSound.setEnabled(nextSound);
    if (nextSound) {
      ncaSound.playClick();
    }
  }, [soundEnabled]);

  // Unlock audio on first user gesture anywhere
  useEffect(() => {
    const unlock = () => {
      ncaSound.setEnabled(soundEnabled);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [soundEnabled]);

  // Initialize NCA Engine
  useEffect(() => {
    const ncaInstance = new NCAEngine(
      "gecko",
      {
        gridSize: 76,
        speedMultiplier: 1,
        regenSpeed: "normal",
        brushRadius: 4,
        brushMode: "scalpel",
        displayMode: "rgba",
        activeChannel: 4,
        glowIntensity: 0.45,
        soundEnabled: true,
      },
      (newTel) => {
        setTelemetry(newTel);
      }
    );

    setEngine(ncaInstance);
    setIsRunning(true);

    return () => {
      ncaInstance.setRunning(false);
    };
  }, []);

  // Control Handlers
  const handleToggleRunning = () => {
    if (!engine) return;
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    engine.setRunning(nextRunning);
  };

  const handleStep = () => {
    if (!engine) return;
    engine.step();
  };

  const handleChangeBrushMode = (mode: BrushMode) => {
    setBrushMode(mode);
    if (engine) engine.config.brushMode = mode;
  };

  const handleChangeBrushRadius = (radius: number) => {
    setBrushRadius(radius);
    if (engine) engine.config.brushRadius = radius;
  };

  const handleChangeSpeed = (speed: number) => {
    setSpeedMultiplier(speed);
    if (engine) engine.config.speedMultiplier = speed;
  };

  const handleChangeDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    if (engine) engine.config.displayMode = mode;
  };

  const handleChangeActiveChannel = (channel: number) => {
    setActiveChannel(channel);
    if (engine) engine.config.activeChannel = channel;
  };

  const handleChangeGlowIntensity = (glow: number) => {
    setGlowIntensity(glow);
    if (engine) engine.config.glowIntensity = glow;
  };

  const handleChangeRegenSpeed = (speed: RegenSpeed) => {
    setRegenSpeed(speed);
    if (engine) engine.setRegenSpeed(speed);
  };

  const handleSelectOrganism = (organismId: string, morphInPlace: boolean) => {
    if (!engine) return;
    const targetOrg = ORGANISM_PRESETS.find((p) => p.id === organismId);
    if (targetOrg) {
      setSelectedOrganism(targetOrg);
      engine.setOrganism(organismId, morphInPlace);
    }
  };

  const handleSelectStencil = (shape: CustomShapeType) => {
    if (!engine) return;
    engine.setCustomStencil(shape, true);
    setSelectedOrganism(engine.organism);
  };

  const handleApplyText = (text: string, colorHex: string) => {
    if (!engine) return;
    engine.setCustomText(text, colorHex, true);
    setSelectedOrganism(engine.organism);
  };

  const handleApplyImage = (canvas: HTMLCanvasElement, name: string) => {
    if (!engine) return;
    engine.setCustomFromCanvas(canvas, name, true);
    setSelectedOrganism(engine.organism);
  };

  const handleBakeCanvas = () => {
    if (!engine) return;
    engine.bakeCurrentStateAsTarget("Painted Organism");
    setSelectedOrganism(engine.organism);
  };

  const handleResetSeed = () => {
    if (!engine) return;
    engine.resetToSeed();
  };

  const handleClear = () => {
    if (!engine) return;
    engine.clearGrid();
  };

  const handleStressTest = () => {
    if (!engine) return;
    engine.triggerStressTest();
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-cyber-dark text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-400 transition-colors duration-300 relative">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid cyber-grid-radial opacity-30 pointer-events-none -z-20" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow" />

      {/* ==========================================
          HEADER BAR
          ========================================== */}
      <header className="w-full glass-panel border-b border-zinc-200 dark:border-white/[0.04] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <img
                src="/icon.png"
                alt="Osama Alam Logo"
                className="w-10 h-10 object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors">
                Osama Alam
              </span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">
                AI Architect & Founder
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-mono">
            {/* Day / Night Mode Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.05] text-zinc-800 dark:text-yellow-400 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm"
              title={isDarkMode ? "Switch to Day Theme" : "Switch to Night Theme"}
            >
              <span className="text-xl transition-transform duration-500 hover:rotate-45 block">
                {isDarkMode ? "🌙" : "☀️"}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-zinc-100 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.06] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{soundEnabled ? "🔊" : "🔇"}</span>
              <span>{soundEnabled ? "SOUND ON" : "SOUND OFF"}</span>
            </button>

            {/* How It Works Modal Trigger */}
            <button
              onClick={() => {
                ncaSound.playClick();
                setIsHowItWorksOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>💡</span>
              <span>HOW IT WORKS</span>
            </button>

            {/* Other Sandboxes */}
            <Link
              href="/neural-evolution"
              className="text-pink-600 dark:text-pink-400 hover:text-pink-500 transition-colors font-semibold"
            >
              🧬 Neural Lab
            </Link>
            <Link
              href="/agents"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors font-semibold"
            >
              ⚡ Agents
            </Link>
            <Link
              href="/rag"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors font-semibold"
            >
              🧠 RAG
            </Link>
            <Link
              href="/vision"
              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors font-semibold"
            >
              👁️ Vision
            </Link>
            <Link
              href="/mcp"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors font-semibold"
            >
              🔌 MCP
            </Link>
            <Link
              href="/"
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              ← Portfolio
            </Link>
          </nav>

          {/* Mobile Navigation Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={handleToggleSound}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                soundEnabled
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40"
                  : "bg-zinc-100 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.06]"
              }`}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.05] text-zinc-800 dark:text-yellow-400 flex items-center justify-center cursor-pointer shadow-sm"
            >
              {isDarkMode ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.05] text-zinc-700 dark:text-zinc-300 flex items-center justify-center cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#070709]/95 backdrop-blur-xl px-4 py-4 space-y-3">
            <button
              onClick={() => {
                setIsHowItWorksOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-bold"
            >
              💡 HOW IT WORKS GUIDE
            </button>
            <Link
              href="/neural-evolution"
              onClick={() => setMobileMenuOpen(false)}
              className="text-pink-500 font-mono text-xs font-bold py-2 block uppercase tracking-wider"
            >
              🧬 Neural Lab
            </Link>
            <Link
              href="/agents"
              onClick={() => setMobileMenuOpen(false)}
              className="text-emerald-500 font-mono text-xs font-bold py-2 block uppercase tracking-wider"
            >
              ⚡ Agents
            </Link>
            <Link
              href="/rag"
              onClick={() => setMobileMenuOpen(false)}
              className="text-purple-500 font-mono text-xs font-bold py-2 block uppercase tracking-wider"
            >
              🧠 RAG
            </Link>
            <Link
              href="/vision"
              onClick={() => setMobileMenuOpen(false)}
              className="text-cyan-500 font-mono text-xs font-bold py-2 block uppercase tracking-wider"
            >
              👁️ Vision
            </Link>
            <Link
              href="/mcp"
              onClick={() => setMobileMenuOpen(false)}
              className="text-blue-500 font-mono text-xs font-bold py-2 block uppercase tracking-wider"
            >
              🔌 MCP
            </Link>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-400 font-mono text-xs font-bold py-2 block uppercase tracking-wider"
            >
              ← Portfolio
            </Link>
          </div>
        )}
      </header>

      {/* ==========================================
          HERO BANNER & TELEMETRY STRIP
          ========================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-white/[0.06] pb-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              BIOLOGICAL MORPHOGENESIS & EMBODIED AI
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Neural Cellular Automata
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Watch a complex organism grow from a single stem cell. Drag the laser scalpel to cut holes
              or sever limbs, and observe how decentralized local communication triggers spontaneous,
              autonomous biological self-regeneration in real-time.
            </p>
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300">
              ⚡ <strong>100% In-Browser</strong> V8 Compute
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-cyan-600 dark:text-cyan-400">
              🧬 <strong>16-State</strong> Vector / Cell
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-emerald-600 dark:text-emerald-400">
              🛡️ <strong>Self-Healing</strong> Attractors
            </span>
          </div>
        </div>
      </section>

      {/* ==========================================
          MAIN SIMULATION WORKSPACE
          ========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Hand: Interactive Bio-Canvas & Tools (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <NCACanvas
              engine={engine}
              isRunning={isRunning}
              brushMode={brushMode}
              brushRadius={brushRadius}
            />

            <ToolPalette
              engine={engine}
              isRunning={isRunning}
              onToggleRunning={handleToggleRunning}
              onStep={handleStep}
              brushMode={brushMode}
              onChangeBrushMode={handleChangeBrushMode}
              brushRadius={brushRadius}
              onChangeBrushRadius={handleChangeBrushRadius}
              speedMultiplier={speedMultiplier}
              onChangeSpeed={handleChangeSpeed}
              regenSpeed={regenSpeed}
              onChangeRegenSpeed={handleChangeRegenSpeed}
              onResetSeed={handleResetSeed}
              onClear={handleClear}
              onStressTest={handleStressTest}
              onOpenCustomModal={() => setIsCustomModalOpen(true)}
            />
          </div>

          {/* Right Hand: Telemetry, Organism Genomes & Channel Inspector (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <TelemetryPanel
              telemetry={telemetry}
              selectedOrganism={selectedOrganism}
              onSelectOrganism={handleSelectOrganism}
            />

            <ChannelInspector
              engine={engine}
              displayMode={displayMode}
              onChangeDisplayMode={handleChangeDisplayMode}
              activeChannel={activeChannel}
              onChangeActiveChannel={handleChangeActiveChannel}
              glowIntensity={glowIntensity}
              onChangeGlowIntensity={handleChangeGlowIntensity}
            />
          </div>
        </div>

        {/* ==========================================
            SCIENTIFIC DEEP DIVE SECTION
            ========================================== */}
        <section className="mt-14 pt-10 border-t border-zinc-200 dark:border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Why Neural Cellular Automata Matter
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              From centralized artificial intelligence to decentralized biological resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-200 dark:border-white/[0.06] flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-xl">
                🛡️
              </div>
              <h3 className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                Immunity to Hardware Damage
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Traditional neural networks fail completely if random nodes are deleted. NCAs learn
                dynamical attractor states where cell destruction does not stop computation; remaining
                nodes detect gradient voids and autonomously re-synthesize lost parameters.
              </p>
            </div>

            {/* Card 2 */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-200 dark:border-white/[0.06] flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center text-xl">
                🤖
              </div>
              <h3 className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                Decentralized Swarm Robotics
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Rather than having a fragile central controller communicate with thousands of drones or
                micro-actuators, every agent runs the exact same local policy, exchanging only local
                spatial coordinates to form self-healing bridges, hulls, or formations.
              </p>
            </div>

            {/* Card 3 */}
            <div className="glass-card rounded-2xl p-6 border border-zinc-200 dark:border-white/[0.06] flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center text-xl">
                🔬
              </div>
              <h3 className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                Morphogenetic Bio-Engineering
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Alan Turing proved in 1952 that simple reaction-diffusion chemicals create animal stripes
                and shapes. NCAs generalize Turing patterns into deep learning, providing synthetic
                biologists a computational foundation to program living tissue growth.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Info Modal */}
      <InfoModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* Custom Shape & Organism Studio Modal */}
      <CustomShapeModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSelectStencil={handleSelectStencil}
        onApplyText={handleApplyText}
        onApplyImage={handleApplyImage}
        onBakeCanvas={handleBakeCanvas}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-200 dark:border-white/[0.06] py-8 text-center text-xs font-mono text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Osama Alam • AI Architect & Engineering Sandbox</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-emerald-500 transition-colors">
              Portfolio
            </Link>
            <Link
              href="/neural-evolution"
              className="hover:text-pink-500 transition-colors"
            >
              Neural Lab
            </Link>
            <Link
              href="/agents"
              className="hover:text-emerald-500 transition-colors"
            >
              Agents
            </Link>
            <Link
              href="/vision"
              className="hover:text-cyan-500 transition-colors"
            >
              Vision
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
