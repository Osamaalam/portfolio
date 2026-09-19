"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SimulationEngine } from "@/lib/simulation/SimulationEngine";
import { LEVELS } from "@/lib/simulation/levels";
import {
  GenerationStats,
  SelectedAgentTelemetry,
  SimulationConfig,
  LevelConfig,
  SharkTelemetry,
} from "@/types/simulation";
import { SimulationCanvas } from "@/components/NeuralEvolution/SimulationCanvas";
import { NeuralNetworkView } from "@/components/NeuralEvolution/NeuralNetworkView";
import { StatsPanel } from "@/components/NeuralEvolution/StatsPanel";
import { ControlPanel } from "@/components/NeuralEvolution/ControlPanel";
import { AgentPanel } from "@/components/NeuralEvolution/AgentPanel";
import { FitnessChart } from "@/components/NeuralEvolution/FitnessChart";
import { InfoModal } from "@/components/NeuralEvolution/InfoModal";

export default function NeuralEvolutionPage() {
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

  // Simulation state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedFishId, setSelectedFishId] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<SelectedAgentTelemetry | null>(null);
  const [history, setHistory] = useState<GenerationStats[]>([]);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [isTargetCustom, setIsTargetCustom] = useState<boolean>(false);
  const [sharkTelemetry, setSharkTelemetry] = useState<SharkTelemetry | null>(null);

  const [config, setConfig] = useState<SimulationConfig>({
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
  });

  const [stats, setStats] = useState<GenerationStats>({
    generation: 1,
    bestFitness: 0,
    averageFitness: 0,
    worstFitness: 0,
    bestDistance: 0,
    survivalRate: 100,
    targetSuccessRate: 0,
    aliveCount: 50,
    totalPopulation: 50,
    level: 1,
    elapsedFrames: 0,
  });

  const [engine, setEngine] = useState<SimulationEngine | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef<boolean>(true);

  // Sync theme changes to root <html> and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("portfolio-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("portfolio-theme", "light");
    }
  }, [isDarkMode]);

  // Audio Context provider with user-gesture support
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Sound effects
  const playTargetSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.0001, now + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.25);
      });
    } catch {
      // Audio error safely ignored
    }
  }, [getAudioContext]);

  const playGenSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.25);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {
      // Audio error safely ignored
    }
  }, [getAudioContext]);

  const playClickSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio error safely ignored
    }
  }, [getAudioContext]);

  // Punchy, satisfying organic aquatic "CHOMP" sound effect when the shark devours a fish
  const playChompSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Master output stage
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.55, now);
      master.connect(ctx.destination);

      // 1. Initial "Ch-" Teeth Clamp (25ms micro-snap)
      const snap1 = ctx.createOscillator();
      const snap1Gain = ctx.createGain();
      snap1.type = "sine";
      snap1.frequency.setValueAtTime(420, now);
      snap1.frequency.exponentialRampToValueAtTime(130, now + 0.025);
      snap1Gain.gain.setValueAtTime(0.22, now);
      snap1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      snap1.connect(snap1Gain);
      snap1Gain.connect(master);
      snap1.start(now);
      snap1.stop(now + 0.035);

      // 2. Main "-OMP!" Jaw Slam & Resonant Cavity (at t = 0.025s)
      const tJaw = now + 0.025;

      // 2a. Resonant Underwater Chomp Formant (Warm, wet mouth cavity sweep)
      const noiseLen = Math.floor(ctx.sampleRate * 0.1);
      const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < noiseLen; i++) {
        const white = Math.random() * 2 - 1;
        channelData[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = channelData[i];
        channelData[i] *= 3.8; // Warm brown-noise texture
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      // Resonant Lowpass plunging from 1800Hz to 200Hz creates the vocal "CHOMP" formant
      const chompFilter = ctx.createBiquadFilter();
      chompFilter.type = "lowpass";
      chompFilter.frequency.setValueAtTime(1800, tJaw);
      chompFilter.frequency.exponentialRampToValueAtTime(200, tJaw + 0.075);
      chompFilter.Q.setValueAtTime(5.5, tJaw);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, tJaw);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, tJaw + 0.085);

      noiseNode.connect(chompFilter);
      chompFilter.connect(noiseGain);
      noiseGain.connect(master);
      noiseNode.start(tJaw);
      noiseNode.stop(tJaw + 0.09);

      // 2b. Solid Jaw Thud (Clean pitch-swept sine punch: 190Hz -> 42Hz)
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(190, tJaw);
      thud.frequency.exponentialRampToValueAtTime(42, tJaw + 0.08);
      thudGain.gain.setValueAtTime(0.45, tJaw);
      thudGain.gain.exponentialRampToValueAtTime(0.001, tJaw + 0.11);
      thud.connect(thudGain);
      thudGain.connect(master);
      thud.start(tJaw);
      thud.stop(tJaw + 0.12);

      // 2c. Deep Sub-Bass Impact (75Hz -> 30Hz) for weight
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(75, tJaw);
      sub.frequency.exponentialRampToValueAtTime(30, tJaw + 0.16);
      subGain.gain.setValueAtTime(0.35, tJaw);
      subGain.gain.exponentialRampToValueAtTime(0.001, tJaw + 0.18);
      sub.connect(subGain);
      subGain.connect(master);
      sub.start(tJaw);
      sub.stop(tJaw + 0.19);
    } catch {
      // Audio error safely ignored
    }
  }, [getAudioContext]);

  // Auto-unlock AudioContext on first user interaction anywhere
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [getAudioContext]);

  // Toggle Sound with immediate user-gesture unlock
  const handleToggleSound = async () => {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    soundEnabledRef.current = nextSound;

    if (nextSound) {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          if (ctx.state === "suspended") {
            await ctx.resume().catch(() => {});
          }
          // Confirmation chirp
          const now = ctx.currentTime;
          [659.25, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + i * 0.07);
            gain.gain.setValueAtTime(0.0001, now + i * 0.07);
            gain.gain.linearRampToValueAtTime(0.08, now + i * 0.07 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.19);
          });
        }
      } catch {
        // Audio unlock error safely ignored
      }
    }
  };

  // Engine initialization on client mount
  useEffect(() => {
    const engine = new SimulationEngine(config, {
      onTick: (currentStats, selTelemetry, sTelemetry) => {
        setStats(currentStats);
        if (selTelemetry) {
          setTelemetry(selTelemetry);
        }
        if (sTelemetry) {
          setSharkTelemetry(sTelemetry);
        }
        if (engineRef.current) {
          setIsTargetCustom(engineRef.current.isTargetCustom());
          if (engineRef.current.selectedFishId !== null) {
            setSelectedFishId(engineRef.current.selectedFishId);
          }
        }
      },
      onGenerationComplete: (genStats, fullHistory) => {
        setHistory(fullHistory);
        playGenSound();
      },
      onLevelChange: (levelId) => {
        const lvl = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
        setCurrentLevel(lvl);
      },
      onTargetReached: () => {
        playTargetSound();
      },
      onSharkKill: () => {
        playChompSound();
      },
    });

    engineRef.current = engine;
    setEngine(engine);
    setSelectedFishId(engine.selectedFishId);
    setStats(engine.getCurrentStats());
    setTelemetry(engine.getSelectedTelemetry());
    setSharkTelemetry(engine.shark.getTelemetry());

    engine.start();
    setIsRunning(true);

    return () => {
      engine.destroy();
    };
  }, []);

  // Keyboard controls: Space (Play/Pause), R (Reset), N (Next Gen), 1-6 (Levels)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleReset();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNextGen();
      } else if (["1", "2", "3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault();
        const levelNum = parseInt(e.key, 10);
        handleLevelChange(levelNum);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  const handleTogglePlay = () => {
    if (!engineRef.current) return;
    const running = engineRef.current.togglePlay();
    setIsRunning(running);
    playClickSound();
  };

  const handleReset = () => {
    if (!engineRef.current) return;
    engineRef.current.reset(true);
    engineRef.current.start();
    setHistory([]);
    setIsRunning(true);
    playClickSound();
  };

  const handleNextGen = () => {
    if (!engineRef.current) return;
    engineRef.current.nextGeneration();
    playClickSound();
  };

  const handleLevelChange = (levelId: number) => {
    if (!engineRef.current) return;
    engineRef.current.setLevel(levelId);
    engineRef.current.start();
    const lvl = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    setCurrentLevel(lvl);
    setIsRunning(true);
    playClickSound();
  };

  const handleChangeConfig = (newConfig: Partial<SimulationConfig>) => {
    if (!engineRef.current) return;
    const merged = { ...config, ...newConfig };
    setConfig(merged);

    if (newConfig.speedMultiplier !== undefined) {
      engineRef.current.setSpeed(newConfig.speedMultiplier);
    }
    if (newConfig.populationSize !== undefined) {
      engineRef.current.setPopulationSize(newConfig.populationSize);
    }
    if (newConfig.mutationRate !== undefined) {
      engineRef.current.setMutationRate(newConfig.mutationRate);
    }
    if (newConfig.mutationStrength !== undefined) {
      engineRef.current.setMutationStrength(newConfig.mutationStrength);
    }
    if (newConfig.autoProgressLevel !== undefined) {
      engineRef.current.config.autoProgressLevel = newConfig.autoProgressLevel;
    }
    if (newConfig.sharkEnabled !== undefined) {
      engineRef.current.setSharkEnabled(newConfig.sharkEnabled);
    }
    if (newConfig.sharkAggression !== undefined) {
      engineRef.current.setSharkAggression(newConfig.sharkAggression);
    }
  };

  const handleSelectFish = (id: number) => {
    if (!engineRef.current) return;
    engineRef.current.selectFishById(id);
    setSelectedFishId(id);
    const tel = engineRef.current.getSelectedTelemetry();
    if (tel) setTelemetry(tel);
    playClickSound();
  };

  const handleResetTarget = () => {
    if (!engineRef.current) return;
    engineRef.current.resetTargetPosition();
    setIsTargetCustom(false);
    playClickSound();
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-cyber-dark text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-400 transition-colors duration-300 relative">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid cyber-grid-radial opacity-30 pointer-events-none -z-20" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-pink-500/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-slow" />

      {/* ==========================================
          HEADER BAR (Non-fixed, scrolls with page like other pages)
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
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "bg-zinc-100 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.06] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{soundEnabled ? "🔊" : "🔇"}</span>
              <span>{soundEnabled ? "SOUND ON" : "SOUND OFF"}</span>
            </button>

            {/* Other Sandboxes */}
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
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/[0.05] text-zinc-600 dark:text-zinc-400"
              }`}
              title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.05] flex items-center justify-center text-zinc-600 dark:text-yellow-400 cursor-pointer transition-all"
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 transition-all"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 border-t border-zinc-200 dark:border-white/[0.04] bg-white dark:bg-[#050507] flex flex-col gap-3 font-mono text-xs animate-fade-in z-50 relative">
            <Link href="/" className="text-zinc-600 dark:text-zinc-400 py-1.5">
              ← Return to Portfolio
            </Link>
            <Link href="/agents" className="text-emerald-500 py-1.5">
              ⚡ Agent Sandbox
            </Link>
            <Link href="/rag" className="text-purple-500 py-1.5">
              🧠 RAG Sandbox
            </Link>
            <Link href="/vision" className="text-cyan-500 py-1.5">
              👁️ Vision Sandbox
            </Link>
            <Link href="/mcp" className="text-blue-500 py-1.5">
              🔌 MCP Sandbox
            </Link>
          </div>
        )}
      </header>

      {/* ==========================================
          MAIN DASHBOARD CONTAINER
          ========================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Title & Research Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-white/[0.06]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping"></span>
              <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🧬 NEURAL EVOLUTION LAB</span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 uppercase">
                  Live Genetic AI
                </span>
              </h1>
            </div>
            <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Autonomous fish agents navigate obstacles via individual 4-layer
              feedforward neural networks, evolving through tournament
              selection, crossover, and weight mutation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>📘</span>
              <span>HOW IT WORKS</span>
            </button>
          </div>
        </div>

        {/* SECTION A: NEURAL NETWORK VISUALIZATION (Live Selected Fish Brain) */}
        {config.showNetwork && (
          <section className="w-full">
            <NeuralNetworkView
              telemetry={telemetry}
              sharkTelemetry={sharkTelemetry}
            />
          </section>
        )}

        {/* SECTION B: LIVE SIMULATION ARENA & METRIC BAR */}
        <section className="w-full flex flex-col gap-4">
          <StatsPanel
            stats={stats}
            currentLevel={currentLevel}
            onLevelChange={handleLevelChange}
            levels={LEVELS}
            isTargetCustom={isTargetCustom}
            onResetTarget={handleResetTarget}
            sharkTelemetry={sharkTelemetry}
          />

          <div className="w-full">
            <SimulationCanvas
              engine={engine}
              onSelectFish={handleSelectFish}
              selectedFishId={selectedFishId}
              showSensorRays={config.showSensorRays}
              showTrails={config.showTrails}
            />
          </div>
        </section>

        {/* SECTION C: STREAMLINED CONTROLS & DUAL TELEMETRY CARDS */}
        <section className="flex flex-col gap-5">
          <ControlPanel
            isRunning={isRunning}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            onNextGen={handleNextGen}
            config={config}
            onChangeConfig={handleChangeConfig}
            onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
            sharkTelemetry={sharkTelemetry}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-6">
              <AgentPanel
                telemetry={telemetry}
                onSelectAgent={handleSelectFish}
                totalPopulation={config.populationSize}
                sharkTelemetry={sharkTelemetry}
              />
            </div>
            <div className="lg:col-span-6">
              <FitnessChart history={history} currentStats={stats} />
            </div>
          </div>
        </section>
      </main>

      {/* How it Works Modal */}
      <InfoModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-cyber-sec border-t border-zinc-200 dark:border-white/[0.04] py-8 text-center font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>
            Osama Alam AI Architecture • Proprietary Neuro-Evolution Simulation
          </span>
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Portfolio
            </Link>
            <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Agents
            </Link>
            <Link href="/rag" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              RAG
            </Link>
            <Link href="/vision" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Vision
            </Link>
            <Link href="/audio" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Audio
            </Link>
            <Link href="/mcp" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              MCP
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
