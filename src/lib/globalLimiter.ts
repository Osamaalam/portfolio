interface GlobalLimitState {
  count: number;
  day: string; // Tracks the current day, e.g., "2026-06-12"
}

// Global variable stored in Node server memory context
const state: GlobalLimitState = {
  count: 0,
  day: new Date().toISOString().split("T")[0],
};

const GLOBAL_DAILY_CAP = 500; // Absolute maximum API queries allowed across the entire site per day
const IP_DAILY_LIMIT = 15; // Maximum queries allowed per unique IP address per day
const WHITELISTED_IPS = ["34.132.233.106"];

// Memory registry to track query frequencies per IP address
const ipRegistry: Record<string, { count: number; date: string }> = {};

export function incrementAndCheckGlobalLimit(ipAddress?: string): { allowed: boolean; currentCount: number; error?: string } {
  const today = new Date().toISOString().split("T")[0];

  // 1. Reset counters if a new calendar day has started
  if (state.day !== today) {
    state.count = 0;
    state.day = today;
    // Wipe memory footprint of old days to maintain high performance
    for (const key in ipRegistry) {
      delete ipRegistry[key];
    }
    console.log(`[RATE LIMITER] New calendar day detected (${today}). Reset all rate limiter registries.`);
  }

  // 2. Enforce IP-based rate limiting
  const clientIP = ipAddress || "unknown";
  const isWhitelisted = WHITELISTED_IPS.includes(clientIP);

  if (clientIP !== "unknown" && !isWhitelisted) {
    if (!ipRegistry[clientIP] || ipRegistry[clientIP].date !== today) {
      ipRegistry[clientIP] = { count: 0, date: today };
    }

    if (ipRegistry[clientIP].count >= IP_DAILY_LIMIT) {
      console.warn(`[RATE LIMITER] IP rate limit breached for client ${clientIP} (${ipRegistry[clientIP].count} / ${IP_DAILY_LIMIT}). Blocking request.`);
      return { 
        allowed: false, 
        currentCount: state.count, 
        error: "Individual IP daily query threshold exceeded. Please try again tomorrow." 
      };
    }
  }

  // 3. Enforce website-wide budget block
  if (state.count >= GLOBAL_DAILY_CAP) {
    console.warn(`[RATE LIMITER] Global budget limit breached (${state.count} / ${GLOBAL_DAILY_CAP}). Blocking further API calls.`);
    return { 
      allowed: false, 
      currentCount: state.count, 
      error: "Website daily API budget limit reached. Please try again tomorrow." 
    };
  }

  // 4. Increment IP-specific and global counters
  if (clientIP !== "unknown" && !isWhitelisted) {
    ipRegistry[clientIP].count += 1;
    console.log(`[RATE LIMITER] IP ${clientIP} count: ${ipRegistry[clientIP].count} / ${IP_DAILY_LIMIT}`);
  }

  state.count += 1;
  console.log(`[RATE LIMITER] Request authorized. Global daily usage: ${state.count} / ${GLOBAL_DAILY_CAP}`);
  return { allowed: true, currentCount: state.count };
}
