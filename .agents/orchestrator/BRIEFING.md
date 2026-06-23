# BRIEFING — 2026-06-23T10:59:15Z

## Mission
Refactor the frEES monolithic Spring Boot application into a decoupled, asynchronous Message Broker pattern using RabbitMQ and Redis, extract computations to a headless node, and integrate OpenTelemetry.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /home/eren/dev/frEES/.agents/orchestrator
- Original parent: parent
- Original parent conversation ID: 7b2955b1-0ad2-4eec-b785-8bf1dc4ceaa1

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: /home/eren/dev/frEES/PROJECT.md
1. **Decompose**: Decompose the refactoring task into logical milestones, separating API and compute modules/profiles, database integration, message queue setup, OTel propagation, and E2E testing.
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: For large milestones (E2E testing track, implementation phases), spawn sub-orchestrators.
   - **Direct (iteration loop)**: For specific sub-milestones, run the Explorer -> Worker -> Reviewer -> Challenger -> Auditor loop.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Project Initialization [in-progress]
- **Current phase**: 1
- **Current focus**: Project Initialization

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- You may use file-editing tools only for metadata/state files (.md) in your .agents/ folder.
- Never reuse a subagent after it has delivered its handoff.
- The Forensic Auditor has a binary veto. If the auditor reports INTEGRITY VIOLATION, the milestone fails unconditionally.

## Current Parent
- Conversation ID: 7b2955b1-0ad2-4eec-b785-8bf1dc4ceaa1
- Updated: not yet

## Key Decisions Made
- Initialized briefing and plan.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_initial | teamwork_preview_explorer | Explore codebase & tests | completed | a67c233f-8e33-4331-8f11-16083b0d5236 |
| e2e_orch | self | E2E Testing Track Orchestration | in-progress | 5384a79b-e01d-469b-af52-d189cdc0a5af |
| worker_m1 | teamwork_preview_worker | Gradle Build Fix & Cleanup | completed | 330a1ef2-f6a7-4605-90f3-a3c7696e694d |
| sub_orch_m2 | self | Redis State Cache Migration | in-progress | 12bfae20-bd28-46eb-97e8-1c4c4ced0600 |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: 5384a79b-e01d-469b-af52-d189cdc0a5af, 12bfae20-bd28-46eb-97e8-1c4c4ced0600
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 716f35cf-2726-40a9-baf2-4bff060d816b/task-21
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- /home/eren/dev/frEES/PROJECT.md — Global index: architecture, milestones, interfaces, code layout
- /home/eren/dev/frEES/.agents/orchestrator/progress.md — Liveness heartbeat and step progress
- /home/eren/dev/frEES/.agents/orchestrator/plan.md — Orchestrator planning and design notes
