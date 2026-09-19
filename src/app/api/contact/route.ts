import { NextResponse } from "next/server";
import axios from "axios";
import { incrementAndCheckGlobalLimit, getClientIP } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request.headers);

    // 1. Enforce IP and Global Daily Rate-Limiting (Rule 8)
    const { allowed, error } = incrementAndCheckGlobalLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: error || "Rate limit exceeded. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { name, email, service, message } = body;

    // Validate inputs
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Strict Input Length Caps (Rule 8)
    name = String(name).trim().slice(0, 100);
    email = String(email).trim().slice(0, 100);
    service = String(service || "general").trim().slice(0, 50);
    message = String(message).trim().slice(0, 3000);

    // 3. Email Format Security Regex (Rule 8)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Security Exception: Invalid email format" },
        { status: 400 }
      );
    }

    // Logging the submission to the server console (visible in terminal logs)
    console.log("=========================================");
    console.log("NEW PORTFOLIO CONTACT SUBMISSION:");
    console.log(`From: ${name} (${email})`);
    console.log(`Topic: ${service}`);
    console.log(`Message: ${message}`);
    console.log("=========================================");

    // Construct the production webhook URL with securely encoded parameters
    const baseUrl = "https://n8n.osamaalam.com/webhook/e99b456d-21d3-4553-92b3-e63809712cac";
    const fullUrl = `${baseUrl}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&service=${encodeURIComponent(service)}&message=${encodeURIComponent(message)}&source=Portfolio_Website_Hub&timestamp=${encodeURIComponent(new Date().toISOString())}`;

    // Construct Basic Authorization header securely from environment variables
    const webhookUser = process.env.N8N_WEBHOOK_USER;
    const webhookPass = process.env.N8N_WEBHOOK_PASS;
    const headers: Record<string, string> = {
      "Accept": "application/json"
    };

    if (webhookUser && webhookPass) {
      headers["Authorization"] = `Basic ${Buffer.from(`${webhookUser}:${webhookPass}`).toString("base64")}`;
    }

    // Forward payload to n8n webhook using axios with safe timeout
    try {
      const response = await axios.get(fullUrl, {
        headers,
        timeout: 5000
      });
      console.log("n8n webhook response status:", response.status);
    } catch (webhookError: any) {
      console.warn("n8n webhook notification failed or offline:", webhookError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Lead processed and received successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Contact API Error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
