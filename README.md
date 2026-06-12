# DiveSeeks — Abigail Sovereign AI Framework

> **Google for Startups AI Agents Challenge — Track 1: Build**
> Powered by Gemini API · Gemini ADK · Google Cloud Run

## The Founding Insight

Most AI products use LLMs as the brain. DiveSeeks inverts this.

> **The LLM is a communicator. Abigail is the brain. PostgreSQL is the long-term memory.**

An LLM is a next-token predictor. It has no memory, no rules, no goals, no identity. Everything marketed as AI reasoning is scaffolding bolted on the outside. Remove it and nothing persists.

**Abigail is a deterministic AI framework** built in NestJS with PostgreSQL as its substrate. The LLM only talks to humans. Every real capability — memory, learning, rules, planning, governance, self-improvement — runs in typed NestJS services at zero or near-zero LLM cost.

| Property | ChatGPT / Cursor / Copilot | Abigail |
|---|---|---|
| Memory | Session ends, everything lost | 6 pgvector stores, permanent, per-tenant |
| Rules | Prompted, can be ignored | Expert system enforced before any LLM call |
| Learning | Frozen weights | parametric_weights updated on every task outcome |
| Goals | None | Vision file + TCE, persistent, auto-decomposed daily |
| Self-improvement | Cannot | Evolve Engine nightly, prompts improve automatically |
| Data ownership | Vendor servers | Your PostgreSQL, your VPS |
| Cost at scale | Every token, forever | ~40% resolved at zero LLM cost once weights accumulate |
| Auditability | Opaque | Every decision traced in task_sessions.context |

## What DiveSeeks Actually Does

DiveSeeks is a **vision-driven autonomous development platform**. A developer connects their GitHub repo, defines their project vision (goals, tech stack, constraints), and Abigail runs the entire development cycle:

1. **Decomposes** vision goals into sized tasks daily — no user prompt needed
2. **Dispatches** 30 specialist agents to execute each task via the PRD execution loop
3. **Reviews** every change via Kai (code review), Felix (security), Sage (tests)
4. **Learns** from every outcome — parametric weights, episodic memory, evolved prompts
5. **Self-improves** nightly — specialist prompts evolve via the Weak-Strong Challenger protocol

The developer uses their own AI subscription for code writing. DiveSeeks pays only for governance, routing, and learning.

## The 9-Step CEO Pipeline

```
Step 0   Brain Gate         Brainstorm required for feature/arch work?
Step 1   Vision Check       Stack conflict? Goal conflict? Constraint violation?
Step 1.5 Arch Gate          Tier-aware rules (solo/startup/scaleup/enterprise)
Step 2   Project Load       Vision file + coordinator context
Step 2.5 Deep Reasoning     pgvector cache -> Gemini web research (async BullMQ)
Step 3   Expert Rules       parametric_weights -> resolved at zero LLM cost
Step 4   Routing + Weights  Team router + ParametricWeightService
Step 5   Developer Profile  Task size from profile (junior 0.25x to expert 1.0x)
Step 6   Budget Gate        Hard token budget per tenant
Step 7   TaskSession        Context assembled, dispatched to BullMQ worker
Step 8   PRD Loop           Specialist iterates until all boolean flags satisfied
Step 8.5 Memory Bridge      Outcomes -> AgentEpisodes -> pgvector -> parametric weights
```

~40% of requests resolve at Steps 1-4 with zero LLM cost once parametric weights accumulate.

## 30 Specialists Across 3 Teams

| Team | Specialists | Output |
|---|---|---|
| **Coding** | Rex (backend), Nova (frontend), Kai (review), Sage (QA), Felix (security), Orion (architect), Pixel (debugger), Luma (docs), Atlas (DevOps), Vex (pentest) | Code on diveseeks/* branch + PR |
| **General** | Echo, Lyra, Spark, Zoe, Gist, Memo, Tran, Plan, Vibe, Quest | Text to chatbox |
| **Research** | Lit, Cite, Hypo, Peer, Scribe, Tutor, Prof, Grant, Data, Synth | Research output |

All 30 share the identical pipeline: vision check, parametric weights, company knowledge RAG, goal ancestry injection, PRD execution loop, episodic memory, and the Evolve Engine.

## The PRD Execution Loop

Every specialist task runs through a boolean-flag loop — not a single LLM call:

```
Vision Goal -> TCE decomposes -> Task created
    |
PrdGeneratorService generates requirements[] with boolean flags
    |
while (iteration < maxIterations):
    Specialist executes (Gemini / tenant own key)
    Evaluators grade each requirement true/false
    All satisfied -> done. Any blocked -> human_review.
    |
GoalProgressService.recompute() — vision progress auto-updates
    |
PrdMemoryBridgeService — failures written to agent_episodes
Next task: prior failures injected into prompt — self-healing
```

Coding: 10 evaluators (file-change, test-pass, kai-approval, typecheck, security-scan).
General: 8 evaluators (length, citations, factcheck, coverage, tone).
Research: 8 evaluators (doi, peer-reviewed, statistical-rigor, reproducible-method).

## Self-Improvement: The Evolve Engine

Every night at 04:00, specialist prompts evolve automatically:

```
Current specialist prompt
    |
Gemini Flash x5  — weak evaluator (should struggle with hard tasks)
Gemini Pro x3    — strong evaluator (should succeed)
    |
gap = strong - weak
If gap >= 0.25 AND weak <= 0.50 AND strong >= 0.60:
    Mutate: add_constraint / remove_hint / sharpen_rubric / clarify_scope
    Accept -> activate immediately
```

No human writes or tunes specialist prompts. They improve from real task trajectories. Full lineage preserved in specialist_prompt_versions with parentVersionId.

## Parametric Memory — The Moat

```
Task outcome -> AgentEpisode written (Vertex embedding, gemini-embedding-001)
    |
Every 10 qualifying episodes -> ParametricCompressionService
    Clusters episodes -> extracts reusable rules -> parametric_weights table
    confidence += 0.01 on success / -0.05 on failure
    |
Next request: ParametricWeightService reads weights
    BLOCK weight  -> resolved at zero LLM cost
    INJECT weight -> injected into specialist prompt
```

DiveSeeks gets cheaper and faster the more it runs — the opposite of every other AI product.

## Google Cloud Integration

| Technology | How DiveSeeks uses it |
|---|---|
| **Gemini API** | Brain intent classification, parametric compression, knowledge synthesis, Evolve Engine (Flash + Pro 2.5), deep reasoning |
| **Gemini ADK** | MCP platform agent in packages/mcp-platform/ — GeminiAgent with tool execution and streaming |
| **Vertex AI** | gemini-embedding-001 across all 6 pgvector stores (agent_episodes, wiki_pages, global/tenant_knowledge, menu_embeddings, kr_solutions) |
| **Google Cloud Run** | dive-mcp-platform — MCP server for specialist tool execution at mcp.diveseeks.cloud |

## Why This Beats Competitors

| | Copilot | Cursor | Claude Code | DiveSeeks |
|---|---|---|---|---|
| Persistent memory | No | No | No | Yes, pgvector permanent |
| Learns your codebase | No | No | No | Yes, parametric weights |
| Autonomous task creation | No | No | No | Yes, TCE daily gap analysis |
| Enforces rules deterministically | No | No | No | Yes, expert system zero LLM |
| Self-improves | No | No | No | Yes, Evolve Engine nightly |
| Pays for code writing | Yes | Yes | Yes | No, developer uses own key |
| Data sovereignty | Vendor | Vendor | Vendor | Your VPS, your DB |
| Vision-governed | No | No | No | Yes, blocks contradicting requests |

## Tech Stack

**Backend:** NestJS 11, TypeORM, PostgreSQL (pgvector), Redis, BullMQ
**Frontend:** Next.js 16 App Router, Tailwind CSS, Zustand, TanStack Query, React Flow
**MCP Platform:** Node.js, Gemini ADK, Google Cloud Run
**AI:** Gemini API (Flash + Pro 2.5), Vertex AI Embeddings, DeepSeek, AI SDK 6
**Infrastructure:** Docker, Nginx, self-hosted VPS (Hostinger KVM8, 32GB RAM, 8 cores)

## Running Locally

Prerequisites: Node 20+, pnpm, PostgreSQL with pgvector, Redis

```bash
pnpm install
cp backend/.env.example backend/.env
# Fill in: GOOGLE_AI_API_KEY, DATABASE_URL, REDIS_URL, JWT_SECRET
cd backend && npm run dev     # port 7771
npm run dev:frontend          # port 7777 (separate terminal)
```

- Frontend: http://localhost:7777
- API: http://localhost:7771
- Swagger: http://localhost:7771/api/docs

## Live Demo

- App: https://app.diveseeks.cloud
- MCP Server: https://mcp.diveseeks.cloud
- Pipeline Diagram: https://app.diveseeks.cloud/abigail-docs

---

*DiveSeeks — Sovereign AI for teams who take data ownership seriously.*
