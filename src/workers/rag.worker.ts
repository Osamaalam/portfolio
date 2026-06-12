self.onmessage = (e: MessageEvent) => {
  const { query, queryVec, chunks } = e.data;

  // Core stop-words to eliminate false positives in natural conversational queries
  const stopWords = new Set([
    "the", "and", "you", "for", "this", "that", "with", "was", "are", "can", "some", "out", 
    "about", "tell", "what", "how", "who", "why", "where", "when", "your", "has", "have", "had", 
    "mention", "page", "node", "record", "from", "them", "then", "their", "there", "they"
  ]);

  const queryKeywords = query.toLowerCase()
    .split(/[^a-zA-Z0-9]+/)
    .filter((k: string) => k.length > 2 && !stopWords.has(k));

  // Score each chunk based on true cosine similarity logic and key terms boost
  const scored = chunks.map((chunk: any) => {
    // True Cosine Similarity calculation over the generated vectors
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let j = 0; j < Math.min(queryVec.length, chunk.vector.length); j++) {
      dotProduct += queryVec[j] * chunk.vector[j];
      magnitudeA += queryVec[j] * queryVec[j];
      magnitudeB += chunk.vector[j] * chunk.vector[j];
    }
    
    const magnitudeProduct = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    const cosineSim = magnitudeProduct > 0 ? (dotProduct / magnitudeProduct) : 0;
    
    // Hybrid sparse keyword boost to anchor specific terms (e.g. price, budget, cost)
    let keywordBonus = 0;
    const chunkTextLower = chunk.text.toLowerCase();
    
    // Check specific financial anchors if the query contains financial intents
    const isFinancialQuery = query.toLowerCase().match(/(price|cost|budget|expense|fee|charge|usd|\$)/i);
    if (isFinancialQuery) {
      if (chunkTextLower.match(/(price|cost|budget|expense|fee|charge|usd|\$)/i)) {
        keywordBonus += 0.05;
      }
    }

    // Match exact query terms
    let matchCount = 0;
    queryKeywords.forEach((keyword: string) => {
      if (chunkTextLower.includes(keyword)) {
        matchCount++;
      }
    });
    
    if (queryKeywords.length > 0 && matchCount > 0) {
      keywordBonus += Math.min((matchCount / queryKeywords.length) * 0.05, 0.05);
    }

    const finalScore = parseFloat(Math.min(Math.max(cosineSim + keywordBonus, 0), 1.0).toFixed(4));

    return {
      chunk,
      score: finalScore
    };
  });

  // Sort by score descending and return top 10 chunks to wident context window
  const results = scored.sort((a: any, b: any) => b.score - a.score).slice(0, 10);

  self.postMessage({ results, queryKeywords });
};
