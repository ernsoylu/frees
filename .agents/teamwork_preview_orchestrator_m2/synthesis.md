# Synthesis: Redis State Cache Migration Analysis

## Consensus
- **Serialization Targets**: All AST interfaces and nested records in `backend/src/main/java/com/frees/backend/ast` must be serializable. Specifically, sealed interfaces `Expr`, `Statement`, `ProcStatement`, and `ProcDef` must extend `java.io.Serializable`. The nested record `ProcDef.Curve` must explicitly implement `java.io.Serializable`.
- **Session Caching**: `SolveContextCache.Session` and its nested record `ReplVar` must implement `java.io.Serializable`.
- **Redis Cache Refactoring**: `SolveContextCache` must be refactored to inject `RedisTemplate<String, Session>` and interact with Redis under `session:<sessionId>` keys with a TTL of 1 hour (3600 seconds).
- **Session Mutation Save**: Direct in-memory updates to `Session` (e.g. `session.define(...)`, `session.setSystem(...)`, `session.clearVariable(...)`, and `session.clearOverlay()`) inside `ReplController` will no longer automatically persist. The controller must explicitly call `cache.save(request.sessionId(), session)` back to Redis after mutations.
- **Test Isolation**: JUnit tests booting Spring Boot context must not require a live Redis instance. We achieve this by excluding `RedisAutoConfiguration` in a `test` profile (via `src/test/resources/application.properties` and properties setup) and defining a thread-safe in-memory `RedisTemplate` mock using `@TestConfiguration` under `com.frees.backend.config.TestRedisConfig`.

## Resolved Conflicts
- No conflicts identified. Both Explorer 2 and Explorer 3 reports are completely aligned.

## Dissenting Views
- None.

## Gaps
- None.
