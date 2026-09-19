# 🧬 Osama Alam's AI Portfolio: 6-Stage Graph-RAG Clinical Coding Engine Blueprint (V2.0 "Better")

This blueprint documents the production-grade, enterprise-scale engineering architecture to implement a **6-Stage Graph-RAG Clinical Retrieval & ICD-10-CM Coding Engine** (V2.0 "Better") on your portfolio. This system integrates **Neo4j (Hierarchical Ontological Graph)**, **Qdrant (Semantic Dense Vector DB)**, **Local clinical database (Sparse Lexical)**, **Gemini 3.1 Flash Lite (Zero-Latency NLP concept normalizer)**, and **Qwen3-Reranker-0.6B (Cross-Encoder Re-ranker)** into a single, high-precision automated billing pipeline.

---

## 🗺️ 1. The 6-Stage Clinical Pipeline Architecture

```
                      Clinician Note / Search Query
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────┐
│ Stage 0: Zero-Latency Clinical Understanding             │
│                                                          │
│ Single-call Gemini 3.1 Flash Lite NLP concept normalizer │
│ Outputs: { diagnosis, anatomy, location, laterality,     │
│             severity, etiology, encounter }              │
└──────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────┐
│ Stage 1: Knowledge Graph Reasoning (Neo4j)               │
│ Deterministic Hierarchy & Graph-Guided Traversal         │
│ - Combination Codes ([:COMBINES_WITH])                   │
│ - Excludes1 Rules ([:EXCLUDES1])                         │
└──────────────────────────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [High-Confidence Match?]            [Low/Ambiguous Match?]
                  │                                   │
                 YES                                 NO
                  │                                   │
                  ▼                                   ▼
        [Direct Graph Resolve]              [Stage 2: Hybrid Retrieval]
        Instantly return Code (1.0)         Parallel search:
                                            ├─ Dense (Qdrant Vector)
                                            └─ Sparse (Local JSON Index)
                                                      │
                                                      ▼
                                            [Stage 3: Candidate Fusion]
                                            Reciprocal Rank Fusion (k=60)
                                            merges into top 30 candidates
                                                      │
                                                      ▼
                                            [Stage 4: Guideline Rerank]
                                            Qwen3 Cross-Encoder re-ranks
                                            using Official Tabular Notes
                                                      │
                                                      ▼
                                            [Stage 5: Confidence Layer]
                                            Computes scores, compile evidence
                                            routes to Auto/Suggest/Clarify
                                                      │
                                                      ▼
                                            Final ICD-10-CM Output JSON
```

---

## 🗂️ 2. True Hierarchical Neo4j Graph Schema

The V2.0 knowledge graph models strict ICD-10 administrative hierarchies, directional anatomy, and instructional notes, completely bypassing semantic vector guesswork.

### Node Labels
* `(:Code {id: "S52.501A", name: "Unspecified fracture of lower end of right radius, initial encounter"})`
* `(:Category {id: "S52.5", name: "Fracture of lower end of radius"})`
* `(:Block {id: "S50-S59", name: "Injuries to the elbow and forearm"})`
* `(:Anatomy {name: "radius"})`
* `(:Pathology {name: "fracture"})`
* `(:Direction {name: "lower end", synonyms: ["distal"]})`
* `(:Laterality {name: "right"})`
* `(:EncounterType {A: "Initial", D: "Subsequent", S: "Sequela"})`
* `(:InstructionalNote {text: "Code first underlying disease"})`

### Edge Relationships
* Hierarchy: `(:Code) -[:CHILD_OF]-> (:Category) -[:CHILD_OF]-> (:Block)` (Allows the AI to understand anatomy groupings, e.g. a "radius fracture" is a "forearm injury").
* Instructional Notes: `(:Code) -[:HAS_INSTRUCTION]-> (:InstructionalNote)` (Tells the model mandatory co-coding conditions).
* 7th Character Rules: `(:Code) -[:REQUIRES_7TH_CHAR]-> (:EncounterType)` (Links encounters back to codes).
* Shift-Left Exclusions: `(:Code) -[:EXCLUDES1]-> (:Code)` (Instantly drops forbidden codes from the candidate pool during traversal).
* Shift-Left Combinations: `(:Code) -[:COMBINES_WITH]-> (:Code)` (Immediately pulls combination codes like Diabetes + CKD E11.22, skipping standalone codes).

---

## ⚙️ 3. Execution & Implementation Steps

### 1. Seeding Python Script (`src/scripts/seed_neo4j_icd10.py`)
We will create a multi-threaded batch-seeding script that:
* Connects to Neo4j using `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` environment variables.
* Sets up constraints and unique indexing on all node keys to guarantee `<0.5ms` lookups.
* Progressively parses your 47,025 codes in `src/data/icd10_index.json` and runs Cypher transactions in batches of 1,000 to seed all nodes and clinical relationships.

### 2. Implementing the 6-Stage Coordinator (`src/lib/icdService.ts`)
* **Stage 0 (EHR NLP Parser):** We use **Gemini 3.1 Flash Lite** (`gemini-3.1-flash-lite` via `process.env.GEMINI_API_KEY`) as a structured, single-call JSON-outputting clinical parser. It receives the raw note, extracts entities, and maps colloquialisms (like *"broken wrist"*) to explicit terms (*"distal radius fracture"*).
* **Stage 1 (Neo4j Deterministic Lookup):** Formulates and runs a fast Cypher set-intersection query. If an exact matched node is found, returns it instantly with **Score: 1.0 and Confidence: High**.
* **Stage 2 & 3 (Hybrid Parallel Fallback):** If Stage-1 is ambiguous, queries Qdrant and your local index in parallel, and merges candidate pools using Reciprocal Rank Fusion (RRF).
* **Stage 4 (Guideline Reranking):** Sends top 30 candidates and their Official ICD-10 Tabular Notes to `qwen3-reranker-0.6b` via `/api/v1/chat` to sort by clinical facet weights, ensuring 100% guideline compliance.
* **Stage 5 (Confidence Router):** Calculates final scores and outputs the professional ICD-10 JSON contract.

---

## 🧪 4. Testing & Verification Criteria

We will modify `src/scripts/test_api_hybrid.py` to cover:
1. **Raw Medical Reports:** Verify that pasting complex reports (like Test 6 and Test 8) gets cleanly parsed, normalized, traversed, and resolved to the exact expected codes.
2. **Deterministic Pruning:** Verify that searching for `"distal radius fracture"` **never** returns `"proximal"` (upper end) codes in the top results.
3. **ICD-10 Guidelines compliance:** Verify that compound guidelines (like Diabetes + CKD) or Excludes rules are correctly parsed and blocked.
