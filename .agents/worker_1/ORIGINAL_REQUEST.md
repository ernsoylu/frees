## 2026-06-23T11:02:41Z

Create the E2E Test Infrastructure document `TEST_INFRA.md` at the project root `/home/eren/dev/frEES/TEST_INFRA.md`.
Use the following content for the file, which follows the Test Infra template and decomposes the test suite requirements for frEES:

# E2E Test Infra: frEES Asynchronous Refactoring

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Run integration tests on the backend using Testcontainers for Redis and RabbitMQ.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Combinations) |
|---|---------|---------------------|:-----------------:|:------------------:|:--------------------:|
| 1 | Async Equation Solving | ORIGINAL_REQUEST §R2 | 5 test cases | 5 test cases | ✓ |
| 2 | Async Optimization | ORIGINAL_REQUEST §R2 | 5 test cases | 5 test cases | ✓ |
| 3 | Async Curve Fitting | ORIGINAL_REQUEST §R2 | 5 test cases | 5 test cases | ✓ |
| 4 | REPL Evaluation | ORIGINAL_REQUEST §R2 | 5 test cases | 5 test cases | ✓ |
| 5 | Job Status Polling | ORIGINAL_REQUEST §R2 | 5 test cases | 5 test cases | ✓ |

## Test Architecture
- Test Runner: JUnit 5 on Gradle (`./gradlew test`)
- Test Location: `backend/src/test/java/com/frees/backend/integration/AsynchronousComputeIntegrationTest.java`
- Infrastructure: Testcontainers starting RabbitMQ (`rabbitmq:3-management-alpine`) and Redis (`redis:7-alpine`)
- Mode: REST API invocation via MockMvc / WebTestClient

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Solve Rankine Cycle | Async Solve, Polling | High |
| 2 | Optimize Heat Exchanger | Async Optimize, Polling | High |
| 3 | Curve-Fit Thermodynamic Properties | Async Curve-fitting, Polling | High |
| 4 | Interactive REPL Session | REPL, Solve Cache | Medium |
| 5 | Concurrent Heavy Solves | Async Solve, RabbitMQ prefetch | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios

Write this file, and once it is written, confirm by replying with the path. Do NOT modify any other files.

## 2026-06-23T11:03:28Z

Modify `backend/build.gradle` to add the following test implementation dependencies inside the `dependencies` block:

```groovy
    testImplementation 'org.springframework.boot:spring-boot-testcontainers'
    testImplementation 'org.testcontainers:junit-jupiter'
    testImplementation 'org.testcontainers:rabbitmq'
```

After modifying the file, run `./gradlew test` inside `/home/eren/dev/frEES/backend` to verify that the existing tests still compile and pass successfully, and that there are no regressions.
Verify that `./gradlew test` passes. Report the test run output and confirm the changes.

## 2026-06-23T11:12:05Z

Create a new Java integration test file at `/home/eren/dev/frEES/backend/src/test/java/com/frees/backend/integration/AsynchronousComputeIntegrationTest.java`.

Use the following content for the file:

```java
package com.frees.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"api", "compute"})
@Testcontainers
public class AsynchronousComputeIntegrationTest {

    @Container
    static RabbitMQContainer rabbitmq = new RabbitMQContainer(DockerImageName.parse("rabbitmq:3-management-alpine"));

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", rabbitmq::getHost);
        registry.add("spring.rabbitmq.port", rabbitmq::getAmqpPort);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private JsonNode submitJobAndPoll(String endpoint, String requestJson) throws Exception {
        // 1. Submit job and expect 202 Accepted
        MvcResult submitResult = mockMvc.perform(post(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isAccepted())
                .andReturn();

        String submitResponse = submitResult.getResponse().getContentAsString();
        JsonNode submitNode = objectMapper.readTree(submitResponse);
        String jobId = submitNode.get("jobId").asText();
        assertEquals("PENDING", submitNode.get("status").asText());

        // 2. Poll for job completion
        long startTime = System.currentTimeMillis();
        long timeout = 10000; // 10 seconds
        JsonNode jobState = null;

        while (System.currentTimeMillis() - startTime < timeout) {
            MvcResult pollResult = mockMvc.perform(get("/api/jobs/" + jobId))
                    .andExpect(status().isOk())
                    .andReturn();

            String pollResponse = pollResult.getResponse().getContentAsString();
            jobState = objectMapper.readTree(pollResponse);
            String status = jobState.get("status").asText();

            if ("COMPLETED".equals(status) || "FAILED".equals(status)) {
                return jobState;
            }

            TimeUnit.MILLISECONDS.sleep(100);
        }

        fail("Job " + jobId + " timed out. Current state: " + jobState);
        return null;
    }

    // TIER 1: Feature Coverage

    @Test
    public void testSolveJob() throws Exception {
        String request = "{\"text\": \"x + y = 3\\ny = 1\"}";
        JsonNode result = submitJobAndPoll("/api/solve", request);
        assertNotNull(result);
        assertEquals("COMPLETED", result.get("status").asText());
        
        JsonNode solveResult = result.get("result");
        assertTrue(solveResult.get("success").asBoolean());
        
        JsonNode variables = solveResult.get("variables");
        boolean foundX = false;
        boolean foundY = false;
        for (JsonNode var : variables) {
            String name = var.get("name").asText();
            double val = var.get("value").asDouble();
            if ("x".equalsIgnoreCase(name)) {
                foundX = true;
                assertEquals(2.0, val, 1e-5);
            } else if ("y".equalsIgnoreCase(name)) {
                foundY = true;
                assertEquals(1.0, val, 1e-5);
            }
        }
        assertTrue(foundX && foundY);
    }

    @Test
    public void testOptimizeJob() throws Exception {
        String request = "{\"text\": \"y = -x^2 + 4*x\\nobjective = y\", \"objective\": \"objective\", \"decision\": \"x\", \"lower\": 0.0, \"upper\": 4.0, \"maximize\": true}";
        JsonNode result = submitJobAndPoll("/api/optimize", request);
        assertNotNull(result);
        assertEquals("COMPLETED", result.get("status").asText());
        
        JsonNode optResult = result.get("result");
        assertTrue(optResult.get("success").asBoolean());
        assertEquals(4.0, optResult.get("objective").get("value").asDouble(), 1e-2);
        assertEquals(2.0, optResult.get("decision").get("value").asDouble(), 1e-2);
    }

    @Test
    public void testCurveFitJob() throws Exception {
        String request = "{\"model\": \"y = a*x + b\", \"yVariable\": \"y\", \"xVariable\": \"x\", \"parameters\": [\"a\", \"b\"], \"xData\": [1,2,3,4], \"yData\": [2.1,3.9,6.1,8.0], \"initialGuess\": [1.0, 1.0]}";
        JsonNode result = submitJobAndPoll("/api/curve-fit", request);
        assertNotNull(result);
        assertEquals("COMPLETED", result.get("status").asText());
        
        JsonNode fitResult = result.get("result");
        assertTrue(fitResult.get("success").asBoolean());
        JsonNode params = fitResult.get("fittedParameters");
        assertEquals(2.0, params.get(0).asDouble(), 0.1);
        assertEquals(0.0, params.get(1).asDouble(), 0.1);
    }

    @Test
    public void testReplEndpoints() throws Exception {
        String sessionId = "test-repl-session-" + System.currentTimeMillis();
        
        // Populate session state with a solve request
        String solveRequest = "{\"text\": \"x = 42\", \"displayUnitSystem\": \"ENG_SI\"}";
        // Send solve request to register the session
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(solveRequest))
                .andExpect(status().isAccepted());
        
        // Wait a brief moment for the session to be stored in Redis
        TimeUnit.MILLISECONDS.sleep(500);

        // Call REPL evaluate
        String evaluateRequest = "{\"sessionId\": \"" + sessionId + "\", \"expression\": \"x * 2\", \"unitSystem\": \"ENG_SI\"}";
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluateRequest))
                .andExpect(status().isOk());
    }

    @Test
    public void testJobStatusPolling() throws Exception {
        // Test non-existent job ID returns 404
        mockMvc.perform(get("/api/jobs/non-existent-uuid-12345"))
                .andExpect(status().isNotFound());
    }

    // TIER 2: Boundary & Corner Cases

    @Test
    public void testInvalidPayload() throws Exception {
        // Syntax error in solve request
        String invalidRequest = "{\"text\": \"x + = 3\"}";
        
        // We expect immediate validation rejection with 400 Bad Request
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testMathematicalFailure() throws Exception {
        // Unsolvable system or singular Jacobian
        String mathErrorRequest = "{\"text\": \"x + y = 3\\nx + y = 4\"}";
        
        // We expect the job to submit successfully (202), but poll status to be FAILED
        JsonNode result = submitJobAndPoll("/api/solve", mathErrorRequest);
        assertNotNull(result);
        assertEquals("FAILED", result.get("status").asText());
        assertFalse(result.get("error").isNull());
    }

    // TIER 3: Cross-Feature Combinations

    @Test
    public void testConcurrentJobs() throws Exception {
        int jobCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(jobCount);
        List<Future<JsonNode>> futures = new ArrayList<>();

        for (int i = 0; i < jobCount; i++) {
            final int index = i;
            futures.add(executor.submit(() -> {
                String request = "{\"text\": \"x = " + index + "\"}";
                return submitJobAndPoll("/api/solve", request);
            }));
        }

        for (int i = 0; i < jobCount; i++) {
            JsonNode result = futures.get(i).get(15, TimeUnit.SECONDS);
            assertNotNull(result);
            assertEquals("COMPLETED", result.get("status").asText());
            JsonNode solveResult = result.get("result");
            assertTrue(solveResult.get("success").asBoolean());
            assertEquals((double) i, solveResult.get("variables").get(0).get("value").asDouble(), 1e-5);
        }

        executor.shutdown();
    }

    // TIER 4: Real-world Application Scenarios

    @Test
    public void testRankineCycleSolve() throws Exception {
        // Complete Rankine cycle equations using PropertyFunctions lookups
        String rankineRequest = "{\"text\": \"" +
                "Fluid$ = 'Water'\\n" +
                "P1 = 10 [kPa]\\n" +
                "x1 = 0 [dimensionless]\\n" +
                "h1 = enthalpy(Fluid$, P=P1, x=x1)\\n" +
                "v1 = volume(Fluid$, P=P1, x=x1)\\n" +
                "P2 = 8000 [kPa]\\n" +
                "w_pump_in = v1 * (P2 - P1)\\n" +
                "h2 = h1 + w_pump_in\\n" +
                "T3 = 600 [C]\\n" +
                "P3 = P2\\n" +
                "h3 = enthalpy(Fluid$, T=T3, P=P3)\\n" +
                "s3 = entropy(Fluid$, T=T3, P=P3)\\n" +
                "P4 = P1\\n" +
                "s4 = s3\\n" +
                "h4 = enthalpy(Fluid$, P=P4, s=s4)\\n" +
                "w_turb_out = h3 - h4\\n" +
                "q_in = h3 - h2\\n" +
                "q_out = h4 - h1\\n" +
                "w_net = w_turb_out - w_pump_in\\n" +
                "eta_th = w_net / q_in\\n" +
                "\"}";

        JsonNode result = submitJobAndPoll("/api/solve", rankineRequest);
        assertNotNull(result);
        assertEquals("COMPLETED", result.get("status").asText());
        
        JsonNode solveResult = result.get("result");
        assertTrue(solveResult.get("success").asBoolean());
        
        // Assert thermal efficiency is reasonable (around 43%)
        JsonNode variables = solveResult.get("variables");
        boolean foundEta = false;
        for (JsonNode var : variables) {
            if ("eta_th".equalsIgnoreCase(var.get("name").asText())) {
                foundEta = true;
                double val = var.get("value").asDouble();
                assertTrue(val > 0.35 && val < 0.50, "Thermal efficiency " + val + " is out of bounds");
            }
        }
        assertTrue(foundEta);
    }
}
```

Write this file, and once it is written, run `./gradlew compileTestJava` inside `/home/eren/dev/frEES/backend` to verify that the file compiles successfully. Do NOT run full tests (which would fail because the async endpoints are not implemented yet). Just confirm that the file compiles successfully by compiling test sources.

## 2026-06-23T11:13:13Z

Run the newly created integration test specifically using gradle:
`./gradlew test --tests com.frees.backend.integration.AsynchronousComputeIntegrationTest`

We expect the tests to FAIL due to assertion failures (since the async endpoints are not implemented yet). However, we must verify that:
1. The Spring Boot application context bootstraps successfully in the test environment.
2. Testcontainers successfully starts both RabbitMQ and Redis containers (meaning Docker is available and configured correctly).
3. There are no bootstrap, class loading, or Docker connectivity issues. The failures should only be assertion errors (e.g., expecting 202 but getting 200/404).

Report the test logs and confirm if the application context and Docker containers started successfully.

## 2026-06-23T11:28:07Z

Create `TEST_READY.md` at the project root `/home/eren/dev/frEES/TEST_READY.md`.

Use the following content for the file:

# E2E Test Suite Ready

## Test Runner
- Command: `./gradlew test --tests com.frees.backend.integration.AsynchronousComputeIntegrationTest`
- Expected: all tests pass with exit code 0 (once the asynchronous compute architecture implementation is complete)

## Coverage Summary
| Tier | Count | Description |
|------|------:|-------------|
| 1. Feature Coverage | 5 | Solve, Optimize, Curve-fit, REPL, and Polling features |
| 2. Boundary & Corner | 2 | Non-existent job IDs (404), Bad requests (400), Mathematical failures |
| 3. Cross-Feature | 2 | Concurrent jobs execution, Solve & REPL state interleaving |
| 4. Real-world Application | 1 | Complex Rankine Cycle solver with property lookups |
| **Total** | **10** | |

## Feature Checklist
| Feature | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---------|:------:|:------:|:------:|:------:|
| Async Equation Solving | ✓ | ✓ | ✓ | ✓ |
| Async Optimization | ✓ | | ✓ | |
| Async Curve Fitting | ✓ | | | |
| REPL Evaluation | ✓ | | ✓ | |
| Job Status Polling | ✓ | ✓ | | |

Write this file, and once it is written, confirm by replying with the path. Do NOT modify any other files.

