import React, { useState } from "react";

export default function MRISimulator() {
  const [mriDepth, setMriDepth] = useState<number>(45);
  const [mriScanning, setMriScanning] = useState<boolean>(false);
  const [mriResult, setMriResult] = useState<string>("");

  const runMRIScan = async () => {
    if (mriScanning) return;
    setMriScanning(true);
    setMriResult("Calibrating image filters...");
    
    await new Promise((res) => setTimeout(res, 900));
    setMriResult("Normalizing voxel colors & highlighting focus areas...");
    
    await new Promise((res) => setTimeout(res, 1200));
    setMriResult("Running convolutional neural network scans...");
    
    await new Promise((res) => setTimeout(res, 1500));
    const isAnomalous = mriDepth > 30 && mriDepth < 65;
    if (isAnomalous) {
      setMriResult(`⚠️ SLICE ISSUE: Minor vascular variance found at depth ${mriDepth}mm. Highlighting target area in red for physician review.`);
    } else {
      setMriResult(`✓ SCAN NORMAL: Slice depth ${mriDepth}mm shows perfect, healthy structural alignment.`);
    }
    mriScanning && setMriScanning(false); // Safeguard
    setMriScanning(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-between min-h-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span>Modality: Vision Pathology Identifier</span>
          <span className="text-cyan-400 font-bold">ResNet-50 Node</span>
        </div>
        
        <div className="flex gap-4 items-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          {/* Brain SVG Cross-section representation */}
          <div className="relative w-20 h-20 bg-black rounded-xl border border-white/[0.1] flex items-center justify-center overflow-hidden flex-shrink-0">
            {/* Neural SVG structure */}
            <svg className="w-16 h-16 text-zinc-800" viewBox="0 0 100 100" fill="none">
              <path d="M50 5 C25 5, 10 30, 10 55 C10 80, 25 95, 50 95 C75 95, 90 80, 90 55 C90 30, 75 5, 50 5 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M40 40 C35 30, 45 25, 45 45 C45 60, 38 65, 42 75" stroke="#22d3ee" strokeWidth="1.5" className="opacity-50" />
              <path d="M60 40 C65 30, 55 25, 55 45 C55 60, 62 65, 58 75" stroke="#22d3ee" strokeWidth="1.5" className="opacity-50" />
              {mriDepth > 30 && mriDepth < 65 && (
                <circle cx="32" cy="46" r="3" fill="#ef4444" className="animate-ping" />
              )}
              {mriDepth > 30 && mriDepth < 65 && (
                <circle cx="32" cy="46" r="2.5" fill="#ef4444" />
              )}
            </svg>
            {/* Scanning horizontal laser bar */}
            <div 
              className="absolute left-0 w-full h-0.5 bg-cyan-400/80 shadow-[0_0_10px_#22d3ee] pointer-events-none"
              style={{ 
                top: `${mriDepth}%`, 
                transition: "top 0.1s ease-out"
              }}
            ></div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-zinc-500">Scan Cross-section:</span>
              <span className="text-cyan-400 font-bold">{mriDepth}mm depth</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="90" 
              value={mriDepth} 
              onChange={(e) => setMriDepth(Number(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <p className="text-[9px] text-zinc-500 leading-tight font-sans">
              Drag the depth slider. The model triggers alerts if it flags unusual densities in the 30mm - 65mm slice spectrum.
            </p>
          </div>
        </div>

        {/* Analysis Output log */}
        <div className="p-3 rounded-lg bg-black border border-white/[0.04] text-[11px] leading-relaxed font-sans">
          <span className="text-zinc-500 font-mono">Model Output: </span>
          <span className={mriResult.includes("⚠️") ? "text-red-400 font-bold" : mriResult.includes("✓") ? "text-emerald-400 font-medium" : "text-muted-foreground"}>
            {mriResult || "Ready to evaluate. Drag slider and click start below."}
          </span>
        </div>
      </div>

      <div className="pt-3 pb-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono">Hardware: Nvidia CUDA Core</span>
        <button 
          onClick={runMRIScan} 
          disabled={mriScanning}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 transition-all cursor-pointer animate-pulse"
        >
          {mriScanning ? "Scanning..." : "🔍 Run Diagnostic"}
        </button>
      </div>
    </div>
  );
}
