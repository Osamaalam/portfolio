import React, { useState } from "react";

interface Chunk {
  id: string;
  doc: string;
  score: number;
}

export default function RAGSimulator() {
  const [ragQuery, setRagQuery] = useState<string>("Summarize company logistics metrics for Q1");
  const [ragStatus, setRagStatus] = useState<string>("idle");
  const [ragChunks, setRagChunks] = useState<Chunk[]>([]);
  const [ragResponse, setRagResponse] = useState<string>("");

  const runRAGSearch = async () => {
    if (ragStatus === "searching" || ragStatus === "embedding" || ragStatus === "retrieving" || ragStatus === "generating") return;
    setRagStatus("searching");
    setRagChunks([]);
    setRagResponse("");

    await new Promise((res) => setTimeout(res, 800));
    setRagStatus("embedding");
    
    await new Promise((res) => setTimeout(res, 600));
    setRagStatus("retrieving");

    const q = (ragQuery || "").toLowerCase();
    let mockChunks: Chunk[] = [];
    let mockResponse = "";

    if (q.includes("revenue") || q.includes("sales") || q.includes("financial") || q.includes("profit") || q.includes("saas") || q.includes("money") || q.includes("cost") || q.includes("margin") || q.includes("growth")) {
      mockChunks = [
        { id: "saas-deck-doc-1", doc: "SaaS Sales Deck: Recurring revenue rose by 22% quarter-over-quarter. Average customer onboarding speed was shortened to 4 days.", score: 0.894 },
        { id: "financial-forecast-2", doc: "Operating profit margin improved to 34.5% due to SaaS renewals and enterprise contract expansion.", score: 0.821 }
      ];
      mockResponse = "The financial logs indicate that recurring SaaS revenue rose by 22% QoQ. Operating margins improved to 34.5% due to enterprise contract expansions, while client onboarding cycles were reduced to 4 days.";
    } else if (q.includes("clinical") || q.includes("medical") || q.includes("diagnosis") || q.includes("health") || q.includes("emr") || q.includes("hospital") || q.includes("imaging") || q.includes("patient") || q.includes("wait") || q.includes("triage")) {
      mockChunks = [
        { id: "clinical-deploy-doc-1", doc: "Clinical Deployment Log: Diagnostic triage chatbots reduced client wait-time by 60% average. Accuracy verified at 94.2%.", score: 0.931 },
        { id: "imaging-pipeline-report-2", doc: "Imaging Pipeline Report: Deep convolutional vision classifiers attained 98.4% diagnostic sensitivity on clinical datasets.", score: 0.864 }
      ];
      mockResponse = "Clinical deployment data shows diagnostic chatbots successfully cut hospital pre-triage delays by 60% with 94.2% verified confidence. The imaging classifiers achieved a diagnostic sensitivity of 98.4% on clinical datasets.";
    } else if (q.includes("solidity") || q.includes("contract") || q.includes("blockchain") || q.includes("crypto") || q.includes("wallet") || q.includes("web3") || q.includes("ether") || q.includes("token") || q.includes("audit")) {
      mockChunks = [
        { id: "omniledger-solidity-1", doc: "OmniLedger Solidity Spec: Hardhat smart contracts passed security audits with 0 critical or high vulnerability warnings.", score: 0.925 },
        { id: "web3-wallet-integration-2", doc: "Web3 Wallet Integration logs: MetaMask and WalletConnect sessions achieved sub-second latency across 1,000+ test trades.", score: 0.851 }
      ];
      mockResponse = "Web3 logs verify that OmniLedger Solidity smart contracts successfully passed audits with zero critical warnings. Wallet transactions (MetaMask/WalletConnect) operated at sub-second speeds under trade volumes.";
    } else {
      mockChunks = [
        { id: "logistics-doc-1", doc: "Q1 Operations Summary: Final transport logs recorded 98.6% on-time delivery index. Fuel overhead was optimized by 12%.", score: 0.912 },
        { id: "logistics-doc-2", doc: "Inventory Report: Warehousing storage reached 84% capacity. Optimized transit patterns resolved shipping delays.", score: 0.792 }
      ];
      mockResponse = `According to company files, Q1 operations were highly efficient. On-time deliveries hit 98.6%, fuel overhead dropped by 12%, and transit optimization minimized warehousing storage constraints. Matches found for: "${ragQuery || "Q1 Logistics"}".`;
    }

    setRagChunks(mockChunks);

    await new Promise((res) => setTimeout(res, 1000));
    setRagStatus("generating");
    
    await new Promise((res) => setTimeout(res, 1400));
    setRagResponse(mockResponse);
    setRagStatus("complete");
  };

  return (
    <div className="flex-1 flex flex-col justify-between min-h-full">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 font-mono">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Query Input:</label>
          <input 
            type="text" 
            value={ragQuery} 
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Type business query..."
            className="w-full px-3 py-1.5 rounded bg-white/[0.02] border border-white/[0.08] text-zinc-100 font-mono text-xs focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* RAG Dynamic Suggestion Preset Chips */}
        <div className="flex flex-wrap gap-1 mt-0.5 mb-1 select-none">
          <button 
            type="button"
            onClick={() => { setRagQuery("Summarize company logistics metrics for Q1"); setRagChunks([]); setRagResponse(""); setRagStatus("idle"); }}
            className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-purple-500/40 text-[9px] text-zinc-300 font-mono transition-all cursor-pointer"
          >
            🚚 Logistics
          </button>
          <button 
            type="button"
            onClick={() => { setRagQuery("What was the SaaS sales revenue and profit growth?"); setRagChunks([]); setRagResponse(""); setRagStatus("idle"); }}
            className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-purple-500/40 text-[9px] text-zinc-300 font-mono transition-all cursor-pointer"
          >
            💰 SaaS Sales
          </button>
          <button 
            type="button"
            onClick={() => { setRagQuery("Analyze wait-times and imaging diagnosis sensitivity"); setRagChunks([]); setRagResponse(""); setRagStatus("idle"); }}
            className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-purple-500/40 text-[9px] text-zinc-300 font-mono transition-all cursor-pointer"
          >
            🩺 Healthcare AI
          </button>
          <button 
            type="button"
            onClick={() => { setRagQuery("Check smart contract Solidity security audits"); setRagChunks([]); setRagResponse(""); setRagStatus("idle"); }}
            className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-purple-500/40 text-[9px] text-zinc-300 font-mono transition-all cursor-pointer"
          >
            ⛓️ Web3 Solidity
          </button>
        </div>

        {/* Vector Database Chunks output */}
        <div className="flex flex-col gap-1.5 font-mono">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase">
            <span>Vector Database Matches</span>
            <span className="text-purple-400">Score</span>
          </div>
          <div className="max-h-[100px] overflow-y-auto no-scrollbar flex flex-col gap-1 p-2 rounded bg-black border border-white/[0.04]">
            {ragChunks.length === 0 ? (
              <div className="text-zinc-600 text-[11px] text-center py-5 font-sans">
                Click Query below to scan document folders.
              </div>
            ) : (
              ragChunks.map((chunk, idx) => (
                <div key={idx} className="p-1.5 border-b border-white/[0.02] last:border-0 flex flex-col gap-0.5">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-purple-400 font-bold">{chunk.id}</span>
                    <span className="text-zinc-500">Match: {(chunk.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 italic font-sans">&quot;{chunk.doc}&quot;</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Generated Summarization Output */}
        {ragResponse && (
          <div className="p-2.5 rounded bg-[#100b1a]/40 border border-purple-500/10 text-[11px] text-purple-200 leading-relaxed max-h-[80px] overflow-y-auto no-scrollbar font-sans">
            <span className="font-bold text-purple-400 font-mono">Synthesized Summary:</span> {ragResponse}
          </div>
        )}
      </div>

      <div className="pt-2 pb-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono">RAG Vector Search active</span>
        <button 
          onClick={runRAGSearch} 
          disabled={ragStatus === "searching" || ragStatus === "embedding" || ragStatus === "retrieving" || ragStatus === "generating"}
          className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(139,92,246,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 transition-all cursor-pointer"
        >
          {ragStatus === "searching" ? "Searching..." : "📂 Query Files"}
        </button>
      </div>
    </div>
  );
}
