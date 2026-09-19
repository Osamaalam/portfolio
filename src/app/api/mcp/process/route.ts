import { NextResponse } from "next/server";
import { searchICD, analyzeClinicalReport } from "@/lib/icdService";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request.headers);

    // Rate Limit Security Check
    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Daily API quota reached. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { type, query, reportText, stages } = body;

    if (!type || (type !== "search" && type !== "analyze")) {
      return NextResponse.json(
        { success: false, error: "Invalid execution type. Must be 'search' or 'analyze'." },
        { status: 400 }
      );
    }

    if (type === "search") {
      if (!query || typeof query !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing query string." },
          { status: 400 }
        );
      }

      // Input length security limit
      const cleanQuery = query.trim().slice(0, 500);
      const results = await searchICD(cleanQuery, 5);

      return NextResponse.json({
        success: true,
        type: "search",
        query: cleanQuery,
        results,
      });
    } else {
      if (!reportText || typeof reportText !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing clinical reportText string." },
          { status: 400 }
        );
      }

      // Report size security limit
      const cleanReportText = reportText.trim().slice(0, 3000);
      const analysis = await analyzeClinicalReport(cleanReportText);

      return NextResponse.json({
        success: true,
        type: "analyze",
        summary: analysis.original_summary,
        findings: analysis.findings,
        negations: analysis.negations,
        relationships: analysis.relationships,
      });
    }
  } catch (error: any) {
    console.error("[MCP PROCESS API ERROR]:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred during processing." },
      { status: 500 }
    );
  }
}
