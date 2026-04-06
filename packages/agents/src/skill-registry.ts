import type { SkillDefinition, SkillResult } from "@tahminforge/shared";
import type { BaseSkill, SkillContext } from "./base-skill.js";
import { EventEmitter } from "node:events";
import pino from "pino";

/**
 * SkillRegistry — Discovers, matches, and executes TahminForge skills.
 */
export class SkillRegistry extends EventEmitter {
  private skills = new Map<string, BaseSkill>();
  private logger = pino({ name: "skill-registry" });

  register(skill: BaseSkill): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill "${skill.name}" already registered`);
    }
    this.skills.set(skill.name, skill);
    this.logger.info({ skill: skill.name }, "Skill registered");
  }

  get(name: string): BaseSkill | undefined {
    return this.skills.get(name);
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values()).map((s) => s.toDefinition());
  }

  match(input: string, threshold = 0.15): BaseSkill | null {
    let bestSkill: BaseSkill | null = null;
    let bestScore = threshold;

    for (const skill of this.skills.values()) {
      const score = skill.matches(input);
      if (score > bestScore) {
        bestScore = score;
        bestSkill = skill;
      }
    }
    return bestSkill;
  }

  async execute(name: string, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(`Skill "${name}" not found`);
    }

    this.emit("skill_start", { skillName: name });
    const result = await skill.run(context);

    if (result.status === "failed") {
      this.emit("skill_failed", result);
    } else {
      this.emit("skill_complete", result);
    }
    return result;
  }
}
