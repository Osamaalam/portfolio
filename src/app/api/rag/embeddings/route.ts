import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const { texts } = await request.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid texts array" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    console.log(`Generating real embeddings using model ${model} for ${texts.length} items via direct REST API...`);

    // Perform parallel embedding requests via axios to bypass Next's global fetch patch
    const embedPromises = texts.map(async (text: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
      const response = await axios.post(url, {
        content: {
          parts: [{ text: text }]
        }
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 12000
      });

      if (response.data && response.data.embedding && response.data.embedding.values) {
        return response.data.embedding.values;
      } else {
        throw new Error("Invalid embedding response from Google REST API");
      }
    });

    const vectors = await Promise.all(embedPromises);

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