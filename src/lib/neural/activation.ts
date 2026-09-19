export function tanh(x: number): number {
  if (isNaN(x)) return 0;
  if (x > 20) return 1;
  if (x < -20) return -1;
  return Math.tanh(x);
}

export function sigmoid(x: number): number {
  if (isNaN(x)) return 0.5;
  const clamped = Math.max(-45, Math.min(45, x));
  return 1 / (1 + Math.exp(-clamped));
}

export function relu(x: number): number {
  return Math.max(0, x);
}

export function clamp(val: number, min: number, max: number): number {
  if (isNaN(val)) return min;
  return Math.max(min, Math.min(max, val));
}
