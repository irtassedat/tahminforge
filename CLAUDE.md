# CLAUDE.md — TahminForge

## Project
AI Match Prediction Platform — TypeScript monorepo. Autonomous agents collect match data, generate AI-powered predictions, create social media content, and track accuracy over time.

## Structure
- `packages/shared` — Core types (Match, Prediction, Team, Content, Skill)
- `packages/agents` — Agent runtime (BaseAgent, Registry, Skills — from AgentForge patterns)
- `packages/prediction` — AI prediction engine (Claude API)
- `packages/collector` — Data collection agents (football-data.org, team stats)
- `packages/content` — Social media content generation
- `packages/api` — REST API (Fastify 5)
- `packages/dashboard` — Prediction dashboard (Next.js 15)

## Commands
- `pnpm install` — install all deps
- `pnpm build` — build all packages
- `pnpm dev` — run in dev mode
- `pnpm typecheck` — TypeScript check
- `pnpm test` — run tests
- `pnpm demo` — start full stack with Docker

## Code Style
- TypeScript strict mode, ESNext
- Conventional commits (feat/fix/refactor/test/docs)
- No `any` — use `unknown` and narrow
- Tests alongside source (*.test.ts)

## Git
- user.name = irtassedat
- user.email = sedatirtas.1@gmail.com
- NO AI attribution (no Co-Authored-By)

## Architecture
- Agents follow AgentForge BaseAgent pattern
- Skills system: BaseSkill → SkillRegistry → semantic matching → structured output
- Data pipeline: Collect → Predict → Content → Publish → Verify
- Predictions verified against real match results (football-data.org)
- Accuracy tracked per market type with streaks
