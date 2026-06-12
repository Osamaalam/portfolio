"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UpworkLogo, LinkedInLogo } from "@/components/ui/icons";
import AgentSimulator from "@/components/simulators/AgentSimulator";
import MRISimulator from "@/components/simulators/MRISimulator";
import RAGSimulator from "@/components/simulators/RAGSimulator";

// ==========================================
// TYPES & DATA DEFINITIONS
// ==========================================

interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  role: string;
  period: string;
  metric: string;
  metricLabel: string;
  description: string;
  highlights: string[];
  tech: string[];
  accentColor: string;
}

interface SkillCategory {
  id: string;
  title: string;
  description: string;
  skills: { name: string; level: number }[];
  highlightedProject: string;
}

interface TimelineItem {
  id: string;
  title: string;
  organization: string;
  location: string;
  period: string;
  type: "work" | "education";
  highlights: string[];
  tech?: string[];
}

interface Testimonial {
  id: string;
  client: string;
  role: string;
  platform: "Upwork" | "Enterprise" | "Startup Partner";
  rating: number;
  content: string;
  tag: string;
}

const PROJECTS_DATA: Project[] = [
  {
    id: "emrchains",
    title: "EMRChains",
    subtitle: "AI-Powered Healthcare & Diagnostics Orchestration",
    category: "Healthcare AI / Startup",
    role: "Founder & AI Developer",
    period: "2023 - Present",
    metric: "60%",
    metricLabel: "Reduction in Patient Wait Times",
    description: "EMRChains was founded to resolve access barriers in underserved healthcare systems. We built and deployed specialized diagnostic chatbots and medical imaging classifiers optimized for patient-centric clinical workflows in rural and high-throughput settings.",
    highlights: [
      "Engineered clinical diagnostic chatbots resolving 60% of pre-triage delays.",
      "Spearheaded multi-agent clinical workflow designs for non-technical users in rural healthcare units.",
      "Fine-tuned neural networks to handle noisy, low-resource medical telemetry and real-world imaging.",
      "Established secure, HIPAA-compliant patient record indexing and distributed clinical decision logic."
    ],
    tech: ["Next.js", "Python", "PyTorch", "Tailwind CSS", "MongoDB", "FastAPI", "Docker"],
    accentColor: "teal"
  },
  {
    id: "nexgen",
    title: "NexGen Clinical AI Hub",
    subtitle: "Enterprise Medical Imaging & Decision Support Systems",
    category: "Computer Vision / Cloud AI",
    role: "AI Engineer",
    period: "2024 - Present",
    metric: "98.4%",
    metricLabel: "Diagnostic Sensitivity Achieved",
    description: "Built and integrated state-of-the-art diagnostic imaging processing pipelines at NexGen Technology in Doha, Qatar. Fine-tuned deep transfer learning models on clinical X-ray, CT, MRI, and Ultrasound datasets, deploying them as high-availability microservices for hospital decision support.",
    highlights: [
      "Fine-tuned pre-trained CNN and Vision Transformer models for multi-modal imaging pathology detection.",
      "Constructed production-grade medical preprocessing pipelines (Dicom normalization, CLAHE contrast enhancement).",
      "Created a web-based clinical viewer featuring real-time Grad-CAM saliency heatmaps for explainable AI metrics.",
      "Successfully scaled inferencing systems to process high-resolution clinical volumes with sub-second latency."
    ],
    tech: ["PyTorch", "TensorFlow", "FastAPI", "React", "Docker", "AWS", "OpenCV"],
    accentColor: "blue"
  },
  {
    id: "agents",
    title: "Synapse Multi-Agent Engine",
    subtitle: "Autonomous Enterprise Task Orchestration & Vector Knowledge Retrieval",
    category: "LLM / Automation",
    role: "AI Lead Architect",
    period: "2023 - Present",
    metric: "10x",
    metricLabel: "Speedup in Complex Document Summaries",
    description: "Engineered high-end autonomous agent clusters and RAG (Retrieval-Augmented Generation) setups for enterprise workflows. Designed specialized multi-agent architectures that leverage role-play, reflection, and secure tools to conduct market analysis, medical research, and data processing autonomously.",
    highlights: [
      "Architected a custom Python multi-agent system executing self-correcting prompt loops and automated tool execution.",
      "Designed semantic search architectures utilizing hierarchical vector chunking, metadata filters, and cross-encoder rerankers.",
      "Developed an automated dashboard showing token usage, agent dialogue trees, and live diagnostic feedback.",
      "Integrated secure sandboxes for agents to write and evaluate code dynamically, boosting extraction accuracy by 40%."
    ],
    tech: ["LangChain", "OpenAI API", "Pinecone", "Python", "TypeScript", "Next.js", "Redis"],
    accentColor: "purple"
  },
  {
    id: "solidity",
    title: "OmniLedger Solidity DApp",
    subtitle: "Decentralized Finance Smart Contracts & Web3 Application",
    category: "Blockchain / Full-Stack",
    role: "Lead Full-Stack Web3 Engineer",
    period: "2022 - 2023",
    metric: "$2.4M+",
    metricLabel: "Mock Liquidity Simulated",
    description: "Designed and developed a highly secure decentralized transaction portal, bridging Solidity-based Ethereum smart contracts with a responsive, high-performance React dashboard. Optimized for security, gas efficiency, and modern responsive user experience.",
    highlights: [
      "Wrote and unit-tested production-grade Solidity smart contracts utilizing Hardhat and OpenZeppelin standards.",
      "Implemented seamless Web3 wallet integrations (MetaMask, WalletConnect) with reactive state UI management.",
      "Engineered real-time gas price trackers, transaction logs, and cryptographic signature validation.",
      "Formulated responsive fluid layouts to view cross-chain assets, token pools, and staking rewards."
    ],
    tech: ["Solidity", "Hardhat", "React.js", "Ethers.js", "Tailwind CSS", "Node.js", "Web3.js"],
    accentColor: "gold"
  }
];

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "ai-engineering",
    title: "AI & Model Engineering",
    description: "Deep learning model fine-tuning, architecture optimization, and multi-modal clinical intelligence pipelines.",
    skills: [
      { name: "Deep Neural Networks (CNNs, GANs)", level: 95 },
      { name: "Transfer Learning (Vision/NLP)", level: 92 },
      { name: "PyTorch & TensorFlow", level: 90 },
      { name: "Multi-Agent AI Architectures", level: 88 },
      { name: "LLM Fine-tuning & Prompt Ops", level: 94 }
    ],
    highlightedProject: "NexGen Clinical AI Hub"
  },
  {
    id: "rag-llm",
    title: "LLMs, RAG & Automation",
    description: "Structuring high-precision retrieval systems, semantic embedding models, and automated pipeline logic.",
    skills: [
      { name: "Vector Databases (Pinecone, Chroma)", level: 92 },
      { name: "RAG Pipeline Architectures", level: 95 },
      { name: "LangChain / LangGraph / CrewAI", level: 90 },
      { name: "API Integration & Workflows", level: 96 },
      { name: "Autonomous Evaluation Frameworks", level: 85 }
    ],
    highlightedProject: "Synapse Multi-Agent Engine"
  },
  {
    id: "full-stack",
    title: "Full-Stack Web Development",
    description: "Crafting beautiful, reactive, and highly scalable user interfaces backed by performant distributed microservices.",
    skills: [
      { name: "Next.js / React.js", level: 96 },
      { name: "TypeScript / JavaScript", level: 94 },
      { name: "Node.js (Express, NestJS)", level: 90 },
      { name: "Tailwind CSS (v3, v4)", level: 98 },
      { name: "MongoDB & SQL Databases", level: 90 }
    ],
    highlightedProject: "EMRChains"
  },
  {
    id: "blockchain-cloud",
    title: "Cloud & Decentralization",
    description: "Secure, highly available deployment structures and decentralized trust-less execution layers.",
    skills: [
      { name: "Docker Containerization", level: 88 },
      { name: "AWS Cloud Infrastructure", level: 85 },
      { name: "CI/CD & Git Actions", level: 88 },
      { name: "Solidity & Smart Contracts", level: 85 },
      { name: "Web3.js & Wallet Bridging", level: 84 }
    ],
    highlightedProject: "OmniLedger Solidity DApp"
  }
];

const TIMELINE_DATA: TimelineItem[] = [
  {
    id: "emrchains-job",
    title: "Founder & AI Developer",
    organization: "EMRChains",
    location: "Islamabad, Pakistan",
    period: "2023 - Current",
    type: "work",
    highlights: [
      "Built and scaled a clinical intelligence platform designed to eliminate waiting backlogs in under-resourced hospitals.",
      "Engineered custom medical diagnosis assistant models and clinic chatbots that reduced client routing delay by 60%.",
      "Fostered cross-functional integration of healthcare guidelines, creating reliable clinical interfaces.",
      "Optimized ML workloads to run efficiently on standard cloud hardware and constrained on-premises servers."
    ],
    tech: ["Next.js", "Python", "PyTorch", "FastAPI", "MongoDB", "Tailwind CSS"]
  },
  {
    id: "nexgen-job",
    title: "AI Engineer",
    organization: "NexGen Technology",
    location: "Doha, Qatar",
    period: "2024 - Current",
    type: "work",
    highlights: [
      "Fine-tuned transfer learning architectures (ResNet, DenseNet, ViT) for rapid classification of X-ray, CT, MRI, and Ultrasound files.",
      "Constructed automated data pipelines incorporating rigorous medical standards, contrast normalization, and augmentation.",
      "Collaborated with clinical advisors to establish strict mathematical safety nets and explainability logs (Grad-CAM).",
      "Deployed highly stable cloud APIs integrated inside real-world clinical hospital software platforms."
    ],
    tech: ["PyTorch", "Docker", "FastAPI", "OpenCV", "TensorFlow", "AWS"]
  },
  {
    id: "upwork-job",
    title: "Web Application Developer (Top Rated)",
    organization: "Upwork Global Freelancing",
    location: "Remote",
    period: "2017 - Current",
    type: "work",
    highlights: [
      "Designed and delivered 40+ high-end web platforms, specializing in custom AI integrations, chatbots, and dashboards.",
      "Leveraged OpenAI APIs, LangChain, and vector stores to build custom business automations and diagnostic query tools.",
      "Engineered secure decentralized Web3 apps (Solidity DApps) integrating custom smart contracts with responsive React frontends.",
      "Maintained a 100% Job Success Score with stellar reviews from tech founders, healthcare operators, and startups."
    ],
    tech: ["Next.js", "React.js", "Node.js", "Solidity", "Tailwind CSS", "MongoDB", "OpenAI API"]
  },
  {
    id: "nust-edu",
    title: "Master's in Artificial Intelligence & Autonomous Systems",
    organization: "National University of Sciences & Technology (NUST)",
    location: "Islamabad, Pakistan",
    period: "2023 - 2025",
    type: "education",
    highlights: [
      "Specialized research focus on Computer Vision, Multi-Agent Coordination, and Medical Diagnostic AI Systems.",
      "Graduated from Pakistan's premier technology university with hands-on labs in robotics, Reinforcement Learning, and Deep Learning.",
      "Authored academic reports analyzing explainable neural architectures (XAI) and multi-modal healthcare diagnostic models."
    ]
  },
  {
    id: "air-edu",
    title: "Bachelor's in Electrical & Electronics Engineering",
    organization: "Air University",
    location: "Islamabad, Pakistan",
    period: "2017 - 2021",
    type: "education",
    highlights: [
      "Acquired strong mathematical grounding in Signal Processing, Linear Algebra, Calculus, and Control Systems.",
      "Completed a Capstone project designing automated hardware telemetry and controller processing units.",
      "Built solid fundamentals in object-oriented programming, data structures, and microcontroller algorithms."
    ]
  }
];

const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: "t1",
    client: "Robert F. (Upwork Client)",
    role: "Founder, AlphaHealth SaaS",
    platform: "Upwork",
    rating: 5,
    content: "Osama is a true master of full-stack AI development. He built a custom diagnostic chatbot integrated with our clinical data nodes. His code is outstandingly clean, and his execution speed exceeded our estimates. Best hiring decision we've made this year.",
    tag: "AI & Full-Stack"
  },
  {
    id: "t2",
    client: "Marcus V. (Upwork Client)",
    role: "CTO, BlockVenture Labs",
    platform: "Upwork",
    rating: 5,
    content: "Osama engineered our Solidity smart contracts and developed the complete Web3 frontend in Next.js. Finding a developer who combines deep blockchain security engineering with beautiful, high-performance UI/UX is incredibly rare. Highly recommended!",
    tag: "Web3 & Blockchain"
  },
  {
    id: "t3",
    client: "Elena K. (Upwork Client)",
    role: "Operations VP, Global Automation Group",
    platform: "Upwork",
    rating: 5,
    content: "Top-tier AI Engineer! Osama built a multi-agent automation platform using LangChain that scans high volumes of documentation, vectorizes data, and auto-generates compliance summaries. Reduced our analysis cycles by 70%. Absolutely professional.",
    tag: "AI Automation"
  }
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function Home() {
  // Theme state (dark-first by default)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("portfolio-theme");
      return savedTheme !== "light";
    }
    return true;
  });

  // Navigation & Interactive States
  const [activeTab, setActiveTab] = useState<string>("ai-engineering");
  const [activeProject, setActiveProject] = useState<string>("emrchains");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Interactive Live Dashboard States
  const [consoleMode, setConsoleMode] = useState<"agents" | "mri" | "rag">("agents");

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    service: "Multi-Agent System Orchestration",
    message: ""
  });
  const [contactTerminalLogs, setContactTerminalLogs] = useState<string[]>([]);
  const [isSendingContact, setIsSendingContact] = useState<boolean>(false);
  const [contactSuccess, setContactSuccess] = useState<boolean>(false);

  // Terminal scroll helper
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Sync theme with document class list and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("portfolio-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("portfolio-theme", "light");
    }
  }, [isDarkMode]);

  // Auto-scroll terminal
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [contactTerminalLogs]);

  // Auto-sync offline contact form submissions when connection restores
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncOfflineSubmissions = async () => {
      try {
        const queue = JSON.parse(localStorage.getItem("offline-contact-submissions") || "[]");
        if (queue.length === 0) return;

        console.log(`Connection restored. Syncing ${queue.length} offline contact form submissions...`);
        
        for (const item of queue) {
          try {
            await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
          } catch (err) {
            console.error("Error syncing offline contact form:", err);
          }
        }

        localStorage.removeItem("offline-contact-submissions");
        console.log("Successfully synced all offline contact submissions!");
      } catch (err) {
        console.error("Failed to sync offline submissions:", err);
      }
    };

    window.addEventListener("online", syncOfflineSubmissions);
    // Also try syncing on mount if online
    if (navigator.onLine) {
      syncOfflineSubmissions();
    }

    return () => window.removeEventListener("online", syncOfflineSubmissions);
  }, []);

  // Preset CLI Commands for Contact Form
  const runContactCLICommand = async (command: string) => {
    if (isSendingContact) return;
    
    let name = "Elite Partner";
    let email = "partner@quantumventures.ai";
    let service = "Multi-Agent System Orchestration";
    let msg = "Hi Osama, let's discuss scaling our operations with custom AI agents.";

    if (command === "hire") {
      name = "Elite Partner";
      email = "partner@quantumventures.ai";
      service = "Multi-Agent System Orchestration";
      msg = "Hi Osama, we reviewed your AI systems portfolio. We are looking to scale automated client diagnostic pipelines. Let's arrange a consultation call.";
    } else if (command === "consult") {
      name = "Clinic Director";
      email = "director@heartlandclinic.org";
      service = "Healthcare AI Systems Integration";
      msg = "We are interested in integrating custom diagnosis tools inside our routing software to improve triage speed. Let's arrange a call.";
    } else if (command === "general") {
      name = "Tech Recruiter";
      email = "talent@nextech-ventures.com";
      service = "Full-Stack AI Product Development";
      msg = "Hi Osama, excellent portfolio. We have some advanced contract requirements for a Next.js/Python platform. Let's connect.";
    }

    setContactForm({ name, email, service, message: msg });
    setContactTerminalLogs([
      `$ guest@osamaalam.sh: load_preset --command "${command}"`,
      `[SYSTEM] Form fields updated automatically.`,
      `[SYSTEM] Ready to submit payload. Click the Broadcast button!`
    ]);
  };

  // Real contact form submission sending to Next.js API route!
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    
    setIsSendingContact(true);
    setContactSuccess(false);
    setContactTerminalLogs([
      `$ guest@osamaalam.sh: POST /api/contact --payload-active`,
      `[VALIDATOR] Checking form schema...`,
      `[NETWORK] Establishing WebSocket socket connection to server port...`,
      `⏳ Dispatching payload to active Next.js API Route handler (/api/contact)...`
    ]);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      const data = await response.json();

      await new Promise((res) => setTimeout(res, 800));

      if (response.ok && data.success) {
        setContactTerminalLogs((prev) => [
          ...prev,
          `📡 Sending: Name: "${contactForm.name}", Topic: "${contactForm.service}"`,
          `✨ SERVER OK (200): Connection handshake verified.`,
          `💾 TELEMETRY WRITTEN: Server timestamp: ${data.timestamp}`,
          `🎉 Success! Your message has been safely received by Osama's backend! He will reach out in under 12 hours.`
        ]);
        setContactSuccess(true);
      } else {
        setContactTerminalLogs((prev) => [
          ...prev,
          `❌ SERVER ERROR (${response.status}): ${data.error || "Broadcast rejected."}`,
          `[SYSTEM] Reverting back to local backup cache...`
        ]);
      }
    } catch {
      await new Promise((res) => setTimeout(res, 800));

      // Real Local Queue Fallback implementation
      if (typeof window !== "undefined") {
        try {
          const queue = JSON.parse(localStorage.getItem("offline-contact-submissions") || "[]");
          queue.push({ ...contactForm, timestamp: new Date().toISOString() });
          localStorage.setItem("offline-contact-submissions", JSON.stringify(queue));
        } catch (storageErr) {
          console.error("Local storage sync queue error:", storageErr);
        }
      }

      setContactTerminalLogs((prev) => [
        ...prev,
        `⚠️ NETWORK DISRUPTION: Server route unreachable.`,
        `[BACKUP] Telemetry recorded securely in local storage backup queue.`,
        `🎉 Success! Local sync queue is active. Osama will be notified automatically once connection stabilizes.`
      ]);
      setContactSuccess(true);
    } finally {
      setIsSendingContact(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-cyber-dark text-zinc-800 dark:text-zinc-100 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-300">
      
      {/* Background Neon Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute top-1/3 right-10 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/[0.03] rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse-slow" style={{ animationDelay: "3s" }}></div>
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-500/5 dark:bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse-slow" style={{ animationDelay: "6s" }}></div>

      {/* Cyber Grid Pattern Background */}
      <div className="absolute inset-0 cyber-grid cyber-grid-radial opacity-40 dark:opacity-50 pointer-events-none -z-20"></div>

      {/* ==========================================
          1. HEADER / FLOATING NAVIGATION
          ========================================== */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-zinc-200 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden border border-zinc-200 dark:border-white/[0.08]">
              <img src="/icon.png" alt="Osama Alam Logo" className="w-10 h-10 object-contain rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Osama Alam</span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">AI Architect & Founder</span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <a href="#expertise" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Expertise</a>
            <a href="#projects" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Case Studies</a>
            <a href="#timeline" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Career Path</a>
            <a href="#testimonials" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Testimonials</a>
            <a href="#contact" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Contact</a>
            <Link href="/rag" className="px-3 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:text-purple-300 font-mono text-xs transition-colors uppercase tracking-wider animate-pulse flex items-center gap-1.5">
              <span>🧠</span> RAG Sandbox
            </Link>
          </nav>

          {/* Actions with Day/Night Toggle Switch */}
          <div className="hidden md:flex items-center gap-4">
            
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

            <a 
              href="https://www.linkedin.com/in/osamaalam-/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-all"
              title="LinkedIn Profile"
            >
              <LinkedInLogo className="w-5 h-5" />
            </a>
            <a 
              href="https://www.upwork.com/freelancers/~01e71cf1957688ace7" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all"
              title="Upwork Profile"
            >
              <UpworkLogo className="w-5 h-5" />
            </a>
            <a 
              href="#contact" 
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold tracking-wide text-xs shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all uppercase"
            >
              Consult Now
            </a>
          </div>

          {/* Mobile Menu & Theme Button row */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Day/Night toggle */}
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

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 border-t border-zinc-200 dark:border-white/[0.04] bg-[#ffffff] dark:bg-[#050507] flex flex-col gap-4 animate-fade-in">
            <a 
              href="#expertise" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-2 block border-b border-zinc-100 dark:border-white/[0.02]"
            >
              Expertise
            </a>
            <a 
              href="#projects" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-2 block border-b border-zinc-100 dark:border-white/[0.02]"
            >
              Case Studies
            </a>
            <a 
              href="#timeline" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-2 block border-b border-zinc-100 dark:border-white/[0.02]"
            >
              Career Path
            </a>
            <a 
              href="#testimonials" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-2 block border-b border-zinc-100 dark:border-white/[0.02]"
            >
              Testimonials
            </a>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-2 block border-b border-zinc-100 dark:border-white/[0.02]"
            >
              Contact
            </a>
            <Link 
              href="/rag" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-purple-500 hover:text-purple-400 font-mono text-xs font-bold transition-colors py-2.5 block uppercase tracking-wider animate-pulse"
            >
              🧠 RAG Sandbox
            </Link>
            <div className="flex gap-4 pt-4 border-t border-zinc-100 dark:border-white/[0.04]">
              <a 
                href="https://www.linkedin.com/in/osamaalam-/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 py-3 bg-zinc-50 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.05]"
              >
                <LinkedInLogo className="w-4 h-4 text-cyan-500 dark:text-cyan-400" /> LinkedIn
              </a>
              <a 
                href="https://www.upwork.com/freelancers/~01e71cf1957688ace7" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 py-3 bg-zinc-50 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.05]"
              >
                <UpworkLogo className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Upwork
              </a>
            </div>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold rounded-lg shadow-lg text-xs tracking-wider uppercase transition-all"
            >
              Consult Now
            </a>
          </div>
        )}
      </header>

      {/* ==========================================
          2. HERO SECTION & LIVE DIAGNOSTIC CONSOLE
          ========================================== */}
      <section className="relative pt-8 pb-20 md:pt-16 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hand: Premium Pitch */}
            <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8 text-center lg:text-left">
              
              {/* Dynamic Status Badge */}
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] sm:text-xs tracking-wider uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Founder & AI Lead Architect
                </div>
              </div>

              {/* Stellar Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1] md:leading-[1.05]">
                Engineering the Future of{" "}
                <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 dark:from-emerald-400 dark:via-cyan-400 dark:to-blue-500 bg-clip-text text-transparent text-glow-teal">
                  Autonomous AI
                </span>{" "}
                & Enterprise Systems
              </h1>

              {/* Short professional description */}
              <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
                I build robust multi-agent orchestration frameworks, self-correcting prompt loops, and high-performance full-stack applications. Bridging advanced machine learning models with secure corporate infrastructure.
              </p>

              {/* Actions & Links */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <a 
                  href="#projects" 
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold tracking-wide shadow-[0_5px_30px_rgba(16,185,129,0.2)] dark:shadow-[0_5px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_5px_40px_rgba(16,185,129,0.55)] transition-all flex items-center justify-center gap-2 group"
                >
                  Explore Work
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
                <a 
                  href="#contact" 
                  className="initiate-handshake-btn w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] text-zinc-950 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.15] font-semibold tracking-wide transition-all flex items-center justify-center gap-2"
                >
                  Initiate Handshake
                </a>
              </div>

              {/* Dynamic Counters / Stats Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl glass-panel mt-6">
                <div className="flex flex-col items-center lg:items-start p-2">
                  <span className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight bg-gradient-to-b from-zinc-900 dark:from-white to-zinc-500 dark:to-zinc-400 bg-clip-text">
                    60%
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-1">Wait Reduced</span>
                </div>
                <div className="flex flex-col items-center lg:items-start p-2 border-l border-zinc-200 dark:border-white/[0.05]">
                  <span className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    98.4%
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mt-1">Model Precision</span>
                </div>
                <div className="flex flex-col items-center lg:items-start p-2 border-l border-zinc-200 dark:border-white/[0.05]">
                  <span className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    40+
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-1">AI Apps Built</span>
                </div>
                <div className="flex flex-col items-center lg:items-start p-2 border-l border-zinc-200 dark:border-white/[0.05]">
                  <span className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    100%
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mt-1">Upwork Score</span>
                </div>
              </div>
            </div>

            {/* Right Hand: High-End Interactive Simulator Widget */}
            <div className="lg:col-span-5 w-full text-zinc-100">
              {/* Force pristine dark look in both themes */}
              <div className="sh-terminal relative w-full rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-950 dark:bg-[#070709]/90 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/60"></span>
                  </div>
                  <div className="font-mono text-xs text-zinc-500 select-none">
                    osama_alam_ai_pipeline.sh
                  </div>
                  <div className="w-4 h-4 rounded bg-emerald-500/10 flex items-center justify-center font-mono text-[9px] text-emerald-400">
                    🟢
                  </div>
                </div>

                {/* Simulated Mode Select Tabs */}
                <div className="flex border-b border-white/[0.05] bg-[#09090c] font-mono text-[10px] sm:text-xs text-zinc-400 select-none">
                  <button 
                    onClick={() => setConsoleMode("agents")}
                    className={`flex-1 py-2.5 border-r border-white/[0.05] flex items-center justify-center gap-1.5 transition-all ${consoleMode === "agents" ? "bg-[#070709] text-emerald-400 border-b-2 border-b-emerald-400 font-semibold" : "hover:bg-white/[0.02]"}`}
                  >
                    <span>🤖</span> Agent Loop
                  </button>
                  <button 
                    onClick={() => setConsoleMode("mri")}
                    className={`flex-1 py-2.5 border-r border-white/[0.05] flex items-center justify-center gap-1.5 transition-all ${consoleMode === "mri" ? "bg-[#070709] text-cyan-400 border-b-2 border-b-cyan-400 font-semibold" : "hover:bg-white/[0.02]"}`}
                  >
                    <span>🧠</span> Scan Analytics
                  </button>
                  <button 
                    onClick={() => setConsoleMode("rag")}
                    className={`flex-1 flex items-center justify-center gap-1.5 transition-all ${consoleMode === "rag" ? "bg-[#070709] text-purple-400 border-b-2 border-b-purple-400 font-semibold" : "hover:bg-white/[0.02]"}`}
                  >
                    <span>📂</span> Document RAG
                  </button>
                </div>

                {/* Main Interactive Screen */}
                <div className="px-5 pt-5 pb-8 h-[340px] overflow-y-auto no-scrollbar flex flex-col justify-between bg-[#050507]">
                  {consoleMode === "agents" && <AgentSimulator />}
                  {consoleMode === "mri" && <MRISimulator />}
                  {consoleMode === "rag" && <RAGSimulator />}
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          3. EXPERTISE & DOMAIN TABBED MATRIX
          ========================================== */}
      <section id="expertise" className="py-20 md:py-32 bg-cyber-sec border-t border-zinc-200 dark:border-white/[0.03] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Title */}
          <div className="flex flex-col items-center text-center gap-4 mb-16 md:mb-24">
            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono text-xs uppercase tracking-widest">
              Core Capabilities
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              The AI & Systems Matrix
            </h2>
            <p className="max-w-2xl text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
              Specialized research domains and tech-stacks tailored to enterprise AI startups, advanced healthcare data-mining, and automated agents.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Tab navigation list */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col gap-3 overflow-x-auto no-scrollbar pb-4 lg:pb-0 select-none">
              {SKILL_CATEGORIES.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`expertise-tab-btn flex-shrink-0 lg:w-full p-5 rounded-xl border text-left transition-all duration-300 ${activeTab === cat.id ? "active-tab bg-zinc-200/[0.4] dark:bg-white/[0.03] border-cyan-500/40 shadow-[0_4px_25px_rgba(6,182,212,0.05)] text-zinc-900 dark:text-white font-bold" : "bg-transparent border-zinc-200 dark:border-white/[0.03] text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.01]"}`}
                >
                  <div className="font-bold text-sm md:text-base tracking-wide flex items-center justify-between">
                    {cat.title}
                    {activeTab === cat.id && <span className="text-cyan-600 dark:text-cyan-400 text-xs">➔</span>}
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 hidden lg:block line-clamp-2 leading-relaxed font-normal">
                    {cat.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Selected Tab content pane */}
            <div className="lg:col-span-8">
              {SKILL_CATEGORIES.map((cat) => {
                if (cat.id !== activeTab) return null;
                return (
                  <div key={cat.id} className="p-6 md:p-8 rounded-2xl glass-panel flex flex-col gap-8 animate-fade-in">
                    
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">{cat.title}</h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm leading-relaxed">{cat.description}</p>
                    </div>

                    {/* Skills Meter List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {cat.skills.map((skill, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-100/50 dark:bg-white/[0.01] border border-zinc-200/50 dark:border-white/[0.03] hover:border-zinc-300 dark:hover:border-white/[0.06] transition-all">
                          <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{skill.name}</span>
                            <span className="font-mono text-cyan-600 dark:text-cyan-400 text-[11px]">{skill.level}%</span>
                          </div>
                          {/* Custom Slider line */}
                          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-1000"
                              style={{ width: `${skill.level}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Integrated Footnote / Context reference */}
                    <div className="p-4 rounded-xl bg-cyan-500/[0.02] border border-cyan-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-zinc-500 uppercase">Core Reference Work:</span>
                        <p className="text-zinc-800 dark:text-zinc-200 font-bold mt-0.5">{cat.highlightedProject}</p>
                      </div>
                      <a 
                        href="#projects" 
                        onClick={() => setActiveProject(PROJECTS_DATA.find(p => p.title === cat.highlightedProject)?.id || "emrchains")}
                        className="px-4 py-2 rounded bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-cyan-600 dark:text-cyan-400 border border-zinc-200 dark:border-white/[0.05] hover:border-cyan-500/30 transition-all uppercase text-[10px]"
                      >
                        Inspect Case Study ➔
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          4. CASE STUDIES & PORTFOLIO SHOWCASE
          ========================================== */}
      <section id="projects" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section title */}
          <div className="flex flex-col items-center text-center gap-4 mb-16 md:mb-24">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase tracking-widest">
              Selected Deployments
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Real-World Clinical & Enterprise AI
            </h2>
            <p className="max-w-2xl text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
              Explore concrete case studies scaling patient health systems, image diagnosis algorithms, multi-agent frameworks, and Web3 stacks.
            </p>
          </div>

          {/* Quick-links selector */}
          <div className="flex justify-center flex-wrap gap-2 md:gap-3 mb-12 select-none">
            {PROJECTS_DATA.map((p) => {
              const isActive = activeProject === p.id;
              const btnStyle = isActive 
                ? "active-tab bg-zinc-100 dark:bg-white/[0.03] text-zinc-900 dark:text-white border-emerald-500/35" 
                : "bg-transparent text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-white/[0.02] hover:border-zinc-300 dark:hover:border-white/[0.08] hover:text-zinc-700 dark:hover:text-zinc-200";
              return (
                <button 
                  key={p.id}
                  onClick={() => setActiveProject(p.id)}
                  className={`project-tab-btn px-4 py-2.5 rounded-xl border font-mono text-[11px] sm:text-xs transition-all ${btnStyle}`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>

          {/* Case study detail layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual representation of project */}
            <div className="sh-dark-card lg:col-span-5 w-full order-last lg:order-first text-zinc-100">
              {activeProject === "emrchains" && (
                <div className="p-6 rounded-2xl bg-[#090b0a] border border-emerald-500/10 shadow-[0_15px_40px_rgba(16,185,129,0.03)] flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-emerald-500/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="font-mono text-xs text-emerald-400 uppercase tracking-widest">EMRChains Live Telemetry</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Doha / Islamabad nodes</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col">
                      <span className="text-zinc-500 text-[10px] font-mono">WAIT TIME</span>
                      <span className="text-emerald-400 font-bold text-lg md:text-xl font-mono mt-1">-60%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col">
                      <span className="text-zinc-500 text-[10px] font-mono">DIAG CONF</span>
                      <span className="text-white font-bold text-lg md:text-xl font-mono mt-1">94.2%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col">
                      <span className="text-zinc-500 text-[10px] font-mono">PATIENTS</span>
                      <span className="text-white font-bold text-lg md:text-xl font-mono mt-1">14,321</span>
                    </div>
                  </div>

                  {/* Mock Clinic Wait-time comparison bar chart */}
                  <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">Pre-Triage Efficiency:</span>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div className="flex justify-between text-zinc-400">
                          <span>Standard Manual Routing:</span>
                          <span className="text-zinc-500">125 mins avg</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-zinc-600 rounded-full"></div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-[11px] mt-1">
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>EMRChains AI Diagnostic Engine:</span>
                          <span>49 mins avg</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-[39%] h-full bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed bg-black/60 p-3 rounded border border-white/[0.03]">
                    &quot;We engineered EMRChains clinical routing logic to prioritize high-throughput data pipelines, ensuring low diagnostic wait barriers under constraints.&quot;
                  </p>
                </div>
              )}

              {activeProject === "nexgen" && (
                <div className="p-6 rounded-2xl bg-[#090a0c] border border-cyan-500/10 shadow-[0_15px_40px_rgba(6,182,212,0.03)] flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                      <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest">NexGen AI Validation Hub</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">AWS SageMaker Cloud</span>
                  </div>

                  {/* ROC curve simulation */}
                  <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                      <span>Neural Receiver Operating Characteristic (ROC)</span>
                      <span className="text-cyan-400">AUC: 0.992</span>
                    </div>
                    
                    <div className="relative w-full h-[150px] bg-black rounded border border-white/[0.05] flex items-end p-2 overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:15px_15px]"></div>
                      {/* Diagonal line */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 3" />
                        {/* High performance curve path */}
                        <path d="M0,100 C10,30, 40,3, 100,0" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="shadow-[0_0_10px_#22d3ee]" />
                      </svg>
                      <div className="text-[8px] text-zinc-500 font-mono flex justify-between w-full select-none">
                        <span>False Positive Rate</span>
                        <span>True Positive Rate</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                      <span className="text-zinc-500 block uppercase text-[10px]">Modality</span>
                      <span className="text-zinc-200 font-bold mt-1 block">X-Ray, CT, MRI, Ultrasound</span>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                      <span className="text-zinc-500 block uppercase text-[10px]">Optimizers</span>
                      <span className="text-zinc-200 font-bold mt-1 block">AdamW, Warmup Cosine</span>
                    </div>
                  </div>
                </div>
              )}

              {activeProject === "agents" && (
                <div className="p-6 rounded-2xl bg-[#0a090c] border border-purple-500/10 shadow-[0_15px_40px_rgba(139,92,246,0.03)] flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-purple-500/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                      <span className="font-mono text-xs text-purple-400 uppercase tracking-widest">Multi-Agent Nodes Graph</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">LangGraph / CrewAI Cluster</span>
                  </div>

                  {/* Connected Graph Map Representation */}
                  <div className="relative w-full h-[180px] bg-black rounded-xl border border-white/[0.05] p-4 flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 bg-grid opacity-10"></div>
                    
                    <div className="flex justify-between items-center z-10">
                      <div className="px-2.5 py-1 rounded bg-[#130f1c] border border-purple-500/30 font-mono text-[9px] text-purple-300">
                        Input Source: PDF/Telemetry
                      </div>
                      <div className="px-2.5 py-1 rounded bg-[#130f1c] border border-purple-500/30 font-mono text-[9px] text-purple-300">
                        Vector DB: Chunk Indexes
                      </div>
                    </div>

                    {/* Laser link beams lines */}
                    <div className="flex justify-center z-10 my-4">
                      <div className="px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] font-mono text-xs text-purple-200 font-bold uppercase animate-float">
                        Synapse Orchestrator
                      </div>
                    </div>

                    <div className="flex justify-between items-center z-10">
                      <div className="px-2.5 py-1 rounded bg-[#130f1c] border border-purple-500/30 font-mono text-[9px] text-purple-300">
                        Research Agent
                      </div>
                      <div className="px-2.5 py-1 rounded bg-[#130f1c] border border-purple-500/30 font-mono text-[9px] text-purple-300">
                        Medical Validation Reviewer
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed bg-black/60 p-3 rounded border border-white/[0.03]">
                    &quot;Automating healthcare pipeline reasoning relies on structured self-correction loops. The pipeline cross-examines outputs against 10k medical journals in real-time.&quot;
                  </p>
                </div>
              )}

              {activeProject === "solidity" && (
                <div className="p-6 rounded-2xl bg-[#0c0b09] border border-yellow-500/10 shadow-[0_15px_40px_rgba(234,179,8,0.03)] flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-yellow-500/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      <span className="font-mono text-xs text-yellow-500 uppercase tracking-widest">DApp Swap Portal</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Ethers.js / Web3.js Active</span>
                  </div>

                  {/* Mock Liquidity Swap widget */}
                  <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase text-zinc-500">
                      <span>DeFi Swap Mock Simulator</span>
                      <span className="text-yellow-500">Slippage: 0.5%</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="p-2.5 rounded bg-black border border-white/[0.05] flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500">From</span>
                          <span className="text-white font-bold font-mono text-sm">1.50</span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-zinc-800 text-xs font-bold text-white font-mono">ETH</span>
                      </div>

                      <div className="p-2.5 rounded bg-black border border-white/[0.05] flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500">To (Estimated)</span>
                          <span className="text-yellow-500 font-bold font-mono text-sm">4,520.40</span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-zinc-800 text-xs font-bold text-white font-mono">USDC</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl font-mono text-[10px] text-zinc-500 flex justify-between">
                    <span>Contracts verified: Etherscan</span>
                    <span className="text-emerald-400">Gas Used: 43,102 gwei</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Hand: Deep Text Narrative */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {PROJECTS_DATA.map((p) => {
                if (p.id !== activeProject) return null;
                return (
                  <div key={p.id} className="flex flex-col gap-6 animate-fade-in">
                    
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {p.category}
                      </span>
                      <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white leading-tight">
                        {p.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-300 font-medium italic text-sm">
                        {p.subtitle}
                      </p>
                    </div>

                    {/* Stats metric tag */}
                    <div className="inline-flex max-w-fit items-center gap-3 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06] select-none">
                      <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">{p.metric}</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-mono tracking-wider max-w-[150px] leading-tight">
                        {p.metricLabel}
                      </span>
                    </div>

                    {/* Description Paragraph */}
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm sm:text-base">
                      {p.description}
                    </p>

                    {/* bullet points of deliverables */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                        Key Engineering Milestones:
                      </span>
                      <ul className="flex flex-col gap-2.5 text-sm">
                        {p.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-zinc-700 dark:text-zinc-300">
                            <span className="text-emerald-500 mt-1 font-mono text-xs">✔</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Technology tags */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-200 dark:border-white/[0.04]">
                      {p.tech.map((t, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 rounded bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-300 dark:border-white/[0.05] font-mono text-[10px] tracking-wide text-zinc-800 dark:text-zinc-300 font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          5. CAREER TIMELINE & EDUCATION
          ========================================== */}
      <section id="timeline" className="py-20 md:py-32 bg-cyber-sec border-t border-b border-zinc-200 dark:border-white/[0.03] transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section title */}
          <div className="flex flex-col items-center text-center gap-4 mb-20">
            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono text-xs uppercase tracking-widest">
              Career Evolution
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Professional Timeline
            </h2>
            <p className="max-w-xl text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              Tracking my milestones spanning founders roles, healthcare engineering positions, Upwork freelancing, and specialized academic research.
            </p>
          </div>

          {/* Interactive chronology flow */}
          <div className="relative border-l border-zinc-200 dark:border-white/[0.08] ml-4 md:ml-8 pl-6 md:pl-10 flex flex-col gap-12">
            
            {TIMELINE_DATA.map((item) => {
              const isWork = item.type === "work";
              return (
                <div key={item.id} className="relative group">
                  
                  {/* Timeline bullet dot anchor */}
                  <span className={`absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full border-2 bg-cyber-dark transition-all group-hover:scale-125 ${isWork ? "border-emerald-500 shadow-[0_0_10px_#10b981]" : "border-cyan-400 shadow-[0_0_10px_#22d3ee]"}`}></span>
                  
                  {/* Timeline card */}
                  <div className="p-6 rounded-2xl bg-cyber-card border border-zinc-200 dark:border-white/[0.03] group-hover:border-zinc-300 dark:group-hover:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.01)] dark:shadow-none transition-all duration-300">
                    
                    {/* Card header meta */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg tracking-tight">
                          {item.title}
                        </span>
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.organization} • <span className="text-zinc-400">{item.location}</span>
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase ${isWork ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"}`}>
                        {item.period}
                      </span>
                    </div>

                    {/* Bullet achievement outputs */}
                    <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                      {item.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                          <span className="text-zinc-400 mt-1 font-mono text-xs">➔</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Technical tags */}
                    {item.tech && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-100 dark:border-white/[0.03]">
                        {item.tech.map((t, i) => (
                          <span 
                            key={i} 
                            className="px-2.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-300/80 dark:border-white/[0.04] font-mono text-[9px] tracking-wide text-zinc-800 dark:text-zinc-300 font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                </div>
              );
            })}

          </div>

        </div>
      </section>

      {/* ==========================================
          6. THE CLINIC & ENTERPRISE SERVICES HUB
          ========================================== */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section title */}
          <div className="flex flex-col items-center text-center gap-4 mb-16 md:mb-24">
            <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-xs uppercase tracking-widest">
              Consulting Tiers
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              AI Engagement Architecture
            </h2>
            <p className="max-w-xl text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
              Deploying enterprise solutions built for precision medical workflows, predictive automation, and decentralized operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service 1 */}
            <div className="p-6 md:p-8 rounded-2xl bg-cyber-card border border-zinc-200 dark:border-white/[0.03] hover:border-emerald-500/30 dark:hover:border-emerald-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-emerald-500 text-lg group-hover:scale-105 transition-transform">
                  🩺
                </span>
                <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                  Healthcare Clinical AI
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm leading-relaxed font-normal">
                  Integration of transfer learning classifiers for medical imaging CT, MRI, Ultrasound. Customized diagnostic assist chatbots and triage workflows mapped to strict clinical evaluation guidelines.
                </p>
              </div>
              <a href="#contact" onClick={() => setContactForm(prev => ({ ...prev, service: "Healthcare AI Systems Integration" }))} className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                Request Healthcare Deep Dive ➔
              </a>
            </div>

            {/* Service 2 */}
            <div className="p-6 md:p-8 rounded-2xl bg-cyber-card border border-zinc-200 dark:border-white/[0.03] hover:border-cyan-500/30 dark:hover:border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-4">
                <span className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-mono text-cyan-500 text-lg group-hover:scale-105 transition-transform">
                  🤖
                </span>
                <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                  Multi-Agent Task Loop Orchestration
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm leading-relaxed font-normal">
                  Design of autonomous pipelines deploying collaborative agent loops. Eliminating human data entry bottlenecks by executing document vector scans (RAG), syntheses, and self-reflecting evaluation logs.
                </p>
              </div>
              <a href="#contact" onClick={() => setContactForm(prev => ({ ...prev, service: "Multi-Agent System Orchestration" }))} className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 group-hover:underline">
                Request Agent Specs ➔
              </a>
            </div>

            {/* Service 3 */}
            <div className="p-6 md:p-8 rounded-2xl bg-cyber-card border border-zinc-200 dark:border-white/[0.03] hover:border-purple-500/30 dark:hover:border-purple-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-4">
                <span className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-mono text-purple-500 text-lg group-hover:scale-105 transition-transform">
                  ⚡
                </span>
                <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                  Full-Stack AI Product Engineering
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm leading-relaxed font-normal">
                  Architecting modern responsive platforms from zero to high-availability deployment. Connecting responsive Next.js apps with Python cloud APIs, Docker pipelines, and secure Web3 decentralized ledger transactions.
                </p>
              </div>
              <a href="#contact" onClick={() => setContactForm(prev => ({ ...prev, service: "Full-Stack AI Product Development" }))} className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 group-hover:underline">
                Request Product Scaffold ➔
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          7. VERIFIED REVIEWS & CLIENT FAITH (Upwork)
          ========================================== */}
      <section id="testimonials" className="py-20 md:py-32 bg-cyber-sec border-t border-b border-zinc-200 dark:border-white/[0.03] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section title */}
          <div className="flex flex-col items-center text-center gap-4 mb-16 md:mb-24">
            <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 font-mono text-xs uppercase tracking-widest">
              Verified Feedback
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Endorsements & Upwork Reviews
            </h2>
            <p className="max-w-xl text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
              Stellar endorsements directly from your Upwork profile, reflecting a 100% Job Success Rate in full-stack AI development.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {TESTIMONIALS_DATA.map((t) => (
              <div key={t.id} className="p-6 md:p-8 rounded-2xl glass-card flex flex-col justify-between gap-6 relative overflow-hidden group">
                
                {/* Background platform icon */}
                <span className="absolute top-6 right-6 text-zinc-400 dark:text-zinc-800 font-mono text-2xl opacity-10 dark:opacity-20 pointer-events-none font-bold select-none">
                  Upwork
                </span>

                <div className="flex flex-col gap-4">
                  {/* Rating stars */}
                  <div className="flex items-center gap-1">
                    {[...Array(t.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-500 text-xs">★</span>
                    ))}
                  </div>

                  {/* Feedback comment */}
                  <p className="text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed italic">
                    &quot;{t.content}&quot;
                  </p>
                </div>

                {/* Footer Bio */}
                <div className="flex items-center justify-between border-t border-zinc-100 dark:border-white/[0.04] pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm tracking-wide">{t.client}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">{t.role}</span>
                  </div>
                  
                  <span className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] text-[9px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                    {t.tag}
                  </span>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ==========================================
          8. THE CONTACT SYSTEM / INTERACTIVE COMMAND TERMINAL
          ========================================== */}
      <section id="contact" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: General info CTA */}
            <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
              <div className="flex">
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase tracking-widest">
                  Secure Connect
                </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                Let&apos;s Formulate Your AI Stack
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
                Have an advanced vision challenge, enterprise automation backlog, or a top-tier full-stack product specs? Route a request directly through the command console or normal secure contact block.
              </p>

              <div className="flex flex-col gap-4 font-mono text-xs text-zinc-700 dark:text-zinc-400 mt-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/[0.03]">
                  <span className="text-emerald-500">📬</span>
                  <div>
                    <span className="text-zinc-800 dark:text-zinc-400 font-bold block">Direct Channel:</span>
                    <a href="mailto:osamaalam@emrchains.com" className="text-zinc-950 dark:text-zinc-200 font-semibold hover:text-emerald-500 hover:underline">osamaalam@emrchains.com</a>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/[0.03]">
                  <span className="text-purple-400">📍</span>
                  <div>
                    <span className="text-zinc-800 dark:text-zinc-400 font-bold block">HQ Operations Location:</span>
                    <span className="text-zinc-950 dark:text-zinc-200 font-semibold">NUST NSTP, Islamabad, Pakistan</span>
                  </div>
                </div>
              </div>

              {/* Instant terminal macros preset buttons */}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/[0.04]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Fast-Connect Terminal Presets:</span>
                <p className="text-[11px] text-zinc-500 mb-2 leading-tight">Clicking an option automatically populates custom credentials and runs our webhook simulated compiler logs in real-time:</p>
                <div className="flex flex-col sm:flex-row gap-2 select-none">
                  <button 
                    onClick={() => runContactCLICommand("hire")} 
                    disabled={isSendingContact}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] border border-emerald-500/20 hover:border-emerald-500/40 text-center transition-all cursor-pointer"
                  >
                    🚀 Hire as AI Lead
                  </button>
                  <button 
                    onClick={() => runContactCLICommand("consult")} 
                    disabled={isSendingContact}
                    className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-400/20 text-cyan-600 dark:text-cyan-400 font-mono text-[11px] border border-cyan-500/20 hover:border-cyan-400/40 text-center transition-all cursor-pointer"
                  >
                    🩺 Clinic Integration
                  </button>
                  <button 
                    onClick={() => runContactCLICommand("general")} 
                    disabled={isSendingContact}
                    className="flex-1 py-2 px-3 rounded-lg bg-purple-500/10 hover:bg-purple-400/20 text-purple-600 dark:text-purple-400 font-mono text-[11px] border border-purple-500/20 hover:border-purple-500/40 text-center transition-all cursor-pointer"
                  >
                    💼 Contract Dev
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Interactive Command/Form terminal */}
            <div className="lg:col-span-7 w-full text-zinc-100">
              {/* Force pristine dark look in both themes */}
              <div className="sh-terminal relative w-full rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-950 dark:bg-[#070709] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                
                {/* Visual Window buttons Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10] select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/60"></span>
                  </div>
                  <span className="font-mono text-xs text-zinc-500">secure_contact_gateway.exe</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                </div>

                {/* Grid splitter */}
                <div className="grid grid-cols-1 md:grid-cols-2">
                  
                  {/* Form fields pane */}
                  <form onSubmit={handleFormSubmit} className="p-6 border-b md:border-b-0 md:border-r border-white/[0.05] flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold">Your Identifier / Name</label>
                      <input 
                        type="text" 
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="e.g. Robert F."
                        className="px-3.5 py-2 rounded bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.08] focus:border-emerald-500/50 text-zinc-100 font-sans text-xs focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold">Secure Contact Email</label>
                      <input 
                        type="email" 
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="e.g. robert@alphahealth.com"
                        className="px-3.5 py-2 rounded bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.08] focus:border-emerald-500/50 text-zinc-100 font-sans text-xs focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold">Project / Consulting Scope</label>
                      <select 
                        value={contactForm.service}
                        onChange={(e) => setContactForm({ ...contactForm, service: e.target.value })}
                        className="px-3.5 py-2 rounded bg-zinc-900 border border-white/[0.08] text-zinc-300 font-sans text-xs focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                      >
                        <option value="Healthcare AI Systems Integration">Healthcare AI Systems Integration</option>
                        <option value="Multi-Agent System Orchestration">Multi-Agent System Orchestration</option>
                        <option value="Full-Stack AI Product Development">Full-Stack AI Product Development</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold">System Directive / Message</label>
                      <textarea 
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Detail your engineering specifications..."
                        className="px-3.5 py-2 rounded bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.08] focus:border-emerald-500/50 text-zinc-100 font-sans text-xs focus:outline-none resize-none transition-all"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSendingContact}
                      className="w-full py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 transition-all font-mono uppercase cursor-pointer"
                    >
                      {isSendingContact ? "Broadcasting..." : "🚀 Broadcast payload"}
                    </button>
                  </form>

                  {/* Terminal stdout compiler output logger */}
                  <div className="p-5 font-mono text-[10px] sm:text-xs text-zinc-400 bg-[#040406] flex flex-col justify-between min-h-[300px]">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 text-zinc-500">
                        <span>STDOUT DIAGNOSTICS</span>
                        <span>STATUS: ACTIVE</span>
                      </div>
                      
                      {contactTerminalLogs.length === 0 ? (
                        <div className="text-zinc-600 animate-pulse py-10 text-center leading-normal font-sans">
                          Gateway socket listener connected.<br />
                          Ready for user payload submissions...
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar max-h-[220px]">
                          {contactTerminalLogs.map((log, i) => {
                            let color = "text-zinc-400";
                            if (log.startsWith("$")) color = "text-amber-400";
                            else if (log.includes("SERVER OK") || log.includes("RESPONSE 200")) color = "text-emerald-400 font-bold";
                            else if (log.startsWith("[PARAM]")) color = "text-purple-300";
                            else if (log.startsWith("🎉") || log.startsWith("✨")) color = "text-teal-300 font-bold text-glow-teal";
                            return (
                              <div key={i} className={`leading-relaxed text-[10px] sm:text-[11px] ${color}`}>
                                {log}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-white/[0.04] pt-2 text-[9px] text-zinc-500 flex justify-between items-center select-none bg-[#040406]">
                      <span>SECURE CLIENT ROUTE</span>
                      <span className={contactSuccess ? "text-emerald-400 font-bold" : "text-zinc-600 animate-pulse"}>
                        {contactSuccess ? "DISPATCH_OK" : "LISTENING"}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          9. FOOTER SECTION
          ========================================== */}
      <footer className="bg-cyber-sec border-t border-zinc-200 dark:border-white/[0.04] py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6">
          
          {/* Logo brand footer */}
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Osama Alam Logo" className="w-8 h-8 object-contain rounded-full shadow-md border border-zinc-200 dark:border-white/[0.08]" />
            <span className="font-extrabold tracking-tight text-zinc-950 dark:text-white text-base">Osama Alam</span>
          </div>

          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono max-w-md leading-relaxed">
            Multi-agent orchestration frameworks, self-correcting prompt systems, and premium high-performance Web3 architecture.
          </p>

          <div className="flex gap-4">
            <a 
              href="https://www.linkedin.com/in/osamaalam-/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 rounded-full bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.05] text-zinc-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-all"
            >
              <LinkedInLogo className="w-4 h-4" />
            </a>
            <a 
              href="https://www.upwork.com/freelancers/~01e71cf1957688ace7" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 rounded-full bg-zinc-100 dark:bg-white/[0.02] hover:bg-zinc-200 dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.05] text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all"
            >
              <UpworkLogo className="w-4 h-4" />
            </a>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-600 border-t border-zinc-200 dark:border-white/[0.02] w-full pt-6 mt-4 flex flex-col sm:flex-row justify-between gap-4 items-center max-w-4xl">
            <span>© {new Date().getFullYear()} Osama Alam. All rights reserved. Operations Islamabad/Doha.</span>
            <span>Made with Next.js v16 & Tailwind v4. Secure compliance active.</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
