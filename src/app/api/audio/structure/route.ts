import { NextResponse } from "next/server";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request.headers);

    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json({ success: false, error: error }, { status: 429 });
    }

    const { text, prompt } = await request.json();
    
    // Security: sanitize and limit
    const sanitizedText = String(text || "").trim().slice(0, 15000);
    const sanitizedPrompt = String(prompt || "Structure this into notes").trim().slice(0, 1000);

    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-3.1-flash-lite"; // Audio supports 3.1 series flawlessly

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: `Here is the transcribed text:\n${sanitizedText}\n\nInstructions: ${sanitizedPrompt}` }]
      }]
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });

    return NextResponse.json({ success: true, text: response.data.candidates[0].content.parts[0].text });
  } catch (err: any) {
    console.error("[Audio Structure API] Error:", err.message);
    return NextResponse.json({ success: false, error: "Failed to structure notes" }, { status: 500 });
  }
}
