# Scope: Redis State Cache Migration

## Architecture
- **State Store**: Session storage is migrated from the in-memory `ConcurrentHashMap` in `SolveContextCache` to Redis, keyed under `session:<sessionId>`.
- **Serialization**: Since values stored in Redis (`Session`) are serialized, all JVM classes residing inside the session (including the AST representation classes `ProcDef`, `ProcStatement`, `Expr`, `Statement`, and their dependencies) must implement `java.io.Serializable`.
- **Spring Configuration**: A Spring `@Configuration` class (`RedisConfig`) is introduced to define the `RedisTemplate<String, Session>` bean.
- **Properties**: Redis host config properties are added to `application.properties`.
- **Unit Testing**: Tests booting the Spring context (e.g., using `@SpringBootTest`) must run without requiring a live Redis server by mocking or disabling Redis auto-configuration during testing.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | AST Serialization | Identify and modify all AST-related classes/interfaces to extend/implement `java.io.Serializable`. | None | PLANNED |
| 2 | Redis Properties Configuration | Add Redis properties (host, port, etc.) to `application.properties`. | None | PLANNED |
| 3 | Redis Configuration Class | Create `RedisConfig.java` to define `RedisTemplate<String, Session>` using JDK Serialization. | M1, M2 | PLANNED |
| 4 | Refactor SolveContextCache | Modify `SolveContextCache` and `Session` to read/write from Redis under `session:<sessionId>` keys. | M3 | PLANNED |
| 5 | Test Isolation | Disable/mock Redis auto-configuration in tests to run without a live Redis server. | M4 | PLANNED |
| 6 | Verification | Run all builds and tests to ensure successful migration and no regressions. | M5 | PLANNED |

## Interface Contracts
- **Session Cache**: Key `session:<sessionId>` maps to a JDK-serialized `SolveContextCache.Session` object.
- **SolveContextCache API**:
  - `public Session session(String sessionId)` - Retrieves session from Redis (creating it if absent).
  - `public Session peek(String sessionId)` - Retrieves session from Redis without creating, or returns null if absent/expired.
  - `public void put(String sessionId, ...)` - Updates the session in Redis.
  - `public void clear(String sessionId)` - Evicts/deletes the session from Redis.
