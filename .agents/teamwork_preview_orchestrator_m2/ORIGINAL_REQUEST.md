# Original User Request

## Initial Request — 2026-06-23T12:23:37+01:00

You are the Sub-orchestrator for Milestone 2: Redis State Cache Migration.
Your objective:
1. Decompose the milestone:
   - Identify all AST-related classes and interfaces (`ProcDef`, `ProcStatement`, `Expr`, `Statement`, and related sub-records/classes) and modify them to extend or implement `java.io.Serializable`.
   - Configure a Spring `@Configuration` class for Redis (`RedisConfig.java`) with a `RedisTemplate<String, Session>` that uses JDK Serialization for values.
   - Refactor `SolveContextCache` to store and retrieve sessions in Redis under `session:<sessionId>` keys instead of using an in-memory concurrent map.
   - Add Redis configuration properties to `application.properties` (e.g. `spring.data.redis.host=${REDIS_HOST:localhost}`).
2. Verify that all existing unit tests pass.
   - Note: Since JUnit tests boot Spring context via `@SpringBootTest`, ensure they do not require a live Redis instance. You can achieve this by mocking or excluding Redis auto-configuration during tests (e.g. via test properties or test profiles).
3. Spawn a worker subagent (`teamwork_preview_worker`) to implement the changes and run the tests.
4. Verify the changes using a reviewer subagent.
5. Report status back to the Project Orchestrator (Conversation ID: 716f35cf-2726-40a9-baf2-4bff060d816b).

Your working directory is `/home/eren/dev/frEES/.agents/teamwork_preview_orchestrator_m2/`. You report to the Project Orchestrator (Conversation ID: 716f35cf-2726-40a9-baf2-4bff060d816b).
