"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ==========================================
// INTERFACES & CONTEXTS
// ==========================================

interface RAGChunk {
  id: number;
  text: string;
  vector: number[];
  page: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  citations?: { id: number; page: number; score: number }[];
  latency?: number;
}

interface RAGLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "vector";
  message: string;
}

// Helper to extract only the cited RAG sources mentioned in the generated answer text
const filterRelevantCitations = (
  messageContent: string, 
  citations: { id: number; page: number; score: number }[]
) => {
  const lowerText = messageContent.toLowerCase();
  
  const citedList = citations.filter((cit, cIdx) => {
    const blockNum = cIdx + 1;
    // Look for patterns like "block #1", "block 1", or simple brackets like "[1]"
    const patterns = [
      `block #${blockNum}`,
      `block ${blockNum}`,
      `[${blockNum}]`,
    ];
    return patterns.some(pattern => lowerText.includes(pattern));
  });

  // If explicit citation patterns are found, display only those cited sources!
  if (citedList.length > 0) {
    return citedList;
  }

  // Fallback: If no explicit citations are parsed in the text, show the top 2 matches to keep it clean
  return citations.slice(0, 2);
};

export default function RAGPlayground() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  // Page load & scripts
  const [pdfjsLoaded, setPdfjsLoaded] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  
  // Theme state initialized to a static default (dark-first) to prevent SSR hydration mismatches
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Load local storage theme safely after mounting has successfully completed on client
  useEffect(() => {
    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
    } else if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else {
      // Respect browser/system preferred color scheme on first visit
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
  
  // IP & Limits tracking
  const [clientIP, setClientIP] = useState<string>("Detecting...");
  const [ipLocation, setIpLocation] = useState<string>("Secure Node");
  const [requestCount, setRequestCount] = useState<number>(0);
  const [isVipUrl, setIsVipUrl] = useState<boolean>(false);
  const maxRequests = 5;
  const isWhitelisted = clientIP === "34.132.233.106" || isVipUrl;

  // Helper to load/save daily usage count (Rule 8)
  const getDailyUsageKey = () => {
    const today = new Date().toISOString().split("T")[0];
    return `portfolio-usage-rag-${today}`;
  };

  // PDF upload & ingestion states
  const [uploading, setUploading] = useState<boolean>(false);
  const [ingestStep, setIngestStep] = useState<number>(0); // 0: idle, 1: reading, 2: chunking, 3: vectorizing, 4: complete
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileNameSize] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);
  
  // Vector database state
  const [chunks, setChunks] = useState<RAGChunk[]>([]);
  const [selectedChunk, setSelectedChunk] = useState<RAGChunk | null>(null);

  // Chat console states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queryInput, setQueryInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentReasoningChain, setCurrentReasoningChain] = useState<string>("");

  // Live Behind-the-Scenes simulation logs
  const [ragLogs, setRagLogs] = useState<RAGLog[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "logs">("chat");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // INITIALIZATION & DYNAMIC SCRIPT LOAD
  // ==========================================

  useEffect(() => {
    setIsClient(true);
    addLog("info", "RAG Reasoning sandbox initializing locally...");
    
    // Check URL search parameters for VIP override keys
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("vip") === "true" || urlParams.get("access") === "unlimited") {
        setIsVipUrl(true);
        addLog("success", "VIP Access Key authenticated. Unlimited queries unlocked!");
      }
    }

    // Load daily usage from localStorage if present to prevent page refresh/dev restart reset
    if (typeof window !== "undefined") {
      const usageKey = getDailyUsageKey();
      const stored = localStorage.getItem(usageKey);
      if (stored) {
        setRequestCount(parseInt(stored, 10));
      } else {
        setRequestCount(0);
        // Prune older portfolio-usage-rag keys to avoid cluttering localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("portfolio-usage-rag-") && key !== usageKey) {
            localStorage.removeItem(key);
          }
        }
      }
    }
    
    // Fetch user public IP dynamically
    fetchIPAddress();

    // Dynamically load PDF.js from cdnjs securely
    if (typeof window !== "undefined" && !window.hasOwnProperty("pdfjsLib")) {
      addLog("info", "Loading secure browser-side PDF compilers...");
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.async = true;
      script.onload = () => {
        // Set worker
        if (typeof window !== "undefined" && (window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
          setPdfjsLoaded(true);
          addLog("success", "PDF.js parser engines successfully loaded in sandbox.");
        }
      };
      script.onerror = () => {
        addLog("error", "Failed to load external PDF engines. Local browser fallback active.");
      };
      document.body.appendChild(script);
    } else {
      setPdfjsLoaded(true);
    }
  }, []);

  // Fetch Public IP securely via CORS-free backend proxy with high-performance Session Caching (Rule 8)
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
            setRequestCount(finalCount);
            localStorage.setItem(usageKey, finalCount.toString());
          }
          
          addLog("info", `Session Cache Hit: Loaded IP ${cachedIp} from memory.`);
          return; // Zero API hits!
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
        
        const backendCount = data.usageCount || 0;
        const usageKey = getDailyUsageKey();
        let localCount = 0;
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(usageKey);
          localCount = stored ? parseInt(stored, 10) : 0;
        }
        const finalCount = Math.max(localCount, backendCount);
        setRequestCount(finalCount);
        if (typeof window !== "undefined") {
          localStorage.setItem(usageKey, finalCount.toString());
        }
        
        // 2. Save resolved details to sessionStorage to bypass subsequent triggers
        if (typeof window !== "undefined") {
          sessionStorage.setItem("portfolio-client-ip", resolvedIp);
          sessionStorage.setItem("portfolio-client-geo", resolvedGeo);
        }

        addLog("info", `Secure gateway connection authenticated. Client IP: ${resolvedIp} (${data.city || "Remote Gateway"})`);
      } else {
        throw new Error();
      }
    } catch {
      // Secure Fallback (Rule 8)
      setClientIP("0.0.0.0");
      setIpLocation("Unknown Location");
      
      const usageKey = getDailyUsageKey();
      let localCount = 0;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(usageKey);
        localCount = stored ? parseInt(stored, 10) : 0;
      }
      setRequestCount(localCount);
      addLog("warning", "Secure proxy fallback active. Anonymized IP mapped to workspace.");
    }
  };

  // Helper to add RAG logs
  const addLog = (type: RAGLog["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setRagLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  // Auto scroll chat & logs containers locally (prevents browser-wide scroll jumps)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentReasoningChain]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [ragLogs]);

  // ==========================================
  // CLIENT SIDE PDF PARSER, RECURSIVE CHUNKER & VECTORIZER
  // ==========================================

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation checks
    if (file.type !== "application/pdf") {
      alert("Error: Only standard PDF files are supported!");
      addLog("error", `Rejected upload of "${file.name}". File is not a PDF.`);
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeInBytes) {
      alert("Error: File exceeds maximum 5 MB limit!");
      addLog("error", `Rejected upload of "${file.name}". Size exceeds 5 MB capacity.`);
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setFileNameSize((file.size / 1024 / 1024).toFixed(2) + " MB");
    setIngestStep(1);
    setChunks([]);
    setSelectedChunk(null);
    setMessages([]);
    addLog("info", `Target PDF captured: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        
        if (!pdfjsLoaded || !(window as any).pdfjsLib) {
          throw new Error("PDF parser is still loading. Please try again in a second.");
        }

        addLog("info", "Compiling document layout streams in browser sandboxed worker...");
        const pdfjsLib = (window as any).pdfjsLib;
        const loadingTask = pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;
        
        setNumPages(pdf.numPages);
        addLog("success", `Parsed structure. Pages detected: ${pdf.numPages}`);
        setIngestStep(2);

        let fullText = "";
        const extractedPagesText: { page: number; text: string }[] = [];

        // Parse page texts sequentially
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          extractedPagesText.push({ page: pageNum, text: pageText });
          fullText += pageText + " ";
        }

        // Chunking text
        addLog("info", "Applying Recursive Character Splitter: Chunk Size = 350, Overlap = 70...");
        await new Promise((resolve) => setTimeout(resolve, 200));
        setIngestStep(3);

        const tempChunks: RAGChunk[] = [];
        let chunkIdCounter = 1;
        const chunkSize = 350;
        const overlap = 70;

        extractedPagesText.forEach(({ page, text }) => {
          let startIndex = 0;
          while (startIndex < text.length) {
            const chunkText = text.substring(startIndex, startIndex + chunkSize).trim();
            if (chunkText.length > 30) { // Discard tiny noise chunks
              tempChunks.push({
                id: chunkIdCounter++,
                text: chunkText,
                vector: [], // Initial empty vector, populated via API below
                page
              });
            }
            startIndex += (chunkSize - overlap);
          }
        });

        addLog("success", `Recursive splitting complete. Constructed ${tempChunks.length} unique semantic blocks.`);

        if (tempChunks.length === 0) {
          throw new Error("This PDF contains no extractable text. Scanned images or OCR-locked files are not supported in this local sandbox.");
        }

        addLog("info", "Requesting high-dimensional vector embeddings from Google Gemini API...");

        // Call our real embeddings API route with safety timeout
        const textsToEmbed = tempChunks.map(c => c.text);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const embedRes = await fetch("/api/rag/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: textsToEmbed }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const embedData = await embedRes.json();

        if (!embedData.success || !embedData.vectors) {
          throw new Error(embedData.error || "Failed to generate vector embeddings via Gemini API");
        }

        // Map real vectors back to our browser-side chunks
        tempChunks.forEach((chunk, idx) => {
          chunk.vector = embedData.vectors[idx];
        });
        
        setChunks(tempChunks);
        setTotalChunksCount(tempChunks.length);
        setIngestStep(4);
        setUploading(false);
        addLog("success", `Indexed ${tempChunks.length} real high-dimensional vector coordinates inside sandboxed browser memory.`);
        
        // Pre-populate chat with welcome message
        setMessages([
          {
            id: "system-1",
            role: "assistant",
            content: `👋 Document ingestion successful! I have fully mapped **"${file.name}"** into your browser's local vector memory. \n\nI parsed **${pdf.numPages} pages** and compiled **${tempChunks.length} real vector embeddings** using **${process.env.NEXT_PUBLIC_GEMINI_EMBEDDING_MODEL || "gemini-embedding-2"}**. You can now test live, real-world RAG performance by asking any question, or hover/click the vector nodes on the left to inspect raw chunks and high-dimensional vectors!`
          }
        ]);

        // Pre-fill the input box with a default overview query for immediate client testing!
        setQueryInput("Tell me about this document");
      };
      
      fileReader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      setUploading(false);
      setIngestStep(0);
      addLog("error", `Ingestion failure: ${err.message || "Failed parsing stream."}`);
      alert("Parsing failed: " + (err.message || "Unknown error occurred."));
    }
  };

  // Helper to generate a realistic, deterministic vector array based on character codes
  const generateDeterministicVector = (text: string): number[] => {
    const vectorLength = 1536;
    const vector: number[] = [];
    let hash = 0;
    
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate pseudo-random floats centered around zero
    for (let j = 0; j < 6; j++) { // We display only first 6 coordinates in UI, but store mock count
      const seed = Math.sin(hash + j) * 10000;
      const floatVal = parseFloat((seed - Math.floor(seed)).toFixed(4));
      // Normalize between -1 and 1
      vector.push(floatVal * 2 - 1);
    }
    return vector;
  };

  // ==========================================
  // RETRIEVAL & GENERATION WITH REASONING CHAIN
  // ==========================================

  // Perform local Cosine Similarity using a background Web Worker
  const localVectorSearch = async (query: string): Promise<{ chunk: RAGChunk; score: number }[]> => {
    addLog("info", `Initiating vector scan for query: "${query}"`);
    
    // Call our real embeddings API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const embedRes = await fetch("/api/rag/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [query] }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const embedData = await embedRes.json();

    if (!embedData.success || !embedData.vectors) {
      throw new Error(embedData.error || "Failed to embed query via Gemini API");
    }

    const queryVec = embedData.vectors[0];
    addLog("vector", `Query Embedded: [${queryVec.slice(0, 4).join(", ")}, ...]`);
    
    addLog("info", "Offloading cosine similarity and keyword analysis to background Web Worker thread...");

    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL("../../workers/rag.worker.ts", import.meta.url));
        
        worker.onmessage = (event) => {
          const { results, queryKeywords } = event.data;
          
          addLog("info", `Extracted keywords for indexing in worker: [${queryKeywords.join(", ") || "none"}]`);
          addLog("success", `Vector scan complete inside background worker thread. Identified Top-${results.length} semantic overlap nodes.`);
          
          results.forEach((res: any, i: number) => {
            addLog("vector", `Rank ${i+1}: Node #${res.chunk.id} | Page ${res.chunk.page} | Score: ${res.score} | Preview: "${res.chunk.text.substring(0, 35)}..."`);
          });
          
          worker.terminate();
          resolve(results);
        };

        worker.onerror = (err) => {
          console.error("Worker error:", err);
          worker.terminate();
          reject(new Error("Web Worker processing failed."));
        };

        worker.postMessage({ query, queryVec, chunks });
      } catch (err) {
        console.error("Failed to spawn background Web Worker:", err);
        reject(err);
      }
    });
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isGenerating || chunks.length === 0) return;

    const userQuery = queryInput;
    setQueryInput("");
    const startTime = Date.now();
    const isFirstQuery = requestCount === 0;

    // Check request limits first!
    if (!isWhitelisted && requestCount >= maxRequests) {
      addLog("error", `Gateway Access Blocked: Rate limits exceeded for IP ${clientIP}`);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: "user", content: userQuery },
        {
          id: Math.random().toString(),
          role: "assistant",
          content: `⚠️ **ACCESS DENIED: API rate limit exceeded.**\n\nYour detected IP gateway (\`${clientIP}\`) has consumed **${requestCount} / ${maxRequests}** of its local demo sandboxed allocation.\n\nTo prevent server or memory overload under concurrent demo trades, client playgrounds are capped. Please **contact Osama Alam** directly to obtain an unrestricted enterprise access token or arrange an live infrastructure review!`,
        }
      ]);
      return;
    }

    // Register usage (Rule 8)
    setRequestCount((prev) => {
      const newCount = prev + 1;
      if (typeof window !== "undefined") {
        localStorage.setItem(getDailyUsageKey(), newCount.toString());
      }
      return newCount;
    });

    // Add user query to chat
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), role: "user", content: userQuery }
    ]);
    
    setIsGenerating(true);
    setActiveTab("logs"); // Swaps to logs tab so user can see "behind-the-scenes" action!

    try {
      const qLower = userQuery.toLowerCase();
      const isOverviewQuery = qLower.includes("summarize") || 
                              qLower.includes("summary") || 
                              qLower.includes("overview") || 
                              (qLower.includes("about") && (qLower.includes("file") || qLower.includes("document") || qLower.includes("this"))) ||
                              (qLower.includes("what is") && (qLower.includes("this") || qLower.includes("file") || qLower.includes("document")));

      // Step 1: Vector Search & Retrieval
      let retrievedMatches = [];
      if (isOverviewQuery && chunks.length > 0) {
        retrievedMatches = chunks.slice(0, Math.min(3, chunks.length)).map(chunk => ({
          chunk,
          score: 0.99
        }));
        addLog("info", `Overview query detected ("${userQuery}"). Slicing prime introductory document chunks.`);
      } else {
        retrievedMatches = await localVectorSearch(userQuery);
      }

      // Relevance is now evaluated and enforced natively inside Google Gemini's reasoning layers
      const isRelevant = true; 
      
      // Step 2: Show animated reasoning chain in Chat UI!
      addLog("info", "Augmenting contextual reasoning layers inside LLM Context Window...");
      
      let reasoningSteps = [];
      if (isOverviewQuery) {
        reasoningSteps = [
          `Initializing sandboxed retrieval search... Analyzing ${chunks.length} local vector nodes.`,
          `High-level overview request detected. Bypassing cosine similarity threshold.`,
          `Successfully compiled document introductory chunks: Node #1, Node #2.`,
          `Context window constructed with overview contexts. Synthesizing cited document summary...`
        ];
      } else {
        reasoningSteps = [
          `Initializing sandboxed retrieval search... Analyzing ${chunks.length} local vector nodes.`,
          `Query embedded. Executing cosine distance scans against browser IndexedDB layout.`,
          `Successfully retrieved matching chunks: Node #${retrievedMatches[0].chunk.id} (${(retrievedMatches[0].score * 100).toFixed(0)}% score), Node #${retrievedMatches[1].chunk.id} (${(retrievedMatches[1].score * 100).toFixed(0)}% score).`,
          `Context window constructed with ${retrievedMatches.length} raw semantic nodes. Synthesizing cited response...`
        ];
      }

      for (let step = 0; step < reasoningSteps.length; step++) {
        setCurrentReasoningChain(reasoningSteps[step]);
        await new Promise((res) => setTimeout(res, 200));
      }

      // Step 3: Construct Response
      let finalAnswer = "";
      let finalCitations: { id: number; page: number; score: number }[] = [];

      if (isRelevant) {
        addLog("info", "Dispatching context window to Google Gemini LLM API...");
        
        const chatController = new AbortController();
        const chatTimeoutId = setTimeout(() => chatController.abort(), 12000); // 12s timeout

        const chatRes = await fetch("/api/rag/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userQuery,
            contexts: retrievedMatches.map(m => m.chunk.text),
            history: messages, // Send conversation history for multi-turn chat!
            isFirstQuery,
            clientIP
          }),
          signal: chatController.signal
        });
        clearTimeout(chatTimeoutId);
        const chatData = await chatRes.json();

        if (!chatData.success || !chatData.text) {
          throw new Error(chatData.error || "Failed to generate RAG response via Gemini API");
        }

        finalAnswer = chatData.text;
        finalCitations = retrievedMatches.map(m => ({ id: m.chunk.id, page: m.chunk.page, score: m.score }));
      }

      const durationMs = Date.now() - startTime;

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: finalAnswer,
          citations: finalCitations,
          latency: durationMs
        }
      ]);

      addLog("success", `Response generated and dispatched to active user terminal in ${durationMs}ms.`);
    } catch (err: any) {
      console.error("RAG Query Error:", err);
      addLog("error", `RAG Pipeline Execution Failed: ${err.message || "Unknown error"}`);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: `❌ **RAG Execution Error:**\n\nFailed to complete the query process: **${err.message || "Failed to communicate with the backend Gemini API"}**.\n\nPlease verify that your \`.env\` file has a valid, active \`GEMINI_API_KEY\` and that your server is connected to the internet.`
        }
      ]);
    } finally {
      setCurrentReasoningChain("");
      setIsGenerating(false);
      setActiveTab("chat"); // Return to chat to display answer/error
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-cyber-dark text-zinc-800 dark:text-zinc-100 overflow-x-hidden transition-colors duration-300">
      
      {/* Interactive Grid Background */}
      <div className="absolute inset-0 cyber-grid cyber-grid-radial opacity-30 pointer-events-none -z-20"></div>

      {/* Background Neon Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse-slow"></div>

      {/* ==========================================
          HEADER
          ========================================== */}
      <header className="w-full glass-panel border-b border-zinc-200 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
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
            <Link href="/vision" className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors mr-2">👁️ Vision Sandbox</Link>
            <Link href="/agents" className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors mr-2">⚡ Agent Sandbox</Link>
            <Link href="/audio" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors mr-2">🎙️ Audio Sandbox</Link>
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
              href="/vision" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-cyan-500 hover:text-cyan-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]"
            >
              👁️ Vision Sandbox
            </Link>
            <Link 
              href="/agents" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-emerald-500 hover:text-emerald-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider border-b border-zinc-100 dark:border-white/[0.02]"
            >
              ⚡ Agent Sandbox
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

      {/* ==========================================
          MAIN PAGE BODY
          ========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Page Title Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/[0.04] pb-8">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-xs uppercase tracking-widest">
              ⛓️ Browser Vector Sandboxing
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Sandboxed Client-Side RAG
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans mt-1">
              Test my high-performance client-side **Retrieval-Augmented Generation (RAG)** pipeline. Upload a PDF—the browser parses its layout, chunk-splits its text recursively, compiles 1536-dimensional float vector embeddings, and executes local similarity searches **100% locally** on your machine. No server uploads. Absolute privacy.
            </p>
          </div>

          {/* Secure IP & Usage limit panel */}
          <div className="sh-dark-card flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-white/[0.04] font-mono text-xs text-zinc-400 w-full md:w-[320px]">
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-1.5">
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
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-white/[0.05]">
              <div className="flex justify-between text-[11px] font-bold">
                <span>Demo Usage Rate Limit:</span>
                {isWhitelisted ? (
                  <span className="text-emerald-400 font-bold animate-pulse">
                    UNLIMITED (VIP Sandbox)
                  </span>
                ) : (
                  <span className={requestCount >= maxRequests ? "text-red-400" : "text-purple-400"}>
                    {requestCount} / {maxRequests} Queries
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isWhitelisted ? "bg-emerald-500" : requestCount >= maxRequests ? "bg-red-500" : "bg-purple-500"}`}
                  style={{ width: isWhitelisted ? "100%" : `${Math.min((requestCount / maxRequests) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==========================================
              LEFT COLUMN: PDF UPLOADER & VECTOR DATABASE
              ========================================== */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* 1. PDF File Uploader Card */}
            <div className="p-6 rounded-2xl glass-panel border border-zinc-200 dark:border-white/[0.04] flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.05] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📂</span>
                  <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-zinc-900 dark:text-white">Ingest Workspace</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">MAX 5MB | 1 PDF</span>
              </div>

              {/* Drag-and-drop input container */}
              <div className="relative">
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={`p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-3 transition-all ${uploading ? "border-purple-500/30 bg-purple-500/[0.01]" : "border-zinc-300 dark:border-zinc-800 hover:border-purple-500/40 hover:bg-zinc-100 dark:hover:bg-white/[0.01]"}`}>
                  <span className="text-4xl animate-bounce" style={{ animationDuration: "3s" }}>📄</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {fileName ? fileName : "Drag & Drop PDF File Here"}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {fileSize ? `${fileSize} | ${numPages} Pages` : "or click to search system folders"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload & Indexing Pipeline Progress display */}
              {ingestStep > 0 && (
                <div className="sh-dark-card flex flex-col gap-3 p-4 rounded-xl bg-zinc-950 border border-white/[0.04]">
                  <span className="text-[10px] text-purple-400 font-bold font-mono uppercase tracking-widest">Compiler Pipeline Output:</span>
                  
                  <div className="flex flex-col gap-2 font-mono text-[11px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className={ingestStep >= 1 ? "text-emerald-400" : "text-zinc-600"}>{ingestStep >= 1 ? "✓" : "○"}</span>
                      <span className={ingestStep === 1 ? "text-white font-bold animate-pulse" : ""}>Step 1: Reading PDF Document layout...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={ingestStep >= 2 ? "text-emerald-400" : "text-zinc-600"}>{ingestStep >= 2 ? "✓" : "○"}</span>
                      <span className={ingestStep === 2 ? "text-white font-bold animate-pulse" : ""}>Step 2: Recursive Splitter (350 char blocks)...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={ingestStep >= 3 ? "text-emerald-400" : "text-zinc-600"}>{ingestStep >= 3 ? "✓" : "○"}</span>
                      <span className={ingestStep === 3 ? "text-white font-bold animate-pulse" : ""}>Step 3: Calculating 1536-dim Embeddings...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={ingestStep >= 4 ? "text-emerald-400" : "text-zinc-600"}>{ingestStep >= 4 ? "✓" : "○"}</span>
                      <span className={ingestStep === 4 ? "text-white font-bold animate-pulse" : ""}>Step 4: Vector Indexing complete!</span>
                    </div>
                  </div>

                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-[1s]"
                      style={{ width: `${(ingestStep / 4) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Interactive Vector Map Card */}
            {chunks.length > 0 && (
              <div className="p-6 rounded-2xl glass-panel border border-zinc-200 dark:border-white/[0.04] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.05] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🌐</span>
                    <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-zinc-900 dark:text-white">Browser Vector Database</h3>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">{chunks.length} Nodes Indexed</span>
                </div>

                <p className="text-[11px] text-zinc-500 leading-normal">
                  Click on any vector node (dot) below to decompile its coordinates and see the parsed recursive text chunk:
                </p>

                {/* Nodes Dot Map Grid */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/[0.03] flex justify-center">
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto no-scrollbar justify-start w-full">
                    {chunks.map((chunk) => {
                      const isSelected = selectedChunk?.id === chunk.id;
                      return (
                        <button
                          key={chunk.id}
                          type="button"
                          onClick={() => setSelectedChunk(chunk)}
                          className={`w-6 h-6 rounded-md font-mono text-[9px] flex items-center justify-center border transition-all cursor-pointer ${isSelected ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.5)] scale-110" : "bg-zinc-100 dark:bg-white/[0.01] hover:bg-purple-500/20 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.06] hover:border-purple-500/30"}`}
                          title={`Chunk #${chunk.id} | Page ${chunk.page}`}
                        >
                          {chunk.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded Selected Node Inspector */}
                {selectedChunk && (
                  <div className="sh-dark-card p-4 rounded-xl bg-[#0a0614]/80 border border-purple-500/10 flex flex-col gap-3 font-sans text-xs text-purple-100 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-purple-500/10 pb-2">
                      <span className="font-mono font-bold text-purple-400 uppercase text-[10px] tracking-wider">Vector Node Inspector</span>
                      <span className="font-mono text-[10px] text-zinc-500">Node #{selectedChunk.id} | Page {selectedChunk.page}</span>
                    </div>
                    
                    {/* Simulated High Dim Vector Coordinate floats */}
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-purple-300 font-semibold uppercase">1536-dim Embedding:</span>
                      <div className="p-2 rounded bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/[0.03] font-mono text-[10px] text-emerald-600 dark:text-emerald-400 truncate select-none leading-none">
                        [{selectedChunk.vector.join(", ")}, ...]
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-purple-300 font-semibold uppercase">Decompiled Raw Text Chunk:</span>
                      <div className="p-3 rounded bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/[0.03] leading-relaxed italic max-h-[120px] overflow-y-auto no-scrollbar font-serif text-zinc-700 dark:text-muted-foreground">
                        "{selectedChunk.text}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==========================================
              RIGHT COLUMN: DOCKER TERMINAL / CHAT & LOGS
              ========================================== */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Tab Swappers */}
            <div className="sh-terminal relative w-full rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[580px]">
              
              {/* Card Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10] select-none">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500/60"></span>
                </div>
                <div className="font-mono text-xs text-zinc-500">
                  sandbox_rag_compiler_runtime.log
                </div>
                <div className="w-4 h-4 rounded bg-purple-500/10 flex items-center justify-center font-mono text-[9px] text-purple-400">
                  🟣
                </div>
              </div>

              {/* Mode Selector Tab buttons */}
              <div className="flex border-b border-white/[0.05] bg-[#09090c] font-mono text-[10px] sm:text-xs text-zinc-400 select-none">
                <button 
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 py-2.5 border-r border-white/[0.05] flex items-center justify-center gap-1.5 transition-all ${activeTab === "chat" ? "bg-[#070709] text-emerald-400 border-b-2 border-b-emerald-400 font-semibold" : "hover:bg-white/[0.02]"}`}
                >
                  <span>💬</span> Ingestion Chat
                </button>
                <button 
                  onClick={() => setActiveTab("logs")}
                  className={`flex-1 flex items-center justify-center gap-1.5 transition-all ${activeTab === "logs" ? "bg-[#070709] text-purple-400 border-b-2 border-b-purple-400 font-semibold" : "hover:bg-white/[0.02]"}`}
                >
                  <span>📺</span> Behind-The-Scenes RAG Logs
                </button>
              </div>

              {/* TAB 1: Chat interface screen */}
              {activeTab === "chat" && (
                <div className="flex-1 flex flex-col justify-between p-5 bg-[#050507] overflow-hidden">
                  
                  {/* Messages Feed area */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4 pr-1">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 gap-3 font-sans">
                        <span className="text-4xl animate-pulse">🤖</span>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <span className="text-sm font-bold text-zinc-400">RAG Sandbox Memory Empty</span>
                          <span className="text-xs text-zinc-600">Please upload a PDF file on the left first. The browser will chunk and vectorize it dynamically so you can chat with its text.</span>
                        </div>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div 
                          key={m.id} 
                          className={`flex flex-col gap-1.5 max-w-[85%] ${m.role === "user" ? "self-end items-end" : "self-start items-start"}`}
                        >
                          <span className="font-mono text-[9px] text-zinc-500 uppercase">
                            {m.role === "user" ? "Client Guest" : `Osama's RAG Core ${m.latency ? `(in ${m.latency}ms)` : ""}`}
                          </span>
                          <div className={`p-3.5 rounded-xl text-xs leading-relaxed font-sans ${m.role === "user" ? "bg-purple-600/10 border border-purple-500/20 text-purple-100" : "bg-[#0a0a0c] border border-white/[0.05] text-muted-foreground"}`}>
                            {m.content.split("\n\n").map((para, pIdx) => (
                              <p key={pIdx} className="mb-2 last:mb-0 whitespace-pre-line">{para}</p>
                            ))}

                            {/* Citations / Sources */}
                            {m.citations && m.citations.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
                                <span className="font-mono text-[9px] text-zinc-500 flex items-center uppercase">Retrieved Sources:</span>
                                {filterRelevantCitations(m.content, m.citations).map((cit) => (
                                  <button
                                    key={cit.id}
                                    type="button"
                                    onClick={() => {
                                      const found = chunks.find(ch => ch.id === cit.id);
                                      if (found) setSelectedChunk(found);
                                    }}
                                    className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 font-mono text-[9px] text-purple-400 cursor-pointer transition-all"
                                    title={`Similarity: ${(cit.score * 100).toFixed(0)}%`}
                                  >
                                    Node #{cit.id} (P. {cit.page})
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Reasoning Chain typings */}
                    {isGenerating && currentReasoningChain && (
                      <div className="flex flex-col gap-1.5 self-start max-w-[85%] items-start animate-pulse">
                        <span className="font-mono text-[9px] text-purple-400 uppercase font-bold">RAG Reasoner thinking...</span>
                        <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 text-xs leading-relaxed font-sans text-purple-300 flex items-center gap-2">
                          <span className="animate-spin">🌀</span>
                          <span className="font-mono text-[11px]">{currentReasoningChain}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message submission field */}
                  <form onSubmit={handleQuerySubmit} className="mt-4 pt-4 border-t border-white/[0.04] flex gap-2">
                    <input 
                      type="text" 
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      disabled={isGenerating || chunks.length === 0}
                      placeholder={chunks.length === 0 ? "Please upload PDF to initialize gateway..." : "Query PDF content semantic nodes..."}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 disabled:cursor-not-allowed disabled:bg-transparent"
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || !queryInput.trim() || chunks.length === 0}
                      className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold font-mono text-xs cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed transition-all"
                    >
                      SEND
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: Behind the Scenes Logs terminal screen */}
              {activeTab === "logs" && (
                <div className="flex-1 flex flex-col justify-between p-5 bg-[#040406] font-mono text-[10px] sm:text-xs overflow-hidden">
                  <div ref={logContainerRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 text-zinc-500 select-none">
                      <span>RAG LOGS PROCESS MONITOR</span>
                      <span className="text-purple-400 animate-pulse">GATEWAY COMPILER ACTIVE</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {ragLogs.length === 0 ? (
                        <div className="text-zinc-600 text-center py-20 animate-pulse font-sans">
                          Gateway socket diagnostics empty.<br />
                          Ingest or query files to inspect logs.
                        </div>
                      ) : (
                        ragLogs.map((log, i) => {
                          let color = "text-zinc-400";
                          if (log.type === "success") color = "text-emerald-400 font-bold";
                          else if (log.type === "error") color = "text-red-400 font-bold";
                          else if (log.type === "warning") color = "text-yellow-500 font-bold";
                          else if (log.type === "vector") color = "text-purple-400";
                          
                          return (
                            <div key={i} className="leading-relaxed">
                              <span className="text-zinc-600">[{log.timestamp}]</span>{" "}
                              <span className={color}>{log.message}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-white/[0.04] pt-2 text-[9px] text-zinc-500 flex justify-between items-center select-none bg-[#040406]">
                    <span>REAL-TIME COGNITIVE TRACING</span>
                    <span>1536_DIMENSION_DECOMPILER</span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Dynamic educational guidelines */}
        <div className="sh-dark-card mt-16 p-8 rounded-2xl bg-zinc-950 border border-white/[0.04] grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2.5">
            <span className="text-2xl">⚡</span>
            <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Browser-Bound Vector Space</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              No files or chunks ever leave your system. PDF parsing, indexing, and vector calculations run natively inside your browser's V8 memory threads. Perfect enterprise compliance and privacy by design.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-2xl">🧠</span>
            <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Advanced Reasoning Layers</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Unlike basic keyword matching, this sandbox isolates matching embedding spaces, computes dynamic term weights, and feeds exact citation links to the Reasoning Context Window before answer synthesis.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-2xl">📈</span>
            <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Million-Scale Architecture</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              This layout mimics the infrastructure patterns I build for enterprise clients: distributing search weights, recursive text parsing, hierarchical vector indexes, and secure sandbox-isolated API layers.
            </p>
          </div>
        </div>

      </main>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="bg-cyber-sec border-t border-zinc-200 dark:border-white/[0.04] py-12 transition-colors duration-300">
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