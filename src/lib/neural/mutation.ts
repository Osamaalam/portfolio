/**
 * Standard Box-Muller transform to generate normally distributed random numbers
 * with mean = 0 and stdDev = 1.
 */
export function gaussianRandom(rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng(); // Converting [0,1) to (0,1)
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Mutates a numeric value with given probability and strength.
 * Occasionally performs a complete random reset (10% chance when mutated) to escape local minima.
 */
export function mutateValue(
  value: number,
  rate: number,
  strength: number,
  rng: () => number = Math.random
): number {
  if (rng() >= rate) return value;

  // 10% chance of random replacement within [-2, 2]
  if (rng() < 0.1) {
    return (rng() * 4) - 2;
  }

  // 90% chance of Gaussian nudge
  const delta = gaussianRandom(rng) * strength;
  const result = value + delta;

  // Clamp to healthy weight bounds [-4, 4]
  return Math.max(-4, Math.min(4, result));
}
