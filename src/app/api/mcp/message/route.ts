import { NextResponse } from "next/server";
import { mcpConnections, broadcastMcpLog } from "@/lib/mcpRegistry";
import { searchICD, analyzeClinicalReport } from "@/lib/icdService";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    // 1. Resolve sessionId from search params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    // 2. Fetch the active client connection from memory registry
    const connection = mcpConnections.get(sessionId);
    if (!connection) {
      return NextResponse.json({ error: "Active SSE session not found or closed" }, { status: 404 });
    }

    // 3. Parse JSON-RPC message
    const body = await request.json();
    const { jsonrpc, method, params, id } = body;

    if (jsonrpc !== "2.0") {
      return NextResponse.json({ error: "Invalid JSON-RPC version. Must be '2.0'" }, { status: 400 });
    }

    console.log(`[MCP Server] [Session ${sessionId}] Received JSON-RPC Request:`, { method, id });
    broadcastMcpLog("rpc_in", `[Session ${sessionId}] Inbound: method='${method}' | id=${id || 'none'}`);

    let responsePayload: any = null;

    // 4. Decode JSON-RPC Methods based on MCP specification
    switch (method) {
      case "initialize": {
        responsePayload = {
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {} // Register that this server exposes powerful tools
            },
            serverInfo: {
              name: "osama-icd10-mcp-server",
              version: "1.0.0"
            }
          },
          id
        };
        break;
      }

      case "notifications/initialized": {
        // Client initialized notifications do not require a response.
        broadcastMcpLog("success", `[Session ${sessionId}] Client successfully initialized! Server is active.`);
        return new Response(null, { status: 202 });
      }

      case "tools/list": {
        responsePayload = {
          jsonrpc: "2.0",
          result: {
            tools: [
              {
                name: "search_icd_codes",
                description: "Perform high-precision semantic vector searches in the 2027 ICD-10 clinical database to match patient symptoms, medical queries, or disease descriptions directly with formal ICD-10-CM codes, detailed metadata, and clinical guides.",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Colloquial clinical symptom description or disease term to match (e.g. 'crushing chest pain spreads to left arm', 'history of high blood sugar with burning feet', 'Aarskog syndrome')."
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "analyze_medical_report",
                description: "Deconstruct deep medical notes, clinical summaries, or EHR records using advanced diagnostics. Translates medical findings and reports into formal ICD-10 code lists and clinical descriptions.",
                inputSchema: {
                  type: "object",
                  properties: {
                    reportText: {
                      type: "string",
                      description: "Full clinical notes, EHR details, discharge summary, or doctor note text to deconstruct."
                    }
                  },
                  required: ["reportText"]
                }
              }
            ]
          },
          id
        };
        break;
      }

      case "tools/call": {
        const toolName = params?.name;
        const args = params?.arguments || {};

        const clientIp = getClientIP(request.headers);
        const { allowed, error: limitErr } = incrementAndCheckGlobalLimit(clientIp);
        if (!allowed) {
          responsePayload = {
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: limitErr || "Daily rate limit reached. Please try again tomorrow."
            },
            id
          };
          break;
        }

        broadcastMcpLog("info", `[Session ${sessionId}] Executing tool: '${toolName}'...`);

        if (toolName === "search_icd_codes") {
          const queryArg = args.query || "";
          const results = await searchICD(queryArg, 5);

          // Construct a beautifully formatted Markdown response for the AI agent
          let markdown = `### 🔍 ICD-10-CM Vector Search Results\n`;
          markdown += `Query: *"${queryArg}"*\n\n`;

          if (results.length === 0) {
            markdown += `No matching ICD-10-CM codes found in the vector space. Please try broader clinical keywords.\n`;
          } else {
            results.forEach((match, index) => {
              markdown += `#### ${index + 1}. Code: \`${match.code}\` (Similarity Score: ${(match.score * 100).toFixed(1)}%)\n`;
              markdown += `* **Official Diagnosis:** ${match.name}\n`;
              markdown += `* **Hierarchy:** ${match.chapter} > ${match.block}\n`;
              if (match.parent_code) {
                markdown += `* **Parent Code:** \`${match.parent_code}\`\n`;
              }
              if (match.synonyms && match.synonyms.length > 0) {
                markdown += `* **Synonyms:** ${match.synonyms.join(", ")}\n`;
              }
              if (match.search_index_paths && match.search_index_paths.length > 0) {
                markdown += `* **Clinical Search Paths:**\n`;
                match.search_index_paths.slice(0, 3).forEach((path) => {
                  markdown += `  - *${path}*\n`;
                });
              }
              markdown += `\n`;
            });
          }

          responsePayload = {
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: markdown
                }
              ]
            },
            id
          };
        } else if (toolName === "analyze_medical_report") {
          const reportArg = args.reportText || "";
          const analysis = await analyzeClinicalReport(reportArg);

          // Construct a beautiful, detailed Clinical EHR Markdown report for the AI agent
          let markdown = `### 🏥 Clinical EHR Diagnostics Report\n`;
          markdown += `**Executive Case Summary:**\n*${analysis.original_summary}*\n\n`;
          markdown += `**Primary Findings & Mapped ICD-10 Classifications:**\n\n`;

          analysis.findings.forEach((finding, index) => {
            markdown += `#### Finding ${index + 1}: **${finding.term}**\n`;
            markdown += `* **Clinical Relevance:** *${finding.clinical_relevance}*\n`;
            markdown += `* **Resolved ICD-10-CM Vectors:**\n`;

            if (finding.codes_resolved.length === 0) {
              markdown += `  - *No direct vector match resolved.*\n`;
            } else {
              finding.codes_resolved.forEach((match) => {
                markdown += `  - \`${match.code}\` - **${match.name}** (Match: ${(match.score * 100).toFixed(1)}%)\n`;
                markdown += `    *Section: ${match.block}*\n`;
              });
            }
            markdown += `\n`;
          });

          responsePayload = {
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: markdown
                }
              ]
            },
            id
          };
        } else {
          responsePayload = {
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Method/Tool not found: '${toolName}'`
            },
            id
          };
        }
        break;
      }

      default: {
        responsePayload = {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: '${method}'`
          },
          id
        };
        break;
      }
    }

    // 5. Send JSON-RPC response over the active SSE stream
    if (responsePayload) {
      const chunk = `event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`;
      connection.controller.enqueue(new TextEncoder().encode(chunk));
      
      console.log(`[MCP Server] [Session ${sessionId}] Dispatched Response over SSE stream.`);
      broadcastMcpLog("rpc_out", `[Session ${sessionId}] Outbound: Resolved '${method}' with response.`);
    }

    // Respond 200 OK to the incoming POST trigger
    return new Response(null, { status: 200 });

  } catch (error: any) {
    console.error("[MCP MESSAGE API ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "An unexpected JSON-RPC error occurred" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
