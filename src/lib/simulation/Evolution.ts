import { Fish } from "./Fish";
import { NeuralNetwork } from "@/lib/neural/NeuralNetwork";
import { GenerationStats, LevelConfig } from "@/types/simulation";

export class Evolution {
  /**
   * Selects a parent from the population using tournament selection.
   */
  public static tournamentSelect(
    population: Fish[],
    tournamentSize: number = 3,
    rng: () => number = Math.random
  ): NeuralNetwork {
    let bestFish: Fish = population[Math.floor(rng() * population.length)];

    for (let i = 1; i < tournamentSize; i++) {
      const candidate = population[Math.floor(rng() * population.length)];
      if (candidate.fitness > bestFish.fitness) {
        bestFish = candidate;
      }
    }

    return bestFish.neuralNetwork;
  }

  /**
   * Evolves the current population into a new generation.
   * If selectedFishId is provided, preserves the selected agent's continuous lineage
   * directly at its designated slot ID so it never gets overwritten by random children
   * or moved to Agent 1.
   */
  public static evolveGeneration(
    population: Fish[],
    level: LevelConfig,
    generationNumber: number,
    mutationRate: number = 0.08,
    mutationStrength: number = 0.35,
    eliteCount: number = 5,
    rng: () => number = Math.random,
    selectedFishId?: number | null
  ): { nextPopulation: Fish[]; stats: GenerationStats } {
    const popSize = population.length;
    // 1. Sort population by fitness descending
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);

    // 2. Compute statistics for the completed generation
    const totalFitness = sorted.reduce((sum, f) => sum + f.fitness, 0);
    const avgFitness = totalFitness / popSize;
    const bestFish = sorted[0];
    const worstFish = sorted[sorted.length - 1];
    const successfulCount = sorted.filter((f) => f.reachedTarget).length;
    const targetSuccessRate = (successfulCount / popSize) * 100;
    const survivedCount = sorted.filter((f) => f.state === "TIMEOUT" || f.state === "TARGET_REACHED").length;
    const survivalRate = (survivedCount / popSize) * 100;
    const bestDistance = Math.min(...sorted.map((f) => f.bestTargetDistance));

    const stats: GenerationStats = {
      generation: generationNumber,
      bestFitness: Number(bestFish.fitness.toFixed(2)),
      averageFitness: Number(avgFitness.toFixed(2)),
      worstFitness: Number(worstFish.fitness.toFixed(2)),
      bestDistance: Number(bestDistance.toFixed(1)),
      survivalRate: Number(survivalRate.toFixed(1)),
      targetSuccessRate: Number(targetSuccessRate.toFixed(1)),
      aliveCount: 0,
      totalPopulation: popSize,
      level: level.id,
      elapsedFrames: 0,
    };

    // 3. Create the next generation
    const nextPopulation: Array<Fish | null> = new Array(popSize).fill(null);
    const actualEliteCount = Math.min(eliteCount, Math.floor(popSize * 0.2));

    // Track which elite brains from `sorted` have already been placed
    const usedEliteBrainIndices = new Set<number>();

    // A. If an agent is selected by the user, maintain its continuous lineage directly at slot ID
    const selectedAgent = selectedFishId
      ? population.find((f) => f.id === selectedFishId)
      : null;

    if (selectedAgent && selectedFishId && selectedFishId >= 1 && selectedFishId <= popSize) {
      const selectedIndex = selectedFishId - 1;
      const eliteRank = sorted.findIndex((f) => f.id === selectedFishId);
      const isSelectedElite = eliteRank >= 0 && eliteRank < actualEliteCount;

      let brain: NeuralNetwork;
      if (isSelectedElite) {
        brain = selectedAgent.neuralNetwork.clone();
        usedEliteBrainIndices.add(eliteRank);
      } else {
        const partner = Evolution.tournamentSelect(sorted, 3, rng);
        brain = selectedAgent.neuralNetwork.crossover(partner, rng);
        brain.mutate(mutationRate, mutationStrength, rng);
      }

      const fish = new Fish(
        selectedFishId,
        level.spawnArea.x,
        level.spawnArea.y,
        level.spawnArea.angle,
        brain,
        isSelectedElite
      );
      fish.initDistances(level.target);
      nextPopulation[selectedIndex] = fish;
    }

    // B. Place remaining elite champions into first available slots
    let sortedEliteIdx = 0;
    for (let i = 0; i < popSize; i++) {
      if (nextPopulation[i] !== null) continue;
      while (sortedEliteIdx < actualEliteCount && usedEliteBrainIndices.has(sortedEliteIdx)) {
        sortedEliteIdx++;
      }
      if (sortedEliteIdx < actualEliteCount) {
        const eliteBrain = sorted[sortedEliteIdx].neuralNetwork.clone();
        usedEliteBrainIndices.add(sortedEliteIdx);
        const fish = new Fish(
          i + 1,
          level.spawnArea.x,
          level.spawnArea.y,
          level.spawnArea.angle,
          eliteBrain,
          true // isElite
        );
        fish.initDistances(level.target);
        nextPopulation[i] = fish;
        sortedEliteIdx++;
      } else {
        break;
      }
    }

    // C. Breed remaining agents via crossover and mutation
    for (let i = 0; i < popSize; i++) {
      if (nextPopulation[i] !== null) continue;

      const parentA = Evolution.tournamentSelect(sorted, 3, rng);
      const parentB = Evolution.tournamentSelect(sorted, 3, rng);

      const childBrain = parentA.crossover(parentB, rng);
      childBrain.mutate(mutationRate, mutationStrength, rng);

      const fish = new Fish(
        i + 1,
        level.spawnArea.x,
        level.spawnArea.y,
        level.spawnArea.angle,
        childBrain,
        false
      );
      fish.initDistances(level.target);
      nextPopulation[i] = fish;
    }

    return { nextPopulation: nextPopulation as Fish[], stats };
  }
}
