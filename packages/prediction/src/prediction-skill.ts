import { BaseSkill, type SkillContext } from "@tahminforge/agents";
import type { Match, PredictionMarket } from "@tahminforge/shared";
import { ClaudeClient } from "./claude-client.js";

interface ClaudePredictionResponse {
  prediction: string;
  confidence: number;
  reasoning: string;
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
    detail: string;
  }>;
}

/**
 * PredictionSkill — Generates AI match predictions using Claude.
 *
 * Structured output: prediction + confidence + reasoning + factors.
 * Obstacle reporting: missing data, API issues, parse errors.
 */
export class PredictionSkill extends BaseSkill {
  readonly name = "match-predictor";
  readonly description = "Generates AI match predictions with confidence scores and reasoning";
  readonly triggerPhrases = [
    "predict",
    "tahmin",
    "match prediction",
    "forecast",
    "who will win",
    "kim kazanır",
  ];
  readonly outputFormat = [
    { name: "prediction", type: "text" as const, required: true },
    { name: "confidence", type: "metric" as const, required: true },
    { name: "reasoning", type: "text" as const, required: true },
    { name: "factors", type: "list" as const, required: true },
  ];

  private claude: ClaudeClient;

  constructor(claude?: ClaudeClient) {
    super();
    this.claude = claude ?? new ClaudeClient();
  }

  protected async execute(context: SkillContext): Promise<Record<string, unknown>> {
    const match = context.params?.match as Match | undefined;
    const market = (context.params?.market as PredictionMarket) ?? "1X2";

    if (!match) {
      this.reportObstacle({
        type: "other",
        description: "No match data provided in context.params.match",
        severity: "critical",
      });
      return { error: "Match data required" };
    }

    const prompt = this.buildPrompt(match, market);
    const systemPrompt =
      "You are a football match analyst. Analyze matches using available data and provide " +
      "predictions in structured JSON format. Be concise and factual. Always respond with valid JSON only.";

    try {
      const response = await this.claude.askJson<ClaudePredictionResponse>(prompt, {
        systemPrompt,
        maxTokens: 800,
        estimatedCost: 0.005,
      });

      const pred = response.content;

      if (pred.confidence < 50) {
        this.reportObstacle({
          type: "other",
          description: `Low confidence prediction (${pred.confidence}%) — insufficient data`,
          severity: "warning",
        });
      }

      return {
        match: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        market,
        prediction: pred.prediction,
        confidence: pred.confidence,
        reasoning: pred.reasoning,
        factors: pred.factors,
        cost: response.cost,
        tokens: response.usage,
        duration: response.duration,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.reportObstacle({
        type: error.includes("limit") ? "other" : "network",
        description: error,
        severity: "critical",
      });
      throw err;
    }
  }

  private buildPrompt(match: Match, market: PredictionMarket): string {
    const scheduledAt =
      match.scheduledAt instanceof Date
        ? match.scheduledAt.toISOString()
        : String(match.scheduledAt);

    return `Analyze this football match and predict the outcome for market "${market}".

Match: ${match.homeTeam.name} vs ${match.awayTeam.name}
Competition: ${match.competition}
Date: ${scheduledAt}
${match.venue ? `Venue: ${match.venue}` : ""}

Respond with JSON only (no markdown):
{
  "prediction": "<specific prediction for ${market}>",
  "confidence": <0-100>,
  "reasoning": "<2-3 sentence explanation>",
  "factors": [
    { "name": "<factor name>", "impact": "positive|negative|neutral", "weight": <0-1>, "detail": "<brief>" }
  ]
}

For 1X2 market: prediction must be "1" (home), "X" (draw), or "2" (away).
For over_under: prediction must be "Over 2.5" or "Under 2.5".
For btts: prediction must be "Yes" or "No".`;
  }
}
