import type { Match } from "@tahminforge/shared";
import { PredictionSkill } from "./prediction-skill.js";

async function main() {
  console.log("🎯 TahminForge Prediction Demo\n");

  // Mock match (later: real data from collector)
  const match: Match = {
    id: "demo-1",
    homeTeam: {
      id: "tur",
      name: "Türkiye",
      shortName: "TUR",
      country: "Turkey",
      league: "UEFA EURO 2028 Qualifiers",
    },
    awayTeam: {
      id: "ita",
      name: "İtalya",
      shortName: "ITA",
      country: "Italy",
      league: "UEFA EURO 2028 Qualifiers",
    },
    competition: "UEFA EURO 2028 Qualifiers",
    scheduledAt: new Date("2026-06-15T19:00:00Z"),
    status: "scheduled",
  };

  const skill = new PredictionSkill();

  console.log(`Predicting: ${match.homeTeam.name} vs ${match.awayTeam.name}\n`);

  const result = await skill.run({
    taskId: "demo-task",
    agentId: "demo-agent",
    params: { match, market: "1X2" },
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Status:     ${result.status}`);
  console.log(`Duration:   ${result.duration}ms`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (result.status !== "failed") {
    const output = result.output as {
      prediction: string;
      confidence: number;
      reasoning: string;
      factors: Array<{ name: string; impact: string; weight: number; detail: string }>;
      cost: number;
      tokens: { inputTokens: number; outputTokens: number };
    };

    console.log(`\n🔮 Prediction:  ${output.prediction}`);
    console.log(`📊 Confidence:  ${output.confidence}%`);
    console.log(`💭 Reasoning:   ${output.reasoning}`);
    console.log(`\n📈 Factors:`);
    for (const factor of output.factors) {
      const icon =
        factor.impact === "positive" ? "✅" : factor.impact === "negative" ? "❌" : "➖";
      console.log(`   ${icon} ${factor.name} (${Math.round(factor.weight * 100)}%): ${factor.detail}`);
    }
    console.log(`\n💰 Cost:        $${output.cost.toFixed(6)}`);
    console.log(`🔢 Tokens:      ${output.tokens.inputTokens} in / ${output.tokens.outputTokens} out`);
  }

  if (result.obstacles.length > 0) {
    console.log(`\n⚠️  Obstacles:`);
    for (const ob of result.obstacles) {
      console.log(`   - [${ob.severity}] ${ob.description}`);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
