import { NextResponse } from "next/server";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  let params: any = {};
  try {
    const ip = getClientIP(request.headers);

    // 1. Enforce daily API usage cap to protect budget
    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Daily global API budget limit reached. Please try again tomorrow." },
        { status: 429 }
      );
    }

    params = await request.json();
    let { scenario, agentRole, userPrompt, temperature, allowedTools, isRevision, workspaceFiles } = params;

    if (!scenario || !agentRole || !userPrompt) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: scenario, agentRole, or userPrompt" },
        { status: 400 }
      );
    }

    // 1. Strict Parameter Whitelists (Rule 8)
    const allowedScenarios = ["engineering", "marketing", "operations"];
    const allowedRoles: Record<string, string[]> = {
      engineering: ["architect", "engineer", "qa", "secops"],
      marketing: ["scraper", "swot", "copywriter", "compliance"],
      operations: ["triage", "sql", "fraud", "resolution"]
    };

    if (!allowedScenarios.includes(scenario)) {
      return NextResponse.json({ success: false, error: "Security Exception: Unsupported scenario type." }, { status: 400 });
    }

    if (!allowedRoles[scenario] || !allowedRoles[scenario].includes(agentRole)) {
      return NextResponse.json({ success: false, error: "Security Exception: Unsupported agent role for selected scenario." }, { status: 400 });
    }

    // 2. Strict Input Length Caps (Rule 8)
    userPrompt = String(userPrompt).trim().slice(0, 1000);

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
      console.warn("[AGENTS API] Gemini API key not found in env variables. Activating local fallback mode.");
      const fallback = getFallbackResult(scenario, agentRole, userPrompt, isRevision);
      return NextResponse.json({ success: true, data: fallback });
    }

    // 2. Build the System Instruction based on Scenario & Agent Role
    let systemInstruction = "You are a professional AI agent participating in an enterprise Multi-Agent Orchestrator workspace. ";
    systemInstruction += "You must complete your assigned sub-task and return a valid JSON object matching the requested schema. Do not output anything else but raw JSON. No markdown codeblocks (do not wrap in ```json ... ```), no extra characters. Just raw JSON.\n\n";
    systemInstruction += "The output JSON schema MUST be exactly:\n";
    systemInstruction += "{\n";
    systemInstruction += '  "thought": "A detailed 1-2 sentence paragraph representing your internal expert reasoning,",\n';
    systemInstruction += '  "logs": ["An array of exactly 2-3 short strings describing active sub-steps, e.g. [\'Analyzing payload schema...\', \'Validating security headers...\']"],\n';
    systemInstruction += '  "content": "The generated file content, code, SWOT markdown table, or audit file,",\n';
    systemInstruction += '  "toolName": "Name of tool executed if any (e.g. \'run_tests\', \'web_scrape\', \'query_stripe\'), or null if no tool was executed,",\n';
    systemInstruction += '  "toolOutput": "Simulated terminal logs outputted by the tool (or null), showing pass/fail status, mock database response grids, or web browser crawl status",\n';
    systemInstruction += '  "approved": true\n';
    systemInstruction += "}\n\n";

    systemInstruction += "CRITICAL SPEED & CONCISENESS RULES:\n";
    systemInstruction += "1. Keep the 'content' field short and highly optimized (under 25 lines of code or 2 short paragraphs of text/markdown). Do not write massive boilerplate or long templates. Focus only on the core logic.\n";
    systemInstruction += "2. For code files, write only the primary endpoint/function and mock dependencies compactly.\n";
    systemInstruction += "3. For tests, write only 1-2 essential unit test cases compactly. Avoid long test suites.\n";
    systemInstruction += "4. Generating short responses makes the execution extremely fast and prevents server timeouts.\n\n";

    systemInstruction += "ESCAPING & JSON RULES:\n";
    systemInstruction += "1. The 'content' field must contain stringified code, markdown, or text. You MUST properly escape all double quotes (\") as \\\" and escape all newlines as \\n.\n";
    systemInstruction += "2. Never output unescaped literal newlines or unescaped control characters inside string properties.\n";
    systemInstruction += "3. Make sure the output is mathematically valid, parsable JSON.\n\n";

    systemInstruction += `WORKSPACE OBJECTIVE: "${userPrompt}"\n\n`;
    systemInstruction += `CURRENT ACTIVE PIPELINE: ${scenario.toUpperCase()}\n`;
    systemInstruction += `YOUR ASSIGNED IDENTITY: ${agentRole.toUpperCase()}\n\n`;

    // Core role customization
    if (scenario === "engineering") {
      if (agentRole === "architect") {
        systemInstruction += "ROLE SPEC: Lead Architect. Write a comprehensive Markdown database design and software architecture spec for this feature. Design tables, relational structures, and endpoint schemas.\n";
        systemInstruction += "TOOL ACTION: Use 'database_schema_planner' tool. Return spec in 'content'. Mark approved: true.";
      } else if (agentRole === "engineer") {
        systemInstruction += "ROLE SPEC: Software Engineer. Write the clean, production-grade TypeScript/Express code implementation of this feature. Include proper error handling, types, and input validation.\n";
        if (isRevision) {
          systemInstruction += "SPECIAL EVENT: This is a REVISION. Correct the previous bug (e.g. ensure correct JWT validation or token extraction). Make the implementation flawless. Return final code in 'content'. Mark approved: true.";
        } else {
          systemInstruction += "SPECIAL EVENT: This is the FIRST DRAFT. Introduce a subtle, typical developer bug in the JWT validation logic (like extracting from 'authorization' header without stripping 'Bearer ' prefix, or checking expiration incorrectly). This will let the QA Agent catch it! Mark approved: true.";
        }
      } else if (agentRole === "qa") {
        systemInstruction += "ROLE SPEC: QA Auditor. Analyze the code. ";
        if (isRevision) {
          systemInstruction += "SPECIAL EVENT: Since this is the revised code, compile it and run the tests. Tests should fully PASS. Return a glowing test runner terminal output in 'toolOutput' under tool 'jest_runner'. Mark approved: true.";
        } else {
          systemInstruction += "SPECIAL EVENT: Since this is the first draft code, write unit tests and RUN them. Catch the JWT validation bug (e.g. 'Authorization token parsing failed due to raw Bearer prefix presence'). Reject the build! Return failing Jest unit tests in 'toolOutput' under tool 'jest_runner'. Mark approved: false.";
        }
      } else if (agentRole === "secops") {
        systemInstruction += "ROLE SPEC: SecOps Inspector. Perform static security analysis on the final code block. Scan for secret exposure, JWT token strength, XSS vulnerabilities, and database SQL injection risks. Produce a beautiful security markdown compliance audit table in 'content'. Mark approved: true.";
      }
    } else if (scenario === "marketing") {
      if (agentRole === "scraper") {
        systemInstruction += "ROLE SPEC: Market Scraper. Simulate web crawler actions. Crawl competitor products, pricing pages, and feature matrices. Format a detailed comparative markdown list in 'content'.\n";
        systemInstruction += "TOOL ACTION: Use 'web_scrape_crawling_sim'. Return simulated crawl details in 'toolOutput' and the pricing summary in 'content'.";
      } else if (agentRole === "swot") {
        systemInstruction += "ROLE SPEC: SWOT Analyst. Evaluate competitors, pricing tables, and market trends. Compile a deep, comprehensive financial SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis markdown table with calculated profit margins and target user demographics in 'content'.";
      } else if (agentRole === "copywriter") {
        systemInstruction += "ROLE SPEC: Copywriter Agent. Generate highly-persuasive digital advertising headlines, email copy, and social marketing slogans designed to outperform competitors based on the SWOT targets. Return beautifully structured creative content in 'content'.";
      } else if (agentRole === "compliance") {
        systemInstruction += "ROLE SPEC: Compliance Officer. Conduct rigorous copyright, claim-accuracy, and legal liability checks on the creative copywriting. Identify any risky claims, adjust terms to be legally compliant, and return a checklist audit report in 'content'. Mark approved: true.";
      }
    } else if (scenario === "operations") {
      if (agentRole === "triage") {
        systemInstruction += "ROLE SPEC: Triage Manager. Parse user emails, classify client sentiment (frustrated, neutral, happy), assign urgency category, and retrieve billing histories. Return a structured JSON ticket log in 'content'.";
      } else if (agentRole === "sql") {
        systemInstruction += "ROLE SPEC: Database Auditor. Draft a safe read-only SQL query to audit Stripe charge transaction logs, check for duplicate charges, or verify refund availability. Return SQL query and simulated SQLite console results table in 'toolOutput' and an audit summary in 'content'. Use tool 'stripe_db_audit'.";
      } else if (agentRole === "fraud") {
        systemInstruction += "ROLE SPEC: Fraud Analyst. Analyze client IP locations, device fingerprints, transaction velocities, and refund records. Compute a security risk index (0 to 100), flag any proxies, and output a detailed compliance audit file in 'content'.";
      } else if (agentRole === "resolution") {
        systemInstruction += "ROLE SPEC: Resolution Officer. Synthesize support tickets, SQL audits, and risk scores. Draft a highly-empathetic customer settlement response, and provide automated webhooks triggering a refund database state modification. Return response in 'content'.";
      }
    }

    systemInstruction += `\n\nAllowed Tool list configuration: ${JSON.stringify(allowedTools || [])}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`[AGENTS API] Querying model ${model} for Scenario: ${scenario}, Role: ${agentRole}, Temp: ${temperature}`);

    // Format previous files as context for Gemini - strictly filter to only the directly relevant ones to prevent token inflation and model timeouts!
    let contextFilesString = "";
    if (workspaceFiles && typeof workspaceFiles === "object") {
      let filteredFiles: Record<string, string> = {};
      
      if (agentRole === "engineer") {
        if (workspaceFiles.spec) filteredFiles.spec = workspaceFiles.spec;
      } else if (agentRole === "qa" || agentRole === "secops") {
        if (workspaceFiles.code) filteredFiles.code = workspaceFiles.code;
      } else if (agentRole === "swot") {
        if (workspaceFiles.scrapings) filteredFiles.scrapings = workspaceFiles.scrapings;
      } else if (agentRole === "copywriter") {
        if (workspaceFiles.swot) filteredFiles.swot = workspaceFiles.swot;
      } else if (agentRole === "compliance") {
        if (workspaceFiles.copy) filteredFiles.copy = workspaceFiles.copy;
      } else if (agentRole === "sql") {
        if (workspaceFiles.ticket) filteredFiles.ticket = workspaceFiles.ticket;
      } else if (agentRole === "fraud") {
        // Fraud needs only SQL logs
        if (workspaceFiles.sql_logs) filteredFiles.sql_logs = workspaceFiles.sql_logs;
      } else if (agentRole === "resolution") {
        if (workspaceFiles.ticket) filteredFiles.ticket = workspaceFiles.ticket;
        if (workspaceFiles.risk_score) filteredFiles.risk_score = workspaceFiles.risk_score;
      }

      contextFilesString = Object.entries(filteredFiles)
        .filter(([_, content]) => !!content)
        .map(([fileId, content]) => `--- FILE STATE: ${fileId} ---\n${content}\n----------------------------`)
        .join("\n\n");
    }

    let promptText = `WORKSPACE OBJECTIVE: "${userPrompt}"\n\n`;
    if (contextFilesString) {
      promptText += `Here is the work compiled by previous agents in this pipeline so far. You MUST build directly on top of this, test it, audit it, or reference it based on your assigned role:\n\n${contextFilesString}\n\n`;
    }
    promptText += `Based on the objective and the previous files, write your agent payload and output it inside raw JSON.`;

    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: promptText }]
      }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: parseFloat(temperature) || 0.4,
        responseMimeType: "application/json"
      }
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 45000 // Extended timeout to 45s for high tolerance
    });

    let rawText = "";
    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates.length > 0 &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts.length > 0
    ) {
      rawText = response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("No text response from Gemini API");
    }

    // Clean up any potential formatting slips and extract raw JSON block
    let cleanedJson = rawText.trim();
    if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```[a-zA-Z]*\n/, "");
      if (cleanedJson.endsWith("```")) {
        cleanedJson = cleanedJson.slice(0, -3);
      }
    }
    cleanedJson = cleanedJson.trim();

    // Extract block within first '{' and last '}' to strip extra text wraps
    const firstBrace = cleanedJson.indexOf("{");
    const lastBrace = cleanedJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.slice(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(cleanedJson);
      return NextResponse.json({
        success: true,
        data: parsed
      });
    } catch (parseErr) {
      console.error("[AGENTS API] Failed to parse Gemini response as JSON. Raw text was:", rawText);
      throw new Error("JSON parsing error");
    }

  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || "";
    console.warn(`[AGENTS API] Exception encountered: ${errorMsg}. Activating local agent compiler fallback...`);
    
    // Serve high-fidelity local fallback so the user experience is never interrupted
    const fallback = getFallbackResult(
      params.scenario || "engineering",
      params.agentRole || "architect",
      params.userPrompt || "Process task",
      params.isRevision || false
    );
    
    return NextResponse.json({
      success: true,
      data: fallback,
      fallbackActive: true
    });
  }
}

// ==========================================
// STATIC PRE-VERIFIED FALLBACK DATABASE
// ==========================================
function getFallbackResult(scenario: string, role: string, userPrompt: string, isRevision: boolean) {
  const isEng = scenario === "engineering";
  const isMkt = scenario === "marketing";
  const isOps = scenario === "operations";

  // Smart Parser: Extract clean title keywords from the custom user prompt
  const cleanPrompt = userPrompt.replace(/[^\w\s-]/gi, "").trim();
  const promptWords = cleanPrompt.split(/\s+/).filter(w => w.length > 2);
  
  // Create a beautiful Capitalized Title from the prompt keywords
  let subjectTitle = "Custom Target Module";
  if (promptWords.length > 0) {
    const sliceLen = Math.min(promptWords.length, 5);
    subjectTitle = promptWords.slice(0, sliceLen)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  // Detect a specific language requested in the user prompt (TypeScript is default)
  let langExt = "ts";
  let langName = "TypeScript";
  const promptLower = userPrompt.toLowerCase();
  if (promptLower.includes("python") || promptLower.includes(".py")) {
    langExt = "py";
    langName = "Python";
  } else if (promptLower.includes("rust") || promptLower.includes("cargo") || promptLower.includes(".rs")) {
    langExt = "rs";
    langName = "Rust";
  } else if (promptLower.includes("go ") || promptLower.includes("golang") || promptLower.includes(".go")) {
    langExt = "go";
    langName = "Go";
  } else if (promptLower.includes("java ") || promptLower.includes(".java")) {
    langExt = "java";
    langName = "Java";
  }

  if (isEng) {
    if (role === "architect") {
      return {
        thought: "Gemini pipeline exceeded latency. Serving high-fidelity local database design specifications.",
        logs: ["Compiling entity relational graphs...", "Planning endpoint JWT authentication schemas..."],
        content: `# System Architecture: ${subjectTitle}\n\n## 1. Executive Summary & Objective\n- **Objective**: ${userPrompt}\n- **Implementation Language**: ${langName}\n\n## 2. Relational Database Schema\n- \`users\` (id: UUID, email: UNIQUE VARCHAR, secret_hash: TEXT, created_at: TIMESTAMP)\n- \`activity_logs\` (id: UUID, user_id: UUID, action: VARCHAR, payload: JSONB)\n\n## 3. Relational Schema Blueprint\n* System components mapped for routing dynamic validation checks.\n\n## 4. Operational Strategy\n- Load-balancing through isolated processing layers.`,
        toolName: "database_schema_planner",
        toolOutput: "✓ Entity validation checks successfully completed.\n✓ Mapped 4 relational databases with 0 foreign key warnings.",
        approved: true
      };
    } else if (role === "engineer") {
      let bugCode = "";
      let fixedCode = "";

      if (langExt === "py") {
        bugCode = `# Custom Implementation: ${subjectTitle}\n# Objective: ${userPrompt}\n\nimport jwt\nimport os\n\nSECRET = 'synapse_jwt_key'\n\ndef authenticate_request(headers):\n    # [BUG]: Reading authorization header without removing Bearer prefix\n    auth_header = headers.get('Authorization')\n    if auth_header:\n        try:\n            payload = jwt.decode(auth_header, SECRET, algorithms=['HS256'])\n            return payload\n        except Exception as e:\n            return {"error": "Token verification failed"}\n    return {"error": "Auth header missing"}`;

        fixedCode = `# Custom Implementation: ${subjectTitle}\n# Objective: ${userPrompt}\n\nimport jwt\nimport os\n\nSECRET = 'synapse_jwt_key'\n\ndef authenticate_request(headers):\n    auth_header = headers.get('Authorization')\n    if auth_header and auth_header.startswith('Bearer '):\n        try:\n            # Fixed Bearer token extraction\n            token = auth_header.split(' ')[1]\n            payload = jwt.decode(token, SECRET, algorithms=['HS256'])\n            return payload\n        except Exception as e:\n            return {"error": "Token signature is invalid"}\n    return {"error": "Bearer token authorization missing"}`;
      } else {
        bugCode = `// Custom Implementation: ${subjectTitle}\n// Objective: ${userPrompt}\n\nimport express from 'express';\nimport jwt from 'jsonwebtoken';\n\nconst router = express.Router();\nconst SECRET = 'synapse_jwt_key';\n\nrouter.post('/process', (req, res) => {\n  const token = jwt.sign({ subject: '${subjectTitle}' }, SECRET, { expiresIn: '1h' });\n  return res.json({ success: true, token });\n});\n\nexport const authenticateJWT = (req, res, next) => {\n  const authHeader = req.headers.authorization;\n  // [BUG]: Directly verifying authorization header without removing 'Bearer ' prefix\n  if (authHeader) {\n    jwt.verify(authHeader, SECRET, (err, user) => {\n      if (err) return res.status(403).json({ error: 'Token verification failed' });\n      req.user = user;\n      next();\n    });\n  } else {\n    res.status(401).json({ error: 'Auth header missing' });\n  }\n};`;

        fixedCode = `// Custom Implementation: ${subjectTitle}\n// Objective: ${userPrompt}\n\nimport express from 'express';\nimport jwt from 'jsonwebtoken';\n\nconst router = express.Router();\nconst SECRET = 'synapse_jwt_key';\n\nrouter.post('/process', (req, res) => {\n  const token = jwt.sign({ subject: '${subjectTitle}' }, SECRET, { expiresIn: '1h' });\n  return res.json({ success: true, token });\n});\n\nexport const authenticateJWT = (req, res, next) => {\n  const authHeader = req.headers.authorization;\n  if (authHeader && authHeader.startsWith('Bearer ')) {\n    // Extracted and stripped token prefix securely\n    const token = authHeader.split(' ')[1];\n    jwt.verify(token, SECRET, (err, user) => {\n      if (err) return res.status(403).json({ error: 'Token signature is invalid' });\n      req.user = user;\n      next();\n    });\n  } else {\n    res.status(401).json({ error: 'Bearer token authorization missing' });\n  }\n};`;
      }

      return {
        thought: "Gemini connection delayed. Initializing pre-compiled TypeScript route compiler.",
        logs: ["Drafting authentication route validation payload...", isRevision ? "Replacing token extraction array with secure slice..." : "Injecting typical token middleware parsing bug..."],
        content: isRevision ? fixedCode : bugCode,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    } else if (role === "qa") {
      return {
        thought: "Local Jest compilation triggered for test auditing.",
        logs: ["Compiling unit test environment variables...", "Executing Jest test files against routes..."],
        content: isRevision 
          ? `✓ All compiled ${subjectTitle} components verified. 100% test coverage achieved.`
          : `✕ Test suites failed. QA Auditor detected a validation signature exception in ${subjectTitle}.`,
        toolName: "jest_runner",
        toolOutput: isRevision
          ? `PASS  tests/${langExt === "py" ? "test_main.py" : "auth.test.ts"}\n  ✓ should compile ${subjectTitle} components (14ms)\n  ✓ should satisfy objectives: "${userPrompt.slice(0, 50)}..." (4ms)\n  ✓ should strip Bearer prefix (2ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        1.104s\n\n✓ All tests passed with flying colors!`
          : `FAIL  tests/${langExt === "py" ? "test_main.py" : "auth.test.ts"}\n  ✕ should verify valid payload (42ms)\n  ✓ should reject empty header (2ms)\n\n● should verify valid payload\n\n  Exception: Token verification failed due to Bearer prefix presence in header string!\n\nTest Suites: 1 failed, 1 total\nTests:       1 failed, 1 passed, 2 total`,
        approved: isRevision
      };
    } else if (role === "secops") {
      return {
        thought: "Upstream delay. Booting local static SecOps audit container...",
        logs: ["Scanning codebase for plaintext secret tokens...", "Checking Cross-Origin resource settings..."],
        content: `# SecOps Static Audit Compliance Review: ${subjectTitle}\n\n## 1. Compliance Matrix\n- **SEC-101 (Secret Leakage Check)**: PASS (Is isolated in env parameters).\n- **SEC-102 (Symmetric Encryption)**: PASS (Strong asymmetric token configuration).\n- **SEC-103 (SQL Injection Vector)**: PASS (Relational models use parameterized query strings).\n\n## 2. Threat Index Rating\n- Threat level: **LOW (9.2 / 100)**\n- Target System: **${subjectTitle}**\n- Deploy ready: **YES**`,
        toolName: "secops_vuln_scanner",
        toolOutput: "✓ Scanning AST tree completed. 0 critical vulnerabilities found.\n✓ Cryptographic key validation completed successfully.",
        approved: true
      };
    }
  }

  if (isMkt) {
    if (role === "scraper") {
      return {
        thought: "Upstream timeout. Crawling mock local competitor matrices.",
        logs: ["Parsing search terms...", "Simulating headless chrome scraping pages..."],
        content: `# Competitor Intelligence Matrix: ${subjectTitle}\n\n| Competitor Product | Base Tier | Setup Fee | Core Features |\n| :--- | :--- | :--- | :--- |\n| Premium Option A | $120 / mo | $99 | Fully automated, basic analytics |\n| Mid-tier Option B | $85 / mo | $0 | Standard support, clean reports |\n| Custom Option C | $180 / mo | $150 | Enterprise priority API limits |`,
        toolName: "web_scrape_crawling_sim",
        toolOutput: `✓ Opening chrome instance...\n✓ Successfully crawled 3 competitor domains.\n✓ Extracted feature matrix based on user query: "${userPrompt.slice(0, 50)}..."`,
        approved: true
      };
    } else if (role === "swot") {
      return {
        thought: "Compiling financial SWOT coordinates from local assets.",
        logs: ["Computing profit models...", "Identifying strategic market entries..."],
        content: `# SWOT Strategic Analysis: ${subjectTitle}\n\n### Strengths\n- Custom tailored onboarding aligning with: "${userPrompt.slice(0, 60)}..."\n\n### Weaknesses\n- Lower initial marketing visibility.\n\n### Opportunities\n- Target premium sector clients by offering custom tier features.\n\n### Threats\n- Incumbents offering steep baseline registration rates.`,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    } else if (role === "copywriter") {
      return {
        thought: "Generating creative marketing assets locally.",
        logs: ["Formulating ad slogans...", "Drafting email newsletter outreach templates..."],
        content: `# Campaign Creative Options: ${subjectTitle}\n\n## Option A (Lead Headline)\n\`Unlock professional results for "${subjectTitle}" without expensive setups.\`\n\n## Option B (Target Newsletter)\n\`Tired of generic solutions? Get custom ${subjectTitle} campaigns active today. 0 sign-up barriers.\``,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    } else if (role === "compliance") {
      return {
        thought: "Initializing local legal copyright and compliance checklists.",
        logs: ["Auditing advertising slogans for liabilities...", "Verifying claim accuracy against SWOT indexes..."],
        content: `# Legal Compliance Claim Audit: ${subjectTitle}\n\n* **Audited Slogan**: 'Custom ${subjectTitle} campaigns active' -> **APPROVED**\n* **Audited Claim**: 'Guaranteed 100% conversion results' -> **REJECTED** (high legal liability). Refined to 'Tested conversion programs'.`,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    }
  }

  if (isOps) {
    if (role === "triage") {
      return {
        thought: "Upstream delay. Accessing support queue triage files.",
        logs: ["Analyzing email customer sentiment index...", "Retrieving ticket metadata structures..."],
        content: `{\n  "ticket_id": "TKT-9822",\n  "subject": "${subjectTitle}",\n  "sentiment": "HIGHLY FRUSTRATED",\n  "urgency": "CRITICAL",\n  "original_prompt": "${userPrompt.replace(/"/gi, '\\"')}"\n}`,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    } else if (role === "sql") {
      return {
        thought: "Running SQLite sandbox database audit query.",
        logs: ["Compiling transaction SQL string...", "Connecting to secure payment replica..."],
        content: `Drafted SQL audit query to verify checkout transactions for "${subjectTitle}".`,
        toolName: "stripe_db_audit",
        toolOutput: `SELECT * FROM checkout_logs WHERE order_desc LIKE '%${promptWords[0] || "order"}%' LIMIT 3;\n\nID         | DESC           | STATUS    | DATE\n---------------------------------------------------------------\nch_0182    | ${subjectTitle} | succeeded | 2026-06-12 14:02:11\nch_0183    | ${subjectTitle} | succeeded | 2026-06-12 14:02:14\n\n[AUDIT RESULTS]: Detected duplicate charges for description matching "${subjectTitle}". Double-billing verified.`,
        approved: true
      };
    } else if (role === "fraud") {
      return {
        thought: "Upstream delay. Analyzing transaction fraud velocities.",
        logs: ["Checking browser device fingerprints...", "Analyzing proxy VPN IP blacklist index..."],
        content: `{\n  "risk_score": 8.4,\n  "target_asset": "${subjectTitle}",\n  "status": "SAFE",\n  "action_recommendation": "APPROVE RESOLUTION FOR: ${userPrompt.slice(0, 40).toUpperCase()}"\n}`,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    } else if (role === "resolution") {
      return {
        thought: "Synthesizing support details to draft resolution response.",
        logs: ["Compiling Stripe SQL audits...", "Drafting empathetic resolution settlement email..."],
        content: `Subject: Urgent Resolution: Action on "${subjectTitle}"\n\nDear Client,\n\nWe have analyzed your support request: "${userPrompt}".\n\nOur system confirmed transaction logs duplicate events. We have automatically triggered a refund back to your card. Transaction ID: ch_0183.`,
        toolName: null,
        toolOutput: null,
        approved: true
      };
    }
  }

  // Default fallback object
  return {
    thought: "Direct endpoint timed out. Loading local mock agent configuration.",
    logs: ["Reading objective variables...", "Compiling local templates..."],
    content: "Success. Local mock task compiled successfully.",
    toolName: null,
    toolOutput: null,
    approved: true
  };
}
