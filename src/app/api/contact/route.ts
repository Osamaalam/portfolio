import { NextResponse } from "next/server";
import { execFile } from "child_process";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, service, message } = body;

    // Validate inputs
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
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

    // Execute native curl.exe with an arguments array (completely secure against shell injection)
    // This utilizes the native Windows network stack, bypassing Node.js socket DNS IPv6 bottlenecks.
    const curlArgs = [
      "-s",
      "-u", "osamaresponse:paskjewi&hw6",
      fullUrl
    ];

    console.log(`Forwarding payload to n8n via native system adapters...`);
    
    // We execute this asynchronously in the background so the user gets an instant 200 OK response!
    execFile("curl.exe", curlArgs, (error, stdout, stderr) => {
      if (error) {
        console.error("n8n native forward integration failed:", error.message || error);
      } else {
        console.log("n8n native forward response successful:", stdout.trim());
      }
    });

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
