"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import axios from "axios";

// ==========================================
// INTERFACES & SCENARIOS
// ==========================================

interface AgentStepResult {
  thought: string;
  logs: string[];
  content: string;
  toolName: string | null;
  toolOutput: string | null;
  approved: boolean;
}

interface AgentTelemetry {
  latency: number;
  tokens: number;
  cost: number;
}

interface LogLine {
  timestamp: string;
  sender: string;
  type: "info" | "success" | "warning" | "error" | "tool";
  message: string;
}

const SCENARIO_PRESETS = {
  engineering: {
    title: "Autonomous Software Engineering Pipeline",
    description: "Multi-agent loop designed to specify, write, unit-test, and security-scan modular backend code.",
    defaultPrompt: "Build a high-performance authorization endpoint with JWT verification, payload schema constraints, and mock unit tests.",
    agents: [
      { id: "architect", name: "System Architect", role: "Design Specs", emoji: "📐" },
      { id: "engineer", name: "Software Engineer", role: "Write Code", emoji: "💻" },
      { id: "qa", name: "QA Test Auditor", role: "Verify & Run Tests", emoji: "🧪" },
      { id: "secops", name: "SecOps Guardian", role: "Security Review", emoji: "🛡️" }
    ],
    files: [
      { id: "spec", name: "architecture_spec.md", language: "markdown" },
      { id: "code", name: "auth_endpoint.ts", language: "typescript" },
      { id: "tests", name: "auth.test.ts", language: "typescript" },
      { id: "security", name: "secops_report.json", language: "json" }
    ]
  },
  marketing: {
    title: "Competitor Intel & Campaign Engine",
    description: "Parallel scrapers and analysts researching competitors and generating compliance-approved digital marketing copy.",
    defaultPrompt: "Compare premium gym/fitness subscriptions in metropolitan areas, draft an email newsletter campaign, and review legal liability.",
    agents: [
      { id: "scraper", name: "Market Scraper", role: "Crawl Competitors", emoji: "🔍" },
      { id: "swot", name: "SWOT Strategist", role: "Market Analysis", emoji: "📊" },
      { id: "copywriter", name: "Creative Copywriter", role: "Draft Slogans", emoji: "✍️" },
      { id: "compliance", name: "Compliance Legal", role: "Claim Protection", emoji: "⚖️" }
    ],
    files: [
      { id: "scrapings", name: "competitor_audit.md", language: "markdown" },
      { id: "swot", name: "swot_positioning.md", language: "markdown" },
      { id: "copy", name: "outreach_campaign.txt", language: "text" },
      { id: "compliance", name: "compliance_audit.json", language: "json" }
    ]
  },
  operations: {
    title: "Operations & Settlement Escalator",
    description: "Customer service intake auditing transactions, scoring refund risks, and creating automated settlements.",
    defaultPrompt: "Process a refund dispute of $240 for Order #9822, audit checkout logs, evaluate fraud risk, and auto-draft a settlement response.",
    agents: [
      { id: "triage", name: "Triage Intake", role: "Sentiment Triage", emoji: "📥" },
      { id: "sql", name: "DB Audit SQL", role: "Stripe DB Check", emoji: "🗄️" },
      { id: "fraud", name: "Fraud Auditor", role: "Risk Scoring", emoji: "🚨" },
      { id: "resolution", name: "Resolution Officer", role: "Approve Refund", emoji: "✉️" }
    ],
    files: [
      { id: "ticket", name: "ticket_metadata.json", language: "json" },
      { id: "sql_logs", name: "stripe_audit_results.sql", language: "sql" },
      { id: "risk_score", name: "fraud_risk_profile.json", language: "json" },
      { id: "email", name: "resolution_settlement.txt", language: "text" }
    ]
  }
};

const LOCAL_PRESET_CACHE: Record<string, Record<string, any>> = {
  engineering: {
    architect: {
      thought: "Analyzing custom payload schema constraints and planning secure authorization designs.",
      logs: ["Analyzing custom payload schema constraints...", "Designing relational user/session tables..."],
      content: `# Architecture Specification: JWT Security Gateway\n\n## 1. Database Relations\n- \`users\` (id: UUID, email: UNIQUE VARCHAR, password_hash: TEXT, created_at: TIMESTAMP)\n- \`sessions\` (id: UUID, user_id: UUID, token: TEXT, expires_at: TIMESTAMP)\n\n## 2. API Endpoints\n- \`POST /api/auth/register\` (Registers a new user account)\n- \`POST /api/auth/login\` (Validates hash and returns secure token)\n\n## 3. Cryptographic Settings\n- **Algorithm**: HS256\n- **Key Strength**: 256-bit symmetric key\n- **Token TTL**: 1 Hour (3600 seconds)`,
      toolName: "database_schema_planner",
      toolOutput: "✓ Entity validation checks successfully completed.\n✓ Mapped 4 relational databases with 0 foreign key warnings.",
      approved: true
    },
    engineer: {
      firstDraft: {
        thought: "Drafting TypeScript Express route implementation. Adding typical Bearer token extraction bug for QA audit.",
        logs: ["Compiling express routes...", "Implementing JWT verification middleware..."],
        content: `import express from 'express';\nimport jwt from 'jsonwebtoken';\n\nconst router = express.Router();\nconst SECRET = 'synapse_jwt_key';\n\n// JWT login implementation\nrouter.post('/login', (req, res) => {\n  const { email, password } = req.body;\n  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });\n  return res.json({ success: true, token });\n});\n\n// AUTHENTICATION MIDDLEWARE WITH INJECTED SIGNATURE BUG\nexport const authenticateJWT = (req, res, next) => {\n  const authHeader = req.headers.authorization;\n  // [BUG]: Directly verifying authorization header without removing 'Bearer ' prefix!\n  if (authHeader) {\n    jwt.verify(authHeader, SECRET, (err, user) => {\n      if (err) return res.status(403).json({ error: 'Token verification failed' });\n      req.user = user;\n      next();\n    });\n  } else {\n    res.status(401).json({ error: 'Auth header missing' });\n  }\n};`,
        toolName: null,
        toolOutput: null,
        approved: true
      },
      revision: {
        thought: "Self-Reflection active. Correcting Express JWT middleware by securely stripping Bearer prefix.",
        logs: ["Parsing auth unit tests failure logs...", "Rebuilding token extraction logic..."],
        content: `import express from 'express';\nimport jwt from 'jsonwebtoken';\n\nconst router = express.Router();\nconst SECRET = 'synapse_jwt_key';\n\n// JWT login implementation\nrouter.post('/login', (req, res) => {\n  const { email, password } = req.body;\n  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });\n  return res.json({ success: true, token });\n});\n\n// AUTHENTICATION MIDDLEWARE - FIXED VERSION\nexport const authenticateJWT = (req, res, next) => {\n  const authHeader = req.headers.authorization;\n  if (authHeader && authHeader.startsWith('Bearer ')) {\n    // Extracted and stripped token prefix securely\n    const token = authHeader.split(' ')[1];\n    jwt.verify(token, SECRET, (err, user) => {\n      if (err) return res.status(403).json({ error: 'Token signature is invalid' });\n      req.user = user;\n      next();\n    });\n  } else {\n    res.status(401).json({ error: 'Bearer token authorization missing' });\n  }\n};`,
        toolName: null,
        toolOutput: null,
        approved: true
      }
    },
    qa: {
      firstDraft: {
        thought: "Writing and executing Jest test suite against the first draft router.",
        logs: ["Compiling unit test environment variables...", "Executing Jest test files against routes..."],
        content: "✕ Compilation failed. QA Auditor detected a validation signature exception in auth_endpoint.ts.",
        toolName: "jest_runner",
        toolOutput: "FAIL  tests/auth.test.ts\n  ✕ should authenticate valid JWT (42ms)\n  ✓ should reject empty header (2ms)\n\n● should authenticate valid JWT\n\n  JsonWebTokenError: jwt malformed\n    at verify (node_modules/jsonwebtoken/verify.js:82)\n\n  [DETECTED EXCEPTION]: Middleware directly queried header 'Bearer eyJhb...' without stripping prefix!\n\nTest Suites: 1 failed, 1 total\nTests:       1 failed, 1 passed, 2 total",
        approved: false
      },
      revision: {
        thought: "Re-running Jest test suite against the revised, fixed TypeScript endpoint.",
        logs: ["Compiling test environment...", "Executing Jest test runner on revised endpoint..."],
        content: "✓ All security routes compiled. 100% test coverage achieved.",
        toolName: "jest_runner",
        toolOutput: "PASS  tests/auth.test.ts\n  ✓ should authenticate valid JWT (14ms)\n  ✓ should reject tampered signature (4ms)\n  ✓ should strip Bearer prefix (2ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        1.104s\n\n✓ All tests passed with flying colors!",
        approved: true
      }
    },
    secops: {
      thought: "Performing static security review (AST) on the final, approved code block.",
      logs: ["Scanning abstract syntax trees...", "Analyzing token cryptographic key strengths..."],
      content: "# SecOps Static Audit Compliance Review\n\n## 1. Compliance Matrix\n- **SEC-101 (Secret Leakage Check)**: PASS (JWT Secret isolated in env parameters).\n- **SEC-102 (Symmetric Encryption)**: PASS (Strong asymmetric token configuration).\n- **SEC-103 (SQL Injection Vector)**: PASS (Relational models use parameterized query strings).\n\n## 2. Threat Index Rating\n- Threat level: **LOW (9.2 / 100)**\n- Deploy ready: **YES**",
      toolName: "secops_vuln_scanner",
      toolOutput: "✓ Scanning AST tree completed. 0 critical vulnerabilities found.\n✓ Cryptographic key validation completed successfully.",
      approved: true
    }
  },
  marketing: {
    scraper: {
      thought: "Crawling and indexing pricing matrices and feature tables from competitors.",
      logs: ["Resolving search domains...", "Simulating headless crawler actions..."],
      content: "# Competitor Intelligence Matrix\n\n| Competitor Gym | Tier Monthly | Sign-up Fee | Core Features |\n| :--- | :--- | :--- | :--- |\n| Elite Fitness | $120 / mo | $99 | Access to standard cardio, no pool |\n| Pulse Arena | $160 / mo | $0 | Group sessions, sauna, pool access |\n| Core Wellness | $85 / mo | $150 | Cardio only, no group classes |",
      toolName: "web_scrape_crawling_sim",
      toolOutput: "✓ Opening chrome instance...\n✓ Successfully crawled 3 competitor domains.\n✓ Formatted pricing arrays.",
      approved: true
    },
    swot: {
      thought: "Evaluating competitor margins and positioning to format a comprehensive marketing SWOT analysis.",
      logs: ["Analyzing price barriers...", "Compiling strengths, weaknesses, and targets..."],
      content: "# SWOT Strategic Analysis\n\n### Strengths\n- Custom tailored digital onboarding.\n- Lower registration barriers compared to Competitor #3.\n\n### Weaknesses\n- Lower initial marketing visibility.\n\n### Opportunities\n- Target premium gym tier clients by offering an introductory $0 registration rate.",
      toolName: null,
      toolOutput: null,
      approved: true
    },
    copywriter: {
      thought: "Generating creative email sequences and headlines targeted to SWOT advantages.",
      logs: ["Formulating lead slogans...", "Drafting email newsletter outreach templates..."],
      content: "# Campaign Copy Options\n\n## Option Option A (Email Blast Headline)\n`Are you tired of hidden fees? Get premium fitness with $0 down today.`\n\n## Option Option B (Social Media)\n`Elite trainers, dynamic group pools, 0 sign-up hurdles. Join Pulse Arena today.`",
      toolName: null,
      toolOutput: null,
      approved: true
    },
    compliance: {
      thought: "Auditing copywriting options against legal liability guidelines.",
      logs: ["Reviewing ad slogans for trademark conflicts...", "Verifying claim safety parameters..."],
      content: "# Compliance Claim Audit Check\n\n* **Claim**: '$0 down' -> **APPROVED** (validated by promotional schema).\n* **Claim**: 'Guaranteed 100% results' -> **REJECTED** (high legal liability). Refined to 'Tested training programs'.",
      toolName: null,
      toolOutput: null,
      approved: true
    }
  },
  operations: {
    triage: {
      thought: "Parsing support request email, classifying sentiment, and fetching billing histories.",
      logs: ["Analyzing customer email text...", "Retrieving ticket metadata structures..."],
      content: "{\n  \"ticket_id\": \"TKT-9822\",\n  \"customer_email\": \"client@example.com\",\n  \"sentiment\": \"HIGHLY FRUSTRATED\",\n  \"urgency\": \"CRITICAL\",\n  \"subject\": \"Double billed $240 during checkout crash\"\n}",
      toolName: null,
      toolOutput: null,
      approved: true
    },
    sql: {
      thought: "Querying secure replica checkout database to verify duplicate payment events.",
      logs: ["Compiling transaction audit SQL string...", "Connecting to transaction replica databases..."],
      content: "Drafted SQL audit query to verify checkout transactions.",
      toolName: "stripe_db_audit",
      toolOutput: "SELECT * FROM charges WHERE amount = 240.00 AND customer_id = 'usr_9822';\n\nID         | AMOUNT | GATEWAY | STATUS    | CREATED_AT\n---------------------------------------------------------------\nch_0182    | 240.00 | stripe  | succeeded | 2026-06-12 14:02:11\nch_0183    | 240.00 | stripe  | succeeded | 2026-06-12 14:02:14\n\n[AUDIT RESULTS]: Detected 2 charges succeeded within 3 seconds. Double-billing verified.",
      approved: true
    },
    fraud: {
      thought: "Calculating safety and proxy risk profile indicators.",
      logs: ["Scanning browser fingerprints...", "Analyzing proxy VPN IP blacklists..."],
      content: "{\n  \"risk_score\": 8.4,\n  \"status\": \"SAFE\",\n  \"vpn_detected\": false,\n  \"charge_velocity\": \"STABLE\",\n  \"action_recommendation\": \"APPROVE REFUND IMMEDIATELY\"\n}",
      toolName: null,
      toolOutput: null,
      approved: true
    },
    resolution: {
      thought: "Synthesizing support details to draft resolution response.",
      logs: ["Compiling Stripe SQL audits...", "Drafting empathetic resolution settlement email..."],
      content: "Subject: Urgent Resolution: Order #9822 Double Charge Refunded\n\nDear Client,\n\nWe sincerely apologize for the checkout interruption. Our automated billing system confirmed that your transaction was successfully double-charged. \n\nWe have automatically triggered a refund of $240.00 back to your card. Transaction ID: ch_0183.",
      toolName: null,
      toolOutput: null,
      approved: true
    }
  }
};

export default function AgentsPlayground() {
  const [isClient, setIsClient] = useState<boolean>(false);
  
  // Theme state initialized to a static default (dark-first) to prevent SSR hydration mismatches
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Load local storage theme safely after mounting has successfully completed on client
  useEffect(() => {
    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
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

  // Playground Configuration States
  const [scenario, setScenario] = useState<"engineering" | "marketing" | "operations">("engineering");
  const [userPrompt, setUserPrompt] = useState<string>(SCENARIO_PRESETS.engineering.defaultPrompt);
  const [temperature, setTemperature] = useState<number>(0.4);
  const [allowedTools, setAllowedTools] = useState<string[]>(["crawler", "sandbox", "database", "security"]);
  const [humanInLoop, setHumanInLoop] = useState<boolean>(true);

  // Simulation Running States
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentAgentIdx, setCurrentAgentIdx] = useState<number>(-1);
  const [simulationStepText, setSimulationStepText] = useState<string>("System Ready. Initialize pipeline to begin.");
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [humanInterrupted, setHumanInterrupted] = useState<boolean>(false);

  // Live output workspace buffers
  const [workspaceFiles, setWorkspaceFiles] = useState<Record<string, string>>({});
  const [activeFileTab, setActiveFileTab] = useState<string>("");
  const [typingBuffer, setTypingBuffer] = useState<string>("");

  // Diagnostic Logs Console States
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"terminal" | "tools">("terminal");
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [activeToolOutput, setActiveToolOutput] = useState<string | null>(null);

  // Telemetry Analytics
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [tokensCount, setTokensCount] = useState<number>(0);
  const [costDollars, setCostDollars] = useState<number>(0);

  // Refs for auto-scrolls
  const logsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll logs & editors safely
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight;
    }
  }, [typingBuffer]);

  // Initial IP load & logger
  useEffect(() => {
    addLog("SYSTEM", "info", "Autonomous Multi-Agent Orchestrator Sandbox initialized.");
    fetchIPAddress();
  }, []);

  const fetchIPAddress = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        setClientIP(data.ip || "127.0.0.1");
        setIpLocation(`${data.city || "Doha"}, ${data.country_name || "QA"}`);
        const stored = localStorage.getItem(`agents-usage-${data.ip}`);
        if (stored) setUsageCount(parseInt(stored, 10));
        addLog("SYSTEM", "info", `Authenticated secure node connection from IP ${data.ip}`);
      }
    } catch {
      setClientIP("104.28.14.92");
      setIpLocation("Active Proxy Gateway");
      const stored = localStorage.getItem("agents-usage-fallback");
      if (stored) setUsageCount(parseInt(stored, 10));
    }
  };

  // Helper to pre-fill prompt on scenario change
  const handleScenarioChange = (newSec: "engineering" | "marketing" | "operations") => {
    setScenario(newSec);
    setUserPrompt(SCENARIO_PRESETS[newSec].defaultPrompt);
    // Reset simulation using the new scenario directly
    resetSimulationState(newSec);
    addLog("SYSTEM", "info", `Pipeline configuration swapped to: ${SCENARIO_PRESETS[newSec].title}`);
  };

  const addLog = (sender: string, type: LogLine["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, sender, type, message }]);
  };

  const resetSimulationState = (targetScenario = scenario) => {
    setIsRunning(false);
    setCurrentAgentIdx(-1);
    setSimulationStepText("System Ready. Initialize pipeline to begin.");
    setIsRevising(false);
    setHumanInterrupted(false);
    setWorkspaceFiles({});
    setActiveFileTab(SCENARIO_PRESETS[targetScenario].files[0].id);
    setTypingBuffer("");
    setActiveToolName(null);
    setActiveToolOutput(null);
    setElapsedMs(0);
    setTokensCount(0);
    setCostDollars(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Typewriter effect stream simulator
  const streamText = async (targetText: string, onUpdate: (partial: string) => void) => {
    const totalLength = targetText.length;
    let index = 0;
    // Fast typist scaling
    const stepSize = Math.max(3, Math.floor(totalLength / 220));
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        index += stepSize;
        if (index >= totalLength) {
          onUpdate(targetText);
          clearInterval(interval);
          resolve();
        } else {
          onUpdate(targetText.substring(0, index));
        }
      }, 10);
    });
  };

  // Primary Agent Execution Loop Coordinator
  const runAgentPipeline = async (startFromIndex = 0, isLoopingRevision = false) => {
    const isWhitelisted = clientIP === "34.132.233.106" || clientIP === "104.28.14.92";
    if (usageCount >= maxUsage && !isWhitelisted) {
      alert("Demo workspace query limit reached (5/5). Please contact Osama Alam for an unlimited VIP trial key!");
      addLog("GATEWAY", "error", "Rate limit exceeded. Query blocked.");
      return;
    }

    setIsRunning(true);
    setHumanInterrupted(false);
    
    // Start timing
    if (startFromIndex === 0 && !isLoopingRevision) {
      resetSimulationState();
      setIsRunning(true);
      timerIntervalRef.current = setInterval(() => {
        setElapsedMs((prev) => prev + 100);
      }, 100);
    }

    const preset = SCENARIO_PRESETS[scenario];
    const sequence = preset.agents;
    
    // Track file states locally inside the loop closure to prevent state timing lag
    const currentFiles = startFromIndex === 0 && !isLoopingRevision ? {} : { ...workspaceFiles };
    
    for (let i = startFromIndex; i < sequence.length; i++) {
      const agent = sequence[i];
      setCurrentAgentIdx(i);
      setSimulationStepText(`Evaluating agent: [${agent.name}] - ${agent.role}...`);
      addLog(agent.name.toUpperCase(), "info", `Activating node context. Formulating objective steps...`);
      
      // Determine output tab for this step
      const matchedFile = preset.files[i];
      setActiveFileTab(matchedFile.id);
      setTypingBuffer("🧠 Formulating ideas... Sending coordinates to neural matrix.");

      // Detect if user is running a default pre-made scenario prompt (normalize whitespace and carriage returns)
      const isPreset = userPrompt.replace(/\r\n/g, "\n").trim().toLowerCase() === SCENARIO_PRESETS[scenario].defaultPrompt.replace(/\r\n/g, "\n").trim().toLowerCase();

      try {
        let agentResult: AgentStepResult;

        if (isPreset) {
          // Instant local lookup with professional typing/thinking lag
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          if (agent.id === "engineer" || agent.id === "qa") {
            const variant = isLoopingRevision ? "revision" : "firstDraft";
            agentResult = LOCAL_PRESET_CACHE[scenario][agent.id][variant];
          } else {
            agentResult = LOCAL_PRESET_CACHE[scenario][agent.id];
          }
          
          addLog("SANDBOX", "success", `Retrieved pre-verified local agent cache results (0ms API latency).`);
        } else {
          // Query server side API endpoints passing previous workspace files context
          const response = await axios.post("/api/agents/generate", {
            scenario,
            agentRole: agent.id,
            userPrompt,
            temperature,
            allowedTools,
            isRevision: isLoopingRevision && agent.id === "engineer",
            workspaceFiles: currentFiles
          });

          if (!response.data || !response.data.success) {
            throw new Error(response.data?.error || "Invalid response format");
          }

          agentResult = response.data.data;
        }

        // Display logs
        agentResult.logs?.forEach((lg) => {
          addLog(agent.name.toUpperCase(), "info", lg);
        });

        // If tool was executed, trigger overlay console animations
        if (agentResult.toolName) {
          addLog(agent.name.toUpperCase(), "tool", `Invoking tool capability: '${agentResult.toolName}'...`);
          setActiveToolName(agentResult.toolName);
          setActiveToolOutput(agentResult.toolOutput);
          setActiveConsoleTab("tools");
          
          // Simulated Tool execution runtime lag
          await new Promise((resolve) => setTimeout(resolve, 2200));
          addLog("SANDBOX", agentResult.approved ? "success" : "warning", `Tool execution finished. Check 'Active Tool' console.`);
        }

        // Stream typing the workspace content
        await streamText(agentResult.content || "", (val) => {
          setTypingBuffer(val);
        });

        // Store file in local cache and permanent state
        currentFiles[matchedFile.id] = agentResult.content;
        setWorkspaceFiles((prev) => ({
          ...prev,
          [matchedFile.id]: agentResult.content
        }));

        // Adjust Telemetry meters
        const addedTokens = agentResult.content.length / 3 + 120;
        setTokensCount((prev) => Math.floor(prev + addedTokens));
        setCostDollars((prev) => prev + (addedTokens * 0.000015));

        // Intercept: QA/Analyst Rejection Self-Reflection Loop Simulation!
        if (scenario === "engineering" && agent.id === "qa" && !agentResult.approved && !isLoopingRevision) {
          addLog("QA_AUDITOR", "warning", `CRITICAL: Unit testing failed. Injected Bug Detected in 'auth_endpoint.ts'!`);
          addLog("SYSTEM", "info", `Self-Reflection Loop active. Retrying software pipeline with failing logs payload...`);
          
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          // Trigger the Revision!
          setIsRevising(true);
          // Loop back to engineer (idx 1)
          setIsRunning(false);
          if (humanInLoop) {
            // Wait for human-in-the-loop popup!
            setHumanInterrupted(true);
            addLog("SYSTEM", "warning", `Pipeline paused. Awaiting human validation checklist override.`);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            return; // break loop. human will click proceed.
          } else {
            // Auto-loop immediately
            await runAgentPipeline(1, true);
            return;
          }
        }

        // Intercept: Generic Human-In-The-Loop gate for non-engineering scenarios
        if (humanInLoop && i === 2 && !isLoopingRevision && scenario !== "engineering") {
          setHumanInterrupted(true);
          setIsRunning(false);
          addLog("SYSTEM", "warning", `Human decision gate encountered. Pausing workflow for stakeholder verification.`);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return;
        }

      } catch (err: any) {
        addLog(agent.name.toUpperCase(), "error", `API handshake failed: ${err.message}`);
        setIsRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Loop finished fully
    setIsRunning(false);
    setCurrentAgentIdx(4);
    setSimulationStepText("Multi-Agent Automation Workflow successfully completed.");
    addLog("SYSTEM", "success", `Pipeline execution finished. Process fully completed in ${(elapsedMs / 1000).toFixed(1)}s.`);
    
    // Increment usage rate limits
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    if (typeof window !== "undefined") {
      localStorage.setItem(`agents-usage-${clientIP}`, newCount.toString());
      localStorage.setItem("agents-usage-fallback", newCount.toString());
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Human-in-the-Loop decision actions
  const handleHumanProceed = async (override = false) => {
    setHumanInterrupted(false);
    timerIntervalRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);

    if (scenario === "engineering") {
      if (override) {
        addLog("HUMAN", "warning", "Forced Override approved. Proceeding with faulty build bypassing QA warnings.");
        runAgentPipeline(3, false); // jump directly to secops
      } else {
        addLog("HUMAN", "success", "Auto-Correction loop authorized. Requesting Engineer code rebuild.");
        runAgentPipeline(1, true); // Loop back to engineer as revision
      }
    } else {
      // For Marketing/Operations, just proceed to final step (Compliance/Resolution)
      addLog("HUMAN", "success", "Stakeholder verified intermediate findings. Resuming automation sequence.");
      runAgentPipeline(3, false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-cyber-dark text-zinc-800 dark:text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-300 relative">
      
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
              <span className="font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Osama Alam</span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">AI Architect & Founder</span>
            </div>
          </Link>
          
          <nav className="flex items-center gap-6 text-sm font-medium">
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
            <Link href="/rag" className="text-purple-500 hover:text-purple-400 font-semibold transition-colors mr-1">🧠 RAG Sandbox</Link>
            <Link href="/" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">← Back to Portfolio</Link>
          </nav>
        </div>
      </header>

      {/* 🛠️ Dynamic Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Page Title Header */}
        <div className="xl:col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-white/[0.04] pb-6 mb-2">
          <div className="flex flex-col gap-2 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase tracking-widest self-start">
              🧠 Synapse Multi-Agent Intelligence
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Synapse Multi-Agent Orchestrator
            </h1>
            <p className="text-sm text-black dark:text-zinc-400 leading-relaxed font-sans mt-1 font-medium">
              Experience the future of process automation and collaborative intelligence. Orchestrate multiple specialized AI agents executing complex software engineering, competitor intelligence, or support logistics tasks. Analyze real-time vector reasoning, test self-correcting compilation loops, and exercise precise operational governance with interactive <strong>Human-in-the-Loop</strong> decision gates.
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
              <span className="text-zinc-300 font-bold">{clientIP}</span>
            </div>
            <div className="flex justify-between">
              <span>Secure Node:</span>
              <span className="text-zinc-300 font-bold line-clamp-1">{ipLocation}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.05] pt-1.5 mt-1 text-[11px] font-bold">
              <span>Daily Rate Limit:</span>
              <span className="text-emerald-400">
                {clientIP === "34.132.233.106" || clientIP === "104.28.14.92" ? "UNLIMITED (VIP)" : `${usageCount} / ${maxUsage} Used`}
              </span>
            </div>
          </div>
        </div>
        
        {/* ==========================================
            LEFT PANEL: SETTINGS & DYNAMIC CONTROL
            ========================================== */}
        <section className="xl:col-span-4 flex flex-col gap-5 glass-panel p-5 rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#07070a]/90 self-start relative transition-colors duration-300">
          
          <div className="pb-3 border-b border-zinc-200 dark:border-white/[0.05]">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-1.5">
              ⚙️ Pipeline Control Center
            </h2>
            <p className="text-[10px] text-black dark:text-zinc-400 font-mono leading-relaxed mt-0.5 font-semibold">
              Customize environment variables and run constraints.
            </p>
          </div>

          {/* Preset Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
              1. Choose Pipeline Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["engineering", "marketing", "operations"] as const).map((key) => {
                const active = scenario === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleScenarioChange(key)}
                    disabled={isRunning}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      active 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                        : "bg-zinc-50 dark:bg-white/[0.01] border-zinc-200 dark:border-white/[0.04] text-black dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.1] font-semibold"
                    }`}
                  >
                    <span className="text-lg mb-1">
                      {key === "engineering" ? "💻" : key === "marketing" ? "📈" : "🗄️"}
                    </span>
                    <span className="text-[9px] font-mono leading-tight uppercase font-bold tracking-wider">
                      {key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Active Description Box */}
          <div className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/[0.04] text-[10px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-black dark:text-white font-mono uppercase tracking-wider mb-1">
              <span>{scenario === "engineering" ? "💻" : scenario === "marketing" ? "📈" : "🗄️"}</span>
              <span>{scenario === "engineering" ? "Software Engineering Pipeline" : scenario === "marketing" ? "Competitor Intelligence Loop" : "Incident Operations Escalator"}</span>
            </div>
            <p className="text-black dark:text-zinc-300 font-sans font-semibold">
              {scenario === "engineering" && "An automated loop where a System Architect specifies schemas, an Engineer implements TypeScript backend routes with typical bug patterns, and a QA Auditor compiles unit tests to trigger self-reflection correction loops."}
              {scenario === "marketing" && "A digital intelligence sequence where a Web Crawler indexes competitor models, a SWOT Specialist computes target demographics, and a Copywriter generates creative legal-compliance audited campaigns."}
              {scenario === "operations" && "An operational customer-support triage funnel analyzing ticket sentiments, executing SQL audits on duplicate transaction replicas, and computing security fraud index scores."}
            </p>
          </div>

          {/* Prompt Objective Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
                2. Customize Target Objective
              </label>
              <button 
                onClick={() => setUserPrompt(SCENARIO_PRESETS[scenario].defaultPrompt)}
                disabled={isRunning}
                className="text-[9px] font-mono text-black dark:text-zinc-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer font-bold"
              >
                Reset Default
              </button>
            </div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              disabled={isRunning}
              rows={3}
              className="w-full p-3 rounded-xl bg-white dark:bg-black/60 dark:disabled:bg-black/50 border border-zinc-300 dark:border-white/[0.1] text-xs text-black disabled:text-black dark:text-zinc-200 dark:disabled:text-zinc-400  focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 leading-relaxed resize-none no-scrollbar font-bold shadow-inner"
              placeholder="Enter exact business or code automation instructions..."
            />
          </div>

          {/* Hyper-Parameters Sliders & Options */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-white/[0.01] border border-zinc-100 dark:border-white/[0.03] p-3 rounded-xl">
            {/* Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-[9px] uppercase font-mono text-black dark:text-zinc-400 font-bold">Temperature</span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                disabled={isRunning}
                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
              />
              <span className="text-[8px] text-black dark:text-zinc-500 font-mono leading-none font-bold">
                {temperature < 0.4 ? "Strict, Compliance" : temperature > 0.65 ? "Creative, Bold" : "Balanced, Standard"}
              </span>
            </div>

            {/* Human in loop toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase font-mono text-black dark:text-zinc-400 font-bold">Human-In-The-Loop</span>
              <button
                onClick={() => setHumanInLoop(!humanInLoop)}
                disabled={isRunning}
                className={`py-1 px-2.5 rounded-lg border text-[10px] font-mono flex items-center justify-between cursor-pointer transition-all ${
                  humanInLoop 
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300 font-bold" 
                    : "border-zinc-200 dark:border-white/[0.05] bg-zinc-50 dark:bg-white/[0.01] text-black dark:text-zinc-500 font-bold"
                }`}
              >
                <span>{humanInLoop ? "🔒 Enabled" : "🔓 Off"}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${humanInLoop ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"}`} />
              </button>
              <span className="text-[8px] text-black dark:text-zinc-500 leading-tight font-bold">Intervene & correct steps</span>
            </div>
          </div>

          {/* Checked Toolboxes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-black dark:text-zinc-400">
              3. Authorize Agent Capabilities
            </label>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {[
                { id: "crawler", label: "Web Crawler Sim" },
                { id: "sandbox", label: "Code Compiler" },
                { id: "database", label: "SQL Database Aud" },
                { id: "security", label: "SecOps Auditor" }
              ].map((tool) => {
                const active = allowedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    disabled={isRunning}
                    onClick={() => {
                      if (active) setAllowedTools(allowedTools.filter((t) => t !== tool.id));
                      else setAllowedTools([...allowedTools, tool.id]);
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      active 
                        ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-bold" 
                        : "bg-zinc-50 dark:bg-white/[0.01] border-zinc-200 dark:border-white/[0.03] text-black dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 font-semibold"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded flex items-center justify-center border text-[8px] ${
                      active ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    }`}>
                      {active && "✓"}
                    </div>
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger Activation */}
          <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.05] flex flex-col gap-3">
            
            <button
              onClick={() => runAgentPipeline(0, false)}
              disabled={isRunning || humanInterrupted}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <span className="w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Orchestrating Workflow...
                </>
              ) : (
                <>
                  <span>⚡</span> Initialize Agent Pipeline
                </>
              )}
            </button>
          </div>

        </section>

        {/* ==========================================
            RIGHT PANEL: HIGH-TECH TOPOLOGY & WORKSPACE
            ========================================== */}
        <section className="xl:col-span-8 flex flex-col gap-6">

          {/* SVG Agent Network Graph Topology */}
          <div className="sh-dark-card p-4 rounded-2xl border border-white/[0.06] bg-[#07070a] relative overflow-hidden min-h-[160px] flex flex-col justify-between">
            
            {/* Background Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03]"></div>

            <div className="flex items-center justify-between z-10">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 font-semibold">
                  Network Graph Topology
                </span>
                <span className="text-[11px] text-zinc-300 font-bold mt-0.5">
                  {SCENARIO_PRESETS[scenario].title}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {simulationStepText}
              </span>
            </div>

            {/* Interactive Graph Display */}
            <div className="relative py-4 grid grid-cols-4 gap-4 z-10">
              
              {/* Connector SVG Lines behind nodes */}
              <div className="absolute inset-x-[12%] top-[45%] h-1 -translate-y-1/2 -z-10">
                <svg className="w-full h-8 overflow-visible" fill="none">
                  <path 
                    d="M 0,16 L 300,16" 
                    stroke="rgba(255, 255, 255, 0.04)" 
                    strokeWidth="2" 
                    className="w-full"
                  />
                  {/* Glowing Forward Path packet streams */}
                  {isRunning && (
                    <path
                      d="M 0,16 L 300,16"
                      stroke={isRevising ? "#f97316" : "#10b981"}
                      strokeWidth="2"
                      strokeDasharray="8 20"
                      className="animate-grid-move"
                      style={{ animationDuration: "1.5s" }}
                    />
                  )}
                </svg>
              </div>

              {/* Four Agent Node Iteration */}
              {SCENARIO_PRESETS[scenario].agents.map((agent, index) => {
                const isActive = currentAgentIdx === index;
                const isCompleted = currentAgentIdx > index;
                const isRejectedState = isRevising && index === 2 && currentAgentIdx < 2;

                let ringColor = "border-white/[0.04] bg-[#050507]";
                let textColor = "text-zinc-500";
                
                if (isActive) {
                  ringColor = "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105";
                  textColor = "text-emerald-400 font-bold";
                } else if (isRejectedState) {
                  ringColor = "border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse";
                  textColor = "text-orange-400";
                } else if (isCompleted) {
                  ringColor = "border-emerald-500/40 bg-black/40 opacity-70";
                  textColor = "text-zinc-400";
                }

                return (
                  <div key={agent.id} className="flex flex-col items-center text-center transition-all duration-500 relative">
                    <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl transition-all duration-500 ${ringColor}`}>
                      {agent.emoji}
                    </div>
                    <span className={`text-[10px] mt-2 leading-none ${textColor}`}>
                      {agent.name}
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono mt-1">
                      {agent.role}
                    </span>
                    
                    {/* Tiny Status Indicator Spot */}
                    <div className={`absolute top-0 right-[25%] w-2 h-2 rounded-full border border-[#030303] ${
                      isActive ? "bg-emerald-400 animate-ping" : isRejectedState ? "bg-orange-500 animate-pulse" : isCompleted ? "bg-emerald-500" : "bg-zinc-800"
                    }`} />
                  </div>
                );
              })}

            </div>

            {/* Metrics Dashboard Row */}
            <div className="grid grid-cols-4 gap-2 border-t border-white/[0.05] pt-3 z-10 text-[10px] font-mono text-zinc-500">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Elapsed</span>
                <span className="text-white font-bold mt-0.5">{(elapsedMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Sim Cost</span>
                <span className="text-emerald-400 font-bold mt-0.5">${costDollars.toFixed(4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Bandwidth</span>
                <span className="text-white mt-0.5">{tokensCount.toLocaleString()} tok</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600">Active State</span>
                <span className="text-cyan-400 font-bold mt-0.5 uppercase">
                  {isRunning ? `STG ${currentAgentIdx + 1}/4` : currentAgentIdx === 4 ? "COMPLETE" : "IDLE"}
                </span>
              </div>
            </div>

          </div>

          {/* Code Workspace & Terminal Output Side-by-Side split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* 🖥️ Left Side: Workspace File Preview Pane (7 columns) */}
            <div className="lg:col-span-7 flex flex-col h-[400px] rounded-2xl border border-white/[0.06] bg-[#07070a]/95 relative overflow-hidden sh-dark-card">
              
              {/* Workspace Header Tabs */}
              <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {SCENARIO_PRESETS[scenario].files.map((file, idx) => {
                    const active = activeFileTab === file.id;
                    const exists = workspaceFiles[file.id] || activeFileTab === file.id;
                    return (
                      <button
                        key={file.id}
                        disabled={!exists}
                        onClick={() => {
                          setActiveFileTab(file.id);
                          setTypingBuffer(workspaceFiles[file.id] || "");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                          active 
                            ? "bg-white/[0.05] text-emerald-400 border border-white/[0.05]" 
                            : exists 
                              ? "text-zinc-400 hover:text-white" 
                              : "text-zinc-600 cursor-not-allowed opacity-40"
                        }`}
                      >
                        {file.name}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[9px] font-mono text-zinc-600 uppercase">
                  Workspace
                </span>
              </div>

              {/* IDE Editor Output screen */}
              <div ref={editorRef} className="flex-1 p-4 overflow-y-auto no-scrollbar bg-black/60 font-mono text-xs leading-relaxed">
                {typingBuffer ? (
                  <pre className="whitespace-pre-wrap text-zinc-300">
                    <code>{typingBuffer}</code>
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 font-sans p-6">
                    <span className="text-3xl mb-2">📁</span>
                    <h5 className="text-xs font-bold text-zinc-400">Workspace Empty</h5>
                    <p className="text-[10px] mt-1">Start the pipeline preset to let agents write and review files dynamically here.</p>
                  </div>
                )}
              </div>

            </div>

            {/* 📺 Right Side: Diagnostic Logs Console Pane (5 columns) */}
            <div className="lg:col-span-5 flex flex-col h-[400px] rounded-2xl border border-white/[0.06] bg-[#07070a]/90 relative overflow-hidden sh-dark-card">
              
              {/* Console Tabs */}
              <div className="bg-[#050507]/90 px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveConsoleTab("terminal")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      activeConsoleTab === "terminal" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Console Out
                  </button>
                  <button
                    onClick={() => setActiveConsoleTab("tools")}
                    disabled={!activeToolName}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      activeConsoleTab === "tools" ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Active Tool {activeToolName && `(${activeToolName})`}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Live Trace</span>
                </div>
              </div>

              {/* Console Screen */}
              <div className="flex-1 p-4 bg-black/80 font-mono text-[10px] leading-relaxed overflow-y-auto" ref={logsRef}>
                
                {activeConsoleTab === "terminal" ? (
                  <div className="flex flex-col gap-2">
                    {logs.map((log, index) => {
                      let color = "text-zinc-400";
                      if (log.type === "success") color = "text-emerald-400 font-semibold";
                      else if (log.type === "warning") color = "text-orange-400 font-semibold";
                      else if (log.type === "error") color = "text-red-400 font-semibold";
                      else if (log.type === "tool") color = "text-cyan-400 font-bold";

                      return (
                        <div key={index} className="flex gap-2 border-b border-white/[0.01] pb-1.5 last:border-none">
                          <span className="text-zinc-600 select-none">[{log.timestamp}]</span>
                          <span className="text-zinc-500 select-none uppercase font-bold text-[9px] min-w-[70px]">
                            [{log.sender}]
                          </span>
                          <span className={color}>{log.message}</span>
                        </div>
                      );
                    })}
                    {logs.length === 0 && (
                      <span className="text-zinc-700">Awaiting automation trace streams...</span>
                    )}
                  </div>
                ) : (
                  <div className="h-full">
                    {activeToolOutput ? (
                      <pre className="text-cyan-400 whitespace-pre-wrap leading-normal font-mono text-[9px]">
                        <code>{activeToolOutput}</code>
                      </pre>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 font-sans p-4">
                        <span className="text-2xl mb-1">🛠️</span>
                        <h6 className="text-[11px] font-bold text-zinc-400">No Tool Invoked</h6>
                        <p className="text-[9px] mt-0.5">Console captures live databases, scraping loops, or test compilation runtimes here.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>

          </div>

        </section>

        {/* Info Banner Row */}
        <div className="sh-dark-card mt-6 p-8 rounded-2xl bg-zinc-950 border border-white/[0.04] grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto xl:col-span-12">
          <div className="flex flex-col gap-2.5">
            <span className="text-2xl">🤖</span>
            <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Autonomous Loop Routing</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              System tasks are spec'd out by a Manager/Architect agent and routed sequentially. Agents dynamically execute intermediate tasks, compiling and passing file states along clean, robust APIs.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-2xl">🔄</span>
            <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Self-Reflection & Correction</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Our workflows feature native, automated testing hooks. If the QA Agent detects syntax errors or payload validation failures, it rejects the build, drafts logs, and triggers a developer self-correction loop automatically.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-2xl">👥</span>
            <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-white">Human-In-The-Loop (HITL)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Automations require strict oversight. By integrating HITL interruption thresholds, stakeholders can audit and manually correct agent findings, approve revisions, or bypass alerts to maintain complete operational control.
            </p>
          </div>
        </div>

      </main>

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

      {/* ==========================================
          INTERACTIVE HUMAN-IN-THE-LOOP MODAL DIALOG
          ========================================== */}
      {humanInterrupted && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="max-w-md w-full glass-panel border border-orange-500/30 bg-white/95 dark:bg-[#0c0a09]/95 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.15)] overflow-hidden animate-scale-up">
            
            {/* Modal Alert Header */}
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-4 flex items-center gap-3">
              <span className="text-2xl animate-bounce">⚠️</span>
              <div>
                <h3 className="text-sm font-extrabold text-orange-500 dark:text-orange-400 uppercase tracking-wider font-mono">
                  Human verification required
                </h3>
                <p className="text-[9px] text-zinc-600 dark:text-zinc-400 font-mono">Awaiting supervisor manual pipeline authorization</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              
              <p className="text-xs text-zinc-800 dark:text-zinc-300 leading-relaxed font-semibold">
                {scenario === "engineering" ? (
                  <>
                    The <span className="font-extrabold text-zinc-950 dark:text-white">QA Auditor Agent</span> successfully ran automated Unit tests against the current TypeScript draft, and found an intentional <span className="text-orange-600 dark:text-orange-400 font-extrabold">JWT Signature Parse Bug</span>.
                    <br /><br />
                    To demonstrate true self-correcting RAG/Multi-Agent intelligence, would you like to approve the correction loop?
                  </>
                ) : (
                  <>
                    The intermediate research and SWOT metrics are ready. Please approve findings to let the loop proceed with compiling compliance-checked copywriting strategies.
                  </>
                )}
              </p>

              {/* Dynamic Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {scenario === "engineering" ? (
                  <>
                    <button
                      onClick={() => handleHumanProceed(false)}
                      className="py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      🔄 Approve Auto-Correct
                    </button>
                    <button
                      onClick={() => handleHumanProceed(true)}
                      className="py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.06] text-zinc-800 dark:text-zinc-300 hover:text-black dark:hover:text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      ⚠️ Bypass (Force Deploy)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleHumanProceed(false)}
                      className="col-span-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
                    >
                      ✓ Approve Findings & Continue
                    </button>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
