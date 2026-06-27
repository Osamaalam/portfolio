import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryIp = searchParams.get("ip");

    const forwardHeader = request.headers.get("x-forwarded-for");
    const detectedIp = forwardHeader ? forwardHeader.split(",")[0].trim() : "127.0.0.1";

    // Strict IP validation regex to prevent injection or header manipulation (Rule 8)
    const ipPattern = /^([0-9a-fA-F:.]{3,45})$/;
    let ip = queryIp && ipPattern.test(queryIp) ? queryIp : detectedIp;

    // For localhost development, detect the public IP of the machine via freeipapi.com
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
      const res = await axios.get("https://freeipapi.com/api/json/", { 
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        timeout: 4000 
      });
      return NextResponse.json({
        ip: res.data.ipAddress || "127.0.0.1",
        city: res.data.cityName || "Local Dev",
        country_name: res.data.countryName || "Workspace"
      });
    }

    // In production, query details for the detected client IP via freeipapi.com
    const url = `https://freeipapi.com/api/json/${ip}`;
    const res = await axios.get(url, { 
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 4000 
    });
    return NextResponse.json({
      ip: res.data.ipAddress || ip,
      city: res.data.cityName || "Unknown City",
      country_name: res.data.countryName || "Unknown Country"
    });
  } catch (err: any) {
    console.error("[Vision IP API] Error retrieving IP geo via freeipapi.com:", err.message);
    // Secure fallback to default parameters to prevent dashboard crash (Rule 8)
    return NextResponse.json({
      ip: "0.0.0.0",
      city: "Unknown Region",
      country_name: "Blocked"
    });
  }
}
