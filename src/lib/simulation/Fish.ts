import { NeuralNetwork } from "@/lib/neural/NeuralNetwork";
import {
  FishAgentData,
  SelectedAgentTelemetry,
  AgentState,
  Wall,
  Target,
  RayHit,
  Point,
} from "@/types/simulation";
import { calculateFishSensors } from "./SensorSystem";
import { circleCollidesWithWall, circleCollidesWithCircle } from "./Collision";

const TURN_SPEED = 0.09;
const ACCELERATION = 0.32;
const DRAG = 0.93;
const MAX_SPEED = 4.0;
const FISH_RADIUS = 5.5;
const MAX_TRAIL_LENGTH = 18;

export class Fish {
  public id: number;
  public x: number;
  public y: number;
  public velocityX: number;
  public velocityY: number;
  public angle: number;
  public speed: number;
  public alive: boolean;
  public age: number;
  public fitness: number;
  public distanceTravelled: number;
  public targetDistance: number;
  public initialTargetDistance: number;
  public bestTargetDistance: number;
  public reachedTarget: boolean;
  public state: AgentState;
  public color: string;
  public isElite: boolean;

  public neuralNetwork: NeuralNetwork;
  public trail: Point[];

  public lastInputs: number[];
  public lastOutputs: number[];
  public lastActivations: number[][];
  public lastRays: RayHit[];

  constructor(
    id: number,
    spawnX: number,
    spawnY: number,
    initialAngle: number = 0,
    brain?: NeuralNetwork,
    isElite: boolean = false
  ) {
    this.id = id;
    this.x = spawnX;
    this.y = spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.angle = initialAngle + (Math.random() * 0.4 - 0.2);
    this.speed = 0;
    this.alive = true;
    this.age = 0;
    this.fitness = 0;
    this.distanceTravelled = 0;
    this.targetDistance = 1000;
    this.initialTargetDistance = 1000;
    this.bestTargetDistance = 1000;
    this.reachedTarget = false;
    this.state = "SEARCHING";
    this.isElite = isElite;
    this.color = isElite ? "#06b6d4" : "#ec4899"; // Cyan for elite, pink/magenta for general

    this.neuralNetwork = brain ? brain.clone() : new NeuralNetwork([8, 8, 6, 2]);
    this.trail = [{ x: spawnX, y: spawnY }];

    this.lastInputs = new Array(8).fill(0);
    this.lastOutputs = [0, 0];
    this.lastActivations = [[...this.lastInputs], new Array(8).fill(0), new Array(6).fill(0), [0, 0]];
    this.lastRays = [];
  }

  public initDistances(target: Target): void {
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    this.initialTargetDistance = dist;
    this.targetDistance = dist;
    this.bestTargetDistance = dist;
  }

  public step(
    target: Target,
    walls: Wall[],
    environmentDiag: number,
    maxFrames: number,
    targetReachBonus: number,
    shark?: { x: number; y: number; radius: number; enabled?: boolean }
  ): void {
    if (!this.alive) return;

    this.age++;

    // 1. Gather environmental sensor inputs (including dynamic shark hazard detection)
    const prevDist = this.targetDistance;
    const { inputs, rays, currentDistance } = calculateFishSensors(
      this.x,
      this.y,
      this.angle,
      prevDist,
      target,
      walls,
      environmentDiag,
      shark
    );

    this.lastInputs = inputs;
    this.lastRays = rays;
    this.targetDistance = currentDistance;
    if (currentDistance < this.bestTargetDistance) {
      this.bestTargetDistance = currentDistance;
    }

    // 2. Feed-forward pass through the fish's unique neural network
    const prediction = this.neuralNetwork.predict(inputs);
    this.lastOutputs = prediction.outputs;
    this.lastActivations = prediction.activations;

    const turn = prediction.outputs[0];   // [-1, 1]
    const thrust = prediction.outputs[1]; // [0, 1]

    // 3. Biological Mauthner-Cell Predator Evasion Reflex & Adrenaline Burst
    let finalTurn = turn;
    let finalThrust = thrust;
    let currentMaxSpeed = MAX_SPEED;

    if (shark && shark.enabled !== false) {
      const dxToShark = shark.x - this.x;
      const dyToShark = shark.y - this.y;
      const distToShark = Math.hypot(dxToShark, dyToShark);
      const SENSE_RADIUS = 125; // Lateral-line acoustic and wake detection range

      if (distToShark < SENSE_RADIUS) {
        // Threat urgency: 0 at 125px up to 1.0 at close contact
        const threat = Math.max(0, Math.min(1.0, (SENSE_RADIUS - distToShark) / (SENSE_RADIUS - 20)));

        const angleToShark = Math.atan2(dyToShark, dxToShark);
        let relAngle = angleToShark - this.angle;
        while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

        // Evasion impulse: steer decisively away from the predator
        let evasionTurn = 0;
        if (Math.abs(relAngle) > 2.5) {
          // Shark is chasing directly from behind: execute rapid lateral zigzag dart
          evasionTurn = Math.sin(this.age * 0.25) > 0 ? 1.0 : -1.0;
        } else if (relAngle > 0) {
          // Shark is to the right: steer hard LEFT
          evasionTurn = -1.0;
        } else {
          // Shark is to the left: steer hard RIGHT
          evasionTurn = 1.0;
        }

        // Wall safety override: avoid dodging straight into a concrete barrier
        const wallLeft = this.lastRays[1]?.distance ?? 1.0;
        const wallRight = this.lastRays[2]?.distance ?? 1.0;
        if (evasionTurn < 0 && wallLeft < 0.22) {
          evasionTurn = 0.85;
        } else if (evasionTurn > 0 && wallRight < 0.22) {
          evasionTurn = -0.85;
        }

        // Blend neural network output with biological survival reflex
        finalTurn = turn * (1 - threat * 0.88) + evasionTurn * (threat * 0.88);

        // Adrenaline panic burst: maximum thrust + temporary speed surge to evade lunge
        finalThrust = Math.max(thrust, threat * 1.0);
        currentMaxSpeed = MAX_SPEED + threat * 1.35; // Up to 5.35 px/f escape sprint
      }
    }

    // 4. Movement physics
    this.angle += finalTurn * TURN_SPEED;

    const accel = finalThrust * ACCELERATION;
    this.velocityX = (this.velocityX + Math.cos(this.angle) * accel) * DRAG;
    this.velocityY = (this.velocityY + Math.sin(this.angle) * accel) * DRAG;

    this.speed = Math.hypot(this.velocityX, this.velocityY);
    if (this.speed > currentMaxSpeed) {
      const scale = currentMaxSpeed / this.speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
      this.speed = currentMaxSpeed;
    }

    this.x += this.velocityX;
    this.y += this.velocityY;
    this.distanceTravelled += this.speed;

    // 5. Update motion trail
    if (this.age % 2 === 0) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > MAX_TRAIL_LENGTH) {
        this.trail.shift();
      }
    }

    // 5. Collision checking with walls
    for (const wall of walls) {
      if (circleCollidesWithWall(this.x, this.y, FISH_RADIUS, wall)) {
        this.alive = false;
        this.state = "CRASHED";
        this.fitness = Math.max(0, this.calculateFitness(maxFrames, targetReachBonus) - 35);
        return;
      }
    }

    // 6. Target check
    if (circleCollidesWithCircle(this.x, this.y, FISH_RADIUS, target.x, target.y, target.radius)) {
      this.alive = false;
      this.reachedTarget = true;
      this.state = "TARGET_REACHED";
      this.fitness = this.calculateFitness(maxFrames, targetReachBonus);
      return;
    }

    // 7. Max lifespan check
    if (this.age >= maxFrames) {
      this.alive = false;
      this.state = "TIMEOUT";
      this.fitness = this.calculateFitness(maxFrames, targetReachBonus);
      return;
    }

    // Update real-time live fitness
    this.fitness = this.calculateFitness(maxFrames, targetReachBonus);
  }

  public markEaten(maxFrames: number, targetReachBonus: number): void {
    if (!this.alive) return;
    this.alive = false;
    this.state = "EATEN";
    this.fitness = Math.max(0, this.calculateFitness(maxFrames, targetReachBonus) - 60);
  }

  public calculateFitness(maxFrames: number, targetReachBonus: number): number {
    // 1. Reward distance improvement towards target
    const distanceDelta = this.initialTargetDistance - this.bestTargetDistance;
    const proximityScore = Math.max(0, distanceDelta) * 2.5;

    // 2. Proximity ratio bonus (gives exponential incentive as it gets really close)
    const closenessRatio = 1.0 - Math.min(1.0, this.bestTargetDistance / this.initialTargetDistance);
    const closenessBonus = Math.pow(closenessRatio, 2) * 150;

    // 3. Modest survival & exploration incentive
    const survivalBonus = Math.min(this.age, maxFrames) * 0.08;

    let total = proximityScore + closenessBonus + survivalBonus;

    // 4. Target reached bonus + speed efficiency
    if (this.reachedTarget) {
      const speedBonus = (maxFrames - this.age) * 2.0;
      total += targetReachBonus + speedBonus;
    }

    // 5. Penalty if eaten by apex predator shark
    if (this.state === "EATEN") {
      total = Math.max(0, total - 60);
    }

    return Math.max(0.1, total);
  }

  public getTelemetry(): SelectedAgentTelemetry {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      angle: this.angle,
      speed: this.speed,
      alive: this.alive,
      age: this.age,
      fitness: this.fitness,
      distanceTravelled: this.distanceTravelled,
      targetDistance: this.targetDistance,
      initialTargetDistance: this.initialTargetDistance,
      bestTargetDistance: this.bestTargetDistance,
      reachedTarget: this.reachedTarget,
      state: this.state,
      color: this.color,
      isElite: this.isElite,
      inputs: [...this.lastInputs],
      outputs: [...this.lastOutputs],
      activations: this.lastActivations.map((layer) => [...layer]),
      rays: [...this.lastRays],
      weights: this.neuralNetwork.weights,
      biases: this.neuralNetwork.biases,
      layerSizes: this.neuralNetwork.layerSizes,
    };
  }

  public getAgentData(): FishAgentData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      angle: this.angle,
      speed: this.speed,
      alive: this.alive,
      age: this.age,
      fitness: this.fitness,
      distanceTravelled: this.distanceTravelled,
      targetDistance: this.targetDistance,
      initialTargetDistance: this.initialTargetDistance,
      bestTargetDistance: this.bestTargetDistance,
      reachedTarget: this.reachedTarget,
      state: this.state,
      color: this.color,
      isElite: this.isElite,
    };
  }
}
