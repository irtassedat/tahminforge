import { BaseSkill, type SkillContext } from "@tahminforge/agents";
import { FootballDataClient } from "./football-data-client.js";

/**
 * CollectMatchesSkill — Fetches upcoming matches from football-data.org.
 *
 * Supports multiple competitions. Obstacle reporting on API errors,
 * rate limits, and missing data.
 */
export class CollectMatchesSkill extends BaseSkill {
  readonly name = "collect-matches";
  readonly description = "Fetches match data from football-data.org for predictions";
  readonly triggerPhrases = [
    "collect matches",
    "fetch matches",
    "match data",
    "upcoming matches",
    "get fixtures",
    "maç verisi",
  ];
  readonly outputFormat = [
    { name: "competition", type: "text" as const, required: true },
    { name: "matchCount", type: "metric" as const, required: true },
    { name: "matches", type: "list" as const, required: true },
  ];

  // Conservative cooldown: free tier allows 10 req/min
  readonly cooldownMs = 6500;

  private client: FootballDataClient;

  constructor(client?: FootballDataClient) {
    super();
    this.client = client ?? new FootballDataClient();
  }

  protected async execute(context: SkillContext): Promise<Record<string, unknown>> {
    const competition = (context.params?.competition as string) ?? "PL"; // Premier League default
    const status = (context.params?.status as "SCHEDULED" | "LIVE" | "FINISHED") ?? "SCHEDULED";
    const limit = (context.params?.limit as number) ?? 10;

    try {
      const matches = await this.client.getCompetitionMatches(competition, status, limit);

      if (matches.length === 0) {
        this.reportObstacle({
          type: "other",
          description: `No ${status.toLowerCase()} matches found for competition ${competition}`,
          severity: "warning",
        });
      }

      return {
        competition,
        status,
        matchCount: matches.length,
        matches: matches.map((m) => ({
          id: m.id,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          scheduledAt: m.scheduledAt instanceof Date ? m.scheduledAt.toISOString() : m.scheduledAt,
          matchday: m.matchday,
        })),
        fullMatches: matches,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const isRateLimit = error.includes("429") || error.includes("rate");
      const isAuth = error.includes("401") || error.includes("403");

      this.reportObstacle({
        type: isRateLimit ? "timeout" : isAuth ? "permission" : "network",
        description: error,
        workaround: isRateLimit
          ? "Wait 60s and retry. Free tier allows 10 req/min."
          : isAuth
            ? "Set FOOTBALL_DATA_API_KEY env var — get key from https://www.football-data.org/client/register"
            : undefined,
        severity: "critical",
      });

      throw err;
    }
  }
}
