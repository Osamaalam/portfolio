import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  let tempFilePath = "";
  try {
    const ip = getClientIP(request.headers);

    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Daily global API budget limit reached." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const engine = formData.get("engine") as string | null;
    const targetObject = formData.get("targetObject") as string | null;
    const prompt = formData.get("prompt") as string | null;

    if (!file || !engine) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    // 1. Image Size Security Validation (Rule 5 & Rule 8)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Security Exception: Image file size exceeds the 2 MB threshold." }, { status: 400 });
    }

    // 2. Image Type Security Validation (Rule 8)
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const ext = path.extname(file.name || "").toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      return NextResponse.json({ success: false, error: "Security Exception: Invalid file type. Only JPEG, PNG, and WEBP images are permitted." }, { status: 400 });
    }

    // 3. Engine Parameter Validation
    const allowedEngines = ["gemini", "yolo", "tesseract"];
    if (!allowedEngines.includes(engine)) {
      return NextResponse.json({ success: false, error: "Security Exception: Unsupported engine type." }, { status: 400 });
    }

    // 4. Input Sanitization (Rule 8)
    const sanitizedTarget = (targetObject || "")
      .trim()
      .slice(0, 50)
      .replace(/[^\w\s,-]/g, ""); // Allow only alphanumeric, spaces, commas, dashes

    const sanitizedPrompt = (prompt || "")
      .trim()
      .slice(0, 1000); // Strict limit to prevent buffer or token injection issues

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (engine === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = "gemini-3.1-flash-lite";

      if (!apiKey) {
        const fallbackText = "Gemini API key not configured.";
        return NextResponse.json({ success: true, text: fallbackText, fallbackActive: true });
      }

      const base64Data = buffer.toString("base64");
      const mimeType = file.type || "image/jpeg";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await axios.post(url, {
        contents: [{
          parts: [
            { text: sanitizedPrompt && sanitizedPrompt.trim() ? sanitizedPrompt : "Read this image. Provide a detailed, professional description." },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.15 }
      }, { headers: { "Content-Type": "application/json" }, timeout: 25000 });

      return NextResponse.json({ success: true, text: response.data.candidates[0].content.parts[0].text });
    }

    if (engine === "yolo") {
      const tempDir = "C:\\Users\\HP\\AppData\\Local\\Temp\\opencode";
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      tempFilePath = path.join(tempDir, `vision_${Date.now()}_${file.name.replace(/[^\w.-]/g, "")}`);
      await fs.promises.writeFile(tempFilePath, buffer);

      const scriptPath = path.resolve(path.join(process.cwd(), "src/scripts/yolo_ocr.py"));
      const filterArg = sanitizedTarget ? sanitizedTarget : "all";
      
      // Use spawn to handle large outputs without buffer limits
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn("python", [scriptPath, tempFilePath, filterArg]);
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => { stdout += data.toString(); });
        child.stderr.on("data", (data) => { stderr += data.toString(); });
        child.on("close", (code) => {
          if (stderr) console.error(`[Vision API] Python stderr:`, stderr);
          if (code !== 0) reject(new Error(`Python script exited with code ${code}`));
          else resolve(stdout);
        });
        child.on("error", reject);
      });

      let cleanOutput = output.trim();
      const firstBrace = cleanOutput.indexOf("{");
      const lastBrace = cleanOutput.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanOutput = cleanOutput.slice(firstBrace, lastBrace + 1);
      }

      return NextResponse.json(JSON.parse(cleanOutput));
    }

    return NextResponse.json({ success: false, error: "Invalid engine" }, { status: 400 });

  } catch (err: any) {
    console.error("[Vision API] Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
}
