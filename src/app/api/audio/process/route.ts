import { NextResponse } from "next/server";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request.headers);

    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Rate limit reached." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Security: 2MB limit (Rule 8)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 2MB)" }, { status: 400 });
    }

    // Security: File type validation
    const allowedMimeTypes = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp3"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid audio format" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-3.1-flash-lite"; // Audio supports 3.1 series flawlessly

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(url, {
      contents: [{
        parts: [
          { text: "Transcribe this audio into accurate text." },
          { inlineData: { mimeType: file.type, data: base64Data } }
        ]
      }]
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000 // Audio can take longer
    });

    return NextResponse.json({ success: true, text: response.data.candidates[0].content.parts[0].text });
  } catch (err: any) {
    console.error("[Audio API] Error:", err.message);
    return NextResponse.json({ success: false, error: "Processing failed" }, { status: 500 });
  }
}
