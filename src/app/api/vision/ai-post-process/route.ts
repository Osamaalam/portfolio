import { NextResponse } from "next/server";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request.headers);

    // 1. Enforce IP and Global Daily Rate-Limiting
    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Daily global API budget limit reached. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { text, prompt, temperature } = body;

    if (!text || !prompt) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: text or prompt" },
        { status: 400 }
      );
    }

    // Security Validation & Sanitization (Rule 8)
    text = String(text).slice(0, 15000); // Prevent extremely large document abuse
    prompt = String(prompt).trim().slice(0, 1000); // Prevent prompt injection or payload issues

    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-3.1-flash-lite";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is not configured on server" },
        { status: 500 }
      );
    }

    const systemInstruction = 
      "You are an elite, high-performance Document Intelligence AI assistant. " +
      "Your objective is to read the raw extracted OCR text provided by the user, and process/restructure it strictly following their custom instruction prompt. " +
      "Do not invent details, do not guess missing values, and do not hallucinate. Be accurate, clear, and professional. Adopt the exact style, markdown format, or language requested by the user's prompt.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`[Vision AI API] Querying post-processing model ${model} for prompt: "${prompt.slice(0, 40)}..."`);

    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: `RAW OCR EXTRACTED TEXT:\n"""\n${text}\n"""\n\nUSER PROCESSING INSTRUCTIONS:\n"${prompt}"` }]
      }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: parseFloat(temperature) || 0.3
      }
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 25000
    });

    let resultText = "";
    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates.length > 0 &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts.length > 0
    ) {
      resultText = response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("No text response from Gemini API");
    }

    return NextResponse.json({
      success: true,
      text: resultText
    });

  } catch (err: any) {
    console.error("[Vision AI API] Exception in post-processor:", err.response?.data || err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to post-process extracted text" },
      { status: 500 }
    );
  }
}
