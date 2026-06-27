import { NextResponse } from "next/server";
import { incrementAndCheckGlobalLimit } from "@/lib/globalLimiter";

export async function POST(request: Request) {
  try {
    const forwardHeader = request.headers.get("x-forwarded-for");
    const ip = forwardHeader ? forwardHeader.split(",")[0].trim() : "127.0.0.1";

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

    // Construct Basic Authorization header securely
    const webhookUser = process.env.N8N_WEBHOOK_USER || "osamaresponse";
    const webhookPass = process.env.N8N_WEBHOOK_PASS || "paskjewi&hw6";
    const authString = Buffer.from(`${webhookUser}:${webhookPass}`).toString("base64");

    console.log(`Forwarding payload to n8n via native fetch API...`);
    
    // Perform standard HTTP request securely and portably
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with status ${response.status}`);
    }

    const responseText = await response.text();
    console.log("n8n native forward response successful:", responseText.trim());

    return NextResponse.json({
      success: true,
      message: "Lead processed and queued successfully via n8n",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Contact API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
