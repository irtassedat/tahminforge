import { EventEmitter } from "node:events";
import type { BaseAgent } from "./base-agent.js";
import pino from "pino";

/**
 * AgentRegistry — Central registry for TahminForge agent instances.
 *
 * Manages lifecycle, forwards events from individual agents, and
 * exposes aggregate stats for monitoring.
 */
export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, BaseAgent>();
  private logger = pino({ name: "registry" });

  register(agent: BaseAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already registered`);
    }
    agent.on("started", (id) => this.emit("agent_change", id));
    agent.on("stopped", (id) => this.emit("agent_change", id));
    agent.on("task_complete", (task) => this.emit("task_complete", task));
    agent.on("task_failed", (task) => this.emit("task_failed", task));
    this.agents.set(agent.id, agent);
    this.logger.info({ agentId: agent.id }, "Agent registered");
  }

  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.removeAllListeners();
    return this.agents.delete(agentId);
  }

  get(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  list(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  async startAll(): Promise<void> {
    await Promise.all(Array.from(this.agents.values()).map((a) => a.start()));
  }

  async stopAll(): Promise<void> {
    await Promise.all(Array.from(this.agents.values()).map((a) => a.stop()));
  }

  get stats() {
    const agents = this.list();
    return {
      total: agents.length,
      running: agents.filter((a) => a.status === "running").length,
      idle: agents.filter((a) => a.status === "idle").length,
      failed: agents.filter((a) => a.status === "failed").length,
    };
  }
}
