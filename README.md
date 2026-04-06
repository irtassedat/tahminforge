# TahminForge

**AI Match Prediction Platform** — Autonomous agents for sports prediction, content generation, and accuracy tracking.

> Like Paul the Octopus, but powered by data and AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org)

## How It Works

```
Match Data → AI Analysis → Prediction → Social Media → Verify → Track Accuracy
```

TahminForge uses autonomous agents to:

1. **Collect** match data, team statistics, and historical results
2. **Predict** match outcomes using AI analysis with confidence scores
3. **Generate** social media content (Instagram, TikTok, Twitter)
4. **Publish** predictions automatically before kickoff
5. **Verify** predictions against real results
6. **Track** accuracy over time with detailed analytics

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  TahminForge                     │
├──────────┬──────────┬──────────┬────────────────┤
│Collector │Prediction│ Content  │   Publisher     │
│  Agent   │  Agent   │  Agent   │    Agent        │
├──────────┴──────────┴──────────┴────────────────┤
│              Agent Runtime (Skills)              │
├──────────┬───────────────────────┬───────────────┤
│ Fastify  │    Next.js Dashboard  │    Redis      │
│   API    │  Predictions & Stats  │   Queues      │
├──────────┴───────────────────────┴───────────────┤
│              PostgreSQL + Redis                   │
└─────────────────────────────────────────────────┘
```

## Prediction Markets

| Market | Example | Description |
|--------|---------|-------------|
| 1X2 | Home Win | Match winner prediction |
| Over/Under | Over 2.5 | Total goals threshold |
| BTTS | Yes | Both teams to score |
| Correct Score | 2-1 | Exact final score |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+, TypeScript 5.7 |
| Agent System | BaseAgent, SkillRegistry, SubAgent delegation |
| AI | Claude API (prediction reasoning) |
| Data | football-data.org, public stats APIs |
| API | Fastify 5 |
| Dashboard | Next.js 15, React 19, Tailwind |
| Database | PostgreSQL 16, Redis 7 |
| Deployment | Docker Compose |

## Quick Start

```bash
git clone https://github.com/irtassedat/tahminforge.git
cd tahminforge
pnpm install
pnpm build
docker compose up -d   # PostgreSQL + Redis
pnpm dev               # All services
```

## License

MIT
