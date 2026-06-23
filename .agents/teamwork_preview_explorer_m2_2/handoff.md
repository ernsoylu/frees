# Handoff Report: Redis State Cache Migration Analysis

This report outlines the observations, analysis, and implementation plan for migrating `SolveContextCache` from an in-memory concurrent map to Redis, ensuring AST serialization, designing the Spring configuration, refactoring the caching logic, and isolating unit tests from requiring a live Redis server.

---

## 1. Observation

Direct observations and file inspections on the `frEES` codebase:

1. **AST Interfaces and Classes (`backend/src/main/java/com/frees/backend/ast/`)**:
   - `Expr.java` contains the sealed interface `Expr` and its nested records (e.g. `Num`, `Str`, `Var`, etc.):
     ```java
     public sealed interface Expr permits Expr.Num, Expr.Str, Expr.Var, Expr.BinOp, Expr.Neg,
             Expr.Call, Expr.ArrayAccess, Expr.Range, Expr.ArrayLiteral,
             Expr.Compare, Expr.Logical, Expr.Not {
     ```
   - `Statement.java` contains the sealed interface `Statement` and its nested records:
     ```java
     public sealed interface Statement permits Statement.Eq, Statement.For, Statement.CallProc, Statement.Symbolic {
     ```
   - `ProcDef.java` contains the sealed interface `ProcDef` and its nested records, plus the nested helper record `Curve`:
     ```java
     public sealed interface ProcDef
             permits ProcDef.FunctionDef, ProcDef.ProcedureDef, ProcDef.ModuleDef, ProcDef.FunctionTableDef {
     ...
         record Curve(Double param, double[] xs, double[] ys) {
     ```
   - `ProcStatement.java` contains the sealed interface `ProcStatement` and its nested records:
     ```java
     public sealed interface ProcStatement permits
             ProcStatement.Assign,
             ProcStatement.IfElse,
             ProcStatement.RepeatUntil,
             ProcStatement.Eq,
             ProcStatement.For,
             ProcStatement.While {
     ```

2. **Session Storage and SolveContextCache (`backend/src/main/java/com/frees/backend/api/SolveContextCache.java`)**:
   - `SolveContextCache.java` references `ProcDef` and `UnitRegistry.UnitSystem` and implements the in-memory cache:
     ```java
     public record ReplVar(double value, String unit, Double uncertainty) {}
     ...
     public static final class Session {
         private volatile Map<String, Double> siValues = Map.of();
         private volatile Map<String, ReplVar> displayVars = Map.of();
         private volatile List<String> names = List.of();
         private volatile Map<String, ProcDef> defs = Map.of();
         private volatile UnitRegistry.UnitSystem system = UnitRegistry.UnitSystem.SI;
         private final Map<String, Double> overlaySi = new ConcurrentHashMap<>();
         private final Map<String, ReplVar> overlayDisplay = new ConcurrentHashMap<>();
         private volatile long timestampMillis = System.currentTimeMillis();
         ...
     }
     ```
   - The eviction is handled via an explicit in-memory check:
     ```java
     private static final long TTL_MILLIS = 60L * 60L * 1000L; // 1 hour
     private static final int MAX_SESSIONS = 256;
     ```

3. **Session Mutation in Controllers (`backend/src/main/java/com/frees/backend/api/ReplController.java`)**:
   - The controller retrieves the session and mutates it (e.g. `setSystem`, `session.define(...)` or `session.clearVariable(...)`) without a write-back call since the in-memory instance reference is modified directly:
     ```java
     SolveContextCache.Session session = cache.session(request.sessionId());
     ...
     session.setSystem(...);
     ...
     ReplEvaluator.Outcome o = evaluator.evaluate(request.expression(), session);
     ```

4. **Integration Tests (`backend/src/test/java/com/frees/backend/integration/AsynchronousComputeIntegrationTest.java`)**:
   - Uses Testcontainers to run dynamic tests with a live Redis instance on a mapped port:
     ```java
     @Container
     static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
             .withExposedPorts(6379);
     ```

5. **Unit/Web Tests Booting Spring (`backend/src/test/java/com/frees/backend/api/ReplControllerTest.java`, etc.)**:
   - Boot Spring via `@SpringBootTest` but do not spin up a live Redis container or mock the connections, meaning they will fail if a local Redis is unavailable.

---

## 2. Logic Chain

1. **Serializable Requirement**:
   - Because the session is saved and retrieved from Redis (an out-of-process store), the cache values must be serialized. 
   - `SolveContextCache.Session` and all its components (including nested `ReplVar`, `ProcDef`, and their dependencies `Expr`, `Statement`, `ProcStatement`, and `Curve`) must implement `java.io.Serializable`.
   - By making the interfaces `Expr`, `Statement`, `ProcStatement`, and `ProcDef` extend `java.io.Serializable`, their permitted implementations (which are Java records) will automatically implement `Serializable`. Standing out is `ProcDef.Curve` which is a record inside `ProcDef.java` but does *not* implement `ProcDef`; hence it must be annotated to implement `java.io.Serializable` explicitly.

2. **Persistence Mutability Correction**:
   - In-memory cache returns shared memory references. Thus, calling `session.define(...)` or `session.setSystem(...)` immediately updates the cache.
   - A Redis-backed cache retrieves a deserialized *copy* of the session. Direct mutations on the copy will not propagate back to Redis.
   - Therefore, a `save(String sessionId, Session session)` method must be added to `SolveContextCache`, and the `ReplController` (in both `/evaluate` and `/clear` endpoints) must explicitly call `cache.save(request.sessionId(), session)` to persist changes.

3. **Eviction Simplification**:
   - Since Redis supports Key-value level Time-To-Live (TTL) naturally, setting a TTL of 1 hour on each Redis set operation removes the need for custom `evict()` logic inside the JVM process.

4. **Spring Configuration for Redis**:
   - A configuration class `RedisConfig` using `RedisTemplate<String, Session>` is needed.
   - For readable keys, we use `StringRedisSerializer`. For values, JDK serialization (`JdkSerializationRedisSerializer`) is utilized to support the complex object structure of `Session` and AST classes.

5. **Test Isolation**:
   - To prevent unit tests from failing due to the absence of a live Redis instance:
     - Introduce a `test` profile for testing.
     - real `RedisConfig` is annotated with `@Profile("!test")`.
     - A `TestRedisConfig` (defining a mock `RedisTemplate` backed by a local `ConcurrentHashMap`) is annotated with `@Profile("test")`.
     - In `src/test/resources/application.properties`, set `spring.profiles.active=test`.
     - This isolates unit tests while allowing integration tests (`AsynchronousComputeIntegrationTest`) to override profiles with `@ActiveProfiles({"api", "compute"})` to test against a live Testcontainers instance.

---

## 3. Caveats

1. **Version Compatibility (Class Evolution)**:
   - JDK serialization is sensitive to class signature changes. If AST records are modified in future milestones, previously serialized sessions in Redis will fail to deserialize, throwing `InvalidClassException`. We address this by defining `private static final long serialVersionUID = 1L;` on all main serializable classes. Since Redis sessions are short-lived (1 hour TTL), this risk is low in production but must be acknowledged.
2. **Spring Boot Version**:
   - The application uses Spring Boot `3.5.6`. Spring Boot 3.4+ replaces `@MockBean` with `@MockitoBean`. The designed `TestRedisConfig` uses programmatic mocking with Mockito or standard `@Configuration` with `@Profile`, making it fully compatible.

---

## 4. Conclusion & Implementation Plan

### Step 1: Modify AST Classes to be Serializable
Add `extends java.io.Serializable` or `implements java.io.Serializable` to:
- `com.frees.backend.ast.Expr`
- `com.frees.backend.ast.Statement`
- `com.frees.backend.ast.ProcStatement`
- `com.frees.backend.ast.ProcDef`
- `com.frees.backend.ast.ProcDef.Curve`

### Step 2: Define Redis Properties
Add the following properties to `backend/src/main/resources/application.properties`:
```properties
# Redis config
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}
spring.data.redis.password=${REDIS_PASSWORD:}
```

### Step 3: Create Redis Configuration
Create `com.frees.backend.config.RedisConfig` under `backend/src/main/java/com/frees/backend/config/RedisConfig.java`:
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
    public RedisTemplate<String, Session> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Session> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        
        JdkSerializationRedisSerializer valueSerializer = new JdkSerializationRedisSerializer();
        template.setValueSerializer(valueSerializer);
        template.setHashValueSerializer(valueSerializer);
        
        template.afterPropertiesSet();
        return template;
    }
}
```

### Step 4: Refactor SolveContextCache
Modify `com.frees.backend.api.SolveContextCache.java` to inject `RedisTemplate<String, Session>` and query/write to Redis under `session:<sessionId>` keys with 1 hour (3600 seconds) TTL:
```java
package com.frees.backend.api;

import com.frees.backend.ast.ProcDef;
import com.frees.backend.units.UnitRegistry;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
public class SolveContextCache {

    public static final String DEFAULT_SESSION = "default";
    private static final long TTL_SECONDS = 3600L;

    private final RedisTemplate<String, Session> redisTemplate;

    public SolveContextCache(RedisTemplate<String, Session> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public record ReplVar(double value, String unit, Double uncertainty) implements java.io.Serializable {
        @java.io.Serial
        private static final long serialVersionUID = 1L;
    }

    public static final class Session implements java.io.Serializable {
        @java.io.Serial
        private static final long serialVersionUID = 1L;

        private volatile Map<String, Double> siValues = Map.of();
        private volatile Map<String, ReplVar> displayVars = Map.of();
        private volatile List<String> names = List.of();
        private volatile Map<String, ProcDef> defs = Map.of();
        private volatile UnitRegistry.UnitSystem system = UnitRegistry.UnitSystem.SI;
        
        private final Map<String, Double> overlaySi = new ConcurrentHashMap<>();
        private final Map<String, ReplVar> overlayDisplay = new ConcurrentHashMap<>();
        private volatile long timestampMillis = System.currentTimeMillis();

        public Map<String, ProcDef> defs() { return defs; }
        public UnitRegistry.UnitSystem system() { return system; }

        public void setSystem(UnitRegistry.UnitSystem system) {
            this.system = system != null ? system : UnitRegistry.UnitSystem.SI;
        }

        public Map<String, Double> siValues() {
            if (overlaySi.isEmpty()) return siValues;
            java.util.Map<String, Double> merged = new java.util.HashMap<>(siValues);
            merged.putAll(overlaySi);
            return merged;
        }

        public ReplVar displayOf(String lowerName) {
            ReplVar v = overlayDisplay.get(lowerName);
            return v != null ? v : displayVars.get(lowerName);
        }

        public String unitOf(String lowerName) {
            ReplVar v = displayOf(lowerName);
            return v != null ? v.unit() : null;
        }

        public List<String> completionNames() {
            if (overlayDisplay.isEmpty()) return names;
            java.util.LinkedHashSet<String> all = new java.util.LinkedHashSet<>(names);
            all.addAll(overlayDisplay.keySet());
            return List.copyOf(all);
        }

        public void define(String lowerName, double si, ReplVar display) {
            overlaySi.put(lowerName, si);
            overlayDisplay.put(lowerName, display);
        }

        public void clearOverlay() {
            overlaySi.clear();
            overlayDisplay.clear();
        }

        public void clearVariable(String lowerName) {
            overlaySi.remove(lowerName);
            overlayDisplay.remove(lowerName);
            String prefix = lowerName + "[";
            overlaySi.keySet().removeIf(k -> k.startsWith(prefix));
            overlayDisplay.keySet().removeIf(k -> k.startsWith(prefix));
        }

        public boolean isPopulated() {
            return !siValues.isEmpty() || !defs.isEmpty() || !overlaySi.isEmpty();
        }
    }

    public Session session(String sessionId) {
        String redisKey = key(sessionId);
        Session s = redisTemplate.opsForValue().get(redisKey);
        if (s == null) {
            s = new Session();
            redisTemplate.opsForValue().set(redisKey, s, TTL_SECONDS, TimeUnit.SECONDS);
        }
        return s;
    }

    public Session peek(String sessionId) {
        String redisKey = key(sessionId);
        return redisTemplate.opsForValue().get(redisKey);
    }

    public void save(String sessionId, Session session) {
        String redisKey = key(sessionId);
        redisTemplate.opsForValue().set(redisKey, session, TTL_SECONDS, TimeUnit.SECONDS);
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

    public void clear(String sessionId) {
        redisTemplate.delete(key(sessionId));
    }

    private static String key(String sessionId) {
        String base = (sessionId == null || sessionId.isBlank()) ? DEFAULT_SESSION : sessionId;
        return "session:" + base;
    }
}
```

### Step 5: Save Mutated Sessions in ReplController
Update `com.frees.backend.api.ReplController.java`:
- Inside `evaluate(...)`, call `cache.save(request.sessionId(), session);` before constructing the response entity.
- Inside `clear(...)`, call `cache.save(request.sessionId(), session);` after modifying the session overlay.

### Step 6: Create Test Isolation Config and Properties
1. Create `backend/src/test/resources/application.properties` (creating the directories if absent) and set:
   ```properties
   spring.profiles.active=test
   ```
2. Create `com.frees.backend.config.TestRedisConfig` under `backend/src/test/java/com/frees/backend/config/TestRedisConfig.java`:
   ```java
   package com.frees.backend.config;

   import org.mockito.Mockito;
   import org.springframework.boot.test.context.TestConfiguration;
   import org.springframework.context.annotation.Bean;
   import org.springframework.context.annotation.Primary;
   import org.springframework.context.annotation.Profile;
   import org.springframework.data.redis.connection.RedisConnectionFactory;
   import org.springframework.data.redis.core.RedisTemplate;
   import org.springframework.data.redis.core.ValueOperations;
   import com.frees.backend.api.SolveContextCache.Session;
   import java.util.Map;
   import java.util.concurrent.ConcurrentHashMap;

   @TestConfiguration
   @Profile("test")
   public class TestRedisConfig {

       @Bean
       @Primary
       public RedisConnectionFactory redisConnectionFactory() {
           return Mockito.mock(RedisConnectionFactory.class);
       }

       @Bean
       @Primary
       public RedisTemplate<String, Session> redisTemplate() {
           RedisTemplate<String, Session> mockTemplate = Mockito.mock(RedisTemplate.class);
           ValueOperations<String, Session> valueOps = Mockito.mock(ValueOperations.class);
           Map<String, Session> mockStore = new ConcurrentHashMap<>();
           
           Mockito.when(mockTemplate.opsForValue()).thenReturn(valueOps);
           
           Mockito.doAnswer(invocation -> {
               String key = invocation.getArgument(0);
               return mockStore.get(key);
           }).when(valueOps).get(Mockito.anyString());
           
           Mockito.doAnswer(invocation -> {
               String key = invocation.getArgument(0);
               Session val = invocation.getArgument(1);
               mockStore.put(key, val);
               return null;
           }).when(valueOps).set(Mockito.anyString(), Mockito.any());
           
           Mockito.doAnswer(invocation -> {
               String key = invocation.getArgument(0);
               Session val = invocation.getArgument(1);
               mockStore.put(key, val);
               return null;
           }).when(valueOps).set(Mockito.anyString(), Mockito.any(), Mockito.anyLong(), Mockito.any());
           
           Mockito.doAnswer(invocation -> {
               String key = invocation.getArgument(0);
               mockStore.remove(key);
               return true;
           }).when(mockTemplate).delete(Mockito.anyString());
           
           return mockTemplate;
       }
   }
   ```

---

## 5. Verification Method

To independently verify the implementation after it is applied by the implementer:
1. **Compilation Check**:
   Run `./gradlew compileJava` in the `backend/` directory. All changes must compile without syntax errors.
2. **Unit Tests (Isolated)**:
   Run `./gradlew test --info` from `backend/`. Confirm that tests like `PlotControllerTest` and `ReplControllerTest` boot successfully and pass without a live Redis server running on the system.
3. **Integration Tests (Live)**:
   Ensure Docker is running and run the integration tests using Testcontainers: `./gradlew test --tests "*AsynchronousComputeIntegrationTest*"` under the `backend/` directory. Confirm that it executes and passes against the dynamic live Redis container.
