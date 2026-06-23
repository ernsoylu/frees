# BRIEFING — 2026-06-23T11:01:00Z

## Mission
Investigate the existing Java backend codebase to prepare for refactoring the Spring Boot application into a decoupled asynchronous system using RabbitMQ and Redis.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Explorer, Investigator
- Working directory: /home/eren/dev/frEES/.agents/teamwork_preview_explorer_initial/
- Original parent: 716f35cf-2726-40a9-baf2-4bff060d816b
- Milestone: RabbitMQ and Redis Refactoring Preparation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode: no external HTTP/HTTPS requests
- Write only to /home/eren/dev/frEES/.agents/teamwork_preview_explorer_initial/

## Current Parent
- Conversation ID: 716f35cf-2726-40a9-baf2-4bff060d816b
- Updated: 2026-06-23T11:01:00Z

## Investigation State
- **Explored paths**:
  - `backend/build.gradle`
  - `backend/src/main/resources/application.properties`
  - `backend/src/main/java/com/frees/backend/api/SolveController.java`
  - `backend/src/main/java/com/frees/backend/api/OptimizeController.java`
  - `backend/src/main/java/com/frees/backend/api/SolveContextCache.java`
  - `backend/src/main/java/com/frees/backend/api/SolverApiSupport.java`
  - `backend/src/main/java/com/frees/backend/api/CyclePathResolver.java`
  - `backend/src/main/java/com/frees/backend/api/CheckController.java`
  - `backend/src/main/java/com/frees/backend/api/ReplController.java`
  - `backend/src/main/java/com/frees/backend/core/EquationSystemSolver.java`
  - `backend/src/main/java/com/frees/backend/core/NewtonSolver.java`
  - `backend/src/main/java/com/frees/backend/core/Optimizer.java`
  - `backend/src/main/java/com/frees/backend/core/MultiObjectiveOptimizer.java`
  - `backend/src/main/java/com/frees/backend/core/CurveFitter.java`
  - `backend/src/test/java/com/frees/backend/api/SolveControllerTest.java`
  - `backend/src/test/java/com/frees/backend/api/ReplControllerTest.java`
  - `backend/src/test/java/com/frees/backend/api/PlotControllerTest.java`
- **Key findings**:
  - `SolveController` and `OptimizeController` handle `/api/solve`, `/api/solve/table`, `/api/optimize`, `/api/optimize/multi`, and `/api/curve-fit` endpoints.
  - The backend uses custom solver components (`EquationSystemSolver`, `NewtonSolver`, `MultiObjectiveOptimizer`) and Apache Commons Math 3 optimization and fitting routines.
  - Shared state in the API layer is limited to the in-memory `SolveContextCache`, which stores solved equation states and REPL session overlays.
  - Integration tests verify synchronous HTTP requests/responses via MockMvc.
  - Gradle dependency configuration already includes RabbitMQ (AMQP) and Redis starter packages.
- **Unexplored areas**: None.

## Key Decisions Made
- Confirmed that Redis should replace the in-memory session cache (`SolveContextCache`) to allow stateless backend instances.
- Recommending to transition solve and optimize calls to asynchronous jobs sent via RabbitMQ queues to decouple heavy calculations from Tomcat request threads.

## Artifact Index
- /home/eren/dev/frEES/.agents/teamwork_preview_explorer_initial/handoff.md — Summary of findings and recommendations
