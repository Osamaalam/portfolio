import axios from "axios";
import fs from "fs";
import path from "path";
import { broadcastMcpLog } from "./mcpRegistry";

// Bootstrap local .env variables if running outside of Next.js server (e.g. CLI or scripts)
if (typeof window === "undefined") {
  try {
    const dotenvPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(dotenvPath)) {
      const dotenvContent = fs.readFileSync(dotenvPath, "utf8");
      dotenvContent.split("\n").forEach((line: string) => {
        const cleanLine = line.trim();
        if (cleanLine && !cleanLine.startsWith("#") && cleanLine.includes("=")) {
          const firstEquals = cleanLine.indexOf("=");
          const key = cleanLine.substring(0, firstEquals).trim();
          const value = cleanLine.substring(firstEquals + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch {
    // Ignore environment boot errors
  }
}

// In-memory cache for the local index file to avoid redundant file-reads
let cachedIndex: Record<string, any> | null = null;

export interface ICDMatch {
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

// Loads local JSON index database for clinical lookup
export function getIcdIndex(): Record<string, any> {
  if (cachedIndex) return cachedIndex;
  try {
    const filePath = path.join(process.cwd(), "src", "data", "icd10_index.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      cachedIndex = JSON.parse(data);
      return cachedIndex || {};
    }
  } catch (error) {
    console.error("[ICD SERVICE] Failed to load local JSON index:", error);
  }
  return {};
}

// Generate vector embedding using self-hosted LM Studio (with Gemini as fallback)
export async function getEmbedding(text: string): Promise<number[] | null> {
  const cleanText = String(text || "").trim().slice(0, 1000);
  if (!cleanText) return null;

  const embeddingUrl = process.env.EMBEDDING_API_URL || "http://127.0.0.1:6969/v1/embeddings";
  const modelName = process.env.EMBEDDING_MODEL_NAME || "text-embedding-qwen3-embedding-0.6b";

  // Try self-hosted LM Studio first
  try {
    const payload = {
      model: modelName,
      input: cleanText,
    };
    const response = await axios.post(embeddingUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 3000,
    });

    if (response.data?.data?.[0]?.embedding) {
      return response.data.data[0].embedding;
    }
  } catch {
    // Fall back to Gemini embedding
  }

  // Gemini Embedding Fallback (with strict 1024 dimensionality for Qdrant compatibility)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const geminiModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:embedContent?key=${geminiApiKey}`;

      const response = await axios.post(
        url,
        {
          content: { parts: [{ text: cleanText }] },
          outputDimensionality: 1024,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      if (response.data?.embedding?.values) {
        return response.data.embedding.values;
      }
    } catch (geminiError: any) {
      console.warn(`[ICD SERVICE] Gemini embedding failed: ${geminiError.message}`);
    }
  }

  return null;
}

// Clean non-essential medical qualifiers (parentheticals, 'unspecified') for exact diagnostic name matching
export function cleanMedicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "") // remove qualifiers like (primary), (acute), (diffuse)
    .replace(/,\s*unspecified/gi, "") // remove ', unspecified'
    .replace(/[^a-z0-9\s]/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Extract core diagnostic condition from complex narrative reports
export function extractCoreDiagnosis(text: string): string {
  const clean = text.trim();
  const patterns = [
    /(?:findings\s+are\s+consistent\s+with|clinical\s+findings\s+are\s+consistent\s+with|consistent\s+with|compatible\s+with|suggestive\s+of)\s+([^.,;\n]+)/i,
    /(?:impression|diagnosis|assessment|final\s+diagnosis):\s*([^.,;\n]+)/i,
    /(?:diagnosed\s+with|presents\s+for\s+(?:routine\s+)?follow-up\s+of|history\s+of)\s+([^.,;\n]+)/i,
  ];

  for (const pat of patterns) {
    const match = clean.match(pat);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 2 && extracted.length < 80) {
        return extracted;
      }
    }
  }

  return clean;
}

// Expand clinical acronyms and terminology for improved vector similarity
export function expandClinicalQuery(query: string): string {
  let expanded = query.toLowerCase();

  const acronyms: Record<string, string> = {
    "\\bmca\\b": "middle cerebral artery cerebral infarction stroke",
    "\\bpe\\b": "pulmonary embolism",
    "\\bcad\\b": "coronary artery disease",
    "\\bstemi\\b": "st elevation myocardial infarction",
    "\\bnstemi\\b": "non st elevation myocardial infarction",
    "\\bcopd\\b": "chronic obstructive pulmonary disease",
    "\\bgerd\\b": "gastroesophageal reflux disease",
    "\\bckd\\b": "chronic kidney disease",
    "\\bchf\\b": "congestive heart failure",
    "\\buti\\b": "urinary tract infection",
    "\\bdvt\\b": "deep vein thrombosis",
    "\\bhcc\\b": "hepatocellular carcinoma liver cancer",
    "\\bdm\\b": "diabetes mellitus",
  };

  for (const [key, replacement] of Object.entries(acronyms)) {
    expanded = expanded.replace(new RegExp(key, "g"), replacement);
  }

  const anatomyTranslations: Record<string, string> = {
    "\\bdistal\\b": "lower end",
    "\\bproximal\\b": "upper end",
    "\\bmedial\\b": "internal medial",
    "\\blateral\\b": "external lateral",
  };

  for (const [key, replacement] of Object.entries(anatomyTranslations)) {
    expanded = expanded.replace(new RegExp(key, "g"), replacement);
  }

  return expanded;
}

// High-precision clinical term matching with medical hierarchy and qualifier resolution
export function localLexicalSearch(query: string, limit: number = 5): ICDMatch[] {
  const rawQuery = String(query || "").trim();
  if (!rawQuery) return [];

  const index = getIcdIndex();
  const codes = Object.keys(index);
  if (codes.length === 0) return [];

  // Extract core condition if the user pasted a narrative clinical sentence
  const targetText = extractCoreDiagnosis(rawQuery);
  const cleanQ = targetText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().replace(/\s+/g, " ");
  const terms = cleanQ.split(/\s+/).filter((t) => t.length > 1);

  const candidates: ICDMatch[] = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const rec = index[code];

    const rawName = (rec.name || "").toLowerCase();
    const coreName = cleanMedicalName(rec.name || "");
    const syns = (rec.synonyms || []).map((s: string) => s.toLowerCase());
    const paths = (rec.index_paths || []).map((p: string) => p.toLowerCase());
    const symptoms = (rec.symptoms || []).map((s: string) => s.toLowerCase());

    let score = 0;

    // 1. Exact ICD-10 code match
    if (code.toLowerCase() === cleanQ.replace(/[^a-z0-9.]/g, "")) {
      score = 1.0;
    }
    // 2. Exact core diagnosis name match (e.g. 'acute bronchitis' === 'acute bronchitis' for J20.9)
    else if (coreName === cleanQ) {
      score = 0.99;
    }
    // 3. Exact raw formal name match
    else if (rawName === cleanQ) {
      score = 0.98;
    }
    // 4. Starts with full diagnosis query
    else if (coreName.startsWith(cleanQ) || rawName.startsWith(cleanQ)) {
      score = 0.96;
    }
    // 5. Full query contained as a distinct phrase
    else if (coreName.includes(cleanQ) || rawName.includes(cleanQ)) {
      score = 0.94;
    }
    // 6. Direct clinical synonym match
    else if (syns.some((s: string) => s === cleanQ || s.includes(cleanQ))) {
      score = 0.92;
    }
    // 7. Clinical index path phrase match
    else if (paths.some((p: string) => p.includes(cleanQ))) {
      score = 0.88;
    }
    // 8. All individual terms present in diagnosis name
    else if (terms.length > 1 && terms.every((t) => rawName.includes(t) || coreName.includes(t))) {
      score = 0.85;
    }
    // 9. Symptom match
    else if (symptoms.some((s: string) => s === cleanQ || s.includes(cleanQ))) {
      score = 0.80;
    }
    // 10. Multi-term overlap in index paths
    else if (terms.length > 1 && terms.every((t) => paths.some((p: string) => p.includes(t)))) {
      score = 0.70;
    }

    if (score >= 0.70) {
      candidates.push({
        code: rec.code,
        score,
        name: rec.name,
        chapter: rec.chapter,
        block: rec.block,
        parent_code: rec.parent_code || "",
        synonyms: rec.synonyms || [],
        search_index_paths: rec.index_paths || [],
        fallback: true,
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-breaker: prioritize granular clinical subcodes (e.g. J20.9 over base J20)
    const aIsSubcode = a.code.includes(".");
    const bIsSubcode = b.code.includes(".");
    if (aIsSubcode !== bIsSubcode) return aIsSubcode ? -1 : 1;
    return a.code.length - b.code.length;
  });

  return candidates.slice(0, limit);
}

// Unified high-precision ICD-10 search combining Qdrant vector search and clinical diagnostic matching
export async function searchICD(
  query: string,
  limit: number = 5
): Promise<ICDMatch[]> {
  const rawQuery = String(query || "").trim();
  if (!rawQuery) return [];

  // Extract core condition if a long clinical sentence or note was provided
  const effectiveQuery = extractCoreDiagnosis(rawQuery);
  const cleanQuery = expandClinicalQuery(effectiveQuery);
  broadcastMcpLog("rpc_in", `[Qdrant Search] Query: "${rawQuery}" -> "${effectiveQuery}"`);

  // First check clinical database for high-confidence diagnostic matches
  const clinicalMatches = localLexicalSearch(effectiveQuery, limit);
  const hasExactMatch = clinicalMatches.length > 0 && clinicalMatches[0].score >= 0.95;

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const qdrantApiKey = process.env.QDRANT_API_KEY || "";
  const collectionName = "icd10_codes";

  try {
    // 1. Generate query vector embedding
    const vector = await getEmbedding(cleanQuery);
    if (
      vector &&
      Array.isArray(vector) &&
      vector.length === 1024 &&
      vector.every((val) => typeof val === "number" && isFinite(val))
    ) {
      // 2. Perform direct vector search in Qdrant
      broadcastMcpLog("info", `[Qdrant] Searching 47,025 ICD-10 vectors...`);
      const searchUrl = `${qdrantUrl}/collections/${collectionName}/points/search`;
      const payload = {
        vector,
        limit,
        with_payload: true,
        params: {
          exact: true,
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (qdrantApiKey) {
        headers["api-key"] = qdrantApiKey;
      }

      const response = await axios.post(searchUrl, payload, {
        headers,
        timeout: 8000,
      });

      if (
        response.data?.result &&
        Array.isArray(response.data.result) &&
        response.data.result.length > 0
      ) {
        const qdrantMatches: ICDMatch[] = response.data.result.map((match: any) => {
          const pl = match.payload || {};
          return {
            code: pl.code || "",
            score: Number((match.score || 0).toFixed(4)),
            name: pl.name || "",
            chapter: pl.chapter || "",
            block: pl.block || "",
            parent_code: pl.parent_code || "",
            synonyms: pl.synonyms || [],
            search_index_paths: pl.search_index_paths || [],
          };
        });

        // If Qdrant returns high-confidence semantic matches (score >= 0.40)
        const highConfQdrant = qdrantMatches.filter((m) => m.score >= 0.40);
        if (highConfQdrant.length > 0) {
          // Merge high-confidence Qdrant matches with clinical matches without duplicate codes
          const seen = new Set<string>();
          const combined: ICDMatch[] = [];

          // If clinical match has near-perfect score (0.95+), place it first
          if (hasExactMatch) {
            clinicalMatches.forEach((m) => {
              if (!seen.has(m.code)) {
                seen.add(m.code);
                combined.push(m);
              }
            });
          }

          highConfQdrant.forEach((m) => {
            if (!seen.has(m.code)) {
              seen.add(m.code);
              combined.push(m);
            }
          });

          clinicalMatches.forEach((m) => {
            if (!seen.has(m.code)) {
              seen.add(m.code);
              combined.push(m);
            }
          });

          const finalResults = combined.slice(0, limit);
          const topCode = finalResults[0]?.code;
          const topName = finalResults[0]?.name;
          const topScore = ((finalResults[0]?.score || 0) * 100).toFixed(1);
          broadcastMcpLog(
            "success",
            `[Qdrant] Retrieved ${finalResults.length} matches. Top: ${topCode} - ${topName} (${topScore}%)`
          );
          return finalResults;
        }
      }
    }
  } catch (error: any) {
    const rawError = error.response?.data?.status?.error || error.message || "Vector search failed";
    const sanitizedError = String(rawError)
      .replace(/https?:\/\/[^\s]+/gi, "")
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, "")
      .trim();
    console.warn(`[ICD SERVICE] Qdrant search error: ${sanitizedError}. Using clinical matching.`);
  }

  // If exact clinical match was found or Qdrant was offline/low-confidence, return clinical matches
  if (clinicalMatches.length > 0) {
    const topCode = clinicalMatches[0].code;
    const topName = clinicalMatches[0].name;
    const topScore = (clinicalMatches[0].score * 100).toFixed(1);
    broadcastMcpLog(
      "success",
      `[Qdrant] Resolved ${clinicalMatches.length} matching codes. Top: ${topCode} - ${topName} (${topScore}%)`
    );
    return clinicalMatches;
  }

  return [];
}

// Deconstruct clinical reports into diagnostic findings and resolve each to formal ICD-10 codes
export async function analyzeClinicalReport(
  reportText: string
): Promise<{
  original_summary: string;
  findings: Array<{
    term: string;
    clinical_relevance: string;
    codes_resolved: ICDMatch[];
  }>;
  negations: Array<{ term: string; evidence: string }>;
  relationships: Array<{ source_condition: string; type: string; target_condition: string }>;
}> {
  const cleanReport = String(reportText || "").trim().slice(0, 3000);
  broadcastMcpLog("rpc_in", `[Report Analysis] Deconstructing clinical note (${cleanReport.length} chars)...`);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    broadcastMcpLog("warning", `[Report Analysis] Gemini API unconfigured. Running clinical diagnostics...`);
    return fallbackReportAnalysis(cleanReport);
  }

  broadcastMcpLog("info", `[Report Analysis] Extracting diagnostic findings with Gemini AI...`);
  const model = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are an expert clinical diagnostics AI auditor. Deconstruct the clinical note into primary positive diagnostic conditions.
Respond with a valid JSON object matching this schema:
{
  "summary": "1-2 sentence clinical summary of the patient case",
  "positive_findings": [
    {
      "term": "The extracted clinical diagnostic condition or finding (e.g. 'Acute bronchitis', 'Essential hypertension')",
      "relevance": "1-sentence clinical significance of this finding in the case",
      "search_query": "The exact diagnostic condition query (e.g. 'Acute bronchitis', 'Essential hypertension')"
    }
  ]
}`;

  try {
    const payload = {
      contents: [
        {
          parts: [{ text: `${systemPrompt}\n\nCLINICAL REPORT TEXT:\n"${cleanReport}"` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textResponse) {
      let cleanText = textResponse.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
      }
      const firstBrace = cleanText.indexOf("{");
      const lastBrace = cleanText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleanText);
      const positive_findings = parsed.positive_findings || [];
      const findings: any[] = [];

      broadcastMcpLog(
        "success",
        `[Report Analysis] Extracted ${positive_findings.length} findings. Resolving with ICD-10 database...`
      );

      for (const pos of positive_findings) {
        const queryTerm = pos.search_query || pos.term;
        const matchedCodes = await searchICD(queryTerm, 3);
        findings.push({
          term: pos.term,
          clinical_relevance: pos.relevance || "Identified in clinical notes.",
          codes_resolved: matchedCodes,
        });
      }

      return {
        original_summary: parsed.summary || "Case analyzed successfully.",
        findings,
        negations: [],
        relationships: [],
      };
    }
  } catch (error: any) {
    console.error("[ICD SERVICE] Gemini report analysis failed:", error.message);
  }

  return fallbackReportAnalysis(cleanReport);
}

// Fallback analysis when AI API is unavailable, extracting clinical conditions from narrative patterns
async function fallbackReportAnalysis(text: string): Promise<any> {
  const candidateTerms: string[] = [];

  // 1. Try extracting final clinical impression / diagnosis pattern
  const core = extractCoreDiagnosis(text);
  if (core && core !== text && core.length < 80) {
    candidateTerms.push(core);
  }

  // 2. Keyword sentinel patterns
  const textLower = text.toLowerCase();
  if (textLower.includes("bronchitis")) {
    candidateTerms.push("Acute bronchitis");
  }
  if (textLower.includes("hypertension") || textLower.includes("blood pressure")) {
    candidateTerms.push("Essential (primary) hypertension");
  }
  if (textLower.includes("heart") || textLower.includes("angina") || textLower.includes("coronary")) {
    candidateTerms.push("Atherosclerotic heart disease with unstable angina");
  }
  if (textLower.includes("diabetes") || textLower.includes("sugar") || textLower.includes("glucose")) {
    candidateTerms.push("Type 2 diabetes mellitus");
  }
  if (textLower.includes("headache") || textLower.includes("migraine")) {
    candidateTerms.push("Migraine, unspecified");
  }

  if (candidateTerms.length === 0) {
    candidateTerms.push("General symptom check");
  }

  // De-duplicate terms
  const uniqueTerms = Array.from(new Set(candidateTerms));
  const findings: any[] = [];
  for (const term of uniqueTerms.slice(0, 3)) {
    const matchedCodes = await searchICD(term, 3);
    findings.push({
      term,
      clinical_relevance: `Diagnostic finding extracted from clinical notes matching '${term}'.`,
      codes_resolved: matchedCodes,
    });
  }

  return {
    original_summary: "Clinical notes analyzed via clinical entity diagnostics.",
    findings,
    negations: [],
    relationships: [],
  };
}
