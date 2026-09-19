import { SerializedNetwork, NetworkPrediction } from "@/types/neural";
import { tanh, sigmoid } from "./activation";
import { mutateValue } from "./mutation";
import { crossoverGene } from "./crossover";

export class NeuralNetwork {
  public layerSizes: number[];
  // weights[layerIndex][neuronIndex][weightIndexFromPrevNeuron]
  // layerIndex 0 is connections from layer 0 to layer 1
  public weights: number[][][];
  // biases[layerIndex][neuronIndex]
  // layerIndex 0 is biases for layer 1
  public biases: number[][];

  constructor(layerSizes: number[] = [8, 8, 6, 2]) {
    this.layerSizes = [...layerSizes];
    this.weights = [];
    this.biases = [];

    this.initializeMatrices();
  }

  private initializeMatrices(): void {
    this.weights = [];
    this.biases = [];

    for (let l = 0; l < this.layerSizes.length - 1; l++) {
      const fanIn = this.layerSizes[l];
      const fanOut = this.layerSizes[l + 1];

      // Xavier initialization scale
      const stdDev = Math.sqrt(2.0 / (fanIn + fanOut));

      const layerWeights: number[][] = [];
      const layerBiases: number[] = [];

      for (let j = 0; j < fanOut; j++) {
        const neuronWeights: number[] = [];
        for (let i = 0; i < fanIn; i++) {
          // Uniform random scaled by Xavier stdDev
          neuronWeights.push((Math.random() * 2 - 1) * stdDev * 1.5);
        }
        layerWeights.push(neuronWeights);
        layerBiases.push((Math.random() * 2 - 1) * 0.1);
      }

      this.weights.push(layerWeights);
      this.biases.push(layerBiases);
    }
  }

  public randomize(rng: () => number = Math.random): void {
    for (let l = 0; l < this.weights.length; l++) {
      const fanIn = this.layerSizes[l];
      const fanOut = this.layerSizes[l + 1];
      const stdDev = Math.sqrt(2.0 / (fanIn + fanOut));

      for (let j = 0; j < fanOut; j++) {
        for (let i = 0; i < fanIn; i++) {
          this.weights[l][j][i] = (rng() * 2 - 1) * stdDev * 1.5;
        }
        this.biases[l][j] = (rng() * 2 - 1) * 0.1;
      }
    }
  }

  public predict(inputs: number[]): NetworkPrediction {
    if (inputs.length !== this.layerSizes[0]) {
      throw new Error(
        `Input dimension mismatch: expected ${this.layerSizes[0]}, got ${inputs.length}`
      );
    }

    const activations: number[][] = [];
    // Input layer activation is raw inputs
    let currentActivations = [...inputs];
    activations.push(currentActivations);

    // Forward pass through hidden and output layers
    for (let l = 0; l < this.weights.length; l++) {
      const isOutputLayer = l === this.weights.length - 1;
      const nextActivations: number[] = [];
      const layerWeights = this.weights[l];
      const layerBiases = this.biases[l];

      for (let j = 0; j < layerWeights.length; j++) {
        let sum = layerBiases[j];
        const neuronWeights = layerWeights[j];

        for (let i = 0; i < currentActivations.length; i++) {
          sum += currentActivations[i] * neuronWeights[i];
        }

        if (isOutputLayer) {
          // Output 0: turn [-1, 1] using tanh
          // Output 1: thrust [0, 1] using sigmoid
          if (j === 0) {
            nextActivations.push(tanh(sum));
          } else {
            nextActivations.push(sigmoid(sum));
          }
        } else {
          // Hidden layers use tanh
          nextActivations.push(tanh(sum));
        }
      }

      currentActivations = nextActivations;
      activations.push(currentActivations);
    }

    return {
      outputs: currentActivations,
      activations,
    };
  }

  public clone(): NeuralNetwork {
    const clone = new NeuralNetwork(this.layerSizes);

    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let i = 0; i < this.weights[l][j].length; i++) {
          clone.weights[l][j][i] = this.weights[l][j][i];
        }
        clone.biases[l][j] = this.biases[l][j];
      }
    }

    return clone;
  }

  public mutate(
    rate: number = 0.08,
    amount: number = 0.35,
    rng: () => number = Math.random
  ): void {
    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let i = 0; i < this.weights[l][j].length; i++) {
          this.weights[l][j][i] = mutateValue(
            this.weights[l][j][i],
            rate,
            amount,
            rng
          );
        }
        this.biases[l][j] = mutateValue(this.biases[l][j], rate, amount, rng);
      }
    }
  }

  public crossover(
    other: NeuralNetwork,
    rng: () => number = Math.random
  ): NeuralNetwork {
    const child = new NeuralNetwork(this.layerSizes);

    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let i = 0; i < this.weights[l][j].length; i++) {
          child.weights[l][j][i] = crossoverGene(
            this.weights[l][j][i],
            other.weights[l][j][i],
            rng
          );
        }
        child.biases[l][j] = crossoverGene(
          this.biases[l][j],
          other.biases[l][j],
          rng
        );
      }
    }

    return child;
  }

  public serialize(): SerializedNetwork {
    return {
      layerSizes: [...this.layerSizes],
      weights: JSON.parse(JSON.stringify(this.weights)),
      biases: JSON.parse(JSON.stringify(this.biases)),
    };
  }

  public static deserialize(data: SerializedNetwork): NeuralNetwork {
    const net = new NeuralNetwork(data.layerSizes);
    net.weights = JSON.parse(JSON.stringify(data.weights));
    net.biases = JSON.parse(JSON.stringify(data.biases));
    return net;
  }
}
