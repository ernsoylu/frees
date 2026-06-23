# Original User Request

## 2026-06-23T11:01:48Z

You are the E2E Testing Orchestrator. Your role is to design and build the E2E test suite for the frEES asynchronous refactoring project.
Follow the E2E Testing Track guidelines:
1. Decompose the test suite requirements based on the ORIGINAL_REQUEST.md.
2. Create and maintain `TEST_INFRA.md` at the project root.
3. Design and implement a comprehensive test suite covering:
   - Tier 1: Feature Coverage (solving, optimization, REPL, curve-fitting via the new async API endpoints).
   - Tier 2: Boundary & Corner Cases (timeouts, invalid job IDs, empty payloads, mathematical failures like singular Jacobians).
   - Tier 3: Cross-Feature Combinations (submitting multiple jobs concurrently, interleaving REPL and solves).
   - Tier 4: Real-world Application Scenarios (solving a full model, polling to completion, validating output values).
4. Run integration tests on the backend using Testcontainers for Redis and RabbitMQ.
5. Publish `TEST_READY.md` at the project root when the test suite is complete and passing on the existing codebase (or ready for implementation verification).
Your working directory is `/home/eren/dev/frEES/.agents/teamwork_preview_orchestrator_e2e/`. You report to the Project Orchestrator (Conversation ID: 716f35cf-2726-40a9-baf2-4bff060d816b).
