import { LevelConfig, Wall, Target } from "@/types/simulation";
import { LEVELS, ARENA_WIDTH, ARENA_HEIGHT } from "./levels";

export class Environment {
  public currentLevel: LevelConfig;
  public width: number;
  public height: number;
  public diagonal: number;
  public target: Target;

  constructor(initialLevelId: number = 1) {
    this.width = ARENA_WIDTH;
    this.height = ARENA_HEIGHT;
    this.diagonal = Math.hypot(this.width, this.height);
    this.currentLevel = LEVELS.find((l) => l.id === initialLevelId) || LEVELS[0];
    this.target = { ...this.currentLevel.target };
  }

  public setLevel(levelId: number): LevelConfig {
    const found = LEVELS.find((l) => l.id === levelId);
    if (found) {
      this.currentLevel = found;
      this.target = { ...found.target };
    }
    return this.currentLevel;
  }

  public setTargetPosition(x: number, y: number): void {
    const margin = this.target.radius + 12;
    this.target.x = Math.max(margin, Math.min(this.width - margin, x));
    this.target.y = Math.max(margin, Math.min(this.height - margin, y));
  }

  public resetTargetPosition(): void {
    this.target = { ...this.currentLevel.target };
  }

  public isTargetCustom(): boolean {
    return (
      Math.abs(this.target.x - this.currentLevel.target.x) > 2 ||
      Math.abs(this.target.y - this.currentLevel.target.y) > 2
    );
  }

  public get walls(): Wall[] {
    return this.currentLevel.walls;
  }

  public get spawnArea() {
    return this.currentLevel.spawnArea;
  }

  public get maxFrames(): number {
    return this.currentLevel.maxFrames;
  }

  public get targetReachBonus(): number {
    return this.currentLevel.targetReachBonus;
  }
}
