"use client";

import React, { useState, useRef } from "react";
import { CustomShapeType } from "@/types/nca";
import { STENCIL_PRESETS } from "@/lib/nca/presets";
import { ncaSound } from "@/lib/nca/NCASound";

interface CustomShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStencil: (shape: CustomShapeType) => void;
  onApplyText: (text: string, colorHex: string) => void;
  onApplyImage: (canvas: HTMLCanvasElement, name: string) => void;
  onBakeCanvas: () => void;
}

export const CustomShapeModal: React.FC<CustomShapeModalProps> = ({
  isOpen,
  onClose,
  onSelectStencil,
  onApplyText,
  onApplyImage,
  onBakeCanvas,
}) => {
  const [activeTab, setActiveTab] = useState<"stencils" | "text" | "upload" | "paint">("stencils");
  const [customText, setCustomText] = useState<string>("BIO AI");
  const [textColor, setTextColor] = useState<string>("#10b981");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const colorPresets = [
    { hex: "#10b981", name: "Emerald" },
    { hex: "#ec4899", name: "Hot Pink" },
    { hex: "#06b6d4", name: "Electric Cyan" },
    { hex: "#facc15", name: "Solar Gold" },
    { hex: "#8b5cf6", name: "Neon Violet" },
    { hex: "#f43f5e", name: "Coral Crimson" },
    { hex: "#ffffff", name: "White Ghost" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImagePreviewUrl(event.target?.result as string);
        const canvas = tempCanvasRef.current || document.createElement("canvas");
        tempCanvasRef.current = canvas;
        canvas.width = 76;
        canvas.height = 76;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 76, 76);
          ctx.drawImage(img, 0, 0, 76, 76);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImage = () => {
    if (tempCanvasRef.current) {
      ncaSound.playClick();
      onApplyImage(tempCanvasRef.current, "Uploaded Blueprint");
      onClose();
    }
  };

  const handleConfirmText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    ncaSound.playClick();
    onApplyText(customText.trim(), textColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="sh-dark-card relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#090a10] border border-white/[0.12] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col gap-5 text-zinc-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
                CUSTOM SHAPE & ORGANISM STUDIO
              </h2>
              <p className="text-xs text-emerald-400 font-mono">
                Input any custom shape, text glyph, or image to generate a living self-repairing organism
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center font-mono text-sm transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Studio Mode Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black/50 rounded-xl border border-white/[0.06] text-xs font-mono">
          <button
            onClick={() => setActiveTab("stencils")}
            className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === "stencils"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ⭐ Stencils
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === "text"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🔤 Text / Word
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === "upload"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🖼️ Upload Image
          </button>
          <button
            onClick={() => setActiveTab("paint")}
            className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === "paint"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🖌️ Bio-Paint
          </button>
        </div>

        {/* Tab 1: Shape Stencils */}
        {activeTab === "stencils" && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Select Geometric & Biological Stencil:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STENCIL_PRESETS.map((stencil) => (
                <button
                  key={stencil.id}
                  onClick={() => {
                    ncaSound.playClick();
                    onSelectStencil(stencil.id);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/40 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group text-center"
                >
                  <span className="text-3xl transition-transform group-hover:scale-110">
                    {stencil.icon}
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-200 group-hover:text-emerald-400">
                    {stencil.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {stencil.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Text / Word */}
        {activeTab === "text" && (
          <form onSubmit={handleConfirmText} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider">
                Enter Text, Name or Emoji (max 8 characters):
              </label>
              <input
                type="text"
                maxLength={8}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. OSAMA, AI, 42, 🧬"
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-lg font-bold tracking-widest focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Color Swatches */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold">
                Select Cellular Pigment:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {colorPresets.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setTextColor(c.hex)}
                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-mono text-xs transition-all cursor-pointer ${
                      textColor === c.hex
                        ? "bg-white/10 border-white text-white font-bold shadow-sm"
                        : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Box */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center">
              <span
                className="font-mono text-3xl font-extrabold tracking-widest"
                style={{ color: textColor }}
              >
                {customText || "PREVIEW"}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer uppercase tracking-wider"
            >
              Synthesize Living Text Organism ↗
            </button>
          </form>
        )}

        {/* Tab 3: Upload Custom Image */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-purple-500/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer text-center"
            >
              <span className="text-4xl">📁</span>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-zinc-200">
                  Click to Browse or Drag Image Here
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">
                  Supports PNG, JPG, WebP, or SVG (Auto-scaled to 76×76)
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {imagePreviewUrl && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/10">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="w-16 h-16 rounded-lg object-contain border border-white/20 bg-black"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-mono font-bold text-white">Image Loaded</span>
                  <span className="text-zinc-400 text-[11px]">
                    Extracted RGBA coordinates ready for neural vectorization.
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={!imagePreviewUrl}
              onClick={handleConfirmImage}
              className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition-all uppercase tracking-wider ${
                imagePreviewUrl
                  ? "bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer"
                  : "bg-white/[0.05] text-zinc-500 cursor-not-allowed border border-white/[0.05]"
              }`}
            >
              Convert Image to Living Organism ↗
            </button>
          </div>
        )}

        {/* Tab 4: Paint Freehand & Bake */}
        {activeTab === "paint" && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 flex flex-col gap-2">
              <strong className="font-mono text-amber-400 font-bold uppercase tracking-wider text-xs">
                🖌️ Freehand Sculpting Mode
              </strong>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                You can use the <strong>Stem Seed</strong>, <strong>Mutagen</strong>, and <strong>Nutrient Spray</strong> tools
                directly on the canvas to draw and sculpt your own organic shape.
              </p>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                When you like the shape on your screen, click the button below. The system will
                <strong className="text-white"> lock your canvas as the new homeostatic target</strong>.
                From that moment on, if you slice it with the laser scalpel, it will remember and regrow your custom drawn shape!
              </p>
            </div>

            <button
              onClick={() => {
                ncaSound.playClick();
                onBakeCanvas();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer uppercase tracking-wider"
            >
              Lock Current Canvas as Living Organism 🔒
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
