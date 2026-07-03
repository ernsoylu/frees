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

    @Autowired
    private MeasurementCalcController controller;

    private void expect422(String body, String messageFragment) throws Exception {
        mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error",
                        org.hamcrest.Matchers.containsString(messageFragment)));
    }

    @Test
    void requestValidationErrorsAreTyped() throws Exception {
        String x = inline("x", "step", 3, 0.1, "10");
        expect422("{\"name\":\"c\",\"formula\":\"  \",\"inputs\":[" + x + "]}", "empty");
        expect422("{\"name\":\"c\",\"formula\":\"x + 1\",\"inputs\":["
                + "{\"var\":\"\",\"inline\":{\"t\":[0],\"v\":[1]}}]}", "variable name");
        expect422("{\"name\":\"c\",\"formula\":\"x + 1\",\"inputs\":["
                + "{\"var\":\"x\",\"inline\":{\"t\":[0,1],\"v\":[1]}}]}", "malformed");
        expect422("{\"name\":\"c\",\"formula\":\"1 + 1\",\"inputs\":[]}", "at least one input");
        expect422("{\"name\":\"c\",\"formula\":\"x + 1\",\"inputs\":[" + x
                + "],\"raster\":{\"mode\":\"spline\"}}", "Unknown raster mode");
        expect422("{\"name\":\"c\",\"formula\":\"x + 1\",\"inputs\":[" + x
                + "],\"raster\":{\"mode\":\"fixed\"}}", "dt > 0");
        expect422("{\"name\":\"c\",\"formula\":\"x + 1\",\"inputs\":[" + x
                + "],\"raster\":{\"mode\":\"sameAs\",\"sameAs\":\"nope\"}}", "unknown input");
    }

    @Test
    void unknownMeasurementIdIs404() throws Exception {
        String body = "{\"name\":\"c\",\"formula\":\"x + 1\",\"inputs\":["
                + "{\"var\":\"x\",\"measurementId\":\"gone\",\"channel\":\"speed\"}]}";
        mockMvc.perform(post("/api/measurements/calc")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error",
                        org.hamcrest.Matchers.containsString("re-upload")));
    }

    @Test
    void computeCalcEvaluatesInlineRequestsAndWrapsFailures() {
        MeasurementCalcController.CalcRequest ok = new MeasurementCalcController.CalcRequest(
                "double", "2 * x",
                java.util.List.of(new MeasurementCalcController.CalcInput(
                        "x", null, null, null,
                        new MeasurementCalcController.InlineSeries(
                                new double[]{0, 1, 2}, new double[]{1, 2, 3}),
                        "step")),
                new MeasurementCalcController.RasterSpec("sameAs", null, "x"));
        MeasurementCalcController.CalcResult result = controller.computeCalc(ok);
        assertEquals(3, result.t().length);
        assertEquals(4.0, result.v()[1], 1e-12);

        MeasurementCalcController.CalcRequest bad = new MeasurementCalcController.CalcRequest(
                "broken", "x +* 2", ok.inputs(), null);
        IllegalStateException e = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class, () -> controller.computeCalc(bad));
        assertTrue(e.getMessage().contains("Formula error"), e.getMessage());
    }

    @Test
    void arrayBearingDtosCompareByContent() throws Exception {
        var s1 = new MeasurementCalcController.InlineSeries(new double[]{0, 1}, new double[]{2, 3});
        var s2 = new MeasurementCalcController.InlineSeries(new double[]{0, 1}, new double[]{2, 3});
        assertEquals(s1, s2);
        assertEquals(s1.hashCode(), s2.hashCode());
        assertTrue(s1.toString().contains("n=2"));

        var r1 = new MeasurementCalcController.CalcResult("p", new double[]{0}, new double[]{1});
        var r2 = new MeasurementCalcController.CalcResult("p", new double[]{0}, new double[]{1});
        assertEquals(r1, r2);
        assertEquals(r1.hashCode(), r2.hashCode());
        assertTrue(r1.toString().contains("name=p"));

        var inputs = java.util.Map.of("x", new com.frees.backend.measurement.SampledSeries(
                new double[]{0, 1}, new double[]{1, 2},
                com.frees.backend.measurement.SampledSeries.Interp.STEP));
        var formula = com.frees.backend.measurement.TimeSeriesEvaluator.parseFormula("x + 1");
        var p1 = new MeasurementCalcController.Prepared(formula, new double[]{0, 1}, inputs, false);
        var p2 = new MeasurementCalcController.Prepared(formula, new double[]{0, 1}, inputs, false);
        assertEquals(p1, p2);
        assertEquals(p1.hashCode(), p2.hashCode());
        assertTrue(p1.toString().contains("raster=2"));
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
