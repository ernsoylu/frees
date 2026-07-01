package com.frees.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.rabbitmq.RabbitMQContainer;
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

    // TIER 4 continued: async paths for the remaining compute endpoints.

    @Test
    public void testSolveTableJob() throws Exception {
        // A parametric solve table: x is fixed per row, y solved.
        String request = "{\"text\": \"y = 2 * x\", \"table\": {\"variables\": [\"x\"], "
                + "\"rows\": [{\"x\": 1.0}, {\"x\": 2.0}, {\"x\": 3.0}]}}";
        JsonNode result = submitJobAndPoll("/api/solve/table", request);
        assertNotNull(result);
        assertEquals("COMPLETED", result.get("status").asText());

        JsonNode tableResult = result.get("result");
        JsonNode rows = tableResult.get("results");
        assertEquals(3, rows.size());
        for (int i = 0; i < 3; i++) {
            assertTrue(rows.get(i).get("success").asBoolean(),
                    "row " + i + " should solve");
            double x = i + 1;
            assertEquals(2 * x, rows.get(i).get("values").get("y").asDouble(), 1e-5);
        }
        assertEquals(3, tableResult.get("stats").get("solved").asInt());
    }

    @Test
    public void testOptimizeMultiJob() throws Exception {
        // Two objectives on one decision — the Pareto front is non-trivial.
        String request = "{\"text\": \"f1 = x\\nf2 = (x - 2)^2\", "
                + "\"objectives\": [\"f1\", \"f2\"], \"maximize\": [true, false], "
                + "\"decisions\": [\"x\"], \"lowers\": [0.0], \"uppers\": [2.0], "
                + "\"populationSize\": 20, \"generations\": 20}";
        JsonNode result = submitJobAndPoll("/api/optimize/multi", request);
        assertNotNull(result);
        assertEquals("COMPLETED", result.get("status").asText());

        JsonNode paretoResult = result.get("result");
        assertTrue(paretoResult.get("front").isArray());
        assertFalse(paretoResult.get("front").isEmpty(),
                "Pareto front should contain at least one point");
    }
}
