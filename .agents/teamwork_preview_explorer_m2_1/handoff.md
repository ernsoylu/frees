# Handoff Report - Redis State Cache Migration (Milestone 2)

## 1. Observation

During the exploration of the codebase, we observed the following files, configurations, and structures:

### A. AST package structures (`backend/src/main/java/com/frees/backend/ast`)
The AST package consists of the following key interfaces and records:
- **`Expr.java`**: A sealed interface (`public sealed interface Expr permits ...`) that defines the expression AST. Permitted records include:
  - `record Num(double value, String unit, boolean isImaginary) implements Expr`
  - `record Str(String value) implements Expr`
  - `record Var(String name) implements Expr`
  - `record BinOp(char op, Expr left, Expr right) implements Expr`
  - `record Neg(Expr operand) implements Expr`
  - `record Call(String function, java.util.List<Expr> args) implements Expr`
  - `record ArrayAccess(String name, java.util.List<Expr> indices) implements Expr`
  - `record Range(Expr start, Expr end) implements Expr`
  - `record ArrayLiteral(java.util.List<Expr> elements) implements Expr`
  - `record Compare(String op, Expr left, Expr right) implements Expr`
  - `record Logical(String op, Expr left, Expr right) implements Expr`
  - `record Not(Expr operand) implements Expr`
- **`Statement.java`**: A sealed interface representing top-level parsed statements:
  - `record Eq(Expr lhs, Expr rhs, String sourceText) implements Statement`
  - `record For(String varName, Expr start, Expr end, List<Statement> body) implements Statement`
  - `record Symbolic(List<String> names) implements Statement`
  - `record CallProc(String name, List<Expr> inputs, List<Expr> outputs, String sourceText) implements Statement`
- **`ProcStatement.java`**: A sealed interface for sequential statements inside FUNCTION or PROCEDURE blocks:
  - `record Assign(String varName, Expr value) implements ProcStatement`
  - `record IfElse(Expr condition, List<ProcStatement> thenBranch, List<ProcStatement> elseBranch) implements ProcStatement`
  - `record RepeatUntil(List<ProcStatement> body, Expr condition) implements ProcStatement`
  - `record Eq(Expr lhs, Expr rhs, String sourceText) implements ProcStatement`
  - `record For(String varName, Expr start, Expr end, List<ProcStatement> body) implements ProcStatement`
  - `record While(Expr condition, List<ProcStatement> body) implements ProcStatement`
- **`ProcDef.java`**: A sealed interface representing top-level callable blocks:
  - `record FunctionDef(String name, List<String> params, List<ProcStatement> body, String outputUnit, List<String> paramUnits) implements ProcDef`
  - `record ProcedureDef(String name, List<String> inputs, List<String> outputs, List<ProcStatement> body) implements ProcDef`
  - `record ModuleDef(String name, List<String> inputs, List<String> outputs, List<Statement> body) implements ProcDef`
  - `record FunctionTableDef(String name, List<String> argNames, boolean xLog, boolean yLog, List<Curve> curves, String outputUnit, List<String> argUnits) implements ProcDef`
  - `record Curve(Double param, double[] xs, double[] ys)` - defined inside `ProcDef.java` but does not implement `ProcDef` directly.

### B. SolveContextCache and ReplController structures
- **`SolveContextCache.java`**:
  - Declares `public record ReplVar(double value, String unit, Double uncertainty)`.
  - Declares `public static final class Session` containing fields:
    - `private volatile Map<String, Double> siValues`
    - `private volatile Map<String, ReplVar> displayVars`
    - `private volatile List<String> names`
    - `private volatile Map<String, ProcDef> defs`
    - `private volatile UnitRegistry.UnitSystem system`
    - `private final Map<String, Double> overlaySi`
    - `private final Map<String, ReplVar> overlayDisplay`
    - `private volatile long timestampMillis`
  - `UnitRegistry.UnitSystem` is an enum (declared in `UnitRegistry.java`, line 456).
- **`ReplController.java`**:
  - In `evaluate` (line 46-56), it retrieves the session using `cache.session(request.sessionId())`, applies a unit system mutation `session.setSystem(...)`, and performs evaluation which mutates `session` overlay maps (`overlaySi` and `overlayDisplay` via `session.define(...)` calls inside `ReplEvaluator.java`).
  - In `clear` (line 64-74), it calls `session.clearVariable(...)` or `session.clearOverlay()`.
  
### C. Integration and Controller Test properties
- **`AsynchronousComputeIntegrationTest.java`**:
  - Uses `@ActiveProfiles({"api", "compute"})` and `@Testcontainers` to boot RabbitMQ and Redis containers.
  - Dynamically configures Redis host/port via `@DynamicPropertySource` registry (lines 43-49):
    ```java
    registry.add("spring.data.redis.host", redis::getHost);
    registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    ```
- **`ReplControllerTest.java`** and **`SolveControllerTest.java`**:
  - Non-integration controller tests annotated with `@SpringBootTest` and `@AutoConfigureMockMvc`.
  - They execute calls to `POST /api/solve` and `POST /api/repl/evaluate` which read/write to the session cache.
  - There is no active profile set (runs default profile).

---

## 2. Logic Chain

1. **AST and Session Serialization Necessity**:
   - The session cache stores instances of `SolveContextCache.Session`.
   - `Session` holds `ProcDef` definitions in the `defs` map field.
   - `ProcDef` instances contain `ProcStatement` and `Statement` bodies, which in turn contain nested `Expr` structures.
   - `ProcDef.FunctionTableDef` also references a list of `Curve` objects.
   - When transitioning from an in-memory `ConcurrentHashMap` to Redis using JDK Serialization for values, `Session` and all its direct and indirect transitively referenced classes/records must implement `java.io.Serializable`.
   - Thus, the interfaces `ProcDef`, `ProcStatement`, `Statement`, `Expr`, the record `Curve`, and cache nested classes `Session` and `ReplVar` must be declared as `Serializable`.

2. **Session Persistence on Mutation**:
   - Unlike an in-memory map where a reference modification is instantly visible across subsequent requests, retrieving a session from Redis deserializes a new copy in memory.
   - Since `ReplController` mutates the fetched `Session` locally (either via `setSystem(...)`, `session.define(...)`, or `session.clearOverlay()`), these changes will be lost on subsequent requests if not written back.
   - Therefore, `SolveContextCache` must introduce a `save(String sessionId, Session session)` method to update/overwrite the mutated `Session` back to Redis. All mutating endpoints in `ReplController` must explicitly invoke this `save` method.

3. **Spring Configuration Location**:
   - Project specifications (`PROJECT.md`) designate `backend/src/main/java/com/frees/backend/config` for global framework configurations (RabbitMQ, Redis, OpenTelemetry) and `/api` for controller/routing concerns.
   - Therefore, `RedisConfig.java` should reside in `com.frees.backend.config`.

4. **Offline Test Environment Isolation**:
   - Lettuce connection factory is lazy and does not initiate a connection to Redis during Spring context startup. However, tests that run REST calls accessing the cache will trigger Redis template actions and fail if Redis is offline.
   - Excluding Redis auto-configuration globally (e.g. in test properties) would break `AsynchronousComputeIntegrationTest` because it requires Lettuce connection factory to connect to its Testcontainers container.
   - Placing a test configuration `TestRedisConfig` in the `src/test/java` package under `com.frees.backend.config` with `@Profile("!integration")` allows it to be picked up by component scanning during all test suites except integration tests (which run with the `api` and `compute` profiles, and can be updated to include the `integration` profile).
   - Declaring a primary mock `RedisConnectionFactory` and a stubbed `RedisTemplate` in `TestRedisConfig` intercepts Redis template requests, routing them to an in-memory `ConcurrentHashMap` for unit/slice tests, thereby running them offline.

---

## 3. Caveats

- **JDK Serialization overhead**: JDK Serialization is chosen as requested, but it produces larger payloads in Redis compared to JSON serializers. Any updates to classes require matching `serialVersionUID` to prevent deserialization issues when schema changes.
- **`AsynchronousComputeIntegrationTest` Profile Mapping**: The integration test must activate the `integration` profile (e.g. `@ActiveProfiles({"api", "compute", "integration"})`) so it bypasses the mock `TestRedisConfig`.

---

## 4. Conclusion

### Proposed Implementation Plan

#### Step 1: Implement `java.io.Serializable` on AST and Cache classes
Modify the following interfaces and records to include/extend `java.io.Serializable` and `serialVersionUID`:

1. **`com.frees.backend.ast.Expr`**:
   ```java
   public sealed interface Expr extends java.io.Serializable permits ...
   ```
2. **`com.frees.backend.ast.Statement`**:
   ```java
   public sealed interface Statement extends java.io.Serializable permits ...
   ```
3. **`com.frees.backend.ast.ProcStatement`**:
   ```java
   public sealed interface ProcStatement extends java.io.Serializable permits ...
   ```
4. **`com.frees.backend.ast.ProcDef`**:
   ```java
   public sealed interface ProcDef extends java.io.Serializable permits ...
   ```
5. **`com.frees.backend.ast.ProcDef.Curve`**:
   ```java
   public record Curve(Double param, double[] xs, double[] ys) implements java.io.Serializable {
       private static final long serialVersionUID = 1L;
       // ...
   }
   ```
6. **`com.frees.backend.api.SolveContextCache.ReplVar`**:
   ```java
   public record ReplVar(double value, String unit, Double uncertainty) implements java.io.Serializable {
       private static final long serialVersionUID = 1L;
   }
   ```
7. **`com.frees.backend.api.SolveContextCache.Session`**:
   ```java
   public static final class Session implements java.io.Serializable {
       private static final long serialVersionUID = 1L;
       // ... (Keep existing fields/methods, but mark it serializable)
   }
   ```

#### Step 2: Configure Redis in `application.properties`
Add the following lines to `backend/src/main/resources/application.properties`:
```properties
# Spring Data Redis Configuration
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

#### Step 3: Create `RedisConfig.java`
Create the file at `backend/src/main/java/com/frees/backend/config/RedisConfig.java`:
```java
package com.frees.backend.config;

import com.frees.backend.api.SolveContextCache.Session;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.JdkSerializationRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@ConditionalOnBean(RedisConnectionFactory.class)
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Session> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Session> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new JdkSerializationRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new JdkSerializationRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
```

#### Step 4: Refactor `SolveContextCache.java`
Update `SolveContextCache` to inject `RedisTemplate<String, Session>` and interact with Redis:
```java
package com.frees.backend.api;

import com.frees.backend.ast.ProcDef;
import com.frees.backend.units.UnitRegistry;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
public class SolveContextCache {

    public static final String DEFAULT_SESSION = "default";
    private static final long TTL_MILLIS = 60L * 60L * 1000L; // 1 hour

    private final RedisTemplate<String, Session> redisTemplate;

    public SolveContextCache(RedisTemplate<String, Session> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public record ReplVar(double value, String unit, Double uncertainty) implements Serializable {
        private static final long serialVersionUID = 1L;
    }

    public static final class Session implements Serializable {
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
            Map<String, Double> merged = new HashMap<>(siValues);
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

        public void updateTimestamp() {
            this.timestampMillis = System.currentTimeMillis();
        }
    }

    public Session session(String sessionId) {
        String key = redisKey(sessionId);
        Session s = redisTemplate.opsForValue().get(key);
        if (s == null) {
            s = new Session();
        } else {
            s.updateTimestamp();
        }
        redisTemplate.opsForValue().set(key, s, TTL_MILLIS, TimeUnit.MILLISECONDS);
        return s;
    }

    public Session peek(String sessionId) {
        String key = redisKey(sessionId);
        Session s = redisTemplate.opsForValue().get(key);
        if (s != null) {
            s.updateTimestamp();
            redisTemplate.opsForValue().set(key, s, TTL_MILLIS, TimeUnit.MILLISECONDS);
        }
        return s;
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
        s.updateTimestamp();
        redisTemplate.opsForValue().set(redisKey(sessionId), s, TTL_MILLIS, TimeUnit.MILLISECONDS);
    }

    public void clear(String sessionId) {
        redisTemplate.delete(redisKey(sessionId));
    }

    public void save(String sessionId, Session session) {
        session.updateTimestamp();
        redisTemplate.opsForValue().set(redisKey(sessionId), session, TTL_MILLIS, TimeUnit.MILLISECONDS);
    }

    private static String redisKey(String sessionId) {
        return "session:" + key(sessionId);
    }

    private static String key(String sessionId) {
        return (sessionId == null || sessionId.isBlank()) ? DEFAULT_SESSION : sessionId;
    }
}
```

#### Step 5: Update `ReplController.java` to save session modifications
In `backend/src/main/java/com/frees/backend/api/ReplController.java`:
1. In `evaluate` method:
   ```java
   // ... after evaluator.evaluate(request.expression(), session)
   cache.save(request.sessionId(), session);
   ```
2. In `clear` method:
   ```java
   // ... inside if (session != null) after mutations
   cache.save(request.sessionId(), session);
   ```

#### Step 6: Create `TestRedisConfig.java` for offline tests
Create the file at `backend/src/test/java/com/frees/backend/config/TestRedisConfig.java`:
```java
package com.frees.backend.config;

import com.frees.backend.api.SolveContextCache;
import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Configuration
@Profile("!integration")
public class TestRedisConfig {

    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory() {
        return Mockito.mock(RedisConnectionFactory.class);
    }

    @Bean
    @Primary
    public RedisTemplate<String, SolveContextCache.Session> redisTemplate() {
        RedisTemplate<String, SolveContextCache.Session> template = Mockito.mock(RedisTemplate.class);
        ValueOperations<String, SolveContextCache.Session> valueOps = Mockito.mock(ValueOperations.class);
        
        Map<String, SolveContextCache.Session> store = new ConcurrentHashMap<>();
        
        Mockito.when(template.opsForValue()).thenReturn(valueOps);
        
        Mockito.doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return store.get(key);
        }).when(valueOps).get(Mockito.anyString());
        
        Mockito.doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            SolveContextCache.Session session = invocation.getArgument(1);
            store.put(key, session);
            return null;
        }).when(valueOps).set(Mockito.anyString(), Mockito.any());

        Mockito.doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            SolveContextCache.Session session = invocation.getArgument(1);
            store.put(key, session);
            return null;
        }).when(valueOps).set(Mockito.anyString(), Mockito.any(), Mockito.anyLong(), Mockito.any(TimeUnit.class));
        
        Mockito.doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            store.remove(key);
            return true;
        }).when(template).delete(Mockito.anyString());
        
        return template;
    }
}
```

#### Step 7: Update active profiles on integration tests
In `backend/src/test/java/com/frees/backend/integration/AsynchronousComputeIntegrationTest.java`, add the `integration` profile:
```java
@ActiveProfiles({"api", "compute", "integration"})
```

---

## 5. Verification Method

To independently verify the implementation, compile the project and execute the full test suite.

### Commands:
```bash
# Clean and run all backend unit, controller, and integration tests
cd backend
./gradlew clean test
```

### Invalidation Conditions:
Verification fails if:
- Compilation errors occur (e.g. `Serializable` missing on any of the permitting AST records).
- `ReplControllerTest` fails to resolve variables or evaluate expressions correctly w.r.t the cache state (indicates `cache.save` missing/failing).
- Non-integration tests block waiting for a Redis connection or throw connection errors (indicates `TestRedisConfig` was not loaded or primary beans did not override lettuce auto-configuration).
- `AsynchronousComputeIntegrationTest` fails due to mock objects instead of using the live Testcontainers Redis instance (indicates the profile exclusion is misconfigured).
