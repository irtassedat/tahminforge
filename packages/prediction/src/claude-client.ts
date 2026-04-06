import Anthropic from "@anthropic-ai/sdk";
import pino from "pino";
import { CostTracker, calculateCost } from "./cost-tracker.js";

const logger = pino({ name: "claude-client" });

export interface ClaudeResponse<T = unknown> {
  content: T;
  usage: { inputTokens: number; outputTokens: number };
  cost: number;
  duration: number;
}

/**
 * ClaudeClient — Anthropic SDK wrapper with cost tracking.
 *
 * Uses claude-haiku-4-5-20251001 by default (cheapest, fast enough).
 */
export class ClaudeClient {
  private client: Anthropic;
  private tracker: CostTracker;
  private model: string;

  constructor(options?: { model?: string; maxDailySpendUsd?: number; costFile?: string }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable not set");
    }
    this.client = new Anthropic({ apiKey });
    this.model = options?.model ?? "claude-haiku-4-5-20251001";
    this.tracker = new CostTracker(options?.costFile, options?.maxDailySpendUsd);
  }

  /**
   * Send a message and parse JSON response.
   * Enforces cost limits before calling.
   */
  async askJson<T>(
    prompt: string,
    options?: {
      maxTokens?: number;
      estimatedCost?: number;
      systemPrompt?: string;
    }
  ): Promise<ClaudeResponse<T>> {
    const estimatedCost = options?.estimatedCost ?? 0.005;
    this.tracker.enforce(estimatedCost);

    const start = Date.now();
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 1000,
      system: options?.systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const duration = Date.now() - start;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = calculateCost(inputTokens, outputTokens);

    this.tracker.record(cost);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in response");
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = textBlock.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let parsed: T;
    try {
      parsed = JSON.parse(jsonText) as T;
    } catch (err) {
      logger.error({ response: textBlock.text }, "Failed to parse JSON");
      throw new Error(
        `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    logger.info(
      { inputTokens, outputTokens, cost: cost.toFixed(6), duration },
      "Claude request completed"
    );

    return { content: parsed, usage: { inputTokens, outputTokens }, cost, duration };
  }

  get costStats() {
    return this.tracker.stats;
  }
}
