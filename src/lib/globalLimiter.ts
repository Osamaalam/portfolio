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

export function incrementAndCheckGlobalLimit(): { allowed: boolean; currentCount: number } {
  const today = new Date().toISOString().split("T")[0];

  // 1. Reset counter if a new calendar day has started
  if (state.day !== today) {
    state.count = 0;
    state.day = today;
    console.log(`[RATE LIMITER] New calendar day detected (${today}). Reset global query counter to 0.`);
  }

  // 2. Enforce budget block
  if (state.count >= GLOBAL_DAILY_CAP) {
    console.warn(`[RATE LIMITER] Global limit breached (${state.count} / ${GLOBAL_DAILY_CAP}). Blocking further API calls.`);
    return { allowed: false, currentCount: state.count };
  }

  // 3. Increment for the allowed query
  state.count += 1;
  console.log(`[RATE LIMITER] Request authorized. Global daily usage: ${state.count} / ${GLOBAL_DAILY_CAP}`);
  return { allowed: true, currentCount: state.count };
}
