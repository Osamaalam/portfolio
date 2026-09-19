export function crossoverGene(
  geneA: number,
  geneB: number,
  rng: () => number = Math.random
): number {
  const r = rng();
  if (r < 0.45) {
    return geneA;
  } else if (r < 0.90) {
    return geneB;
  } else {
    // Arithmetic blending
    return (geneA + geneB) * 0.5;
  }
}
