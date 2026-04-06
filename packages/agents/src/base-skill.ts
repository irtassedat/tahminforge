import type {
  SkillDefinition,
  SkillResult,
  SkillOutputField,
  Obstacle,
} from "@tahminforge/shared";

export interface SkillContext {
  taskId: string;
  agentId: string;
  params?: Record<string, unknown>;
}

/**
 * BaseSkill — Abstract foundation for TahminForge skills.
 *
 * Skills are reusable capabilities with semantic matching,
 * structured output, and obstacle reporting.
 */
export abstract class BaseSkill {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly triggerPhrases: string[];

  readonly outputFormat: SkillOutputField[] = [];
  readonly cooldownMs: number = 0;

  private _lastExecuted = 0;
  private _executionCount = 0;
  private _obstacles: Obstacle[] = [];

  matches(input: string): number {
    const lower = input.toLowerCase();
    let score = 0;
    let matched = 0;

    for (const phrase of this.triggerPhrases) {
      if (lower.includes(phrase.toLowerCase())) {
        matched++;
        if (lower === phrase.toLowerCase()) score += 1.0;
        else score += 0.6;
      }
    }

    if (lower.includes(this.name.toLowerCase())) score += 0.8;

    const maxPossible = this.triggerPhrases.length + 1;
    return Math.min(1, (score / Math.max(1, maxPossible)) * (matched > 0 ? 2 : 1));
  }

  isOnCooldown(): boolean {
    if (this.cooldownMs <= 0) return false;
    return Date.now() - this._lastExecuted < this.cooldownMs;
  }

  async run(context: SkillContext): Promise<SkillResult> {
    if (this.isOnCooldown()) {
      return {
        skillName: this.name,
        status: "failed",
        output: { error: "Cooldown active" },
        obstacles: [],
        duration: 0,
      };
    }

    this._obstacles = [];
    const start = Date.now();

    try {
      const output = await this.execute(context);
      this._lastExecuted = Date.now();
      this._executionCount++;

      return {
        skillName: this.name,
        status: this._obstacles.some((o) => o.severity === "critical") ? "partial" : "success",
        output,
        obstacles: [...this._obstacles],
        duration: Date.now() - start,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        skillName: this.name,
        status: "failed",
        output: { error },
        obstacles: [
          ...this._obstacles,
          { type: "other", description: error, severity: "critical" },
        ],
        duration: Date.now() - start,
      };
    }
  }

  protected reportObstacle(obstacle: Obstacle): void {
    this._obstacles.push(obstacle);
  }

  toDefinition(): SkillDefinition {
    return {
      name: this.name,
      description: this.description,
      triggerPhrases: this.triggerPhrases,
      cooldownMs: this.cooldownMs,
      outputFormat: this.outputFormat,
    };
  }

  get executionCount(): number {
    return this._executionCount;
  }

  protected abstract execute(context: SkillContext): Promise<Record<string, unknown>>;
}
