## 2026-06-23T11:24:25Z
You are Explorer 3 for Milestone 2: Redis State Cache Migration.
Your working directory is `/home/eren/dev/frEES/.agents/teamwork_preview_explorer_m2_3/`.
Your objective:
1. Read `/home/eren/dev/frEES/PROJECT.md` and `/home/eren/dev/frEES/.agents/teamwork_preview_orchestrator_m2/SCOPE.md`.
2. Locate all AST-related classes and interfaces (`ProcDef`, `ProcStatement`, `Expr`, `Statement`, and related sub-records/classes) under `backend/src/main/java/com/frees/backend/ast` and determine which need to implement/extend `java.io.Serializable`.
3. Check `SolveContextCache.java` (in `backend/src/main/java/com/frees/backend/api/SolveContextCache.java`) and check what other classes it references that may also need to be `Serializable` (e.g. `ReplVar`, any enums, etc.).
4. Design a Spring `@Configuration` class for Redis (`RedisConfig.java`) with a `RedisTemplate<String, Session>` bean that uses JDK Serialization for values. Recommend where it should be created (e.g., `com.frees.backend.config` or `com.frees.backend.api`).
5. Design the refactoring for `SolveContextCache` to store and retrieve sessions in Redis under `session:<sessionId>` keys instead of using an in-memory concurrent map.
6. Provide concrete configuration properties to add to `application.properties`.
7. Recommend how JUnit tests booting the Spring context (e.g. `@SpringBootTest`) can mock or disable Redis auto-configuration during tests so they do not require a live Redis instance.
8. Write your findings and proposed implementation plan to `/home/eren/dev/frEES/.agents/teamwork_preview_explorer_m2_3/handoff.md`.
9. Send a message to your parent (Conversation ID: 12bfae20-bd28-46eb-97e8-1c4c4ced0600) when done.

Remember: DO NOT write or modify any source code files. You are in read-only exploration mode.
