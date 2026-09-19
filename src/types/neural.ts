export interface SerializedNetwork {
  layerSizes: number[];
  weights: number[][][]; // [layerIndex][neuronIndex][weightIndex]
  biases: number[][];    // [layerIndex][neuronIndex]
}

export interface NetworkPrediction {
  outputs: number[];
  activations: number[][]; // [layerIndex][neuronIndex] including input layer
}

export interface NeuronMetadata {
  id: string;
  label: string;
  layer: number;
  index: number;
  activation: number;
  x?: number;
  y?: number;
}

export interface ConnectionMetadata {
  fromLayer: number;
  fromNeuron: number;
  toLayer: number;
  toNeuron: number;
  weight: number;
  signalStrength: number; // activation * weight
}
