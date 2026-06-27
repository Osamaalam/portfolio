"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import axios from "axios";

// ==========================================
// INTERFACES & PRESETS
// ==========================================

interface OcrDetection {
  class: string;
  confidence: number;
  box: number[]; // [x_min, y_min, x_max, y_max]
  polygon?: number[][]; // [[x1, y1], [x2, y2], ...]
}

interface LogLine {
  timestamp: string;
  sender: string;
  type: "info" | "success" | "warning" | "error" | "process";
  message: string;
}

const POST_PROCESS_PRESETS = [
  { id: "invoice", label: "📊 Rebuild Invoice Table", prompt: "Parse the extracted document text, extract all line items, quantities, prices, taxes, and totals, and re-compile them into a beautifully-structured Markdown relational invoice table with clean alignments." },
  { id: "contacts", label: "🔍 Extract Contact Info", prompt: "Scan the extracted text, locate all physical addresses, phone numbers, email accounts, and URLs, and list them in a clear bulleted index. Under each entry, list its associated name or context if found." },
  { id: "translation", label: "🌐 Translate to Spanish", prompt: "Translate the raw extracted text into highly professional, grammatically-accurate Spanish, preserving all numerical metrics and titles." },
  { id: "correction", label: "✍️ Correct OCR Grammar", prompt: "Analyze the raw OCR text, detect any fuzzy character recognition errors, spelling mistakes, or layout splits, and rewrite the document neatly, restoring proper syntax and structural paragraphs." }
];

export default function OcrSandbox() {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Theme state synced with local preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
    } else if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else {
      // Respect browser/system preferred color scheme on first load
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(systemPrefersDark);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("portfolio-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("portfolio-theme", "light");
    }
  }, [isDarkMode]);

  // Public IP Info tracking
  const [clientIP, setClientIP] = useState<string>("Detecting...");
  const [ipLocation, setIpLocation] = useState<string>("Secure Workspace");
  const [usageCount, setUsageCount] = useState<number>(0);
  const maxUsage = 5;

  // Helper to load/save daily usage count (Rule 8)
  const getDailyUsageKey = () => {
    const today = new Date().toISOString().split("T")[0];
    return `portfolio-usage-vision-${today}`;
  };

  // Pipeline configuration states
  const [engine, setEngine] = useState<"tesseract" | "gemini" | "yolo">("tesseract");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetObject, setTargetObject] = useState<string>("all");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>(POST_PROCESS_PRESETS[0].prompt);
  const [temperature, setTemperature] = useState<number>(0.3);

  // Execution states
  const [isExecuting, setIsRunning] = useState<boolean>(false);
  const [isPostProcessing, setIsPostProcessing] = useState<boolean>(false);
  const [stepText, setStepText] = useState<string>("Ready. Upload a document to begin.");
  const [rawText, setRawText] = useState<string>("");
  const [aiOutput, setAiOutput] = useState<string>("");
  const [detections, setDetections] = useState<OcrDetection[]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"image" | "text" | "ai">("image");

  // Terminal & logs
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"terminal" | "details">("terminal");
  const [selectedDetection, setSelectedDetection] = useState<OcrDetection | null>(null);

  // Telemetry Analytics
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [apiCost, setApiCost] = useState<number>(0);
  const [tokensCount, setTokensCount] = useState<number>(0);

  // Refs for drawing and scrolling
  const logsRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic CDNs
  const [tesseractLoaded, setTesseractLoaded] = useState<boolean>(false);

  useEffect(() => {
    addLog("SYSTEM", "info", "Multi-Engine AI Vision & Segmenter initialized.");
    
    // Load daily usage from localStorage if present to prevent page refresh/dev restart reset
    if (typeof window !== "undefined") {
      const usageKey = getDailyUsageKey();
      const stored = localStorage.getItem(usageKey);
      if (stored) {
        setUsageCount(parseInt(stored, 10));
      } else {
        setUsageCount(0);
        // Prune older portfolio-usage-vision keys to avoid cluttering localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("portfolio-usage-vision-") && key !== usageKey) {
            localStorage.removeItem(key);
          }
        }
      }
    }

    fetchIPAddress();

    // Dynamically load Tesseract.js from CDN
    if (typeof window !== "undefined" && !window.hasOwnProperty("Tesseract")) {
      addLog("SYSTEM", "info", "Loading local browser-bound Tesseract.js engine...");
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js";
      script.async = true;
      script.onload = () => {
        setTesseractLoaded(true);
        addLog("SYSTEM", "success", "Tesseract.js core OCR engine loaded natively in browser thread.");
      };
      script.onerror = () => {
        addLog("SYSTEM", "error", "Failed to load Tesseract CDN. Local OCR mode disabled.");
      };
      document.body.appendChild(script);
    } else {
      setTesseractLoaded(true);
    }
  }, []);

  // IP Geolocation via secure backend proxy with high-performance Session Caching (Rule 8)
  const fetchIPAddress = async () => {
    try {
      // 1. Check if IP is already cached in this tab session
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
          return; // Zero API hits!
        }
      }

      let clientPublicIp = "";
      try {
        // Fast client-side fetch of public IP (always CORS-allowed by ipify)
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

        // 2. Save resolved details to sessionStorage to bypass subsequent triggers
        if (typeof window !== "undefined") {
          sessionStorage.setItem("portfolio-client-ip", resolvedIp);
          sessionStorage.setItem("portfolio-client-geo", resolvedGeo);
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

  // Reset page state
  const resetWorkspace = () => {
    setStepText("Ready. Upload a document to begin.");
    setRawText("");
    setAiOutput("");
    setDetections([]);
    setSelectedDetection(null);
    setElapsedMs(0);
    setApiCost(0);
    setActiveWorkspaceTab("image");
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Handle image uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addLog("UPLOADER", "error", `Blocked: File '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB limit.`);
        alert(`Image size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB limit. Please upload an image under 2 MB.`);
        return;
      }
      setSelectedFile(file);
      setImageUrl(URL.createObjectURL(file));
      setImageLoaded(false); // Reset load trigger ONLY on fresh uploads
      resetWorkspace();
      addLog("UPLOADER", "info", `Uploaded file '${file.name}' (${(file.size / 1024).toFixed(1)} KB). Format: ${file.type}`);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addLog("UPLOADER", "error", `Blocked: File '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB limit.`);
        alert(`Image size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB limit. Please upload an image under 2 MB.`);
        return;
      }
      setSelectedFile(file);
      setImageUrl(URL.createObjectURL(file));
      setImageLoaded(false); // Reset load trigger ONLY on fresh uploads
      resetWorkspace();
      addLog("UPLOADER", "info", `Dropped file '${file.name}' via drag-gesture.`);
    }
  };

  // Draw YOLO bounding boxes and polygons on Canvas
  const drawYoloDetections = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standardize canvas dimensions to match displayed image sizing
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    // Align the canvas layout styles to match the centered image boundaries exactly!
    canvas.style.width = `${img.clientWidth}px`;
    canvas.style.height = `${img.clientHeight}px`;
    canvas.style.top = `${img.offsetTop}px`;
    canvas.style.left = `${img.offsetLeft}px`;

    // Clear previous
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) return;

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    detections.forEach((det, idx) => {
      const { box, polygon, class: clsName, confidence } = det;

      const x_min = box[0] * scaleX;
      const y_min = box[1] * scaleY;
      const x_max = box[2] * scaleX;
      const y_max = box[3] * scaleY;
      const w = x_max - x_min;
      const h = y_max - y_min;

      // Brand color hashes
      const colorHash = [
        "rgba(6, 182, 212, 0.3)",  // cyan
        "rgba(16, 185, 129, 0.3)", // emerald
        "rgba(249, 115, 22, 0.3)",  // orange
        "rgba(139, 92, 246, 0.3)", // purple
        "rgba(236, 72, 153, 0.3)"  // pink
      ];
      const strokeHash = ["#06b6d4", "#10b981", "#f97316", "#8b5cf6", "#ec4899"];
      const isSelected = selectedDetection === det;
      const cIdx = idx % colorHash.length;

      // 1. Paint Segmentation Mask (Polygons)
      if (polygon && Array.isArray(polygon) && polygon.length > 0) {
        ctx.beginPath();
        const startX = polygon[0][0] * scaleX;
        const startY = polygon[0][1] * scaleY;
        ctx.moveTo(startX, startY);

        for (let p = 1; p < polygon.length; p++) {
          const px = polygon[p][0] * scaleX;
          const py = polygon[p][1] * scaleY;
          ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = isSelected ? "rgba(16, 185, 129, 0.5)" : colorHash[cIdx];
        ctx.fill();

        ctx.strokeStyle = isSelected ? "#10b981" : strokeHash[cIdx];
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
      }

      // 2. Paint Bounding Box
      ctx.strokeStyle = isSelected ? "#10b981" : strokeHash[cIdx];
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash([4, 4]); // Cool glowing dashed overlay
      ctx.strokeRect(x_min, y_min, w, h);
      ctx.setLineDash([]); // Restore

      // 3. Paint Label Tags
      ctx.fillStyle = isSelected ? "#10b981" : strokeHash[cIdx];
      ctx.font = "bold 9px monospace";
      const labelText = `${clsName.toUpperCase()} (${(confidence * 100).toFixed(0)}%)`;
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillRect(x_min, y_min - 12 >= 0 ? y_min - 12 : y_min, textWidth + 6, 12);

      ctx.fillStyle = "#000000";
      ctx.fillText(labelText, x_min + 3, (y_min - 12 >= 0 ? y_min - 12 : y_min) + 9);
    });
  };

  // Re-draw when detections update or panel changes dimensions
  useEffect(() => {
    drawYoloDetections();
    window.addEventListener("resize", drawYoloDetections);
    return () => window.removeEventListener("resize", drawYoloDetections);
  }, [detections, selectedDetection]);

  // Primary OCR Pipeline Runner
  const runOcrPipeline = async () => {
    if (!selectedFile) {
      alert("Please upload an image file first.");
      return;
    }

    const isWhitelisted = clientIP === "34.132.233.106";
    if (usageCount >= maxUsage && !isWhitelisted) {
      alert("Daily sandbox limit reached (5/5). Please contact Osama Alam for unlimited access!");
      return;
    }

    resetWorkspace();
    setIsRunning(true);
    setStepText(`Analyzing document via ${engine.toUpperCase()}...`);

    // Start timer
    timerIntervalRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);

    // ==========================================
    // ENGINE 1: LOCAL TESSERACT.JS (CLIENT)
    // ==========================================
    if (engine === "tesseract") {
      if (!tesseractLoaded) {
        addLog("TESSERACT", "error", "Local CDN engine not fully initialized. Retrying load.");
        setIsRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        return;
      }

      addLog("TESSERACT", "info", "Initializing sandbox web workers natively in browser...");
      addLog("TESSERACT", "process", "Loading English training metrics (eng.traineddata)...");

      try {
        const Tesseract = (window as any).Tesseract;
        
        // Run OCR locally
        const result = await Tesseract.recognize(
          imageUrl,
          "eng",
          { logger: (m: any) => {
            if (m.status === "recognizing text") {
              setStepText(`Recognizing characters: ${(m.progress * 100).toFixed(0)}%`);
            }
          }}
        );

        const extractedText = result?.data?.text || "[NO_TEXT_DETECTED]";
        addLog("TESSERACT", "success", `Local optical character recognition complete.`);
        setRawText(extractedText);
        setStepText("OCR complete. Trigger post-processing to structure text.");
        setActiveWorkspaceTab("text");
        setTokensCount(Math.floor(extractedText.length / 3));

      } catch (err: any) {
        addLog("TESSERACT", "error", `Local browser parsing failed: ${err.message}`);
        setStepText("Local compilation failed.");
      } finally {
        setIsRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }

     // ==========================================
    // ENGINE 2: GEMINI 2.5 FLASH VISION (Vision LLM)
    // ==========================================
     else if (engineIsGemini()) {
      addLog("GEMINI_VISION", "info", "Preparing Base64 multi-modal image payload...");
      
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("engine", "gemini");
        formData.append("prompt", customPrompt); // Custom question/instructions for image description

        const response = await axios.post("/api/vision/process", formData);

        if (!response.data || !response.data.success) {
          throw new Error(response.data?.error || "Upstream vision parsing failed");
        }

        const outText = response.data.text;
        addLog("GEMINI_VISION", "success", "Vision processing finished. Output returned.");
        setRawText(outText);
        setAiOutput(outText); // Sync with AI workspace directly
        setStepText("Vision complete. Image analysis completed successfully.");
        setActiveWorkspaceTab("ai");
        
        const estTokens = outText.length / 3 + 240;
        setTokensCount(Math.floor(estTokens));
        setApiCost(estTokens * 0.000015);

      } catch (err: any) {
        addLog("GEMINI_VISION", "error", `API handshake failed: ${err.message}`);
        setStepText("Handshake failed.");
      } finally {
        setIsRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }

    // ==========================================
    // ENGINE 3: REAL SERVER-SIDE YOLOe SEGMENTATION
    // ==========================================
    else {
      addLog("YOLOe", "info", `Isolating target object: "${targetObject}"...`);
      addLog("YOLOe", "process", "Spawning backend ultralytics yoloe-11s-seg.pt python runtime...");

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("engine", "yolo");
        formData.append("targetObject", targetObject); // Named object to detect

        const response = await axios.post("/api/vision/process", formData);

        if (!response.data || !response.data.success) {
          throw new Error(response.data?.error || "YOLOe segmentation failed");
        }

        const data = response.data;
        const list = data.detections || [];
        const diagnostics = data.diagnostics || [];

        // Stream python telemetry diagnostic logs
        diagnostics.forEach((diag: string) => {
          addLog("YOLOe", "process", diag);
        });
        
        addLog("YOLOe", "success", `YOLOe Segmentation complete. Found ${list.length} matching shapes.`);
        setDetections(list);
        setStepText(`YOLOe complete. Detected ${list.length} segmented semantic shapes.`);
        setActiveWorkspaceTab("image");

        if (list.length > 0) {
          // Highlight first object
          setSelectedDetection(list[0]);
          setActiveConsoleTab("details");
          
          // Synthesize fake text represent to make it feel like layout OCR
          const fakeText = list.map((det: any, i: number) => `[Shape #${i+1}: ${det.class.toUpperCase()} - Conf: ${(det.confidence*100).toFixed(0)}%]\nBounding Box: ${JSON.stringify(det.box)}`).join("\n\n");
          setRawText(fakeText);
        }

      } catch (err: any) {
        addLog("YOLOe", "error", `Server compilation failed: ${err.message}`);
        setStepText("YOLOe execution failed.");
      } finally {
        setIsRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }

    // Increment Usage Count safely (Rule 8)
    setUsageCount((prev) => {
      const newCount = prev + 1;
      if (typeof window !== "undefined") {
        localStorage.setItem(getDailyUsageKey(), newCount.toString());
      }
      return newCount;
    });
  };

  const engineIsGemini = () => engine === "gemini";

  // AI Post-Processing Trigger
  const triggerAiPostProcess = async () => {
    if (!rawText) {
      alert("Please run the OCR extraction step first to gather raw text.");
      return;
    }

    setIsPostProcessing(true);
    setAiOutput("🧠 Restructuring extracted text via Gemini post-processor... Awaiting tokens.");
    addLog("POST_PROCESS", "info", "Sending OCR string coordinates to Gemini-3.1...");

    try {
      const response = await axios.post("/api/vision/ai-post-process", {
        text: rawText,
        prompt: customPrompt,
        temperature
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "AI post-processing failed");
      }

      const outText = response.data.text;
      addLog("POST_PROCESS", "success", "Structured text received successfully.");
      setAiOutput(outText);
      setActiveWorkspaceTab("ai");

    } catch (err: any) {
      addLog("POST_PROCESS", "error", `Post-processing failed: ${err.message}`);
      setAiOutput(`❌ Failed to process: ${err.message}`);
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
            {/* Elegant Minimalist Day/Night Icon Button */}
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
            <Link href="/audio" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors mr-1">🎙️ Audio Sandbox</Link>
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
              href="/audio" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-amber-500 hover:text-amber-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]"
            >
              🎙️ Audio Sandbox
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
              👁️ AI Computer Vision & Multimodal Sandbox
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Synapse Multi-Engine Vision Sandbox
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans mt-1 font-medium">
              Experience dynamic computer vision and document intelligence pipelines. Upload an image, choose between client-side Tesseract.js, Vision LLM (Multimodal Q&A), or server-side YOLOe Instance Segmentations to map exact shapes, and write custom prompts to restructure the results.
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
              ⚙️ Vision Configuration Center
            </h2>
            <p className="text-[10px] text-black dark:text-zinc-400 font-mono leading-relaxed mt-0.5 font-semibold">
              Select your extraction engine, upload images, and control AI parameters.
            </p>
          </div>

          {/* Drag & Drop File Upload Zone */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
              1. Upload Document Image
            </label>
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-white/[0.08] hover:border-cyan-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-white/[0.01] hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]"
            >
              <input 
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold line-clamp-1">{selectedFile.name}</span>
                  <span className="text-[8px] text-zinc-500">{(selectedFile.size / 1024).toFixed(0)} KB (Click to swap)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl text-zinc-400">📥</span>
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Drag & Drop image here</span>
                  <span className="text-[9px] text-zinc-400">or click to browse filesystem (Max 2MB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Extraction Engine Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
              2. Select Extraction Engine
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["tesseract", "gemini", "yolo"] as const).map((key) => {
                const active = engine === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setEngine(key); resetWorkspace(); }}
                    disabled={isExecuting}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      active 
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                        : "bg-zinc-50 dark:bg-white/[0.01] border-zinc-200 dark:border-white/[0.04] text-black dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.1] font-semibold"
                    }`}
                  >
                    <span className="text-lg mb-0.5">
                      {key === "tesseract" ? "🌐" : key === "gemini" ? "🧠" : "🚀"}
                    </span>
                    <span className="text-[8px] font-mono leading-tight uppercase font-bold tracking-wider">
                      {key === "tesseract" ? "Local" : key === "gemini" ? "Vision LLM" : "YOLOe"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Engine Explanation Box */}
          <div className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/[0.04] text-[10px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-black dark:text-white font-mono uppercase tracking-wider mb-1">
              <span>{engine === "tesseract" ? "🌐" : engine === "gemini" ? "🧠" : "🚀"}</span>
              <span>{engine === "tesseract" ? "Tesseract.js (Local Client-Bound)" : engine === "gemini" ? "Vision LLM (Paid Multimodal Q&A)" : "YOLOe Segmentation (Server)"}</span>
            </div>
            <p className="text-black dark:text-zinc-400 font-sans font-semibold">
              {engine === "tesseract" && "Parses layout text entirely locally in the browser's thread. No data leaves your machine, ensuring complete privacy compliance."}
              {engine === "gemini" && "Answers custom questions about images or provides detailed descriptions using a paid, multimodal Vision LLM (Gemini)."}
              {engine === "yolo" && "Spawns a Python Ultralytics instance on the server to run YOLOe Segmentations, isolating and highlighting your named target object. Note: Server-side CPU inference may take 3-5 seconds, so please be patient during execution."}
            </p>
          </div>

          {/* Dynamic Engine Inputs */}
          {engine === "yolo" && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
                🏷️ Target Object to Detect
              </label>
              <input
                type="text"
                value={targetObject}
                onChange={(e) => setTargetObject(e.target.value)}
                disabled={isExecuting}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-zinc-300 dark:border-white/[0.06] text-xs text-black dark:text-zinc-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 font-bold"
                placeholder="e.g. laptop, cell phone, cup, or 'all'"
              />
              <span className="text-[8px] text-zinc-500 dark:text-zinc-400 leading-none">
                Type any COCO class to isolate highlights (or 'all' for everything)
              </span>
              <span className="text-[8px] text-orange-500 dark:text-orange-400 leading-tight font-bold mt-1 block">
                ⚠️ CPU Inference executes on server. Execution requires 10-30s. Please be patient.
              </span>
            </div>
          )}

          {engine === "gemini" && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
                ❓ Ask a Question / Direct the AI
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                disabled={isExecuting}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-zinc-300 dark:border-white/[0.06] text-xs text-black dark:text-zinc-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 font-bold"
                placeholder="Ask anything about the image (e.g. 'Describe this image' or 'List any text present')..."
              />
              <span className="text-[8px] text-zinc-500 dark:text-zinc-400 leading-none">
                Type your custom question or processing instructions for the Multimodal Vision LLM
              </span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={runOcrPipeline}
            disabled={isExecuting || !selectedFile}
            className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white! font-extrabold text-sm shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Image...
              </>
            ) : (
              <>
                <span>⚡</span> Run Vision Pipeline
              </>
            )}
          </button>

          {/* AI Post-Processing Panel (Only for Non-Gemini engines once text is extracted) */}
          {rawText && engine !== "gemini" && (
            <div className="border-t border-zinc-200 dark:border-white/[0.05] pt-4 flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
                  3. Select AI Post-Processing Preset
                </label>
                <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                  {POST_PROCESS_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setCustomPrompt(preset.prompt)}
                      className={`p-1.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        customPrompt === preset.prompt
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-bold"
                          : "bg-zinc-50 dark:bg-white/[0.01] border-zinc-200 dark:border-white/[0.03] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable custom instructions Prompt */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
                  4. Customize AI Prompt Instructions
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  disabled={isPostProcessing}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/[0.06] text-xs text-black dark:text-zinc-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 leading-relaxed resize-none font-bold"
                  placeholder="Ask Gemini to translate, format, or analyze the text..."
                />
              </div>

              {/* Slider & Run post-process button */}
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
                  onClick={triggerAiPostProcess}
                  disabled={isPostProcessing}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600"
                >
                  {isPostProcessing ? "Processing..." : "✨ Restructure"}
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
                  {engine === "tesseract" ? "Client-Bound Web Worker Loop" : engine === "gemini" ? "Paid Multimodal REST Pipeline" : "Server-Side YOLOe Segmenter"}
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
                  🖼️
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground">File Ingest</span>
              </div>

              {/* Node 2: Selected Engine */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  isExecuting ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105" : rawText ? "border-cyan-500/40 bg-black/40" : "border-white/8 bg-neutral-900/75"
                }`}>
                  {engine === "tesseract" ? "🌐" : engine === "gemini" ? "🧠" : "🚀"}
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground uppercase font-mono text-[9px]">
                  {engine === "tesseract" ? "Tesseract Local" : engine === "gemini" ? "Vision LLM" : "YOLOe Core"}
                </span>
              </div>

              {/* Node 3: Flow Step 3 */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  isPostProcessing ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : rawText ? "border-cyan-500/40 bg-black/40" : "border-white/8 bg-neutral-900/75"
                }`}>
                  {engine === "tesseract" ? "📝" : engine === "gemini" ? "❓" : "🔍"}
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground">
                  {engine === "tesseract" ? "Extracted Text" : engine === "gemini" ? "Ask About Image" : "Object Detection"}
                </span>
              </div>

              {/* Node 4: Flow Step 4 */}
              <div className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${
                  aiOutput ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105" : "border-white/8 bg-neutral-900/75"
                }`}>
                  {engine === "tesseract" ? "✨" : engine === "gemini" ? "💬" : "🎭"}
                </div>
                <span className="text-[10px] mt-2 font-bold text-muted-foreground">
                  {engine === "tesseract" ? "Structured Output" : engine === "gemini" ? "GenAI Response" : "Segmented Masks"}
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
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Shapes Found</span>
                <span className="text-cyan-400 font-bold mt-0.5">{detections.length} masks</span>
              </div>
            </div>

          </div>

          {/* Interactive Document Workspace / Code Splittings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Side: Document Image and Mask Painter */}
            <div className="lg:col-span-7 flex flex-col h-[420px] rounded-2xl border border-white/[0.06] bg-[#07070a]/95 relative overflow-hidden sh-dark-card">
              
              <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">🖼️ Interactive Segmenter Canvas</span>
                {detections.length > 0 && (
                  <span className="text-[9px] font-mono text-cyan-400 animate-pulse uppercase">Hover shapes for details</span>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-[#020203] relative select-none">
                {imageUrl ? (
                  <div className="relative max-h-[340px] max-w-full flex items-center justify-center">
                    <img 
                      ref={imageRef}
                      src={imageUrl}
                      alt="Uploaded OCR Document"
                      className="max-h-[340px] max-w-full object-contain rounded-lg block"
                      onLoad={() => {
                        setImageLoaded(true);
                        // Trigger canvas redraw once image is fully loaded inside the layout
                        setTimeout(drawYoloDetections, 100);
                      }}
                    />
                    {/* Semantic Canvas Layer overlayed precisely on top of displaying document */}
                    <canvas 
                      ref={canvasRef}
                      className="absolute pointer-events-auto cursor-crosshair"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-600 gap-3 font-sans">
                    <span className="text-4xl">🖼️</span>
                    <span className="text-xs font-bold text-zinc-400">Translucent Canvas Idle</span>
                    <p className="text-[10px] max-w-xs">Upload an image and run YOLOe to paint precise semantic segmentation polygon masks directly here.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Side: Text & AI Restructured Panels */}
            <div className="lg:col-span-5 flex flex-col h-[420px] rounded-2xl border border-white/[0.06] bg-[#07070a]/90 relative overflow-hidden sh-dark-card">
              
              {/* Workspace Tab Header */}
              <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveWorkspaceTab("image")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      activeWorkspaceTab === "image" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-muted-foreground"
                    }`}
                  >
                    Workspace
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("text")}
                    disabled={!rawText}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      activeWorkspaceTab === "text" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-muted-foreground"
                    }`}
                  >
                    Raw Text
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("ai")}
                    disabled={!aiOutput}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      activeWorkspaceTab === "ai" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-muted-foreground"
                    }`}
                  >
                    AI Output
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Interactive View</span>
                </div>
              </div>

              {/* Active Screen Tab Area */}
              <div className="flex-1 p-4 bg-black/80 font-mono text-[10px] leading-relaxed overflow-y-auto no-scrollbar">
                
                {activeWorkspaceTab === "image" && (
                  <div className="h-full">
                    {detections.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <span className="text-[9px] uppercase font-bold text-cyan-400 font-mono border-b border-white/[0.05] pb-1 block">Semantic Mask Objects ({detections.length})</span>
                        <div className="flex flex-col gap-2">
                          {detections.map((det, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedDetection(det);
                                setActiveConsoleTab("details");
                              }}
                              className={`p-2 rounded-xl text-left border flex items-center justify-between cursor-pointer transition-all ${
                                selectedDetection === det 
                                  ? "bg-cyan-500/10 border-cyan-500 text-cyan-300" 
                                  : "bg-white/[0.01] border-white/[0.04] text-zinc-400 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">🏷️</span>
                                <span className="font-bold">{det.class.toUpperCase()}</span>
                              </div>
                              <span className="text-[9px] font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">
                                {(det.confidence * 100).toFixed(0)}% Match
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 font-sans p-4">
                        <span className="text-3xl mb-1">📊</span>
                        <h6 className="text-[11px] font-bold text-zinc-400 font-mono uppercase">Interactive Object Details</h6>
                        <p className="text-[9px] mt-0.5">Segmented shapes, confidence maps, and class predictions are populated here.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeWorkspaceTab === "text" && (
                  <div className="h-full">
                    <pre className="text-muted-foreground whitespace-pre-wrap leading-normal font-mono text-[10px]">
                      <code>{rawText}</code>
                    </pre>
                  </div>
                )}

                {activeWorkspaceTab === "ai" && (
                  <div className="h-full animate-fade-in">
                    <pre className="text-emerald-400 whitespace-pre-wrap leading-normal font-mono text-[10px]">
                      <code>{aiOutput}</code>
                    </pre>
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* Diagnostic Console Logger */}
          <div className="lg:col-span-12 flex flex-col h-[180px] rounded-2xl border border-white/[0.06] bg-[#07070a]/90 relative overflow-hidden sh-dark-card">
            
            {/* Terminal Tab Headers */}
            <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveConsoleTab("terminal")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    activeConsoleTab === "terminal" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-muted-foreground"
                  }`}
                >
                  Diagnostic Console
                </button>
                <button
                  onClick={() => setActiveConsoleTab("details")}
                  disabled={!selectedDetection}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeConsoleTab === "details" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-muted-foreground"
                  }`}
                >
                  Active Node Inspector {selectedDetection && `(${selectedDetection.class})`}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Live Output Trace</span>
              </div>
            </div>

            {/* Terminal Screen display */}
            <div className="flex-1 p-4 bg-black/80 font-mono text-[10px] leading-relaxed overflow-y-auto" ref={logsRef}>
              
              {activeConsoleTab === "terminal" ? (
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
              ) : (
                <div className="h-full">
                  {selectedDetection ? (
                    <div className="flex flex-col gap-2 text-cyan-400 text-[10px]">
                      <div><span className="text-zinc-500">Object Type:</span> <span className="font-bold text-white uppercase">{selectedDetection.class}</span></div>
                      <div><span className="text-zinc-500">Confidence Score:</span> <span className="font-bold text-white">{(selectedDetection.confidence * 100).toFixed(2)}% Match</span></div>
                      <div><span className="text-zinc-500">Bounding Box XYXY:</span> <span className="font-mono text-white text-[9px]">{JSON.stringify(selectedDetection.box)}</span></div>
                      {selectedDetection.polygon && (
                        <div>
                          <span className="text-zinc-500">Semantic Polygon Coordinates ({selectedDetection.polygon.length} points):</span>
                          <div className="max-h-[50px] overflow-y-auto no-scrollbar font-mono text-white text-[8px] mt-1 bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.05] whitespace-pre-wrap">
                            {JSON.stringify(selectedDetection.polygon)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 font-sans p-4">
                      <span className="text-2xl mb-1">🛠️</span>
                      <h6 className="text-[11px] font-bold text-zinc-400">No Object Selected</h6>
                      <p className="text-[9px] mt-0.5">Click any segmented shape on the image canvas or sidebar list to inspect its vector metadata.</p>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

        </section>

      </main>

      {/* ==========================================
          INFO FEATURES BANNER
          ========================================== */}
      <div className="sh-dark-card mt-6 p-8 rounded-2xl bg-zinc-950 border border-white/[0.04] grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto xl:col-span-12">
        <div className="flex flex-col gap-2.5">
          <span className="text-2xl">🌐</span>
          <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Client-Bound Tesseract</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Browser-native parsing executing entirely inside your local V8 browser thread. Perfect data confidentiality.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-2xl">🧠</span>
          <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Paid Vision-LLM APIs</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Multimodal analysis utilizing standard paid tier Vision LLM (Gemini) engines, parsing tables and complex hand-written layouts effortlessly.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-2xl">🚀</span>
          <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Real YOLOe Seg Models</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Spawns a real Python Ultralytics engine on the server to execute 'yoloe-11s-seg.pt' model, returning precise shape polygons and masks.
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
            <span className="font-extrabold tracking-tight text-zinc-950 dark:text-white text-base">Osama Alam</span>
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
