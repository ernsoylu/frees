# Project: frEES Decoupled Asynchronous Architecture

This document defines the architecture, milestones, layout, and interface contracts for refactoring the monolithic Spring Boot application `frEES` into a decoupled, asynchronous Message Broker pattern using RabbitMQ and Redis, with OpenTelemetry.

---

## Architecture

The refactored application consists of two Spring Profiles (`api` and `compute`) running inside the same JVM codebases but configured as separate execution paths.

### Component Diagram

```
           +-----------------------------+
           |       React Frontend        |
           +--------------+--------------+
                          | HTTP (check, repl, job poll, solve submit)
                          v
           +-----------------------------+
           |          API Node           |
           |      (Profile: "api")       |
           +-------+--------------+------+
                   |              |
     Read/Write JS |              | Publish ComputeTask
     Session state |              v
                   |      +---------------+
                   |      |   RabbitMQ    |
                   |      | (frees.tasks) |
                   |      +-------+-------+
                   v              |
           +---------------+      | Consume ComputeTask
           |  Redis Cache  |      |
           |  & Job Store  |<-----+
           +---------------+      v
                   ^      +---------------+
                   |      | Compute Node  |
                   +------+  (Profile:    |
             Write result |  "compute")   |
             COMPLETED    +---------------+
```

### Key Decisions
1. **Profiles**:
   - `api`: Activates HTTP endpoints. `SolveController` and `OptimizeController` delegate solving to RabbitMQ and Redis.
   - `compute`: Runs as a headless worker. Listens to RabbitMQ, performs equations solving/optimization, and writes results to Redis.
2. **State Store**: Redis replaces the in-memory `SolveContextCache`.
   - Session keys: `session:<sessionId>` (stores the workspace variables, proc definitions, REPL overrides).
   - Job keys: `job:<jobId>` (stores status, request type, and final output/error).
3. **Queue**: RabbitMQ handles queueing with fair dispatching (`prefetch = 1`).
4. **Context Propagation**: OpenTelemetry context is injected into RabbitMQ message headers by the producer and extracted by the consumer to enable unified distributed tracing.

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Gradle Build Fix & Cleanup | Apply `io.spring.dependency-management` plugin to resolve BOM compilation issues | None | DONE (Conv: 330a1ef2-f6a7-4605-90f3-a3c7696e694d) |
| 2 | Redis State Cache Migration | Make AST structures serializable; migrate `SolveContextCache` to Redis (`session:<sessionId>`) | M1 | DONE (2026-06-23) |
| 3 | Async Controller & API Profiles | Introduce `api` and `compute` profiles. Refactor `SolveController` and `OptimizeController` to queue tasks. Add `JobController`. | M2 | DONE (2026-06-23) |
| 4 | Compute Service & Task Listener | Implement RabbitMQ consumer in `compute` profile. Run solvers, save status (`COMPLETED`/`FAILED`) to Redis. Configure `prefetch=1`. | M3 | DONE (2026-06-23) |
| 5 | OpenTelemetry Distributed Tracing | Configure OpenTelemetry; inject/extract context over RabbitMQ headers. | M4 | PLANNED |
| 6 | Integration Testing & Docker-Compose | Write integration tests using Testcontainers. Adapt existing tests. Verify `docker-compose.yml` with API node + 3 Compute nodes. | M4, M5 | IN_PROGRESS (Testcontainers suite done; docker-compose e2e pending) |
| 7 | Reshape frees.sh Script | Modify `frees.sh` shell script to support running full distributed system and passing SPRING_PROFILES_ACTIVE or launching docker-compose. | M6 | PLANNED |

---

## Interface Contracts

### 1. Redis Job Store
Keys are structured as: `job:<jobId>`
Value: JSON serialized `JobState`

```java
public record JobState(
    String jobId,
    String status,      // "PENDING", "COMPLETED", "FAILED"
    String error,       // Error message if failed, else null
    Object result       // Serialized SolveResponse, OptimizeResponse, etc., when completed
) {}
```

### 2. RabbitMQ Message: `ComputeTask`
Queue name: `frees.tasks`

```java
public record ComputeTask(
    String jobId,
    String taskType,    // "SOLVE", "SOLVE_TABLE", "OPTIMIZE", "OPTIMIZE_MULTI", "CURVE_FIT"
    String sessionId,
    Object requestBody  // The original request DTO serialized
) {}
```

### 3. HTTP Endpoints
- `POST /api/solve`, `POST /api/solve/table`, `POST /api/optimize`, `POST /api/optimize/multi`, `POST /api/curve-fit`
  - Returns: `202 Accepted`
  - Body:
    ```json
    {
      "jobId": "uuid-string",
      "status": "PENDING"
    }
    ```
- `GET /api/jobs/{jobId}`
  - Returns: `200 OK`
  - Body: `JobState`

---

## Code Layout

- `backend/src/main/java/com/frees/backend`
  - `/api` - API Controllers, Web Security, Redis cache configuration.
    - `JobController.java` (New) - Polls Redis.
    - `SolveContextCache.java` (Modified) - Connects to Redis.
  - `/compute` - Headless runner components.
    - `ComputeTaskListener.java` (New) - RabbitMQ listener.
  - `/config` - Spring RabbitMQ, Redis, and OpenTelemetry configurations.
  - `/core` - Core math solvers (unchanged).
  - `/ast` - AST definitions (modified to implement Serializable).
