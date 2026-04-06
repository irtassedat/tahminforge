import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface DailyCost {
  date: string;
  totalUsd: number;
  requestCount: number;
}

/**
 * CostTracker — Enforces daily spending limits on Claude API calls.
 *
 * Persists daily usage to disk. Throws if limit exceeded.
 */
export class CostTracker {
  private costFile: string;
  private maxDailySpendUsd: number;

  constructor(costFile = ".cost-tracker.json", maxDailySpendUsd = 1.0) {
    this.costFile = join(process.cwd(), costFile);
    this.maxDailySpendUsd = maxDailySpendUsd;
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private load(): DailyCost {
    if (!existsSync(this.costFile)) {
      return { date: this.getToday(), totalUsd: 0, requestCount: 0 };
    }
    try {
      const data = JSON.parse(readFileSync(this.costFile, "utf-8")) as DailyCost;
      if (data.date !== this.getToday()) {
        return { date: this.getToday(), totalUsd: 0, requestCount: 0 };
      }
      return data;
    } catch {
      return { date: this.getToday(), totalUsd: 0, requestCount: 0 };
    }
  }

  private save(cost: DailyCost): void {
    writeFileSync(this.costFile, JSON.stringify(cost, null, 2));
  }

  /** Check if a new request would exceed the daily limit */
  canSpend(estimatedUsd: number): boolean {
    const current = this.load();
    return current.totalUsd + estimatedUsd <= this.maxDailySpendUsd;
  }

  /** Record actual spending after an API call */
  record(usd: number): void {
    const current = this.load();
    current.totalUsd += usd;
    current.requestCount += 1;
    this.save(current);
  }

  /** Throw if spending would exceed limit */
  enforce(estimatedUsd: number): void {
    if (!this.canSpend(estimatedUsd)) {
      const current = this.load();
      throw new Error(
        `Daily spending limit exceeded: $${current.totalUsd.toFixed(4)}/$${this.maxDailySpendUsd} ` +
          `(${current.requestCount} requests today). Estimated: $${estimatedUsd.toFixed(4)}.`
      );
    }
  }

  get stats() {
    return this.load();
  }
}

/** Haiku pricing per million tokens (as of April 2026) */
export const HAIKU_PRICING = {
  inputPerMillion: 1.0,
  outputPerMillion: 5.0,
};

/** Calculate cost in USD from token usage */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * HAIKU_PRICING.inputPerMillion +
    (outputTokens / 1_000_000) * HAIKU_PRICING.outputPerMillion
  );
}
