"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import axios from "axios";

interface LogLine {
  timestamp: string;
  sender: string;
  type: "info" | "success" | "warning" | "error" | "process";
  message: string;
}

export default function AudioSandbox() {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // File and transcription states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [structuredNotes, setStructuredNotes] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("Structure this text into clean, professional bulleted study notes with summarized sections.");
  const [temperature, setTemperature] = useState<number>(0.3);

  // Execution states
  const [isExecuting, setIsRunning] = useState<boolean>(false);
  const [isPostProcessing, setIsPostProcessing] = useState<boolean>(false);
  const [stepText, setStepText] = useState<string>("Ready. Ingest an audio file to begin.");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"text" | "notes">("text");

  // Telemetry Analytics
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [apiCost, setApiCost] = useState<number>(0);
  const [tokensCount, setTokensCount] = useState<number>(0);

  // Geolocation & Rate Limits
  const [clientIP, setClientIP] = useState<string>("Detecting...");
  const [ipLocation, setIpLocation] = useState<string>("Secure Workspace");
  const [usageCount, setUsageCount] = useState<number>(0);
  const maxUsage = 5;

  // Helper to load/save daily usage count (Rule 8)
  const getDailyUsageKey = () => {
    const today = new Date().toISOString().split("T")[0];
    return `portfolio-usage-audio-${today}`;
  };

  // Logs terminal
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load theme and geolocation on mount
  useEffect(() => {
    setIsClient(true);
    addLog("SYSTEM", "info", "Multi-Engine Audio-to-Text & Transcription Sandbox initialized.");
    
    // Load daily usage from localStorage if present to prevent page refresh/dev restart reset
    if (typeof window !== "undefined") {
      const usageKey = getDailyUsageKey();
      const stored = localStorage.getItem(usageKey);
      if (stored) {
        setUsageCount(parseInt(stored, 10));
      } else {
        setUsageCount(0);
        // Prune older portfolio-usage-audio keys to avoid cluttering localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("portfolio-usage-audio-") && key !== usageKey) {
            localStorage.removeItem(key);
          }
        }
      }
    }

    fetchIPAddress();

    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
    } else if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(systemPrefersDark);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("portfolio-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("portfolio-theme", "light");
      }
    }
  }, [isDarkMode, isClient]);

  // IP Geolocation via secure backend proxy with sessionStorage cache (Rule 8)
  const fetchIPAddress = async () => {
    try {
      if (typeof window !== "undefined") {
        const cachedIp = sessionStorage.getItem("portfolio-client-ip");
        const cachedGeo = sessionStorage.getItem("portfolio-client-geo");
        
        if (cachedIp && cachedGeo) {
          setClientIP(cachedIp);
          setIpLocation(cachedGeo);
          
          // Re-fetch the latest live server usage count to sync browsers (CORS-proof & instant)
          const resCount = await fetch(`/api/vision/ip?ip=${cachedIp}`);
          if (resCount.ok) {
            const dataCount = await resCount.json();
            const backendCount = dataCount.usageCount || 0;
            const usageKey = getDailyUsageKey();
            const stored = localStorage.getItem(usageKey);
            const localCount = stored ? parseInt(stored, 10) : 0;
            const finalCount = Math.max(localCount, backendCount);
            setUsageCount(finalCount);
            localStorage.setItem(usageKey, finalCount.toString());
          }
          
          addLog("SYSTEM", "info", `Session Cache Hit: Loaded IP ${cachedIp} from memory.`);
          return;
        }
      }

      let clientPublicIp = "";
      try {
        const ipifyRes = await fetch("https://api.ipify.org?format=json");
        if (ipifyRes.ok) {
          const ipifyData = await ipifyRes.json();
          clientPublicIp = ipifyData.ip || "";
        }
      } catch (e) {
        console.warn("ipify lookup failed, falling back to backend IP detection", e);
      }

      const backendUrl = clientPublicIp ? `/api/vision/ip?ip=${clientPublicIp}` : "/api/vision/ip";
      const res = await fetch(backendUrl);
      if (res.ok) {
        const data = await res.json();
        const resolvedIp = data.ip || "127.0.0.1";
        const resolvedGeo = `${data.city || "Doha"}, ${data.country_name || "QA"}`;

        setClientIP(resolvedIp);
        setIpLocation(resolvedGeo);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("portfolio-client-ip", resolvedIp);
          sessionStorage.setItem("portfolio-client-geo", resolvedGeo);
        }

        const backendCount = data.usageCount || 0;
        const usageKey = getDailyUsageKey();
        let localCount = 0;
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(usageKey);
          localCount = stored ? parseInt(stored, 10) : 0;
        }
        const finalCount = Math.max(localCount, backendCount);
        setUsageCount(finalCount);
        if (typeof window !== "undefined") {
          localStorage.setItem(usageKey, finalCount.toString());
        }

        addLog("SYSTEM", "info", `Gateway handshake complete. Client IP: ${resolvedIp}`);
      }
    } catch {
      setClientIP("0.0.0.0");
      setIpLocation("Unknown Location");
      
      const usageKey = getDailyUsageKey();
      let localCount = 0;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(usageKey);
        localCount = stored ? parseInt(stored, 10) : 0;
      }
      setUsageCount(localCount);
    }
  };

  const addLog = (sender: string, type: LogLine["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, sender, type, message }]);
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const resetWorkspace = () => {
    setTranscription("");
    setStructuredNotes("");
    setElapsedMs(0);
    setApiCost(0);
    setTokensCount(0);
    setStepText("Ready. Ingest an audio file to begin.");
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // File triggers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addLog("UPLOADER", "error", `Blocked: File '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB limit.`);
        alert(`Audio file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB security limit. Please upload a smaller recording.`);
        return;
      }
      setSelectedFile(file);
      resetWorkspace();
      addLog("UPLOADER", "info", `Uploaded audio file '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB). Format: ${file.type}`);
    }
  };

  // Run Transcription
  const runAudioPipeline = async () => {
    if (!selectedFile) {
      alert("Please upload an audio recording first.");
      return;
    }

    const isWhitelisted = clientIP === "34.132.233.106";
    if (usageCount >= maxUsage && !isWhitelisted) {
      alert("Daily sandbox limit reached (5/5). Please contact Osama Alam for unlimited access!");
      return;
    }

    resetWorkspace();
    setIsRunning(true);
    setStepText("Decoding audio stream and transcribing... Please wait.");
    addLog("DECODER", "info", `Opening audio stream channel for ${selectedFile.name}...`);
    addLog("DECODER", "process", "Spawning backend speech-to-text decoder socket...");

    // Start timer
    timerIntervalRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post("/api/audio/process", formData);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "Audio decoding failed");
      }

      const outText = response.data.text;
      addLog("DECODER", "success", "Audio stream transcribed successfully.");
      setTranscription(outText);
      setStepText("Transcription complete. Customize prompt to restructure.");
      setActiveWorkspaceTab("text");

      const estTokens = outText.length / 3 + 120;
      setTokensCount(Math.floor(estTokens));
      setApiCost(estTokens * 0.000015);

    } catch (err: any) {
      addLog("DECODER", "error", `Audio parsing failed: ${err.message}`);
      setStepText("Transcription failed.");
    } finally {
      setIsRunning(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    // Increment usage safely (Rule 8)
    setUsageCount((prev) => {
      const newCount = prev + 1;
      if (typeof window !== "undefined") {
        localStorage.setItem(getDailyUsageKey(), newCount.toString());
      }
      return newCount;
    });
  };

  // Run Structuring Note compiler
  const triggerAudioPostProcess = async () => {
    if (!transcription) {
      alert("Please transcribe the audio first.");
      return;
    }

    setIsPostProcessing(true);
    setStructuredNotes("🧠 Compiling transcribed coordinates into structured notes... Please wait.");
    addLog("STRUCTURE", "info", "Sending transcription payload to post-processing LLM...");

    try {
      const response = await axios.post("/api/audio/structure", {
        text: transcription,
        prompt: customPrompt,
        temperature
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "Structuring notes failed");
      }

      const outText = response.data.text;
      addLog("STRUCTURE", "success", "Structured notes compiled successfully.");
      setStructuredNotes(outText);
      setActiveWorkspaceTab("notes");

    } catch (err: any) {
      addLog("STRUCTURE", "error", `Post-processing failed: ${err.message}`);
      setStructuredNotes(`❌ Failed to structure notes: ${err.message}`);
    } finally {
      setIsPostProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-cyber-dark text-zinc-800 dark:text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-300 relative">
      
      {/* 🌐 Cosmic Grid Backdrop */}
      <div className="absolute inset-0 cyber-grid cyber-grid-radial opacity-30 -z-10 animate-grid-move"></div>

      {/* 🚀 Main Header */}
      <header className="w-full glass-panel border-b border-zinc-200 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden border border-zinc-800">
              <img src="/icon.png" alt="Osama Alam Logo" className="w-10 h-10 object-contain rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-emerald-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Osama Alam</span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">AI Architect & Founder</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.05] text-zinc-800 dark:text-yellow-400 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="text-xl transition-transform duration-500 hover:rotate-45 block">
                {isDarkMode ? "🌙" : "☀️"}
              </span>
            </button>
            <Link href="/agents" className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors mr-1">⚡ Agent Sandbox</Link>
            <Link href="/rag" className="text-purple-500 hover:text-purple-400 font-semibold transition-colors mr-1">🧠 RAG Sandbox</Link>
            <Link href="/vision" className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors mr-1">👁️ Vision Sandbox</Link>
            <Link href="/" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-emerald-400 transition-colors">← Back to Portfolio</Link>
          </nav>

          {/* Mobile Navigation Toggle Button */}
          <div className="flex items-center gap-3 md:hidden">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.05] flex items-center justify-center text-zinc-600 dark:text-yellow-400 cursor-pointer transition-all"
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="p-2 rounded-lg bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 border-t border-zinc-200 dark:border-white/[0.04] bg-[#ffffff] dark:bg-[#050507] flex flex-col gap-4 animate-fade-in z-50 relative">
            <Link 
              href="/agents" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-emerald-500 hover:text-emerald-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]"
            >
              ⚡ Agent Sandbox
            </Link>
            <Link 
              href="/rag" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-purple-500 hover:text-purple-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]"
            >
              🧠 RAG Sandbox
            </Link>
            <Link 
              href="/vision" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-cyan-500 hover:text-cyan-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]"
            >
              👁️ Vision Sandbox
            </Link>
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider"
            >
              ← Back to Portfolio
            </Link>
          </div>
        )}
      </header>

      {/* 🛠️ Dynamic Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Page Title Header */}
        <div className="xl:col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-white/[0.04] pb-6 mb-2">
          <div className="flex flex-col gap-2 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono text-xs uppercase tracking-widest self-start">
              🎙️ AI Speech & Audio Processing Sandbox
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Synapse Multi-Engine Audio Sandbox
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans mt-1 font-medium">
              Experience dynamic audio-to-text intelligence pipelines. Upload an audio recording, transcribe it natively, and execute custom prompts to structure the results into notes, outlines, or reports.
            </p>
          </div>

          {/* Secure IP & Usage limit panel */}
          <div className="sh-dark-card flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-400 w-full md:w-[320px]">
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-1">
              <span className="font-bold text-white">GATEWAY STATUS</span>
              <span className="text-emerald-400 font-bold animate-pulse">● SECURED</span>
            </div>
            <div className="flex justify-between">
              <span>Client IP:</span>
              <span className="text-muted-foreground font-bold">{clientIP}</span>
            </div>
            <div className="flex justify-between">
              <span>Secure Node:</span>
              <span className="text-muted-foreground font-bold line-clamp-1">{ipLocation}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.05] pt-1.5 mt-1 text-[11px] font-bold">
              <span>Daily Rate Limit:</span>
              <span className="text-emerald-400">
                {clientIP === "34.132.233.106" ? "UNLIMITED (VIP)" : `${usageCount} / ${maxUsage} Used`}
              </span>
            </div>
          </div>
        </div>

        {/* ==========================================
            LEFT PANEL: SETTINGS & DYNAMIC CONTROL
            ========================================== */}
        <section className="xl:col-span-4 flex flex-col gap-5 glass-panel p-5 rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#07070a]/90 self-start relative transition-colors duration-300">
          
          <div className="pb-3 border-b border-zinc-200 dark:border-white/[0.05]">
            <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-1.5">
              ⚙️ Audio Configuration Center
            </h2>
            <p className="text-[10px] text-black dark:text-zinc-400 font-mono leading-relaxed mt-0.5 font-semibold">
              Load recordings, configure decoders, and structure results.
            </p>
          </div>

          {/* Drag & Drop File Upload Zone */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
              1. Upload Audio Recording
            </label>
            <div 
              onClick={() => document.getElementById("audio-file-input")?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-white/[0.08] hover:border-cyan-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-white/[0.01] hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
            >
              <input 
                id="audio-file-input"
                type="file"
                accept="audio/mpeg,audio/wav,audio/x-m4a,audio/mp3"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-2xl">🎙️</span>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold line-clamp-1">{selectedFile.name}</span>
                  <span className="text-[8px] text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB (Click to swap)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl text-zinc-400">📥</span>
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Click to upload Audio</span>
                  <span className="text-[9px] text-zinc-400">Supports MP3, WAV, M4A (Max 2MB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={runAudioPipeline}
            disabled={isExecuting || !selectedFile}
            className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 !text-white font-extrabold text-sm shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Decoding Audio...
              </>
            ) : (
              <>
                <span>⚡</span> Transcribe Audio
              </>
            )}
          </button>

          {/* AI Structuring Panel */}
          {transcription && (
            <div className="border-t border-zinc-200 dark:border-white/[0.05] pt-4 flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
                  2. Customize Note Instructions
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  disabled={isPostProcessing}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/[0.06] text-xs text-black dark:text-zinc-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 leading-relaxed font-bold"
                  placeholder="Type how you want the notes compiled (e.g. outline, SWOT, bullets, study guide)..."
                />
              </div>

              {/* Slider & Run button */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[9px] uppercase font-mono text-black dark:text-zinc-400">Temperature</span>
                  <input
                    type="range"
                    min="0.15"
                    max="0.85"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <button
                  onClick={triggerAudioPostProcess}
                  disabled={isPostProcessing}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600"
                >
                  {isPostProcessing ? "Compiling..." : "✨ Restructure"}
                </button>
              </div>
            </div>
          )}

        </section>

        {/* ==========================================
            RIGHT PANEL: HIGH-TECH TOPOLOGY & WORKSPACE
            ========================================== */}
        <section className="xl:col-span-8 flex flex-col gap-6">

          {/* SVG Graph Topology Node Viewer */}
          <div className="glass-panel p-4 rounded-2xl border border-white/[0.06] bg-[#07070a] relative sh-dark-card overflow-hidden min-h-[160px] flex flex-col justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03]"></div>

            <div className="flex items-center justify-between z-10">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-mono tracking-widest text-cyan-400 font-semibold">
                  Network Graph Topology
                </span>
                <span className="text-[11px] text-muted-foreground font-bold mt-0.5 uppercase">
                  {transcription ? "Audio Pipeline Active" : "Audio Pipeline Idle"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {stepText}
              </span>
            </div>

            {/* SVG Interactive Nodes Graph */}
            <div className="relative py-4 grid grid-cols-4 gap-4 z-10">
              
              {/* Connector SVG Line */}
              <div className="absolute inset-x-[12%] top-[45%] h-1 -translate-y-1/2 -z-10">
                <svg className="w-full h-8 overflow-visible" fill="none">
                  <path d="M 0,16 L 300,16" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="2" className="w-full" />
                  {isExecuting && (
                    <path
                      d="M 0,16 L 300,16"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeDasharray="8 20"
                      className="animate-grid-move"
                      style={{ animationDuration: "1.2s" }}
                    />
                  )}
                  {isPostProcessing && (
                    <path
                      d="M 150,16 L 300,16"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeDasharray="5 15"
                      className="animate-grid-move"
                      style={{ animationDuration: "0.8s" }}
                    />
                  )}
                </svg>
              </div>

              {/* Node 1: Upload */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  selectedFile ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-white/8 bg-neutral-900/75"
                }`}>
                  🎙️
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground">Audio Ingest</span>
              </div>

              {/* Node 2: Selected Engine */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  isExecuting ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105" : transcription ? "border-cyan-500/40 bg-black/40" : "border-white/8 bg-neutral-900/75"
                }`}>
                  🔊
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground uppercase font-mono text-[9px]">
                  Decoder
                </span>
              </div>

              {/* Node 3: Raw Extraction */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  isPostProcessing ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : transcription ? "border-cyan-500/40 bg-black/40" : "border-white/8 bg-neutral-900/75"
                }`}>
                  📝
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground">
                  Transcribed Text
                </span>
              </div>

              {/* Node 4: AI Output */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  structuredNotes ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105" : "border-white/8 bg-neutral-900/75"
                }`}>
                  ✨
                </div>
                <span className="text-[10px] mt-2 font-bold text-zinc-300">
                  Structured Notes
                </span>
              </div>

            </div>

            {/* Telemetry Row */}
            <div className="grid grid-cols-4 gap-2 border-t border-white/[0.05] pt-3 text-[10px] font-mono text-zinc-500">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Latency</span>
                <span className="text-white font-bold mt-0.5">{(elapsedMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Paid Credits</span>
                <span className="text-emerald-400 font-bold mt-0.5">${apiCost.toFixed(5)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Estimated Tokens</span>
                <span className="text-white mt-0.5">{tokensCount.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Engine Type</span>
                <span className="text-cyan-400 font-bold mt-0.5">Speech API</span>
              </div>
            </div>

          </div>

          {/* Interactive Document Workspace */}
          <div className="flex flex-col h-[400px] rounded-2xl border border-white/[0.06] bg-[#07070a]/90 relative overflow-hidden sh-dark-card">
            
            {/* Workspace Tab Header */}
            <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveWorkspaceTab("text")}
                  disabled={!transcription}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeWorkspaceTab === "text" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Raw Transcription
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab("notes")}
                  disabled={!structuredNotes}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeWorkspaceTab === "notes" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Structured Notes Output
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Interactive Screen</span>
              </div>
            </div>

            {/* Active Screen Tab Area */}
            <div className="flex-1 p-4 bg-black/80 font-mono text-[10px] leading-relaxed overflow-y-auto no-scrollbar">
              
              {activeWorkspaceTab === "text" && (
                <div className="h-full">
                  {transcription ? (
                    <pre className="!text-zinc-200 whitespace-pre-wrap leading-normal font-mono text-[12px]">
                      <code>{transcription}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 font-sans p-4">
                      <span className="text-3xl mb-1">📝</span>
                      <h6 className="text-[11px] font-bold text-zinc-400 font-mono uppercase">Raw Transcription Output</h6>
                      <p className="text-[9px] mt-0.5">Ingest an audio recording to decode speech coordinates into text.</p>
                    </div>
                  )}
                </div>
              )}

              {activeWorkspaceTab === "notes" && (
                <div className="h-full animate-fade-in">
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-normal font-mono text-[10px]">
                    <code>{structuredNotes}</code>
                  </pre>
                </div>
              )}

            </div>

          </div>

          {/* Diagnostic Console Logger */}
          <div className="flex flex-col h-[180px] rounded-2xl border border-white/[0.06] bg-[#07070a]/90 relative overflow-hidden sh-dark-card">
            
            {/* Terminal Tab Headers */}
            <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
              <span className="px-3 py-1.5 text-[10px] font-mono text-white">
                Diagnostic Console
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Live Output Trace</span>
              </div>
            </div>

            {/* Terminal Screen display */}
            <div className="flex-1 p-4 bg-black/80 font-mono text-[10px] leading-relaxed overflow-y-auto" ref={logsRef}>
              <div className="flex flex-col gap-1.5">
                {logs.map((log, index) => {
                  let color = "text-zinc-400";
                  if (log.type === "success") color = "text-emerald-400 font-semibold";
                  else if (log.type === "warning") color = "text-orange-400 font-semibold";
                  else if (log.type === "error") color = "text-red-400 font-semibold";
                  else if (log.type === "process") color = "text-cyan-400 font-bold";

                  return (
                    <div key={index} className="flex gap-2 border-b border-white/[0.01] pb-1 last:border-none">
                      <span className="text-zinc-600 select-none">[{log.timestamp}]</span>
                      <span className="text-zinc-500 select-none uppercase font-bold text-[9px] min-w-[70px]">
                        [{log.sender}]
                      </span>
                      <span className={color}>{log.message}</span>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                  <span className="text-zinc-500">Awaiting automation trace streams...</span>
                )}
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* ==========================================
          INFO FEATURES BANNER
          ========================================== */}
      <div className="sh-dark-card mt-6 p-8 rounded-2xl bg-zinc-950 border border-white/[0.04] grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto xl:col-span-12">
        <div className="flex flex-col gap-2.5">
          <span className="text-2xl">🎙️</span>
          <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Audio Decoding Stream</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Direct binary audio streaming decoding speech data with high accuracy.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-2xl">⚡</span>
          <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Paid Speech APIs</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Integrates enterprise paid speech structures, converting multi-speaker dialogues easily.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-2xl">✨</span>
          <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Structuring LLM Engine</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Paid-tier semantic note compilers parsing loose streams into beautiful study-notes or summaries.
          </p>
        </div>
      </div>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="bg-cyber-sec border-t border-zinc-200 dark:border-white/[0.04] py-12 transition-colors duration-300 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Osama Alam Logo" className="w-8 h-8 object-contain rounded-full shadow-md border border-zinc-200 dark:border-white/[0.08]" />
            <span className="font-extrabold tracking-tight text-emerald-500 text-base">Osama Alam</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono max-w-md leading-relaxed">
            Multi-agent orchestration frameworks, self-correcting prompt systems, and premium high-performance Web3 architecture.
          </p>
          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-600 border-t border-zinc-200 dark:border-white/[0.02] w-full pt-6 mt-4 flex flex-col sm:flex-row justify-between gap-4 items-center max-w-4xl">
            <span>© {new Date().getFullYear()} Osama Alam. All rights reserved. Operations Islamabad/Doha.</span>
            <span>Made with Next.js v16 & Tailwind v4. Secure compliance active.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
