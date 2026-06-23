# Initial Codebase Explorer Handoff Report

This report documents the findings and architectural mapping of the existing Spring Boot backend in preparation for refactoring it into a decoupled asynchronous system using RabbitMQ and Redis.

---

## 1. Observation

### Key Files and Paths
*   **Controllers & API Support**:
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/SolveController.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/OptimizeController.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/CheckController.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/ReplController.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/SolverApiSupport.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/SolveDtos.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/CyclePathResolver.java`
*   **Context Caching**:
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/api/SolveContextCache.java`
*   **Solvers & Core Mathematics**:
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/core/EquationSystemSolver.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/core/NewtonSolver.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/core/Optimizer.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/core/MultiObjectiveOptimizer.java`
    *   `/home/eren/dev/frEES/backend/src/main/java/com/frees/backend/core/CurveFitter.java`
*   **Test Suite**:
    *   `/home/eren/dev/frEES/backend/src/test/java/com/frees/backend/api/SolveControllerTest.java`
    *   `/home/eren/dev/frEES/backend/src/test/java/com/frees/backend/api/ReplControllerTest.java`
    *   `/home/eren/dev/frEES/backend/src/test/java/com/frees/backend/api/PlotControllerTest.java`
*   **Configuration & Build**:
    *   `/home/eren/dev/frEES/backend/build.gradle`
    *   `/home/eren/dev/frEES/backend/src/main/resources/application.properties`

### Verbatim Gradle Build Failure
Running `./gradlew check` inside `/home/eren/dev/frEES/backend` failed with:
```
FAILURE: Build failed with an exception.

* Where:
Build file '/home/eren/dev/frEES/backend/build.gradle' line: 42

* What went wrong:
A problem occurred evaluating root project 'frees-backend'.
> Could not find method dependencyManagement() for arguments [build_ey07y51t92ftxvpdmi9uw77bj$_run_closure5@23b9b0ac] on root project 'frees-backend' of type org.gradle.api.Project.
```

### Existing Gradle Dependencies
In `/home/eren/dev/frEES/backend/build.gradle`, the dependencies block includes:
```groovy
dependencies {
    antlr 'org.antlr:antlr4:4.13.2'

    implementation platform('org.springframework.boot:spring-boot-dependencies:3.5.6')
    implementation 'org.springframework.boot:spring-boot-starter-web'
    
    // Asynchronous Compute Architecture
    implementation 'org.springframework.boot:spring-boot-starter-amqp'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    
    // OpenTelemetry
    implementation 'io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter'

    implementation 'org.antlr:antlr4-runtime:4.13.2'
    implementation 'org.jgrapht:jgrapht-core:1.5.2'
    implementation 'org.apache.commons:commons-math3:3.6.1'
    implementation 'net.java.dev.jna:jna:5.14.0'
    implementation 'org.apache.xmlgraphics:fop-transcoder:2.11'
    // Symja (matheclipse): pure-Java computer algebra system powering the CAS
    // directives (factor/expand/simplify; later solve/integrate).
    implementation 'org.matheclipse:matheclipse-core:3.0.0'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

### Existing Application Configuration
In `/home/eren/dev/frEES/backend/src/main/resources/application.properties`:
```properties
server.port=${PORT:8080}
spring.application.name=frees-backend

# DoS guards on /api (see RequestGuardFilter). Override per deployment.
frees.security.max-body-bytes=1048576
frees.security.rate-limit-requests=120
frees.security.rate-limit-window-seconds=60
```

---

## 2. Logic Chain

### Current Operations
1.  **Solve Paths**: `SolveController` implements two main endpoints:
    *   `POST /api/solve` accepts a `SolveRequest` (contains the raw equation markdown text, variable definitions, and display settings) and calls `EquationSystemSolver.solve()` or `solveAll()` synchronously.
    *   `POST /api/solve/table` accepts a `SolveTableRequest` and solves parametric rows sequentially or iteratively (if accessors are present, it runs a Gauss-Seidel fixed-point convergence loop up to 12 passes).
2.  **Optimize Paths**: `OptimizeController` implements three main endpoints:
    *   `POST /api/optimize` solves single-objective bound-constrained optimization using univariate Brent's method, Nelder-Mead Simplex, or BOBYQA. It runs up to 2,000 evaluations where each evaluation solves the full system equation set.
    *   `POST /api/optimize/multi` solves multi-objective optimization using the NSGA-II genetic algorithm (population size 40-200 over 40-200 generations, meaning up to 40,000 evaluations).
    *   `POST /api/curve-fit` fits model parameters to x/y data using Levenberg-Marquardt least-squares optimization.
3.  **State Management**: `SolveContextCache` stores the results of the last successful solve per session ID in-memory:
    *   It maps `sessionId` (representing a browser tab/document) to a `Session` object containing variable values, display configurations, parsed function/table definitions (`Map<String, ProcDef>`), and live REPL variable overlays.
    *   `ReplController` reads from this cache to evaluate terminal commands (`/api/repl/evaluate`) and perform auto-completion.

### Core Problems
*   **Request Blocking**: Heavy numeric iterations (NSGA-II generations, parametric tables, long-running Newton solves) block Tomcat web server threads synchronously.
*   **State Locking**: Because `SolveContextCache` uses an in-memory ConcurrentHashMap, scaled backends with multiple node replicas cannot route REPL requests correctly unless sticky sessions are configured. Furthermore, when nodes are restarted, all REPL history and document solve state are lost.
*   **Build System Failure**: The `build.gradle` file uses the `dependencyManagement` block to import a BOM without declaring the `io.spring.dependency-management` plugin. Consequently, Gradle fails immediately on compilation.

---

## 3. Caveats

*   **No Persistent DB**: The application currently has no database schema (stateless design apart from the session cache).
*   **AST Serialization**: Storing `SolveContextCache` sessions in Redis will require serializing the Abstract Syntax Tree (AST) nodes like `ProcDef`, `Expr`, `Statement`, and `ProcStatement`. None of these records/interfaces currently implement `java.io.Serializable`. However, because they are pure data structures made of records, they can easily be made serializable by having their parent interfaces extend `java.io.Serializable`.
*   **Native library caching**: `CoolProp` has a static in-memory `PROPS_CACHE` used for diagram curve sweeps. Since the calculations are pure functions of fluid properties, it is safe and performant to keep this cache JVM-local to avoid network lookup overheads.

---

## 4. Conclusion

### Proposed Decoupled Asynchronous Architecture
1.  **Job Queuing**:
    *   Transition `POST /api/solve` and `POST /api/optimize/*` to asynchronous endpoints.
    *   When a request arrives, generate a unique `jobId` (UUID), submit a JSON task payload to RabbitMQ (e.g., `solve-jobs` or `optimize-jobs` queue), write a job record to Redis (`job:<jobId>` with status `PENDING`), and return `202 Accepted` with the `jobId`.
    *   Expose `GET /api/jobs/{jobId}` to allow the client to poll for status and retrieve final results when completed.
2.  **Background Workers**:
    *   A pool of asynchronous message consumers will pull tasks from RabbitMQ, call the core solver routines, and write the final result/error back to Redis under the `job:<jobId>` key.
3.  **Redis-Backed Cache**:
    *   Migrate `SolveContextCache` to utilize Redis.
    *   Store session data under `session:<sessionId>` keys.
    *   Update AST interfaces to extend `java.io.Serializable` to enable standard Redis JDK/JSON serialization.

### Gradle Configuration Fix
Apply the `io.spring.dependency-management` plugin to `build.gradle` to resolve the immediate build failure.

---

## 5. Verification Method

### Testing Gradle Configuration Fix
1.  Apply the following patch to `/home/eren/dev/frEES/backend/build.gradle`:
    ```diff
    plugins {
        id 'java'
        id 'antlr'
        id 'jacoco'
        id 'org.springframework.boot' version '3.5.6'
    +   id 'io.spring.dependency-management' version '1.1.7'
        id 'org.sonarqube' version '7.3.1.8318'
    }
    ```
2.  Run the tests using the Gradle wrapper:
    ```bash
    cd /home/eren/dev/frEES/backend
    ./gradlew check
    ```
3.  Invalidation condition: If `./gradlew check` still fails with DSL errors or test failures, verify the plugin version and dependencies configuration.
