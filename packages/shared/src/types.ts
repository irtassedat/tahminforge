// ========================================
// TahminForge — Core Type Definitions
// ========================================

// -- Match & Team Data -------------------

export interface Team {
  id: string;
  name: string;
  shortName: string;
  country: string;
  league: string;
  logoUrl?: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: string;
  matchday?: number;
  scheduledAt: Date;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  score?: { home: number; away: number };
  venue?: string;
}

export interface TeamStats {
  teamId: string;
  recentForm: ("W" | "D" | "L")[]; // last 5-10 matches
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  avgPossession: number;
  headToHead: HeadToHead[];
}

export interface HeadToHead {
  matchId: string;
  date: Date;
  homeTeam: string;
  awayTeam: string;
  score: { home: number; away: number };
  competition: string;
}

// -- Prediction --------------------------

export type PredictionMarket = "1X2" | "over_under" | "btts" | "correct_score" | "first_scorer";

export interface Prediction {
  id: string;
  matchId: string;
  market: PredictionMarket;
  prediction: string; // e.g., "1" (home win), "Over 2.5", "Yes"
  confidence: number; // 0-100
  reasoning: string; // AI-generated explanation
  factors: PredictionFactor[];
  createdAt: Date;
  verifiedAt?: Date;
  result?: "correct" | "incorrect" | "void";
}

export interface PredictionFactor {
  name: string; // e.g., "Home form", "H2H record"
  impact: "positive" | "negative" | "neutral";
  weight: number; // 0-1
  detail: string;
}

// -- Accuracy & Leaderboard --------------

export interface AccuracyRecord {
  period: "daily" | "weekly" | "monthly" | "all_time";
  totalPredictions: number;
  correct: number;
  incorrect: number;
  void: number;
  accuracy: number; // percentage
  byMarket: Record<PredictionMarket, { total: number; correct: number }>;
  streak: { current: number; best: number; type: "W" | "L" };
}

// -- Content & Publishing ----------------

export type ContentPlatform = "instagram" | "tiktok" | "twitter" | "web";
export type ContentFormat = "image" | "video" | "carousel" | "story" | "text";

export interface ContentPost {
  id: string;
  predictionId: string;
  platform: ContentPlatform;
  format: ContentFormat;
  caption: string;
  mediaUrl?: string;
  hashtags: string[];
  publishedAt?: Date;
  status: "draft" | "scheduled" | "published" | "failed";
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

// -- Agent System (from AgentForge patterns) --

export type AgentStatus = "idle" | "running" | "paused" | "failed" | "terminated";
export type TaskStatus = "pending" | "processing" | "completed" | "failed";
export type Priority = "critical" | "high" | "normal" | "low";

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  priority: Priority;
  status: TaskStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  completedAt?: Date;
}

// -- Skill System ------------------------

export interface SkillDefinition {
  name: string;
  description: string;
  triggerPhrases: string[];
  outputFormat: SkillOutputField[];
  cooldownMs?: number;
}

export interface SkillOutputField {
  name: string;
  type: "text" | "table" | "metric" | "boolean" | "list";
  required: boolean;
}

export interface SkillResult {
  skillName: string;
  status: "success" | "partial" | "failed";
  output: Record<string, unknown>;
  obstacles: Obstacle[];
  duration: number;
}

export interface Obstacle {
  type: "dependency" | "permission" | "timeout" | "network" | "other";
  description: string;
  workaround?: string;
  severity: "info" | "warning" | "critical";
}

// -- API Response ------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
