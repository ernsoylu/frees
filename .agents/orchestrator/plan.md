# Implementation Plan — frEES Refactoring

This plan outlines the refactoring of the monolithic Spring Boot application `frEES` into a decoupled, asynchronous Message Broker pattern using RabbitMQ and Redis, with OpenTelemetry.

## Milestones

### Milestone 1: Exploration & Architecture Definition (API & Compute Profiles)
- Explore existing codebase: controllers (`SolveController`, `OptimizeController`), solvers, AST evaluation, serialization, and test suite.
- Design `ComputeTask` and `JobState` message contracts.
- Define architecture, interface contracts, and layout. Document in `PROJECT.md`.

### Milestone 2: E2E Test Suite Design (Dual Track)
- Define test infrastructure and test runner.
- Enumerate features and design Tier 1-4 test cases (Happy path, boundaries, cross-feature, workloads) using RabbitMQ/Redis Testcontainers.
- Publish `TEST_INFRA.md` and `TEST_READY.md`.

### Milestone 3: API Refactoring & Redis Integration (API Profile)
- Configure Spring Profiles: `api` and `compute`.
- Refactor `SolveController` and `OptimizeController` to save `PENDING` state to Redis, push `ComputeTask` to RabbitMQ, and return `202 Accepted` with `jobId`.
- Add `JobController` to poll Redis for job results.

### Milestone 4: Compute Service & RabbitMQ Listener (Compute Profile)
- Implement `ComputeTaskListener` to consume from RabbitMQ.
- Execute heavy solvers (Newton's method, etc.) inside the compute context.
- Write solved results or failures back to Redis (`COMPLETED` or `FAILED`).
- Configure fair load balancing (`spring.rabbitmq.listener.simple.prefetch=1`).

### Milestone 5: OpenTelemetry Integration & Context Propagation
- Integrate `opentelemetry-spring-boot-starter`.
- Inject/Extract trace context over RabbitMQ headers.
- Verify distributed tracing propagation.

### Milestone 6: Verification & Multi-Node Docker-Compose
- Adapt the existing backend test suite to function under the async broker model or mock broker behavior.
- Ensure `./gradlew test jacocoTestReport jacocoTestCoverageVerification` passes without regressions.
- Verify `docker-compose.yml` spins up Redis, RabbitMQ, API Node, and 3 Compute Nodes.
- Adversarial coverage hardening (Tier 5).

### Milestone 7: Reshape frees.sh Script
- Modify the `frees.sh` shell script to support running the full distributed system at once.
- Ensure it properly passes `SPRING_PROFILES_ACTIVE` or launches `docker-compose up` depending on the command.
