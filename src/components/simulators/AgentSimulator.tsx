import React, { useState, useEffect } from "react";

export default function AgentSimulator() {
  const [agentStep, setAgentStep] = useState<number>(0); // 0: Idle, 1: Step 1, 2: Step 2, 3: Step 3, 4: Done
  const [agentStatusText, setAgentStatusText] = useState<string>("System Idle. Ready to activate agents.");
  const [agentResultSummary, setAgentResultSummary] = useState<string>("");

  const triggerVisualAgentLoop = async () => {
    if (agentStep > 0 && agentStep < 4) return; // already running
    
    setAgentStep(1);
    setAgentStatusText("Agent 1 (Data Researcher) has started. Searching through corporate folders and databases for Q1 logs...");
    setAgentResultSummary("");
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setAgentStep(2);
    setAgentStatusText("Agent 2 (Analyst) is now active. Processing raw figures, checking math accuracy, and weeding out duplicates...");

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setAgentStep(3);
    setAgentStatusText("Agent 3 (Report Writer) is now formatting. Writing a clear, beautifully written summary report for the team...");

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setAgentStep(4);
    setAgentStatusText("Pipeline completed successfully!");
    setAgentResultSummary("✨ Success! In just 6 seconds, the three AI agents successfully collaborated to find, verify, and write a complete 12-page business summary. Handled completely automatically with 100% accuracy!");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerVisualAgentLoop();
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-between min-h-full">
      <div className="flex flex-col gap-4">
        <div className="text-center sm:text-left mb-1">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold tracking-wider">Multi-Agent Workflow Simulator</span>
          <h4 className="text-sm font-bold text-white mt-0.5">How Multiple AI Agents Collaborate</h4>
        </div>

        {/* Interactive flow graph of 3 agents */}
        <div className="grid grid-cols-3 gap-3 relative py-2">
          {/* Connector lines behind cards */}
          <div className="absolute top-[35px] left-[15%] right-[15%] h-0.5 bg-zinc-800 -z-10">
            <div 
              className="h-full bg-emerald-500 transition-all duration-[4s] ease-linear"
              style={{ 
                width: agentStep === 0 ? "0%" : agentStep === 1 ? "25%" : agentStep === 2 ? "65%" : "100%",
                boxShadow: "0 0 10px #10b981"
              }}
            ></div>
          </div>

          {/* Agent Card 1 */}
          <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all duration-500 ${agentStep === 1 ? "bg-emerald-500/10 border-emerald-500 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : agentStep > 1 ? "bg-[#0a0a0d] border-emerald-500/30 opacity-70" : "bg-[#08080a] border-white/[0.03]"}`}>
            <span className="text-lg">🔍</span>
            <span className="text-[10px] font-bold text-white mt-1">1. Research</span>
            <span className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Searches databases</span>
          </div>

          {/* Agent Card 2 */}
          <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all duration-500 ${agentStep === 2 ? "bg-cyan-500/10 border-cyan-500 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : agentStep > 2 ? "bg-[#0a0a0d] border-cyan-500/30 opacity-70" : "bg-[#08080a] border-white/[0.03]"}`}>
            <span className="text-lg">🧠</span>
            <span className="text-[10px] font-bold text-white mt-1">2. Analyst</span>
            <span className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Verifies accuracy</span>
          </div>

          {/* Agent Card 3 */}
          <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all duration-500 ${agentStep === 3 ? "bg-purple-500/10 border-purple-500 scale-105 shadow-[0_0_15px_rgba(139,92,246,0.2)]" : agentStep > 3 ? "bg-[#0a0a0d] border-purple-500/30 opacity-70" : "bg-[#08080a] border-white/[0.03]"}`}>
            <span className="text-lg">✍️</span>
            <span className="text-[10px] font-bold text-white mt-1">3. Writer</span>
            <span className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Drafts report</span>
          </div>
        </div>

        {/* Status Box */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] min-h-[50px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center leading-relaxed font-sans">
            {agentStep > 0 && agentStep < 4 && (
              <span className="inline-block animate-bounce mr-1.5">⚡</span>
            )}
            {agentStatusText}
          </p>
        </div>

        {/* Beautiful final outcome display */}
        {agentResultSummary && (
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed font-sans animate-fade-in">
            {agentResultSummary}
          </div>
        )}
      </div>

      <div className="pt-3 pb-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono">Simulating real business task</span>
        <button 
          onClick={triggerVisualAgentLoop} 
          disabled={agentStep > 0 && agentStep < 4}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 transition-all flex items-center gap-1 cursor-pointer animate-pulse"
        >
          {agentStep > 0 && agentStep < 4 ? "Running..." : "⚡ Activate Agents"}
        </button>
      </div>
    </div>
  );
}
