## 2026-06-23T11:26:01Z

You are the Worker subagent for Milestone 2: Redis State Cache Migration.
Your working directory is `/home/eren/dev/frEES/.agents/teamwork_preview_worker_m2_1/`.
Your objective is to implement the following changes in the `frEES` codebase:

1. Serialization of AST Classes:
   - Modify AST interfaces `Expr`, `Statement`, `ProcStatement`, and `ProcDef` to extend `java.io.Serializable`.
   - Modify the nested record `ProcDef.Curve` to explicitly implement `java.io.Serializable`.
   - Modify `SolveContextCache.Session` and its nested record `ReplVar` to implement `java.io.Serializable`. Add `private static final long serialVersionUID = 1L;` to the `Session` class.

2. Redis Configuration:
   - Configure a Spring `@Configuration` class `RedisConfig.java` under `com.frees.backend.config` that provides a `RedisTemplate<String, Session>` using JdkSerializationRedisSerializer for values.
   - Add Redis configuration properties to `backend/src/main/resources/application.properties` (e.g., `spring.data.redis.host=${REDIS_HOST:localhost}`).

3. Refactor SolveContextCache & ReplController:
   - Refactor `SolveContextCache` to inject `RedisTemplate<String, Session>` and store/retrieve sessions in Redis under `session:<sessionId>` keys instead of using an in-memory concurrent map. Use a TTL of 1 hour (3600 seconds) on Redis sets.
   - Update `ReplController.java` to explicitly call `cache.save(request.sessionId(), session)` after session mutations (in both `evaluate` and `clear` endpoints) since mutations on the deserialized copy are not automatically reflected in Redis.

4. Test Isolation:
   - Configure a test properties file `backend/src/test/resources/application.properties` setting the active profile to `test`.
   - Configure `com.frees.backend.config.TestRedisConfig` under `backend/src/test/java` annotated with `@TestConfiguration` and `@Profile("test")` that provides a mocked/fake `RedisTemplate<String, Session>` bean.
   - Exclude RedisAutoConfiguration during tests if needed (e.g. via `spring.autoconfigure.exclude` in test properties) to prevent the test context from attempting connection to a live Redis instance.

5. Verification:
   - Run compilation checks (`./gradlew compileJava compileTestJava`) and run the test suite (`./gradlew test`) to verify all existing tests pass and do not require a live Redis instance.
   - Document the files changed, compilation commands, and test results in `/home/eren/dev/frEES/.agents/teamwork_preview_worker_m2_1/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
