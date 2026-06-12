import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const { query, contexts, history } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Missing query" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    // Map conversation history into alternating 'user' and 'model' turns for native chat context
    const contentsList: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        // Exclude system messages or welcome messages that don't match standard user/assistant turns
        if ((msg.role === "user" || msg.role === "assistant") && !msg.id?.startsWith("system")) {
          contentsList.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      });
    }

    // Build the augmented prompt with RAG instructions
    const contextString = contexts && contexts.length > 0 
      ? contexts.map((ctx: string, i: number) => `[Document Block #${i + 1}]: "${ctx}"`).join("\n\n")
      : "No matching context found.";

    const systemInstruction = 
      "You are Osama's RAG Core, an advanced, highly specialized enterprise document question-answering assistant.\n" +
      "Your goal is to answer the user's query truthfully, accurately, and ONLY using the provided retrieved Document Blocks below. Do not guess or hallucinate.\n\n" +
      "CRITICAL RELEVANCE RULES:\n" +
      "1. Answer based ONLY on the provided retrieved Document Blocks.\n" +
      "2. If the retrieved Document Blocks do not contain sufficient or relevant information to answer the user's query, or if the question is unrelated to the document, you MUST refuse to answer. Simply state verbatim: 'I searched through the uploaded document, but I could not find any relevant information matching your query. Please ask a question directly related to the contents of the document.'\n" +
      "3. Do not invent details, do not use your own pre-trained background knowledge, and do not hallucinate under any circumstances.\n" +
      "4. Cite the Document Block numbers you use in your answer (e.g., [Document Block #1]).\n" +
      "5. Adopt a professional, direct, and helpful tone.\n\n" +
      `RETRIEVED DOCUMENT BLOCKS:\n${contextString}`;

    console.log(`Generating real chat completion using model ${model} via direct REST API...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Append the current turn as the final user message
    contentsList.push({
      role: "user",
      parts: [{ text: `User Query: "${query}"` }]
    });

    // Call Gemini generateContent API via axios to bypass Next's global fetch patch
    const response = await axios.post(url, {
      contents: contentsList,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.15 // Slightly lower temperature for stricter factual precision
      }
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000
    });

    let responseText = "";
    if (
      response.data && 
      response.data.candidates && 
      response.data.candidates.length > 0 && 
      response.data.candidates[0].content && 
      response.data.candidates[0].content.parts && 
      response.data.candidates[0].content.parts.length > 0
    ) {
      responseText = response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid text generation response from Google REST API");
    }

    return NextResponse.json({
      success: true,
      text: responseText,
    });
  } catch (error: any) {
    console.error("Gemini Chat REST API Error:", error.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error.response?.data?.error?.message || error.message || "Failed to generate completion" },
      { status: 500 }
    );
  }
}