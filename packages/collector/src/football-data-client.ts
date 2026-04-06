import type { Match, Team } from "@tahminforge/shared";
import pino from "pino";

const logger = pino({ name: "football-data-client" });

interface FdCompetition {
  id: number;
  name: string;
  code: string;
}

interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  area?: { name: string };
}

interface FdMatch {
  id: number;
  competition: FdCompetition;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  utcDate: string;
  status: string;
  matchday?: number;
  score?: {
    fullTime?: { home: number | null; away: number | null };
  };
  venue?: string;
}

interface FdMatchesResponse {
  matches: FdMatch[];
  count?: number;
}

interface FdTeamMatchesResponse {
  matches: FdMatch[];
}

/**
 * Map football-data.org match status to our status.
 */
function mapStatus(status: string): Match["status"] {
  switch (status.toUpperCase()) {
    case "SCHEDULED":
    case "TIMED":
    case "POSTPONED_STATUS":
      return "scheduled";
    case "IN_PLAY":
    case "PAUSED":
    case "LIVE":
      return "live";
    case "FINISHED":
      return "finished";
    case "POSTPONED":
      return "postponed";
    case "CANCELLED":
    case "SUSPENDED":
      return "cancelled";
    default:
      return "scheduled";
  }
}

/** Convert football-data.org team to our Team */
function toTeam(fd: FdTeam, league = ""): Team {
  return {
    id: String(fd.id),
    name: fd.name,
    shortName: fd.shortName ?? fd.tla ?? fd.name,
    country: fd.area?.name ?? "Unknown",
    league,
    logoUrl: fd.crest,
  };
}

/** Convert football-data.org match to our Match */
function toMatch(fd: FdMatch): Match {
  const competition = fd.competition.name;
  return {
    id: String(fd.id),
    homeTeam: toTeam(fd.homeTeam, competition),
    awayTeam: toTeam(fd.awayTeam, competition),
    competition,
    matchday: fd.matchday,
    scheduledAt: new Date(fd.utcDate),
    status: mapStatus(fd.status),
    score:
      fd.score?.fullTime?.home !== null && fd.score?.fullTime?.away !== null
        ? {
            home: fd.score!.fullTime!.home as number,
            away: fd.score!.fullTime!.away as number,
          }
        : undefined,
    venue: fd.venue,
  };
}

/**
 * FootballDataClient — Fetches match data from football-data.org.
 *
 * Free tier: 10 requests/minute, limited competitions.
 * API key optional for public endpoints but recommended.
 */
export class FootballDataClient {
  private baseUrl = "https://api.football-data.org/v4";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.FOOTBALL_DATA_API_KEY;
  }

  private async request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-Auth-Token"] = this.apiKey;
    }

    const url = `${this.baseUrl}${path}`;
    logger.debug({ url }, "Fetching football-data");

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `football-data.org error ${response.status}: ${response.statusText}${text ? ` — ${text}` : ""}`
      );
    }

    return (await response.json()) as T;
  }

  /** Get upcoming matches for a competition */
  async getCompetitionMatches(
    competitionCode: string,
    status: "SCHEDULED" | "LIVE" | "FINISHED" = "SCHEDULED",
    limit = 10
  ): Promise<Match[]> {
    const data = await this.request<FdMatchesResponse>(
      `/competitions/${competitionCode}/matches?status=${status}`
    );
    return data.matches.slice(0, limit).map(toMatch);
  }

  /** Get matches for a specific team */
  async getTeamMatches(
    teamId: string,
    limit = 10,
    status: "SCHEDULED" | "FINISHED" = "FINISHED"
  ): Promise<Match[]> {
    const data = await this.request<FdTeamMatchesResponse>(
      `/teams/${teamId}/matches?status=${status}&limit=${limit}`
    );
    return data.matches.map(toMatch);
  }

  /** Get today's matches across all available competitions */
  async getTodayMatches(): Promise<Match[]> {
    const today = new Date().toISOString().slice(0, 10);
    const data = await this.request<FdMatchesResponse>(
      `/matches?dateFrom=${today}&dateTo=${today}`
    );
    return data.matches.map(toMatch);
  }

  /** Head-to-head between two teams (last N finished matches) */
  async getHeadToHead(team1Id: string, team2Id: string, limit = 5): Promise<Match[]> {
    // football-data.org doesn't have a direct H2H endpoint in free tier.
    // Workaround: fetch team1's recent finished matches and filter by team2.
    const matches = await this.getTeamMatches(team1Id, 50, "FINISHED");
    return matches
      .filter(
        (m) =>
          m.homeTeam.id === team2Id ||
          m.awayTeam.id === team2Id
      )
      .slice(0, limit);
  }
}
