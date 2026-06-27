import { NextResponse } from "next/server";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request.headers);

    // Check total website usage cap first to protect API budget
    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Website daily API budget limit reached. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { texts } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid texts array" },
        { status: 400 }
      );
    }

    // 1. Array Size Security Cap (Rule 8)
    if (texts.length > 60) {
      return NextResponse.json(
        { success: false, error: "Security Exception: Batch size exceeds the 60 text limit." },
        { status: 400 }
      );
    }

    // 2. Element Validation & Individual Length Cap (Rule 8)
    texts = texts.map((t: any) => String(t || "").trim().slice(0, 1000));

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    console.log(`Generating real batch embeddings using model ${model} for ${texts.length} items via direct REST API...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;
    const modelPath = model.startsWith("models/") ? model : `models/${model}`;

    const response = await axios.post(url, {
      requests: texts.map((text: string) => ({
        model: modelPath,
        content: {
          parts: [{ text: text }]
        }
      }))
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000
    });

    if (!response.data || !response.data.embeddings || !Array.isArray(response.data.embeddings)) {
      throw new Error("Invalid response format from Google REST API");
    }

    const vectors = response.data.embeddings.map((item: any) => {
      if (item && item.values) {
        return item.values;
      } else {
        throw new Error("Embedding values missing in response");
      }
    });

    return NextResponse.json({
      success: true,
      vectors,
    });
  } catch (error: any) {
    console.error("Gemini Embeddings REST API Error:", error.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error.response?.data?.error?.message || error.message || "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}