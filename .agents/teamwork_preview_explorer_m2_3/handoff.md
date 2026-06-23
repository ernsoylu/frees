# Handoff Report - Redis State Cache Migration Analysis

## 1. Observation

During read-only investigation, the following files and code snippets were observed:

### AST Structure
Under `backend/src/main/java/com/frees/backend/ast`:
- `Expr.java` is defined as a sealed interface:
  ```java
  public sealed interface Expr permits Expr.Num, Expr.Str, Expr.Var, Expr.BinOp, Expr.Neg,
          Expr.Call, Expr.ArrayAccess, Expr.Range, Expr.ArrayLiteral,
          Expr.Compare, Expr.Logical, Expr.Not { ... }
  ```
- `Statement.java` is defined as a sealed interface:
  ```java
  public sealed interface Statement permits Statement.Eq, Statement.For, Statement.CallProc, Statement.Symbolic { ... }
  ```
- `ProcStatement.java` is defined as a sealed interface:
  ```java
  public sealed interface ProcStatement permits ProcStatement.Assign, ProcStatement.IfElse, ProcStatement.RepeatUntil, ProcStatement.Eq, ProcStatement.For, ProcStatement.While { ... }
  ```
- `ProcDef.java` is defined as a sealed interface:
  ```java
  public sealed interface ProcDef permits ProcDef.FunctionDef, ProcDef.ProcedureDef, ProcDef.ModuleDef, ProcDef.FunctionTableDef { ... }
  ```
  Inside `ProcDef.java`, a nested record `Curve` is defined:
  ```java
  record Curve(Double param, double[] xs, double[] ys) { ... }
  ```
  Unlike the other nested records within `ProcDef` (e.g., `FunctionDef`), `Curve` does **not** implement the `ProcDef` interface.

### SolveContextCache & ReplVar
In `backend/src/main/java/com/frees/backend/api/SolveContextCache.java`:
- The cache stores a `Session` object:
  ```java
  public static final class Session {
      private volatile Map<String, Double> siValues = Map.of();
      private volatile Map<String, ReplVar> displayVars = Map.of();
      private volatile List<String> names = List.of();
      private volatile Map<String, ProcDef> defs = Map.of();
      private volatile UnitRegistry.UnitSystem system = UnitRegistry.UnitSystem.SI;
      private final Map<String, Double> overlaySi = new ConcurrentHashMap<>();
      private final Map<String, ReplVar> overlayDisplay = new ConcurrentHashMap<>();
      private volatile long timestampMillis = System.currentTimeMillis();
      // ...
  }
  ```
- The inner record `ReplVar` is defined as:
  ```java
  public record ReplVar(double value, String unit, Double uncertainty) {}
  ```
- The `UnitRegistry.UnitSystem` enum is defined inside `backend/src/main/java/com/frees/backend/units/UnitRegistry.java` at line 456:
  ```java
  public enum UnitSystem { SI, ENG_SI, ENGLISH }
  ```

### Session Mutation in Controller/Evaluator
In `backend/src/main/java/com/frees/backend/api/ReplController.java`:
- The controller retrieves a session, mutates it via `session.setSystem(...)`, and passes it to `evaluator.evaluate(...)` (which defines new variables using `session.define(...)`):
  ```java
  SolveContextCache.Session session = cache.session(request.sessionId());
  if (request.unitSystem() != null && !request.unitSystem().isBlank()) {
      try {
          session.setSystem(UnitRegistry.UnitSystem.valueOf(request.unitSystem().toUpperCase()));
      } catch (IllegalArgumentException ignored) {}
  }
  ReplEvaluator.Outcome o = evaluator.evaluate(request.expression(), session);
  ```
- Similarly, in `clear(...)`, the session is mutated directly in-memory:
  ```java
  SolveContextCache.Session session = cache.peek(request.sessionId());
  if (session != null) {
      ...
      session.clearVariable(...);
      ...
  }
  ```
- Because these mutations were performed on the shared in-memory object instance in `ConcurrentHashMap`, they automatically persisted. In a Redis-backed environment, they must be written back to Redis explicitly using a `cache.save(sessionId, session)` helper.

### JUnit Testing
- Under `backend/src/test/java/com/frees/backend/api/`, files like `SolveControllerTest.java` and `ReplControllerTest.java` boot the full Spring Boot Context using `@SpringBootTest` and `@AutoConfigureMockMvc`.
- `ReplControllerTest` actively runs solves and executes REPL commands, verifying state propagation across sequential API calls (e.g. `evaluatesExpressionAgainstSolvedWorkspace` and `assignmentDefinesAReusableVariableWithUnits`).

---

## 2. Logic Chain

1. **Serialization of AST and Session**:
   - The `Session` class is stored in Redis under the `session:<sessionId>` key. Therefore, `Session` must implement `java.io.Serializable`.
   - The fields inside `Session` are either JDK standard types (`Map`, `List`, primitives, enums like `UnitRegistry.UnitSystem` which automatically implement `Serializable`) or custom classes: `ReplVar` and `ProcDef`.
   - Thus, `ReplVar` and `ProcDef` must implement `java.io.Serializable`.
   - Since `ProcDef` is a sealed interface that refers to `ProcStatement` and `Statement` in its implementations (e.g. `FunctionDef` holds `List<ProcStatement>`, `ModuleDef` holds `List<Statement>`), and those refer to `Expr` (e.g. `Assign` holds `Expr`), ALL of `ProcStatement`, `Statement`, and `Expr` must extend/implement `java.io.Serializable`.
   - Because `Expr`, `Statement`, `ProcStatement`, and `ProcDef` are sealed interfaces, making the interfaces extend `java.io.Serializable` will make all their permitted nested records (like `Expr.Num`, `Statement.Eq`, etc.) serializable.
   - However, `ProcDef.Curve` is a standalone record that does *not* implement `ProcDef`. Hence, `ProcDef.Curve` must be explicitly declared as `implements java.io.Serializable`.

2. **Refactoring of SolveContextCache**:
   - By injecting `RedisTemplate<String, Session>` into `SolveContextCache`, we can persist sessions in Redis under `session:<sessionId>` keys.
   - Since the Redis `opsForValue().get()` operation returns a deserialized copy of the `Session`, in-memory mutations (such as `define(...)` and `clearVariable(...)`) performed by the REPL flow will not automatically persist to Redis.
   - To resolve this, a `save(String sessionId, Session session)` method must be added to `SolveContextCache` and called in `ReplController` immediately after any session mutations occur.

3. **Test Isolation**:
   - If tests boot `@SpringBootTest` with `spring-boot-starter-data-redis` on the classpath, they will attempt to connect to a live Redis server.
   - Excluding `RedisAutoConfiguration` via test properties (`spring.autoconfigure.exclude`) prevents this connection attempt.
   - However, since `SolveContextCache` autowires a `RedisTemplate<String, Session>`, we must provide a fake `RedisTemplate` in the test context.
   - A `@TestConfiguration` class in the test sources can define a mock/fake `RedisTemplate` that delegates store/retrieve operations to a thread-safe `ConcurrentHashMap`. This ensures context bootstrap succeeds and stateful tests like `ReplControllerTest` continue to pass.

---

## 3. Caveats

- **Serialization Compatibility**: Since JDK Serialization is used, structural class modifications to AST records/classes will invalidate previously serialized sessions. However, because the cache has a short TTL (1 hour), the impact is negligible and old entries will naturally evict. Defining `private static final long serialVersionUID = 1L;` on the non-record class `Session` is recommended to maintain stability.
- **Concurrent Access**: Two concurrent requests on the same session ID might overwrite each other's updates in Redis (last-write wins). Since the REPL is used on a single tab/document per user, this is acceptable and matches the behavior of most HTTP session managers.

---

## 4. Conclusion

All AST classes (`Expr`, `Statement`, `ProcStatement`, `ProcDef`, `ProcDef.Curve`), `ReplVar`, and `Session` must implement `java.io.Serializable`. `SolveContextCache` should be refactored to use `RedisTemplate<String, Session>` with JDK Serialization, and `ReplController` must save the session after mutation. For tests, Redis auto-configuration should be excluded and a fake in-memory `RedisTemplate` bean must be registered.

### Proposed Implementation Plan

#### Step 4.1: Make AST and Session Classes Serializable
1. Modify `Expr.java` to `public sealed interface Expr extends java.io.Serializable`.
2. Modify `Statement.java` to `public sealed interface Statement extends java.io.Serializable`.
3. Modify `ProcStatement.java` to `public sealed interface ProcStatement extends java.io.Serializable`.
4. Modify `ProcDef.java`:
   - Change to `public sealed interface ProcDef extends java.io.Serializable`.
   - Modify nested `Curve` record to `record Curve(Double param, double[] xs, double[] ys) implements java.io.Serializable`.
5. Modify `SolveContextCache.java`:
   - Change `ReplVar` to `public record ReplVar(...) implements java.io.Serializable`.
   - Change `Session` to:
     ```java
     public static final class Session implements java.io.Serializable {
         private static final long serialVersionUID = 1L;
         ...
     }
     ```

#### Step 4.2: Create Redis Config class
Create `backend/src/main/java/com/frees/backend/config/RedisConfig.java`:
```java
package com.frees.backend.config;

import com.frees.backend.api.SolveContextCache.Session;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.JdkSerializationRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@Profile("!test")
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Session> sessionRedisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Session> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new JdkSerializationRedisSerializer());
        template.setHashValueSerializer(new JdkSerializationRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
```

#### Step 4.3: Refactor SolveContextCache
Refactor `SolveContextCache.java` to use the injected `RedisTemplate`:
```java
@Component
public class SolveContextCache {
    public static final String DEFAULT_SESSION = "default";
    private static final long TTL_MILLIS = 60L * 60L * 1000L; // 1 hour

    private final RedisTemplate<String, Session> redisTemplate;

    public SolveContextCache(RedisTemplate<String, Session> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private String redisKey(String sessionId) {
        String sId = (sessionId == null || sessionId.isBlank()) ? DEFAULT_SESSION : sessionId;
        return "session:" + sId;
    }

    public Session session(String sessionId) {
        String key = redisKey(sessionId);
        Session s = redisTemplate.opsForValue().get(key);
        if (s == null) {
            s = new Session();
            redisTemplate.opsForValue().set(key, s, TTL_MILLIS, TimeUnit.MILLISECONDS);
        }
        return s;
    }

    public Session peek(String sessionId) {
        return redisTemplate.opsForValue().get(redisKey(sessionId));
    }

    public void put(String sessionId,
                    Map<String, Double> siValues,
                    Map<String, ReplVar> displayVars,
                    List<String> names,
                    Map<String, ProcDef> defs,
                    UnitRegistry.UnitSystem system) {
        Session s = session(sessionId);
        s.siValues = Map.copyOf(siValues);
        s.displayVars = Map.copyOf(displayVars);
        s.names = List.copyOf(names);
        s.defs = Map.copyOf(defs);
        s.system = system != null ? system : UnitRegistry.UnitSystem.SI;
        s.timestampMillis = System.currentTimeMillis();
        save(sessionId, s);
    }

    public void save(String sessionId, Session session) {
        redisTemplate.opsForValue().set(redisKey(sessionId), session, TTL_MILLIS, TimeUnit.MILLISECONDS);
    }

    public void clear(String sessionId) {
        redisTemplate.delete(redisKey(sessionId));
    }
}
```

#### Step 4.4: Update ReplController to Persist Session Changes
In `ReplController.java`, call `cache.save(request.sessionId(), session)` after mutations:
1. In `evaluate`:
   ```java
   SolveContextCache.Session session = cache.session(request.sessionId());
   if (request.unitSystem() != null && !request.unitSystem().isBlank()) {
       try {
           session.setSystem(UnitRegistry.UnitSystem.valueOf(request.unitSystem().toUpperCase()));
       } catch (IllegalArgumentException ignored) {}
   }
   ReplEvaluator.Outcome o = evaluator.evaluate(request.expression(), session);
   cache.save(request.sessionId(), session); // <-- Save back to Redis
   return ResponseEntity.ok(...);
   ```
2. In `clear`:
   ```java
   SolveContextCache.Session session = cache.peek(request.sessionId());
   if (session != null) {
       String expr = request.expression();
       if (expr != null && !expr.isBlank()) {
           session.clearVariable(expr.trim().toLowerCase());
       } else {
           session.clearOverlay();
       }
       cache.save(request.sessionId(), session); // <-- Save back to Redis
   }
   ```

#### Step 4.5: Configure application.properties
Append standard properties to `backend/src/main/resources/application.properties`:
```properties
# Redis configurations
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}
spring.data.redis.password=${REDIS_PASSWORD:}
```

#### Step 4.6: Mocking/Disabling Redis in JUnit Tests
1. Add a test configuration `backend/src/test/java/com/frees/backend/config/TestRedisConfig.java` to supply a stateful mock `RedisTemplate`:
   ```java
   package com.frees.backend.config;

   import com.frees.backend.api.SolveContextCache.Session;
   import org.mockito.Mockito;
   import org.springframework.boot.test.context.TestConfiguration;
   import org.springframework.context.annotation.Bean;
   import org.springframework.context.annotation.Primary;
   import org.springframework.context.annotation.Profile;
   import org.springframework.data.redis.core.RedisTemplate;
   import org.springframework.data.redis.core.ValueOperations;

   import java.util.Map;
   import java.util.concurrent.ConcurrentHashMap;
   import java.util.concurrent.TimeUnit;

   import static org.mockito.ArgumentMatchers.any;
   import static org.mockito.ArgumentMatchers.anyLong;
   import static org.mockito.ArgumentMatchers.anyString;
   import static org.mockito.Mockito.doAnswer;
   import static org.mockito.Mockito.mock;
   import static org.mockito.Mockito.when;

   @TestConfiguration
   @Profile("test")
   public class TestRedisConfig {

       @Bean
       @Primary
       @SuppressWarnings("unchecked")
       public RedisTemplate<String, Session> redisTemplate() {
           RedisTemplate<String, Session> template = mock(RedisTemplate.class);
           ValueOperations<String, Session> valueOps = mock(ValueOperations.class);
           
           Map<String, Session> fakeStore = new ConcurrentHashMap<>();
           
           when(template.opsForValue()).thenReturn(valueOps);
           
           when(valueOps.get(anyString())).thenAnswer(invocation -> {
               String key = invocation.getArgument(0);
               return fakeStore.get(key);
           });
           
           doAnswer(invocation -> {
               String key = invocation.getArgument(0);
               Session val = invocation.getArgument(1);
               fakeStore.put(key, val);
               return null;
           }).when(valueOps).set(anyString(), any(Session.class));
           
           doAnswer(invocation -> {
               String key = invocation.getArgument(0);
               Session val = invocation.getArgument(1);
               fakeStore.put(key, val);
               return null;
           }).when(valueOps).set(anyString(), any(Session.class), anyLong(), any(TimeUnit.class));
           
           when(template.delete(anyString())).thenAnswer(invocation -> {
               String key = invocation.getArgument(0);
               return fakeStore.remove(key) != null;
           });
           
           return template;
       }
   }
   ```
2. Enable `test` profile and exclude `RedisAutoConfiguration` in tests:
   Create `backend/src/test/resources/application.properties` containing:
   ```properties
   spring.profiles.active=test
   spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration
   ```
   This ensures that no connection attempts are made to standard Redis instances during unit/integration tests and context scans.

---

## 5. Verification Method

- **Build/Compilation Check**: Run `./gradlew compileJava compileTestJava` to verify there are no compilation errors after adding the `Serializable` implements/extends bounds.
- **Unit and Integration Tests Execution**: Run `./gradlew test` (or `./gradlew clean test`).
- **Redis Disconnected Verification**: Run tests with no Redis server running locally. The test suite should completely execute and pass, verifying that `TestRedisConfig` and auto-configuration exclusions work correctly.
