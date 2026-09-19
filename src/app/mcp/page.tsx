"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ICDMatch {
  code: string;
  score: number;
  name: string;
  chapter: string;
  block: string;
  parent_code: string;
  synonyms: string[];
  search_index_paths: string[];
  fallback?: boolean;
}

interface LogItem {
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "rpc_in" | "rpc_out";
  message: string;
}

export default function McpPlayground() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  
  // Theme state initialized to a static default (dark-first) to prevent SSR hydration mismatches
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Load theme from localStorage safely after mounting
  useEffect(() => {
    setIsClient(true);
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
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("portfolio-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("portfolio-theme", "light");
    }
  }, [isDarkMode]);

  // Server endpoint detection
  const [hostOrigin, setHostOrigin] = useState<string>("http://localhost:3000");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostOrigin(window.location.origin);
    }
  }, []);

  // Geolocation & Rate Limits
  const [clientIP, setClientIP] = useState<string>("Detecting...");
  const [ipLocation, setIpLocation] = useState<string>("Resolving secure gateway...");
  const [usageCount, setUsageCount] = useState<number>(0);
  const maxUsage = 15; // Standard demo sandbox query quota

  const getDailyUsageKey = () => {
    const today = new Date().toISOString().split("T")[0];
    return `portfolio-usage-mcp-${today}`;
  };

  const fetchIPAddress = async () => {
    try {
      if (typeof window !== "undefined") {
        const cachedIp = sessionStorage.getItem("portfolio-client-ip");
        const cachedGeo = sessionStorage.getItem("portfolio-client-geo");

        if (cachedIp && cachedGeo) {
          setClientIP(cachedIp);
          setIpLocation(cachedGeo);

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
      } catch {
        // Fallback to backend IP detection
      }

      const backendUrl = clientPublicIp ? `/api/vision/ip?ip=${clientPublicIp}` : "/api/vision/ip";
      const res = await fetch(backendUrl);
      if (res.ok) {
        const data = await res.json();
        const resolvedIp = data.ip || "127.0.0.1";
        const resolvedGeo = `${data.city || "Doha"}, ${data.country_name || "QA"}`;

        setClientIP(resolvedIp);
        setIpLocation(resolvedGeo);

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
          sessionStorage.setItem("portfolio-client-ip", resolvedIp);
          sessionStorage.setItem("portfolio-client-geo", resolvedGeo);
        }
      }
    } catch {
      setClientIP("127.0.0.1");
      setIpLocation("Local Gateway");
    }
  };

  // Connection status checks
  const [qdrantOnline, setQdrantOnline] = useState<boolean>(true);
  
  // Live scrolling logs terminal
  const [trafficLogs, setTrafficLogs] = useState<LogItem[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // SSE Logs listener subscription and IP resolution on mount
  useEffect(() => {
    fetchIPAddress();

    const usageKey = getDailyUsageKey();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(usageKey);
      if (stored) {
        setUsageCount(parseInt(stored, 10));
      }
    }

    const eventSource = new EventSource("/api/mcp/logs");

    eventSource.onmessage = (event) => {
      try {
        const logObj = JSON.parse(event.data) as LogItem;
        setTrafficLogs((prev) => [...prev.slice(-99), logObj]);
      } catch (err) {
        console.error("[MCP PAGE] Error parsing socket log:", err);
      }
    };

    eventSource.onerror = () => {
      console.warn("[MCP PAGE] Log socket disconnected.");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll the terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [trafficLogs]);

  // Tab configurations
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"search" | "analyze">("search");

  // Search variables
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchLoading, setSearchQueryLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<ICDMatch[]>([]);
  const [searchError, setSearchError] = useState<string>("");

  // Report analysis variables
  const [reportText, setReportText] = useState<string>("");
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    findings: Array<{
      term: string;
      clinical_relevance: string;
      codes_resolved: ICDMatch[];
    }>;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");

  // Suggestion chip handlers
  const handleSymptomChipClick = (text: string) => {
    setSearchQuery(text);
    setSearchResults([]);
    setSearchError("");
  };

  const handleReportChipClick = (text: string) => {
    setReportText(text);
    setAnalysisResult(null);
    setAnalysisError("");
  };

  // Perform vector search
  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (clientIP !== "34.132.233.106" && usageCount >= maxUsage) {
      alert(`Daily sandbox query quota reached (${maxUsage}/${maxUsage}). Please contact Osama Alam for unlimited access!`);
      return;
    }

    setSearchQueryLoading(true);
    setSearchResults([]);
    setSearchError("");

    try {
      const response = await fetch("/api/mcp/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", query: searchQuery })
      });
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
        const nextCount = usageCount + 1;
        setUsageCount(nextCount);
        if (typeof window !== "undefined") {
          localStorage.setItem(getDailyUsageKey(), nextCount.toString());
        }
      } else {
        setSearchError(data.error || "Failed to query clinical vectors.");
      }
    } catch (err) {
      setSearchError("Failed to communicate with Next.js processing APIs.");
    } finally {
      setSearchQueryLoading(false);
    }
  };

  // Perform full report analysis
  const handleReportAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    if (clientIP !== "34.132.233.106" && usageCount >= maxUsage) {
      alert(`Daily sandbox query quota reached (${maxUsage}/${maxUsage}). Please contact Osama Alam for unlimited access!`);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisError("");

    try {
      const response = await fetch("/api/mcp/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyze", reportText })
      });
      const data = await response.json();

      if (data.success) {
        setAnalysisResult({
          summary: data.summary,
          findings: data.findings || []
        });
        const nextCount = usageCount + 1;
        setUsageCount(nextCount);
        if (typeof window !== "undefined") {
          localStorage.setItem(getDailyUsageKey(), nextCount.toString());
        }
      } else {
        setSearchError(data.error || "Failed to analyze clinical report.");
      }
    } catch (err) {
      setAnalysisError("Failed to communicate with Next.js processing APIs.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Copy helper
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(""), 2000);
  };

  // Setup instructions configurations
  const [activeInstallerTab, setActiveInstallerTab] = useState<"claude" | "cursor">("claude");

  const claudeConfigText = `{
  "mcpServers": {
    "osama-icd10-server": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/sdk",
        "sse",
        "${hostOrigin}/api/mcp/sse"
      ]
    }
  }
}`;

  // Preloaded mock report templates
  const MOCK_CARDIO_REPORT = `CHIEF COMPLAINT: Recurrent retrosternal pressure at rest.
HISTORY: 68-year-old male presenting with progressive onset of chest tightness radiating to the left shoulder, exacerbated by mild physical exertion. Known history of coronary atherosclerosis.
DIAGNOSTICS: Cardiac biomarkers are negative for myocardial infarction. ECG demonstrates transient ST depression in anterior leads.
IMPRESSION: Atherosclerotic heart disease of native coronary artery with unstable angina pectoris.`;

  const MOCK_ENDOCRINE_REPORT = `CHIEF COMPLAINT: Progressive numbness and sharp burning sensations in bilateral feet.
HISTORY: 54-year-old female with long-standing history of insulin resistance and type 2 diabetes mellitus. Blood glucose levels have been consistently elevated (HbA1c: 8.6%).
PHYSICAL EXAM: Decreased monofilament sensation in symmetrical glove-and-stocking distribution in lower extremities.
IMPRESSION: Type 2 diabetes mellitus with diabetic polyneuropathy.`;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07070a] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      
      {/* 1. Header Navigation */}
      <header className="border-b border-zinc-200 dark:border-white/[0.04] bg-[#ffffff]/80 dark:bg-[#050508]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden border border-zinc-800">
              <img src="/icon.png" alt="Osama Alam Logo" className="w-10 h-10 object-contain rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-blue-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">Osama Alam</span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">AI Architect & Founder</span>
            </div>
          </Link>
          
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
            <Link href="/neural-evolution" className="text-pink-500 hover:text-pink-400 font-semibold transition-colors mr-2">🧬 Neural Lab</Link>
            <Link href="/vision" className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors mr-2">👁️ Vision Sandbox</Link>
            <Link href="/agents" className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors mr-2">⚡ Agent Sandbox</Link>
            <Link href="/rag" className="text-purple-500 hover:text-purple-400 font-semibold transition-colors mr-2">🧠 RAG Sandbox</Link>
            <Link href="/audio" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors mr-2">🎙️ Audio Sandbox</Link>
            <Link href="/" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-blue-400 transition-colors">← Back to Portfolio</Link>
          </nav>

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

        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 border-t border-zinc-200 dark:border-white/[0.04] bg-[#ffffff] dark:bg-[#050507] flex flex-col gap-4 animate-fade-in z-50 relative">
            <Link href="/neural-evolution" onClick={() => setMobileMenuOpen(false)} className="text-pink-500 hover:text-pink-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]">
              🧬 Neural Lab
            </Link>
            <Link href="/vision" onClick={() => setMobileMenuOpen(false)} className="text-cyan-500 hover:text-cyan-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]">
              👁️ Vision Sandbox
            </Link>
            <Link href="/agents" onClick={() => setMobileMenuOpen(false)} className="text-emerald-500 hover:text-emerald-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]">
              ⚡ Agent Sandbox
            </Link>
            <Link href="/rag" onClick={() => setMobileMenuOpen(false)} className="text-purple-500 hover:text-purple-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]">
              🧠 RAG Sandbox
            </Link>
            <Link href="/audio" onClick={() => setMobileMenuOpen(false)} className="text-amber-500 hover:text-amber-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]">
              🎙️ Audio Sandbox
            </Link>
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider">
              ← Back to Portfolio
            </Link>
          </div>
        )}
      </header>

      {/* 2. Main Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow">
        
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold mb-4 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              ACTIVE MODEL CONTEXT PROTOCOL (MCP) INTEGRATION
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 dark:from-blue-400 dark:via-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
              ICD-10-CM Diagnostics & MCP Server Sandbox
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl text-base md:text-lg">
              A production-ready clinical knowledge base. Query all **47,025 codes** directly using our self-hosted **Qdrant Vector Database**, or connect your external AI agents directly to the live server via standard Model Context Protocol (MCP)!
            </p>
          </div>

          {/* Secure IP & Usage limit panel */}
          <div className="sh-dark-card flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-400 w-full md:w-[320px] flex-shrink-0 self-center md:self-auto shadow-lg">
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

        {/* 3. The Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: CONNECTION HUB & LIVE TRAFFIC LOGS (5 cols)  */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Connection Hub Card */}
            <div className="rounded-3xl border border-zinc-200 dark:border-white/[0.04] bg-white dark:bg-[#09090d]/60 shadow-md p-6 relative overflow-hidden transition-all hover:border-blue-500/20">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <span className="flex h-3.5 w-3.5 items-center justify-center relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Agent Connection Hub
              </h2>

              <div className="flex flex-col gap-4">
                
                {/* SSE Endpoint Box */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-black/40 border border-zinc-200/50 dark:border-white/[0.02]">
                  <div className="text-xs font-mono tracking-wider text-zinc-500 uppercase mb-2 flex items-center justify-between">
                    <span>SSE connection URL</span>
                    <button 
                      onClick={() => triggerCopy(`${hostOrigin}/api/mcp/sse`, "sse")}
                      className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      {copyFeedback === "sse" ? "Copied! ✓" : "Copy Link"}
                    </button>
                  </div>
                  <div className="text-sm font-mono tracking-tight text-blue-600 dark:text-blue-400 select-all overflow-x-auto whitespace-nowrap scrollbar-thin">
                    {hostOrigin}/api/mcp/sse
                  </div>
                </div>

                {/* Connection Status Indicators */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/[0.01] flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Qdrant DB</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${qdrantOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                      <span className="text-xs font-bold font-mono uppercase">{qdrantOnline ? "Online" : "Offline"}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/[0.01] flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Vectors</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="text-xs font-bold font-mono text-cyan-400">47,025</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/[0.01] flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1">MCP State</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold font-mono uppercase text-emerald-500">Ready</span>
                    </div>
                  </div>
                </div>

                {/* Qdrant Vector Engine Details */}
                <div className="mt-2 p-4 rounded-2xl bg-zinc-50 dark:bg-black/30 border border-zinc-200/50 dark:border-white/[0.02]">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase block mb-3 font-bold">
                    Qdrant Vector Engine Specs
                  </span>
                  <div className="flex flex-col gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    <div className="flex justify-between items-center py-1 border-b border-zinc-200/50 dark:border-white/[0.02]">
                      <span className="text-zinc-500">Target Collection:</span>
                      <span className="text-indigo-500 dark:text-indigo-400 font-bold">icd10_codes</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-200/50 dark:border-white/[0.02]">
                      <span className="text-zinc-500">Search Strategy:</span>
                      <span className="text-emerald-500 font-bold">Direct Vector (Exact HNSW)</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-200/50 dark:border-white/[0.02]">
                      <span className="text-zinc-500">Distance Metric:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">Cosine Similarity</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-zinc-500">Database Scope:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">47,025 ICD-10 Clinical Codes</span>
                    </div>
                  </div>
                </div>

                {/* Installer instructions */}
                <div className="mt-2">
                  <div className="flex border-b border-zinc-200 dark:border-white/[0.03] gap-4 mb-3">
                    <button 
                      onClick={() => setActiveInstallerTab("claude")}
                      className={`pb-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${activeInstallerTab === "claude" ? "border-blue-500 text-blue-500 font-bold" : "border-transparent text-zinc-500"}`}
                    >
                      Claude Desktop
                    </button>
                    <button 
                      onClick={() => setActiveInstallerTab("cursor")}
                      className={`pb-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${activeInstallerTab === "cursor" ? "border-blue-500 text-blue-500 font-bold" : "border-transparent text-zinc-500"}`}
                    >
                      Cursor / VS Code
                    </button>
                  </div>

                  {activeInstallerTab === "claude" ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] text-zinc-500">
                        Append this configuration to your local `claude_desktop_config.json` to allow Claude Desktop to use your ICD-10 tools:
                      </p>
                      <div className="relative">
                        <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[10px] overflow-x-auto leading-relaxed border border-white/[0.02] max-h-40">
                          {claudeConfigText}
                        </pre>
                        <button 
                          onClick={() => triggerCopy(claudeConfigText, "config")}
                          className="absolute right-2 top-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] cursor-pointer transition-colors"
                        >
                          {copyFeedback === "config" ? "Copied! ✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
                      <ol className="list-decimal pl-4 flex flex-col gap-1 text-[11px]">
                        <li>Open Cursor Settings $\rightarrow$ Features $\rightarrow$ **MCP**.</li>
                        <li>Click **"+ Add New MCP Server"**.</li>
                        <li>Set Name: <code className="text-blue-500 dark:text-blue-400">osama-icd10</code></li>
                        <li>Set Type: <code className="text-blue-500 dark:text-blue-400">sse</code></li>
                        <li>Set URL: <code className="text-blue-500 dark:text-blue-400">{hostOrigin}/api/mcp/sse</code></li>
                        <li>Click **Save** and watch the connection turn green!</li>
                      </ol>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Live Scrolling logs console (sh-terminal) */}
            <div className="sh-terminal rounded-3xl border border-zinc-200 dark:border-white/[0.05] bg-[#050508] p-6 shadow-xl relative overflow-hidden transition-all min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase ml-2">Live Agent Traffic Monitor</span>
                </div>
                <button 
                  onClick={() => setTrafficLogs([])}
                  className="text-[9px] font-mono tracking-wider text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear Console
                </button>
              </div>

              {/* Scrolling Window */}
              <div className="flex-grow overflow-y-auto font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800 flex flex-col gap-2 max-h-60 pr-1">
                {trafficLogs.length === 0 ? (
                  <div className="text-zinc-600 dark:text-zinc-600 animate-pulse italic">
                    Awaiting remote agent handshakes... Establish a connection inside Claude Desktop or Cursor to view live JSON-RPC telemetry.
                  </div>
                ) : (
                  trafficLogs.map((log, index) => {
                    let typeColor = "text-zinc-400";
                    if (log.type === "success") typeColor = "text-emerald-400 font-bold";
                    if (log.type === "warning") typeColor = "text-yellow-400";
                    if (log.type === "error") typeColor = "text-red-400 font-bold";
                    if (log.type === "rpc_in") typeColor = "text-cyan-400";
                    if (log.type === "rpc_out") typeColor = "text-blue-400";

                    return (
                      <div key={index} className="flex gap-2 items-start border-b border-white/[0.02] pb-1 animate-fade-in">
                        <span className="text-zinc-600 flex-shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`${typeColor} flex-shrink-0 select-none uppercase tracking-wider text-[9px]`} style={{ width: "55px" }}>
                          {log.type}
                        </span>
                        <span className="text-zinc-300 break-words flex-grow">{log.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: WORKSPACE & PLAYGROUND (7 cols)             */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            
            <div className="rounded-3xl border border-zinc-200 dark:border-white/[0.04] bg-white dark:bg-[#09090d]/60 shadow-md p-6 relative overflow-hidden transition-all hover:border-indigo-500/20">
              
              {/* Tab Selector */}
              <div className="flex border-b border-zinc-200 dark:border-white/[0.04] gap-6 mb-6">
                <button 
                  onClick={() => setActiveWorkspaceTab("search")}
                  className={`pb-3 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeWorkspaceTab === "search" ? "border-indigo-500 text-indigo-500 dark:text-indigo-400" : "border-transparent text-zinc-400 dark:text-zinc-500"}`}
                >
                  <span className="text-base">🔍</span>
                  Symptom Vector Search
                </button>
                <button 
                  onClick={() => setActiveWorkspaceTab("analyze")}
                  className={`pb-3 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeWorkspaceTab === "analyze" ? "border-indigo-500 text-indigo-500 dark:text-indigo-400" : "border-transparent text-zinc-400 dark:text-zinc-500"}`}
                >
                  <span className="text-base">🏥</span>
                  Clinical Notes Analyzer
                </button>
              </div>

              {/* ========================== */}
              {/* TAB 1: SYMPTOM VECTOR SEARCH */}
              {/* ========================== */}
              {activeWorkspaceTab === "search" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-500 leading-relaxed mb-1">
                    Enter colloquial clinical symptoms to perform high-speed cosine vector similarity matching directly inside Qdrant to find the exact matching diagnostic classifications.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center mr-1">Try presets:</span>
                    {[
                      { label: "Angina", text: "crushing chest pain spreading to left arm with plaque" },
                      { label: "Diabetic Neuropathy", text: "tingling feet, loss of monofilament sensation, high blood sugar" },
                      { label: "Knee Osteoarthritis", text: "severe knee pain, morning stiffness, joint clicking" },
                      { label: "Hypertensive Crisis", text: "pounding headache, dizziness, arterial blood pressure 160/100" }
                    ].map((chip) => (
                      <button 
                        key={chip.label}
                        onClick={() => handleSymptomChipClick(chip.text)}
                        className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.04] cursor-pointer transition-colors text-zinc-600 dark:text-zinc-400"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleVectorSearch} className="flex gap-2">
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Describe symptoms or enter condition (e.g. numbness in toes, history of hyperglycemia)..."
                      className="flex-grow px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/[0.05] text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    />
                    <button 
                      type="submit"
                      disabled={searchLoading || !searchQuery.trim()}
                      className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
                    >
                      {searchLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span>Search Vectors</span>
                      )}
                    </button>
                  </form>

                  {/* Search Error */}
                  {searchError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono">
                      {searchError}
                    </div>
                  )}

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="mt-4 flex flex-col gap-4">
                      <div className="text-xs font-mono tracking-widest text-zinc-400 uppercase border-b border-zinc-200 dark:border-white/[0.04] pb-2 flex justify-between">
                        <span>Resolved Matches</span>
                        <span>{searchResults.length} Codes matched</span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {searchResults.map((match, idx) => (
                          <div 
                            key={match.code}
                            className="p-4 rounded-2xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/[0.01] flex flex-col gap-2 transition-all hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold font-mono">
                                  {match.code}
                                </span>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                  {match.name}
                                </h4>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0 ml-4">
                                <span className="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400">
                                  {(match.score * 100).toFixed(1)}% Match
                                </span>
                                {match.fallback && (
                                  <span className="text-[8px] font-mono uppercase text-zinc-500">
                                    Lexical Fallback
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Match score bar */}
                            <div className="w-full bg-zinc-200 dark:bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${match.score * 100}%` }}
                              />
                            </div>

                            {/* Extra details */}
                            <div className="text-[11px] text-zinc-500 font-mono flex flex-col gap-1 leading-relaxed border-t border-zinc-200/50 dark:border-white/[0.02] pt-2 mt-1">
                              <div><span className="text-zinc-400 uppercase text-[9px] mr-1">Hierarchy:</span> {match.chapter} &gt; {match.block}</div>
                              {match.parent_code && (
                                <div><span className="text-zinc-400 uppercase text-[9px] mr-1">Parent Code:</span> `{match.parent_code}`</div>
                              )}
                              {match.synonyms && match.synonyms.length > 0 && (
                                <div><span className="text-zinc-400 uppercase text-[9px] mr-1">Synonyms:</span> {match.synonyms.join(", ")}</div>
                              )}
                              {match.search_index_paths && match.search_index_paths.length > 0 && (
                                <div>
                                  <span className="text-zinc-400 uppercase text-[9px] mr-1">Index Paths:</span> 
                                  <span className="text-zinc-400 italic">
                                    {match.search_index_paths.slice(0, 2).join("; ")}
                                  </span>
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ========================== */}
              {/* TAB 2: CLINICAL REPORT ANALYZER */}
              {/* ========================== */}
              {activeWorkspaceTab === "analyze" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-500 leading-relaxed mb-1">
                    Paste raw Clinical Discharge reports, EHR summaries, or Doctor notes. Our system will call Gemini to deconstruct symptoms, extract distinct findings, generate vectors for each, and pinpoint corresponding ICD-10-CM codes.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center mr-1">Try presets:</span>
                    <button 
                      onClick={() => handleReportChipClick(MOCK_CARDIO_REPORT)}
                      className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.04] cursor-pointer transition-colors text-zinc-600 dark:text-zinc-400"
                    >
                      Cardiology Report
                    </button>
                    <button 
                      onClick={() => handleReportChipClick(MOCK_ENDOCRINE_REPORT)}
                      className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.04] cursor-pointer transition-colors text-zinc-600 dark:text-zinc-400"
                    >
                      Endocrine Summary
                    </button>
                  </div>

                  {/* Text area Form */}
                  <form onSubmit={handleReportAnalysis} className="flex flex-col gap-3">
                    <textarea 
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Paste clinical note, discharge summary, or diagnostic transcript..."
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/[0.05] text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono leading-relaxed resize-none"
                    />
                    <button 
                      type="submit"
                      disabled={analysisLoading || !reportText.trim()}
                      className="w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
                    >
                      {analysisLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Evaluating Clinical Impressions...</span>
                        </div>
                      ) : (
                        <span>Compile EHR Diagnosis</span>
                      )}
                    </button>
                  </form>

                  {/* Analysis Error */}
                  {analysisError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono">
                      {analysisError}
                    </div>
                  )}

                  {/* Analysis results */}
                  {analysisResult && (
                    <div className="mt-4 flex flex-col gap-4">
                      
                      {/* Executive Summary */}
                      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 leading-relaxed text-sm italic text-zinc-800 dark:text-zinc-300">
                        <span className="not-italic font-bold font-mono text-[10px] uppercase text-indigo-500 dark:text-indigo-400 block mb-1">AI Case Summary</span>
                        "{analysisResult.summary}"
                      </div>

                      <div className="text-xs font-mono tracking-widest text-zinc-400 uppercase border-b border-zinc-200 dark:border-white/[0.04] pb-2">
                        Deconstructed Findings ({analysisResult.findings.length})
                      </div>

                      {/* Map Findings */}
                      <div className="flex flex-col gap-4">
                        {analysisResult.findings.map((finding, fIdx) => (
                          <div 
                            key={fIdx}
                            className="p-5 rounded-2xl bg-zinc-50 dark:bg-black/30 border border-zinc-200/50 dark:border-white/[0.02] flex flex-col gap-3 animate-fade-in"
                          >
                            <div>
                              <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-0.5">Finding {fIdx+1}</span>
                              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                {finding.term}
                              </h4>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 italic leading-relaxed mt-1">
                                {finding.clinical_relevance}
                              </p>
                            </div>

                            {/* Mapped Codes for this finding */}
                            <div className="border-t border-zinc-200 dark:border-white/[0.04] pt-3 flex flex-col gap-2">
                              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">Resolved ICD-10 Vectors:</span>
                              {finding.codes_resolved.length === 0 ? (
                                <span className="text-xs text-zinc-500 italic">No matching vectors found.</span>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {finding.codes_resolved.map((match) => (
                                    <div key={match.code} className="flex flex-col gap-1 rounded-xl p-3 bg-zinc-100 dark:bg-black/20 border border-zinc-200/50 dark:border-white/[0.01]">
                                      <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold font-mono text-[10px]">
                                            {match.code}
                                          </span>
                                          <span className="font-bold text-zinc-800 dark:text-zinc-200 tracking-tight leading-none">
                                            {match.name}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 font-bold">
                                          {(match.score * 100).toFixed(1)}% Match
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-zinc-500 leading-none">
                                        {match.chapter} &gt; {match.block}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* 4. Footer */}
      <footer className="border-t border-zinc-200 dark:border-white/[0.04] bg-[#ffffff] dark:bg-[#050507] py-8 text-center mt-16 transition-colors">
        <p className="text-xs font-mono text-zinc-500 tracking-wider">
          Designed & Built with ❤️ by Osama Alam
        </p>
      </footer>

    </div>
  );
}
export const dynamic = "force-dynamic";
