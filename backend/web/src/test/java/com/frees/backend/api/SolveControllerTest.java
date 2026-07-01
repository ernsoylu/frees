package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SolveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void clampsClientSuppliedSolveBudget() {
        // DoS guard: a client cannot request an unbounded solve budget.
        SolverApiSupport.StopCriteriaDto greedy =
                new SolverApiSupport.StopCriteriaDto(10_000_000, null, null, 99_999.0, null);
        var settings = greedy.toSettings();
        org.junit.jupiter.api.Assertions.assertEquals(
                SolverApiSupport.MAX_ITERATIONS_CAP, settings.maxIterations());
        org.junit.jupiter.api.Assertions.assertEquals(
                SolverApiSupport.MAX_ELAPSED_SECONDS_CAP, settings.elapsedTimeSeconds(), 1e-9);
    }

    @Test
    void rejectsOversizedLoopOverRest() throws Exception {
        // A tiny request that would expand to ~100M equations is rejected, not
        // allowed to exhaust memory.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"FOR i = 1 TO 100000000\\n  x[i] = i\\nEND\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void solvesMilestoneSystemOverRest() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x+y=3\\ny=z-4\\nz=x^2-3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[0].name").value("x"))
                .andExpect(jsonPath("$.variables[0].value").value(
                        org.hamcrest.Matchers.closeTo(2.7015621187164243, 1e-6)))
                .andExpect(jsonPath("$.stats.equations").value(3))
                .andExpect(jsonPath("$.stats.unknowns").value(3))
                .andExpect(jsonPath("$.stats.blocks").value(1));
    }

    @Test
    void solveEchoesCodeDefinedTables() throws Exception {
        // A TABLE block in the editor text is callable and echoed back so the
        // frontend can show it in the Tables window.
        String text = "TABLE fanPressure(rpm)\\n  1000  120\\n  2000  310\\n  3000  560\\nEND\\ndP = fanPressure(2500)";
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"" + text + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.codeTables[0].name").value("fanpressure"))
                .andExpect(jsonPath("$.codeTables[0].argNames[0]").value("rpm"))
                .andExpect(jsonPath("$.codeTables[0].curves[0].points.length()").value(3));
    }

    @Test
    void hidesMatrixLibraryHelperTemporariesFromSolution() throws Exception {
        // x = Inverse(A) * b: the inverse appears inside an expression, so the
        // compiler materializes inverse_temp_* helper unknowns. They are solver
        // internals and must not surface in the user-facing variable list.
        String text = "A = [3 4 5; 3 2 1; 4 1 2]\\nb = [3;2;1]\\nx = Inverse(A) * b";
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"" + text + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[*].name",
                        org.hamcrest.Matchers.everyItem(
                                org.hamcrest.Matchers.not(
                                        org.hamcrest.Matchers.containsString("inverse_temp")))))
                .andExpect(jsonPath("$.variables[*].name",
                        org.hamcrest.Matchers.hasItem("x[1]")));
    }

    @Test
    void checkEchoesCodeDefinedTables() throws Exception {
        String text = "TABLE htc(re : t = 100, 200)\\n  0   0   0\\n  10  10  30\\nEND\\nU = htc(5, 150)";
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"" + text + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codeTables[0].name").value("htc"))
                .andExpect(jsonPath("$.codeTables[0].argNames[1]").value("t"))
                .andExpect(jsonPath("$.codeTables[0].curves.length()").value(2));
    }

    @Test
    void checkEchoesParametricTables() throws Exception {
        // A PARAMETRIC block defines a run-table that the frontend renders;
        // it must not pollute the main equation system.
        String text = "PARAMETRIC sweep1 (T_in, mdot)\\n  T_in = 300:10:320\\n  mdot = [0.1, 0.2, 0.4]\\nEND\\nQ = mdot * 4180 * (T_in - 290)";
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"" + text + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parametricTables[0].name").value("sweep1"))
                .andExpect(jsonPath("$.parametricTables[0].vars[0]").value("T_in"))
                .andExpect(jsonPath("$.parametricTables[0].rows.length()").value(3))
                .andExpect(jsonPath("$.parametricTables[0].rows[2][0]").value(320.0));
    }

    @Test
    void rangeAssignmentSurvivesMarkdownExtraction() throws Exception {
        // The range line must reach the parser (not be dropped as prose).
        String text = "speed = 0:10:100 | Linear\\ntop = speed[11]";
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"" + text + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[?(@.name == 'top')].value")
                        .value(org.hamcrest.Matchers.contains(
                                org.hamcrest.Matchers.closeTo(100.0, 1e-6))));
    }

    @Test
    void reportsSyntaxErrorsAsBadRequest() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + = 3\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void solveResponseCarriesSiUnitsIncludingDerived() throws Exception {
        // SI everywhere: 100 bar -> 1e7 Pa; F = P*A derives N = 240000.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\\nA = 0.024 [m^2]\\nF = P * A\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[0].name").value("A"))
                .andExpect(jsonPath("$.variables[0].units").value("m^2"))
                .andExpect(jsonPath("$.variables[1].name").value("F"))
                .andExpect(jsonPath("$.variables[1].value").value(
                        org.hamcrest.Matchers.closeTo(240000.0, 1e-3)))
                .andExpect(jsonPath("$.variables[1].units").value("N"))
                .andExpect(jsonPath("$.variables[2].value").value(
                        org.hamcrest.Matchers.closeTo(1.0e7, 1e-3)))
                .andExpect(jsonPath("$.variables[2].units").value("Pa"));
    }

    @Test
    void displayUnitSystemConvertsResults() throws Exception {
        // Computed in SI (1e7 Pa); displayed per the requested system.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\\nA = 0.024 [m^2]\\nF = P * A\","
                                + "\"displayUnitSystem\": \"ENG_SI\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[2].name").value("P"))
                .andExpect(jsonPath("$.variables[2].value").value(
                        org.hamcrest.Matchers.closeTo(10000.0, 1e-6)))
                .andExpect(jsonPath("$.variables[2].units").value("kPa"));

        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\\nA = 0.024 [m^2]\\nF = P * A\","
                                + "\"displayUnitSystem\": \"ENGLISH\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[1].units").value("lbf"))
                .andExpect(jsonPath("$.variables[2].value").value(
                        org.hamcrest.Matchers.closeTo(1450.377377, 1e-4)))
                .andExpect(jsonPath("$.variables[2].units").value("psi"));
    }

    @Test
    void declaredNonSiUnitsDisplayConverted() throws Exception {
        // SI default: P computed as 1e7 Pa but declared in bar -> shown as 100 bar.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\","
                                + "\"variableInfo\": [{\"name\":\"P\",\"units\":\"bar\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[0].value").value(
                        org.hamcrest.Matchers.closeTo(100.0, 1e-6)))
                .andExpect(jsonPath("$.variables[0].units").value("bar"));
    }

    @Test
    void convertsBoundsAndGuessesForTemperatureToSi() throws Exception {
        // T_1 is solved at 100 [C] (373.15 K). We specify bounds [0, 250] in Celsius.
        // If they were not converted, the solver would check bounds [0, 250] w.r.t Kelvin,
        // and 373.15 K would exceed the upper bound of 250, causing solver failure or incorrect clamping.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T_1 = 100 [C]\","
                                + "\"variableInfo\": [{\"name\":\"T_1\",\"units\":\"C\",\"lower\":0.0,\"upper\":250.0}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[0].value").value(
                        org.hamcrest.Matchers.closeTo(100.0, 1e-6)))
                .andExpect(jsonPath("$.variables[0].units").value("C"));
    }

    @Test
    void checkEndpointReportsSolvableSystem() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x+y=3\\ny=z-4\\nz=x^2-3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(true))
                .andExpect(jsonPath("$.equations").value(3))
                .andExpect(jsonPath("$.unknowns").value(3));
    }

    @Test
    void checkEndpointReportsUnderspecifiedSystem() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + y = 3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(false))
                .andExpect(jsonPath("$.equations").value(1))
                .andExpect(jsonPath("$.unknowns").value(2));
    }

    @Test
    void checkEndpointReportsFirstSyntaxError() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + = 3\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.solvable").value(false));
    }

    @Test
    void reportsSolverErrorsAsUnprocessable() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + y = 3\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void solvesParametricTable() throws Exception {
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"I = V / R_1\","
                                + "\"table\": {"
                                + "  \"variables\": [\"V\", \"R_1\", \"I\"],"
                                + "  \"rows\": ["
                                + "    {\"V\": 30.0, \"R_1\": 120.0},"
                                + "    {\"V\": 60.0, \"R_1\": 120.0}"
                                + "  ]"
                                + "}"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(true))
                .andExpect(jsonPath("$.results[0].values.I").value(0.25))
                .andExpect(jsonPath("$.results[1].success").value(true))
                .andExpect(jsonPath("$.results[1].values.I").value(0.5));
    }

    @Test
    void multiObjectiveOptimizationReturnsParetoFront() throws Exception {
        mockMvc.perform(post("/api/optimize/multi")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"f1 = x^2\\nf2 = (x - 2)^2\","
                                + "\"objectives\": [\"f1\", \"f2\"],"
                                + "\"maximize\": [false, false],"
                                + "\"decisions\": [\"x\"],"
                                + "\"lowers\": [-1.0],"
                                + "\"uppers\": [3.0],"
                                + "\"populationSize\": 40,"
                                + "\"generations\": 40"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.objectiveNames[0]").value("f1"))
                .andExpect(jsonPath("$.front").isNotEmpty())
                .andExpect(jsonPath("$.front[0].decisions[0]").exists())
                .andExpect(jsonPath("$.front[0].objectives[0]").exists());
    }

    @Test
    void multiObjectiveRejectsSingleObjective() throws Exception {
        mockMvc.perform(post("/api/optimize/multi")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"f1 = x^2\", \"objectives\": [\"f1\"],"
                                + " \"decisions\": [\"x\"], \"lowers\": [0.0], \"uppers\": [1.0]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void parametricAccessorsResolveAcrossRows() throws Exception {
        // A driving-cycle style table: P computed per row, total energy E is the
        // trapezoid integral of P over t — an aggregate of every row, resolved by
        // the table-wide fixed-point pass. E = 0.5*(0+10) + 0.5*(10+20) = 20.
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"P = v\\nE = IntegralValue('P', 't')\\nS = TableSum('P')\","
                                + "\"table\": {"
                                + "  \"variables\": [\"t\", \"v\", \"P\", \"E\", \"S\"],"
                                + "  \"rows\": ["
                                + "    {\"t\": 0.0, \"v\": 0.0},"
                                + "    {\"t\": 1.0, \"v\": 10.0},"
                                + "    {\"t\": 2.0, \"v\": 20.0}"
                                + "  ]"
                                + "}"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(true))
                .andExpect(jsonPath("$.results[0].values.E").value(20.0))
                .andExpect(jsonPath("$.results[0].values.S").value(30.0))
                .andExpect(jsonPath("$.results[2].values.E").value(20.0))
                .andExpect(jsonPath("$.results[2].values.P").value(20.0));
    }

    @Test
    void automaticallyResolvesMissingStatePropertiesFromBackground() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 373.15\\nP[1] = 101325\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[?(@.name == 'T[1]')].value").value(373.15))
                .andExpect(jsonPath("$.variables[?(@.name == 'P[1]')].value").value(101325.0))
                .andExpect(jsonPath("$.variables[?(@.name == 'h[1]')].value").exists())
                .andExpect(jsonPath("$.variables[?(@.name == 's[1]')].value").exists())
                .andExpect(jsonPath("$.variables[?(@.name == 'v[1]')].value").exists());
    }

    @Test
    void optimizesSingleVariableProblem() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"y = (x - 3)^2 + 4\","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"lower\": 0.0,"
                                + "\"upper\": 10.0,"
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.objective.name").value("y"))
                .andExpect(jsonPath("$.objective.value").value(org.hamcrest.Matchers.closeTo(4.0, 1e-3)))
                .andExpect(jsonPath("$.decision.name").value("x"))
                .andExpect(jsonPath("$.decision.value").value(org.hamcrest.Matchers.closeTo(3.0, 1e-3)));
    }

    @Test
    void optimizesMultiVariableProblem() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"f = (x - 1)^2 + (y - 2)^2 + 3\","
                                + "\"objective\": \"f\","
                                + "\"decisions\": [\"x\", \"y\"],"
                                + "\"lowers\": [-5.0, -5.0],"
                                + "\"uppers\": [5.0, 5.0],"
                                + "\"maximize\": false,"
                                + "\"method\": \"simplex\""
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.objective.name").value("f"))
                .andExpect(jsonPath("$.objective.value").value(org.hamcrest.Matchers.closeTo(3.0, 1e-3)))
                .andExpect(jsonPath("$.decisions[0].name").value("x"))
                .andExpect(jsonPath("$.decisions[0].value").value(org.hamcrest.Matchers.closeTo(1.0, 1e-3)))
                .andExpect(jsonPath("$.decisions[1].name").value("y"))
                .andExpect(jsonPath("$.decisions[1].value").value(org.hamcrest.Matchers.closeTo(2.0, 1e-3)));
    }

    @Test
    void customStopCriteriaAreApplied() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x = 2 + 2\","
                                + "\"stopCriteria\": {\"maxIterations\": 100,"
                                + "\"relativeResiduals\": 1e-8,"
                                + "\"changeInVariables\": 1e-10,"
                                + "\"elapsedTimeSeconds\": 60,"
                                + "\"complexMode\": false}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[0].value").value(4.0));
    }

    @Test
    void unknownDisplayUnitSystemFallsBackToSi() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\","
                                + "\"displayUnitSystem\": \"NOT_A_SYSTEM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[0].units").value("Pa"));
    }

    @Test
    void unknownDeclaredUnitIsEchoedUnconverted() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x = 5\","
                                + "\"variableInfo\": [{\"name\":\"x\",\"units\":\"widgets\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[0].value").value(5.0))
                .andExpect(jsonPath("$.variables[0].units").value("widgets"));
    }

    @Test
    void checkEndpointRejectsBlankText() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("No equations entered."));
    }

    @Test
    void tableEndpointValidatesBlankTextAndMissingTable() throws Exception {
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"I = V / R\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void tableEndpointReportsFailedRows() throws Exception {
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"x = 4\","
                                + "\"table\": {"
                                + "  \"variables\": [\"x\"],"
                                + "  \"rows\": [{\"x\": 5.0}]"
                                + "}"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(false))
                .andExpect(jsonPath("$.stats.failed").value(1));
    }

    @Test
    void optimizeEndpointRequiresBounds() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"y = (x - 3)^2 + 4\","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        "Both bounds of the independent variable are required."));
    }

    @Test
    void cyclePathInterpolatesIsobaricSegments() throws Exception {
        // Two states on the same isobar: both segments interpolate at
        // constant pressure over the entropy span.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 400\\nP[1] = 101325\\n"
                                + "T[2] = 500\\nP[2] = 101325\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isNotEmpty())
                .andExpect(jsonPath("$.cyclePath[0].P").value(
                        org.hamcrest.Matchers.closeTo(101325.0, 1.0)));
    }

    @Test
    void cyclePathInterpolatesIsentropicSegments() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P[1] = 100000\\ns[1] = 7000\\n"
                                + "P[2] = 400000\\ns[2] = 7000\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isNotEmpty());
    }

    @Test
    void cyclePathInterpolatesIsothermalSegments() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 500\\ns[1] = 7000\\n"
                                + "T[2] = 500\\ns[2] = 7600\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isNotEmpty());
    }

    @Test
    void cyclePathInterpolatesIsenthalpicSegments() throws Exception {
        // Throttling: equal enthalpies at different pressures.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P[1] = 1000000\\nh[1] = 2800000\\n"
                                + "P[2] = 100000\\nh[2] = 2800000\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isNotEmpty());
    }

    @Test
    void cyclePathInterpolatesIsochoricSegments() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 400\\nv[1] = 0.2\\n"
                                + "T[2] = 500\\nv[2] = 0.2\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isNotEmpty());
    }

    @Test
    void cyclePathFallsBackToLinearInterpolation() throws Exception {
        // Nothing is held constant between the states: every property
        // interpolates linearly.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 300\\nP[1] = 100000\\n"
                                + "T[2] = 450\\nP[2] = 300000\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isNotEmpty());
    }

    @Test
    void singleStateProducesNoCyclePath() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 400\\nP[1] = 101325\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.cyclePath").isEmpty());
    }

    @Test
    void solvesWithFunctionTable() throws Exception {
        // A Function Table named "htc" with curves at T = 100 and T = 200:
        // the table name is the function, called as htc(Re, T).
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"Re = 5\\nT = 150\\nU = htc(Re, T)\","
                                + "\"functionTables\": [{"
                                + "  \"name\": \"htc\","
                                + "  \"argNames\": [\"Re\", \"T\"],"
                                + "  \"curves\": ["
                                + "    {\"param\": 100, \"points\": [[0, 0], [10, 10]]},"
                                + "    {\"param\": 200, \"points\": [[0, 0], [10, 30]]}"
                                + "  ]"
                                + "}]"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[?(@.name == 'U')].value").value(10.0));
    }

    @Test
    void checkEndpointAcceptsFunctionTable() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"Re = 1500\\nU = htc(Re)\","
                                + "\"functionTables\": [{"
                                + "  \"name\": \"htc\","
                                + "  \"argNames\": [\"Re\"],"
                                + "  \"curves\": [{\"points\": [[1000, 50], [2000, 80]]}]"
                                + "}]"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(true));
    }

    @Test
    void optimizeEndpointValidatesBlankText() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"\","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"lower\": 0.0,"
                                + "\"upper\": 10.0,"
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("No equations entered."));
    }

    @Test
    void optimizeEndpointValidatesSyntaxError() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"y = (x - 3)^2 + \","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"lower\": 0.0,"
                                + "\"upper\": 10.0,"
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Syntax error")));
    }

    @Test
    void parsesErrorLineFromAntlrMessage() {
        org.junit.jupiter.api.Assertions.assertEquals(
                4, SolverApiSupport.parseErrorLine("line 4:6 mismatched input '+'"));
        org.junit.jupiter.api.Assertions.assertEquals(
                2, SolverApiSupport.parseErrorLine("line 2:0 foo\nline 9:1 bar"));
        org.junit.jupiter.api.Assertions.assertNull(
                SolverApiSupport.parseErrorLine("some non-positional error"));
        org.junit.jupiter.api.Assertions.assertNull(SolverApiSupport.parseErrorLine(null));
    }

    @Test
    void checkReportsEditorLineForSyntaxError() throws Exception {
        // The malformed equation is on the second editor line; the response must
        // anchor the error there so the frontend can jump to it.
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"a = 1\\nb = * 3\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Syntax error")))
                .andExpect(jsonPath("$.errorLine").value(2));
    }

    @Test
    void solveReportsEditorLineForSyntaxError() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"a = 1\\nb = * 3\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorLine").value(2));
    }

    @Test
    void successfulCheckHasNoErrorLine() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + y = 3\\ny = 2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errorLine").value(org.hamcrest.Matchers.nullValue()));
    }
}
