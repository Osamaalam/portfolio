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

  // Score each chunk based on term frequency & true cosine similarity logic
  const scored = chunks.map((chunk: any) => {
    let termScore = 0;
    
    // Term matching score (representing semantic match)
    const chunkTextLower = chunk.text.toLowerCase();
    queryKeywords.forEach((keyword: string) => {
      if (chunkTextLower.includes(keyword)) {
        termScore += 0.45;
      }
    });

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
    
    // Combine term match and cosine bonus (max cosine bonus of 0.12)
    let finalScore = termScore + Math.max(cosineSim, 0) * 0.12;
    
    // Clamp score between 0.05 and 0.99
    finalScore = parseFloat(Math.min(Math.max(finalScore, 0.05), 0.99).toFixed(3));

    return {
      chunk,
      score: finalScore
    };
  });

  // Sort by score descending and return top 3
  const results = scored.sort((a: any, b: any) => b.score - a.score).slice(0, 3);

  self.postMessage({ results, queryKeywords });
};
