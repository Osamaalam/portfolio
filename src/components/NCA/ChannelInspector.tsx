"use client";

import React, { useRef, useEffect } from "react";
import { NCAEngine } from "@/lib/nca/NCAEngine";
import { DisplayMode } from "@/types/nca";
import { NCA_CHANNELS } from "@/lib/nca/channels";
import { ncaSound } from "@/lib/nca/NCASound";

interface ChannelInspectorProps {
  engine: NCAEngine | null;
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  activeChannel: number;
  onChangeActiveChannel: (channel: number) => void;
  glowIntensity: number;
  onChangeGlowIntensity: (glow: number) => void;
}

export const ChannelInspector: React.FC<ChannelInspectorProps> = ({
  engine,
  displayMode,
  onChangeDisplayMode,
  activeChannel,
  onChangeActiveChannel,
  glowIntensity,
  onChangeGlowIntensity,
}) => {
  const mosaicCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render miniature mosaic thumbnails when mosaic mode is active or as live preview
  useEffect(() => {
    let animId: number;
    const canvas = mosaicCanvasRef.current;
    if (!canvas || !engine) return;

    const renderMosaic = () => {
      engine.renderMosaicToCanvas(canvas);
      animId = requestAnimationFrame(renderMosaic);
    };

    animId = requestAnimationFrame(renderMosaic);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  const currentChannelInfo = NCA_CHANNELS[activeChannel] || NCA_CHANNELS[4];

  return (
    <div className="sh-dark-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-[#09090d] p-4 text-zinc-100 flex flex-col gap-4 shadow-xl">
      {/* Title & Display Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase flex items-center gap-2">
            <span>🔬</span>
            <span>Channel & Phenotype Inspector</span>
          </h3>
          <p className="text-[11px] font-sans text-zinc-400 mt-0.5">
            Inspect the 12 invisible biochemical morphogen channels passing local signals
          </p>
        </div>

        {/* Display Mode Tabs */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.06] font-mono text-[11px]">
          <button
            onClick={() => {
              ncaSound.playClick();
              onChangeDisplayMode("rgba");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              displayMode === "rgba"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🌈 Phenotype (RGBA)
          </button>
          <button
            onClick={() => {
              ncaSound.playClick();
              onChangeDisplayMode("channel");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              displayMode === "channel"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🧪 Hidden Channel
          </button>
          <button
            onClick={() => {
              ncaSound.playClick();
              onChangeDisplayMode("mosaic");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              displayMode === "mosaic"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🌐 16-Grid Mosaic
          </button>
        </div>
      </div>

      {/* Main Content Area based on Mode */}
      {displayMode === "channel" && (
        <div className="flex flex-col gap-3">
          {/* Channel Selector Pills */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold mb-2 block">
              Select Biochemical Morphogen Layer (Channels 4..15):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
              {NCA_CHANNELS.slice(4).map((ch) => {
                const isSelected = activeChannel === ch.index;
                return (
                  <button
                    key={ch.index}
                    onClick={() => {
                      ncaSound.playClick();
                      onChangeActiveChannel(ch.index);
                    }}
                    className={`px-2 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-[10px] font-bold">C{ch.index}</span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: ch.colorHint }}
                      />
                    </div>
                    <span className="text-[10px] truncate font-medium">{ch.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Channel Scientific Deep Dive */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-start gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full mt-0.5 shrink-0"
              style={{ backgroundColor: currentChannelInfo.colorHint }}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white">
                  Channel {currentChannelInfo.index}: {currentChannelInfo.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold bg-white/10 text-cyan-300">
                  {currentChannelInfo.category}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {currentChannelInfo.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 16-Channel Live Mosaic Matrix */}
      {displayMode === "mosaic" && (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-[280px] aspect-square rounded-xl overflow-hidden border border-white/10 bg-black shrink-0">
            <canvas
              ref={mosaicCanvasRef}
              width={280}
              height={280}
              className="w-full h-full block"
            />
          </div>

          <div className="flex flex-col gap-2 text-xs text-zinc-300">
            <h4 className="font-mono font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              Decentralized Multicellular State Vector
            </h4>
            <p className="leading-relaxed">
              Every single pixel in this matrix hosts a <strong className="text-white">16-dimensional state vector</strong>.
              Channels 0–3 encode visible RGBA light emission, while Channels 4–15 operate as local biochemical morphogen transmitters.
            </p>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Through asynchronous convolution passes with Sobel gradient filters, neighbor cells continuously read these 16 coordinates to deduce anatomical orientation, repair tissue damage, and maintain homeostasis.
            </p>
          </div>
        </div>
      )}

      {/* Bloom Glow Slider for Phenotype */}
      {displayMode === "rgba" && (
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-xs font-mono text-zinc-400">
            Bioluminescent Glow / Bloom:{" "}
            <strong className="text-emerald-400">{Math.round(glowIntensity * 100)}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={glowIntensity}
            onChange={(e) => onChangeGlowIntensity(Number(e.target.value))}
            className="w-40 accent-emerald-400 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
