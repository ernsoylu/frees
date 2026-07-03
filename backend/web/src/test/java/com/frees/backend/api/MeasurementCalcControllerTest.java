package com.frees.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Calculated-signal endpoint tests (todo.md Phase 4 web tests). */
@SpringBootTest
@AutoConfigureMockMvc
class MeasurementCalcControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static String inline(String var, String interp, int n, double dt, String vExpr) {
        StringBuilder t = new StringBuilder();
        StringBuilder v = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) {
                t.append(',');
                v.append(',');
            }
            double time = i * dt;
            t.append(time);
            v.append(switch (vExpr) {
                case "2t" -> 2 * time;
                case "10" -> 10.0;
                default -> time;
            });
        }
        return "{\"var\":\"" + var + "\",\"interp\":\"" + interp
                + "\",\"inline\":{\"t\":[" + t + "],\"v\":[" + v + "]}}";
    }

    @Test
    void inlineCalcOnMergedRaster() throws Exception {
        String body = "{\"name\":\"p_kw\",\"formula\":\"tq * w / 1000\",\"inputs\":["
                + inline("tq", "linear", 101, 0.01, "2t") + ","
                + inline("w", "linear", 101, 0.01, "10")
                + "],\"raster\":{\"mode\":\"merge\"}}";
        String resp = mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("p_kw"))
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(resp);
        assertEquals(101, node.get("t").size());
        // At t = 0.5: tq = 1.0, w = 10 → 0.01.
        assertEquals(0.01, node.get("v").get(50).asDouble(), 1e-12);
    }

    @Test
    void overCapReturnsTypedErrorWithCompliantSuggestedDt() throws Exception {
        // A formula WITH a function call gets the 100k cap; send a 150k-point
        // inline series (sameAs raster) to trip it.
        StringBuilder t = new StringBuilder();
        StringBuilder v = new StringBuilder();
        for (int i = 0; i < 150_000; i++) {
            if (i > 0) {
                t.append(',');
                v.append(',');
            }
            t.append(i * 0.001);
            v.append(1);
        }
        String body = "{\"name\":\"c\",\"formula\":\"abs(x)\",\"inputs\":[{\"var\":\"x\",\"interp\":\"step\",\"inline\":{\"t\":["
                + t + "],\"v\":[" + v + "]}}],\"raster\":{\"mode\":\"sameAs\",\"sameAs\":\"x\"}}";
        String resp = mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RASTER_CAP_EXCEEDED"))
                .andExpect(jsonPath("$.actualPoints").value(150_000))
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(resp);
        double dt = node.get("suggestedDt").asDouble();
        long points = (long) Math.floor(149.999 / dt) + 1;
        assertTrue(points <= MeasurementCalcController.MAX_RASTER_WITH_CALLS,
                "suggested dt yields " + points);
    }

    @Test
    void formulaAndBindingErrorsAreTyped() throws Exception {
        String bad = "{\"name\":\"c\",\"formula\":\"x +* 2\",\"inputs\":["
                + inline("x", "step", 3, 0.1, "10") + "],\"raster\":{\"mode\":\"merge\"}}";
        mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").exists());

        String unbound = "{\"name\":\"c\",\"formula\":\"x + y\",\"inputs\":["
                + inline("x", "step", 3, 0.1, "10") + "],\"raster\":{\"mode\":\"merge\"}}";
        mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(unbound))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error", org.hamcrest.Matchers.containsString("y")));
    }

    @Test
    void fixedRasterAndTimeOpsWork() throws Exception {
        String body = "{\"name\":\"d\",\"formula\":\"integral(x)\",\"inputs\":["
                + inline("x", "linear", 101, 0.01, "10")
                + "],\"raster\":{\"mode\":\"fixed\",\"dt\":0.1}}";
        String resp = mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(resp);
        assertEquals(11, node.get("t").size());
        // ∫10 dt over [0, 1] = 10 at the last point.
        assertEquals(10.0, node.get("v").get(10).asDouble(), 1e-9);
    }
}
