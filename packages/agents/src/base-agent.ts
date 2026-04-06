import { EventEmitter } from "node:events";
import type { AgentStatus, AgentTask } from "@tahminforge/shared";
import { nanoid } from "nanoid";
import pino from "pino";

export interface BaseAgentConfig {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * BaseAgent — Abstract foundation for all TahminForge agents.
 *
 * Subclasses implement `process(task)` to define behavior.
 */
export abstract class BaseAgent extends EventEmitter {
  readonly id: string;
  readonly instanceId: string;
  readonly name: string;
  protected config: Required<BaseAgentConfig>;
  protected logger: pino.Logger;

  private _status: AgentStatus = "idle";
  private _startedAt: Date | null = null;
  private _tasksProcessed = 0;
  private _tasksFailed = 0;
  private _lastError: string | null = null;

  constructor(id: string, name: string, config: BaseAgentConfig = {}) {
    super();
    this.id = id;
    this.instanceId = nanoid(12);
    this.name = name;
    this.config = {
      concurrency: config.concurrency ?? 1,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
    this.logger = pino({ name: `agent:${name}` });
  }

  get status(): AgentStatus {
    return this._status;
  }

  get stats() {
    return {
      tasksProcessed: this._tasksProcessed,
      tasksFailed: this._tasksFailed,
      lastError: this._lastError,
      uptime: this._startedAt ? Date.now() - this._startedAt.getTime() : 0,
    };
  }

  async start(): Promise<void> {
    if (this._status === "running") return;
    this.logger.info({ agentId: this.id }, "Agent starting");
    this._status = "running";
    this._startedAt = new Date();
    await this.onStart();
    this.emit("started", this.id);
  }

  async stop(): Promise<void> {
    if (this._status !== "running") return;
    this.logger.info({ agentId: this.id }, "Agent stopping");
    this._status = "terminated";
    await this.onStop();
    this.emit("stopped", this.id);
  }

  async executeTask(task: AgentTask): Promise<AgentTask> {
    if (this._status !== "running") {
      throw new Error(`Agent ${this.id} is not running`);
    }

    task.status = "processing";
    this.logger.info({ taskId: task.id, type: task.type }, "Processing task");

    try {
      const result = await this.process(task);
      task.status = "completed";
      task.result = result;
      task.completedAt = new Date();
      this._tasksProcessed++;
      this.emit("task_complete", task);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      task.attempts++;
      this._lastError = error;

      if (task.attempts >= task.maxAttempts) {
        task.status = "failed";
        task.error = error;
        this._tasksFailed++;
        this.emit("task_failed", task);
      }
    }

    return task;
  }

  /** Subclasses implement this */
  protected abstract process(task: AgentTask): Promise<Record<string, unknown>>;

  protected async onStart(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
