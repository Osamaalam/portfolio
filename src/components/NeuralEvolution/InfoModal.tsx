"use client";

import React from "react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="sh-dark-card relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#090a10] border border-white/[0.12] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col gap-5 text-zinc-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💡</span>
            <div>
              <h2 className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
                HOW THE AI LEARNS
              </h2>
              <p className="text-xs text-cyan-400 font-mono">
                A simple guide to neural network evolution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center font-mono text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* The Big Idea */}
        <div className="p-3.5 rounded-xl bg-cyan-950/25 border border-cyan-500/25 font-mono text-xs text-cyan-200 leading-relaxed">
          <span className="text-white font-bold">The Core Concept: </span>
          The fish start with <span className="text-cyan-300 font-bold">zero knowledge</span>. Through trial, error, and natural selection, each generation learns to dodge walls, evade the apex predator shark, and navigate directly to the green target.
        </div>

        {/* The Apex Predator Twist */}
        <div className="p-3.5 rounded-xl bg-red-950/25 border border-red-500/30 font-mono text-xs text-red-200 leading-relaxed flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🦈</span>
            <span className="text-red-300 font-bold uppercase tracking-wider">
              The Twist: Apex Cyber Shark Predator
            </span>
          </div>
          <p className="text-[11px] text-zinc-300">
            An autonomous Cyber Shark prowls the arena, stalking and lunging at living fish. When sensor rays intersect the predator, fish receive an instant red alarm warning. Over generations, agents evolve dual intelligence: navigating complex obstacle mazes while simultaneously executing agile evasive maneuvers to avoid being devoured!
          </p>
        </div>

        {/* The 3-Step Cycle */}
        <div className="flex flex-col gap-2.5 font-mono text-xs">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
            The 3-Step Lifecycle
          </span>

          <div className="flex flex-col gap-2">
            {/* 1. SENSE */}
            <div className="p-3 rounded-lg bg-[#0d0e17] border border-white/[0.05] flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 text-sm font-bold">
                1
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-cyan-300 font-bold text-xs uppercase">
                  SENSE (What the Fish Sees)
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  3 laser beams detect walls ahead, left, and right. Sensors also measure distance and compass heading to the green target beacon.
                </p>
              </div>
            </div>

            {/* 2. THINK */}
            <div className="p-3 rounded-lg bg-[#0d0e17] border border-white/[0.05] flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 text-sm font-bold">
                2
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-purple-300 font-bold text-xs uppercase">
                  THINK (The Brain Decides)
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Every fish has its own tiny neural network. It processes the sensor inputs and outputs two continuous decisions: <span className="text-white font-semibold">Steer Left/Right</span> and <span className="text-white font-semibold">Thrust Speed</span>.
                </p>
              </div>
            </div>

            {/* 3. EVOLVE */}
            <div className="p-3 rounded-lg bg-[#0d0e17] border border-white/[0.05] flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-sm font-bold">
                3
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-emerald-300 font-bold text-xs uppercase">
                  EVOLVE (Survival of the Fittest)
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Fish that crash into walls die. Fish that get closest to the target score the highest &ldquo;fitness&rdquo;. The top fish become parents of the next generation, passing on their brains with small random mutations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What You Will See Over Time */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1.5 font-mono text-[11px]">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            What to Watch For
          </span>
          <div className="flex flex-col gap-1 text-zinc-300">
            <div>
              <span className="text-pink-400 font-bold">Gen 1–3:</span> Random chaos. Most fish crash into walls or swim in circles.
            </div>
            <div>
              <span className="text-yellow-400 font-bold">Gen 5–10:</span> Reflexes emerge. Survivors steer away when walls get close.
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Gen 15+:</span> Goal-seeking behavior. Fish navigate around barriers directly into the green target!
            </div>
          </div>
        </div>

        {/* Quick Keyboard Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.04] font-mono text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold">Space</kbd> Pause/Play
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold">N</kbd> Next Gen
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold">R</kbd> Reset
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold">1–6</kbd> Maps
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            GOT IT — WATCH SIMULATION
          </button>
        </div>
      </div>
    </div>
  );
};
