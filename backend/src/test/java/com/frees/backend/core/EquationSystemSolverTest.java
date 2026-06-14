package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EquationSystemSolverTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void solvesMilestoneOneSystem() {
        // Milestone 1 from ARCHITECTURE_AND_REQUIREMENTS.md.
        EquationSystemSolver.Result result = solver.solve("x+y=3\ny=z-4\nz=x^2-3");

        double x = result.variables().get("x");
        double y = result.variables().get("y");
        double z = result.variables().get("z");

        assertEquals(3.0, x + y, 1e-8);
        assertEquals(z - 4.0, y, 1e-8);
        assertEquals(x * x - 3.0, z, 1e-8);
        // Starting from guess 1.0, Newton lands on the positive root (-1+sqrt(41))/2.
        assertEquals((-1 + Math.sqrt(41)) / 2, x, 1e-8);
    }

    @Test
    void solvesClaudeMdReferenceSystem() {
        // Reference verification system from CLAUDE.md.
        EquationSystemSolver.Result result = solver.solve("x^2 + y^3 = 77\nx / y = 1.23456");

        double x = result.variables().get("x");
        double y = result.variables().get("y");

        assertEquals(77.0, x * x + y * y * y, 1e-7);
        assertEquals(1.23456, x / y, 1e-9);
    }

    @Test
    void solvesSequentialSystemViaBlocks() {
        EquationSystemSolver.Result result = solver.solve("a = 10\nb = a * 2\nc = a + b");

        assertEquals(3, result.blocks().size());
        assertEquals(10.0, result.variables().get("a"), 1e-12);
        assertEquals(20.0, result.variables().get("b"), 1e-12);
        assertEquals(30.0, result.variables().get("c"), 1e-12);
    }

    @Test
    void residualsAreReportedPerEquation() {
        EquationSystemSolver.Result result = solver.solve("x = 5\ny = x + 2");
        assertEquals(2, result.residuals().size());
        for (EquationSystemSolver.EquationResidual r : result.residuals()) {
            assertTrue(Math.abs(r.residual()) < 1e-9, "residual too large for " + r.equation());
        }
    }

    @Test
    void equationsMaySpanCommentsAndMixedCase() {
        EquationSystemSolver.Result result = solver.solve(
                "{ inlet } TEMP = 300\npressure = Temp * 2 \"ideal-ish\"");
        assertEquals(600.0, result.variables().get("pressure"), 1e-12);
    }

    @Test
    void underdeterminedSystemFailsWithClearMessage() {
        SolverException e = assertThrows(SolverException.class,
                () -> solver.solve("x + y = 3"));
        assertTrue(e.getMessage().contains("underspecified"));
    }

    @Test
    void respectsIterationLimitFromStopCriteria() {
        // x^2 = 2 from guess 1.0 needs several Newton iterations; 1 is not enough.
        SolverSettings oneIteration = new SolverSettings(1, 1e-10, 1e-13, 3600);
        SolverException e = assertThrows(SolverException.class,
                () -> solver.solve("x^2 = 2", oneIteration));
        assertTrue(e.getMessage().contains("1 iterations"));
    }

    @Test
    void looseResidualToleranceAcceptsEarly() {
        SolverSettings loose = new SolverSettings(250, 0.5, 1e-13, 3600);
        EquationSystemSolver.Result result = solver.solve("x^2 = 2", loose);
        // Accepted within a loose relative residual; not the exact root.
        assertTrue(Math.abs(result.variables().get("x") - Math.sqrt(2)) < 0.5);
    }

    @Test
    void reportsIterationsInStats() {
        EquationSystemSolver.Result result = solver.solve("x^2 = 2");
        assertTrue(result.stats().iterations() >= 1, "expected at least one Newton iteration");
        assertEquals(Math.sqrt(2), result.variables().get("x"), 1e-6);
    }

    @Test
    void rejectsInvalidStopCriteria() {
        assertThrows(SolverException.class, () -> new SolverSettings(0, 1e-6, 1e-9, 3600));
        assertThrows(SolverException.class, () -> new SolverSettings(250, -1, 1e-9, 3600));
    }

    @Test
    void guessValueSelectsRoot() {
        // 4^x - 3*2^(x+1) + 8 = 0 has roots x=1 and x=2; the guess steers Newton.
        String text = "4^x - 3 * 2^(x+1) + 8 = 0";

        var nearOne = solver.solve(text, SolverSettings.DEFAULTS,
                Map.of("x", new VariableSpec("x", 0.5,
                        Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY)));
        assertEquals(1.0, nearOne.variables().get("x"), 1e-6);

        var nearTwo = solver.solve(text, SolverSettings.DEFAULTS,
                Map.of("x", new VariableSpec("x", 2.5,
                        Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY)));
        assertEquals(2.0, nearTwo.variables().get("x"), 1e-6);
    }

    @Test
    void complexSolving() {
        SolverSettings complexSettings = new SolverSettings(250, 1e-6, 1e-9, 3600.0, true);
        var result = solver.solve("z^2 = -4", complexSettings);
        double z_r = result.variables().get("z_r");
        double z_i = result.variables().get("z_i");
        assertEquals(0.0, z_r, 1e-6);
        org.junit.jupiter.api.Assertions.assertTrue(Math.abs(z_i - 2.0) < 1e-6 || Math.abs(z_i + 2.0) < 1e-6);
    }

    @Test
    void complexLiterals() {
        SolverSettings complexSettings = new SolverSettings(250, 1e-9, 1e-12, 3600.0, true);
        var result = solver.solve("z = 3 + 4i\nw = 1j * z", complexSettings);
        assertEquals(3.0, result.variables().get("z_r"), 1e-6);
        assertEquals(4.0, result.variables().get("z_i"), 1e-6);
        assertEquals(-4.0, result.variables().get("w_r"), 1e-6);
        assertEquals(3.0, result.variables().get("w_i"), 1e-6);
    }

    @Test
    void complexAbsIsMagnitude() {
        SolverSettings complexSettings = new SolverSettings(250, 1e-9, 1e-12, 3600.0, true);
        // sqrt(-16) = ±4i (branch depends on the sign of the zero imaginary
        // part), so z = 3±4i and |z| = 5 either way.
        var result = solver.solve("z = 3 + sqrt(-16)\nm = abs(z)", complexSettings);
        assertEquals(3.0, result.variables().get("z_r"), 1e-6);
        assertEquals(4.0, Math.abs(result.variables().get("z_i")), 1e-6);
        assertEquals(5.0, result.variables().get("m_r"), 1e-6);
        assertEquals(0.0, result.variables().get("m_i"), 1e-9);
    }

    @Test
    void complexRealAndImag() {
        SolverSettings complexSettings = new SolverSettings(250, 1e-9, 1e-12, 3600.0, true);
        var result = solver.solve("z = 3 + 4i\na = real(z)\nb = imag(z)", complexSettings);
        assertEquals(3.0, result.variables().get("z_r"), 1e-6);
        assertEquals(4.0, result.variables().get("z_i"), 1e-6);
        assertEquals(3.0, result.variables().get("a_r"), 1e-6);
        assertEquals(0.0, result.variables().get("a_i"), 1e-9);
        assertEquals(4.0, result.variables().get("b_r"), 1e-6);
        assertEquals(0.0, result.variables().get("b_i"), 1e-9);
    }

    @Test
    void realModeRealAndImag() {
        var result = solver.solve("x = 5\na = real(x)\nb = imag(x)", SolverSettings.DEFAULTS);
        assertEquals(5.0, result.variables().get("x"), 1e-6);
        assertEquals(5.0, result.variables().get("a"), 1e-6);
        assertEquals(0.0, result.variables().get("b"), 1e-6);
    }

    @Test
    void complexUnsupportedFunctionIsRejected() {
        SolverSettings complexSettings = new SolverSettings(250, 1e-9, 1e-12, 3600.0, true);
        var e = assertThrows(Exception.class,
                () -> solver.solve("y = tan(z)\nz = 1", complexSettings));
        assertTrue(e.getMessage().contains("not supported in complex mode"));
    }

    @Test
    void boundsSelectRoot() {
        // x^2 = 4 has roots ±2; bounds force the solver into one half-plane.
        var negative = solver.solve("x^2 = 4", SolverSettings.DEFAULTS,
                Map.of("x", new VariableSpec("x", -1.0, Double.NEGATIVE_INFINITY, 0.0)));
        assertEquals(-2.0, negative.variables().get("x"), 1e-6);

        var positive = solver.solve("x^2 = 4", SolverSettings.DEFAULTS,
                Map.of("x", new VariableSpec("x", 1.0, 0.0, Double.POSITIVE_INFINITY)));
        assertEquals(2.0, positive.variables().get("x"), 1e-6);
    }

    @Test
    void rejectsGuessOutsideBounds() {
        assertThrows(SolverException.class,
                () -> new VariableSpec("x", 5.0, 0.0, 2.0));
        assertThrows(SolverException.class,
                () -> new VariableSpec("x", 1.0, 3.0, 2.0));
    }

    @Test
    void checkResultListsVariables() {
        EquationSystemSolver.CheckResult check = solver.check("x+y=3\ny=z-4\nz=x^2-3");
        assertEquals(java.util.List.of("x", "y", "z"), check.variables());
    }

    @Test
    void variableCaseFollowsFirstAppearance() {
        // Variable case is unified to the first appearance: F stays F.
        EquationSystemSolver.Result result =
                solver.solve("P = 100\nA = 0.024\nF = P * A");
        assertEquals(java.util.Set.of("A", "F", "P"), result.variables().keySet());
        // Lookups remain case-insensitive.
        assertEquals(2.4, result.variables().get("f"), 1e-9);

        EquationSystemSolver.CheckResult check =
                solver.check("Temp = 300\npressure = Temp * 2");
        assertEquals(java.util.List.of("pressure", "Temp"), check.variables());
    }

    @Test
    void checkReportsSolvableSystem() {
        EquationSystemSolver.CheckResult check = solver.check("x+y=3\ny=z-4\nz=x^2-3");
        assertTrue(check.solvable());
        assertEquals(3, check.equationCount());
        assertEquals(3, check.unknownCount());
        assertTrue(check.message().contains("3 equations and 3 variables"));
    }

    @Test
    void checkReportsUnderspecifiedSystem() {
        EquationSystemSolver.CheckResult check = solver.check("x + y = 3");
        assertTrue(!check.solvable());
        assertEquals(1, check.equationCount());
        assertEquals(2, check.unknownCount());
        assertTrue(check.message().contains("underspecified"));
    }

    @Test
    void checkReportsOverspecifiedSystem() {
        EquationSystemSolver.CheckResult check = solver.check("x = 1\nx = 2");
        assertTrue(!check.solvable());
        assertTrue(check.message().contains("overspecified"));
    }

    @Test
    void checkReportsStructurallySingularSystem() {
        // 3 equations, 3 variables, but a and only a appears in two equations
        // that can each determine nothing else: no complete assignment exists.
        EquationSystemSolver.CheckResult check = solver.check("a = 1\na = 2\nb + c = 3");
        assertTrue(!check.solvable());
        assertTrue(check.message().contains("structurally singular"));
    }

    @Test
    void solvesDuplicateLoopSystem() {
        EquationSystemSolver.Result result = solver.solve(
                "N = 5\n" +
                "X[1] = 10\n" +
                "Duplicate i = 2, N\n" +
                "   X[i] = X[i-1] + i\n" +
                "End\n" +
                "Total = Sum(X[1..N])"
        );

        double x1 = result.variables().get("x[1]");
        double x2 = result.variables().get("x[2]");
        double x3 = result.variables().get("x[3]");
        double x4 = result.variables().get("x[4]");
        double x5 = result.variables().get("x[5]");
        double total = result.variables().get("total");

        assertEquals(10.0, x1, 1e-12);
        assertEquals(12.0, x2, 1e-12);
        assertEquals(15.0, x3, 1e-12);
        assertEquals(19.0, x4, 1e-12);
        assertEquals(24.0, x5, 1e-12);
        assertEquals(80.0, total, 1e-12);
    }

    @Test
    void solvesPowerFactorCorrectionComplex() {
        String source = """
                V_rms = 230 + 0i
                f = 50 [Hz]
                omega = 2 * pi * f
                
                R_load = 15 [ohm]
                L_load = 0.05 [H]
                Z_load = R_load + 1i * omega * L_load
                
                I_load = V_rms / Z_load
                S_uncorrected = V_rms * (real(I_load) - 1i * imag(I_load))
                P_active = real(S_uncorrected)
                Q_reactive_old = imag(S_uncorrected)
                PF_old = P_active / abs(S_uncorrected)
                
                PF_new = 0.98
                S_corrected_mag = P_active / PF_new
                Q_reactive_new = sqrt(S_corrected_mag^2 - P_active^2)
                
                Q_c = Q_reactive_old - Q_reactive_new
                
                Q_c = abs(V_rms)^2 / abs(Z_c)
                Z_c = -1i / (omega * C_corr)
                
                x + y = 3
                y = z - 4
                z = x^2 - 3
                """;
        SolverSettings settings = new SolverSettings(250, 1e-6, 1e-9, 3600.0, true);
        try {
            var result = solver.solve(source, settings);
            double cCorr = result.variables().get("c_corr_r");
            assertEquals(8.55e-5, cCorr, 1e-6);
            assertEquals(0.0, result.variables().get("c_corr_i"), 1e-9);

            // The Variable Information window may submit an explicit guess for
            // every expanded component — including 1.0 for imaginary parts,
            // which puts Z_c's phase on the wrong side of the plane. The
            // conjugate entries of the retry ladder must recover from that.
            java.util.Map<String, VariableSpec> allOnes = new java.util.HashMap<>();
            for (String name : result.variables().keySet()) {
                allOnes.put(name.toLowerCase(), new VariableSpec(name, 1.0,
                        Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
            }
            var explicit = solver.solve(source, settings, allOnes);
            assertEquals(8.55e-5, explicit.variables().get("c_corr_r"), 1e-6);
        } catch (SolverException e) {
            // Re-parse and print blocks to stdout for debugging
            var parsed = new com.frees.backend.parser.EquationParser().parseResult(source);
            var eqList = com.frees.backend.parser.ComplexExpansion.expand(parsed.equations(), parsed.displayNames());
            var blocker = new com.frees.backend.core.Blocker();
            var blocks = blocker.block(eqList);
            System.out.println("DEBUG BLOCKS:");
            for (var b : blocks) {
                System.out.println("Block " + b.index() + ": variables=" + b.variables() + ", equations=" + b.equations());
            }
            throw e;
        }
    }

    @Test
    void solvesEigenvaluesOfSymmetricMatrix() {
        EquationSystemSolver.Result result = solver.solve(
                "A[1,1] = 2; A[1,2] = 1\n" +
                "A[2,1] = 1; A[2,2] = 2\n" +
                "CALL Eigenvalues(A[1..2,1..2] : lambda[1..2])");

        // Eigenvalues of [[2,1],[1,2]] are 1 and 3, reported in ascending order.
        assertEquals(1.0, result.variables().get("lambda[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("lambda[2]"), 1e-8);
    }

    @Test
    void solvesEigenDecompositionWithVectorsAndDownstreamEquations() {
        EquationSystemSolver.Result result = solver.solve(
                "A[1,1] = 2; A[1,2] = 1\n" +
                "A[2,1] = 1; A[2,2] = 2\n" +
                "CALL Eigen(A[1..2,1..2] : lambda[1..2], V[1..2,1..2])\n" +
                "trace = lambda[1] + lambda[2]");

        double s = Math.sqrt(0.5);
        assertEquals(1.0, result.variables().get("lambda[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("lambda[2]"), 1e-8);
        // Column k holds the unit eigenvector of lambda[k]; sign fixed so the
        // largest-magnitude component is positive.
        assertEquals(s, Math.abs(result.variables().get("V[1, 1]")), 1e-8);
        assertEquals(s, Math.abs(result.variables().get("V[2, 1]")), 1e-8);
        assertEquals(-1.0, result.variables().get("V[1, 1]") * result.variables().get("V[2, 1]") / 0.5, 1e-8);
        assertEquals(s, result.variables().get("V[1, 2]"), 1e-8);
        assertEquals(s, result.variables().get("V[2, 2]"), 1e-8);
        assertEquals(4.0, result.variables().get("trace"), 1e-8);
    }

    @Test
    void eigenWaitsForMatrixEntriesSolvedElsewhere() {
        // A's entries are themselves unknowns: Tarjan must order the
        // eigendecomposition after the block that determines them.
        EquationSystemSolver.Result result = solver.solve(
                "x + y = 5\n" +
                "x - y = 1\n" +
                "A[1,1] = x; A[1,2] = 0\n" +
                "A[2,1] = 0; A[2,2] = y\n" +
                "CALL Eigenvalues(A[1..2,1..2] : lambda[1..2])");

        // x = 3, y = 2 -> diagonal matrix with eigenvalues 2 and 3 ascending.
        assertEquals(2.0, result.variables().get("lambda[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("lambda[2]"), 1e-8);
    }

    @Test
    void solvesWithHyperbolicFunctions() {
        EquationSystemSolver.Result result = solver.solve(
                "y = sinh(x)\n" +
                "z = cosh(x)\n" +
                "w = tanh(x)\n" +
                "x_asinh = arcsinh(y)\n" +
                "x_acosh = arccosh(z)\n" +
                "x_atanh = arctanh(w)\n" +
                "x = 1.25"
        );
        assertEquals(Math.sinh(1.25), result.variables().get("y"), 1e-12);
        assertEquals(Math.cosh(1.25), result.variables().get("z"), 1e-12);
        assertEquals(Math.tanh(1.25), result.variables().get("w"), 1e-12);
        assertEquals(1.25, result.variables().get("x_asinh"), 1e-12);
        assertEquals(1.25, result.variables().get("x_acosh"), 1e-12);
        assertEquals(1.25, result.variables().get("x_atanh"), 1e-12);
    }

    @Test
    void solvesWithPiecewiseAndRounding() {
        EquationSystemSolver.Result result = solver.solve(
                "a = round(1.6)\n" +
                "b = round(1.2345, 2)\n" +
                "c = floor(2.8)\n" +
                "d = ceil(2.1)\n" +
                "e = trunc(-3.7)\n" +
                "f = sign(-4.2)\n" +
                "g = factorial(3.0)\n" +
                "h = step(0.0)\n" +
                "h2 = step(-0.5)"
        );
        assertEquals(2.0, result.variables().get("a"), 1e-12);
        assertEquals(1.23, result.variables().get("b"), 1e-12);
        assertEquals(2.0, result.variables().get("c"), 1e-12);
        assertEquals(3.0, result.variables().get("d"), 1e-12);
        assertEquals(-3.0, result.variables().get("e"), 1e-12);
        assertEquals(-1.0, result.variables().get("f"), 1e-12);
        assertEquals(6.0, result.variables().get("g"), 1e-12);
        assertEquals(1.0, result.variables().get("h"), 1e-12);
        assertEquals(0.0, result.variables().get("h2"), 1e-12);
    }

    @Test
    void solvesWithConditionalsAndSeries() {
        EquationSystemSolver.Result result = solver.solve(
                "x = 5\n" +
                "y = If(x, 10, 100, 200, 300)\n" +
                "total = Sum(i, 1, 4, i^2)\n" +
                "prod = Product(j, 1, 3, j + 1)"
        );
        // x < 10 -> y = 100
        assertEquals(100.0, result.variables().get("y"), 1e-12);
        // 1^2 + 2^2 + 3^2 + 4^2 = 30
        assertEquals(30.0, result.variables().get("total"), 1e-12);
        // 2 * 3 * 4 = 24
        assertEquals(24.0, result.variables().get("prod"), 1e-12);
    }

    @Test
    void solvesWithComplexHelpers() {
        SolverSettings settings = new SolverSettings(250, 1e-12, 1e-15, 3600.0, true);
        EquationSystemSolver.Result result = solver.solve(
                "z = 3 + 4i\n" +
                "real_z = real(z)\n" +
                "imag_z = imag(z)\n" +
                "z_conj = conj(z)\n" +
                "z_mag = magnitude(z)\n" +
                "z_angle = anglerad(z)\n" +
                "z_angle_deg = angledeg(z)\n" +
                "z_cis = cis(z_angle)",
                settings
        );
        assertEquals(3.0, result.variables().get("real_z_r"), 1e-8);
        assertEquals(4.0, result.variables().get("imag_z_r"), 1e-8);
        assertEquals(3.0, result.variables().get("z_conj_r"), 1e-8);
        assertEquals(-4.0, result.variables().get("z_conj_i"), 1e-8);
        assertEquals(5.0, result.variables().get("z_mag_r"), 1e-8);
        assertEquals(Math.atan2(4.0, 3.0), result.variables().get("z_angle_r"), 1e-8);
        assertEquals(Math.atan2(4.0, 3.0) * 180.0 / Math.PI, result.variables().get("z_angle_deg_r"), 1e-8);
        assertEquals(3.0 / 5.0, result.variables().get("z_cis_r"), 1e-8);
        assertEquals(4.0 / 5.0, result.variables().get("z_cis_i"), 1e-8);
    }

    @Test
    void generatesWarningsForNonSmoothFunctionsInSimultaneousBlocks() {
        // Simultaneous block: x + y = 10, y = floor(x)
        List<String> warnings = solver.checkUnits(
                "x + y = 10\n" +
                "y = floor(x)",
                Map.of()
        );
        boolean hasNonSmoothWarning = warnings.stream().anyMatch(w -> w.contains("depends on non-smooth function"));
        assertTrue(hasNonSmoothWarning, "Expected simultaneous block non-smooth function warning");

        // Sequential block: x = 10, y = floor(x) -> no warning
        List<String> warningsSeq = solver.checkUnits(
                "x = 10\n" +
                "y = floor(x)",
                Map.of()
                );
        boolean hasNonSmoothWarningSeq = warningsSeq.stream().anyMatch(w -> w.contains("depends on non-smooth function"));
        assertFalse(hasNonSmoothWarningSeq, "Expected no warning for sequential block");
    }

    @Test
    void propagatesUncertaintySimple() {
        var specs = Map.of("x", new VariableSpec("x", 5.0, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, 0.1));
        var result = solver.solve("y = x\nx = 5", SolverSettings.DEFAULTS, specs);
        
        assertEquals(5.0, result.variables().get("y"), 1e-6);
        assertEquals(0.1, result.uncertainties().get("y"), 1e-6);
        assertEquals(0.1, result.uncertainties().get("x"), 1e-6);
    }

    @Test
    void propagatesUncertaintyMultipleInputs() {
        var specs = Map.of(
            "x1", new VariableSpec("x1", 3.0, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, 0.1),
            "x2", new VariableSpec("x2", 4.0, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, 0.2)
        );
        var result = solver.solve("y = x1 + 2 * x2\nx1 = 3\nx2 = 4", SolverSettings.DEFAULTS, specs);
        
        assertEquals(11.0, result.variables().get("y"), 1e-6);
        assertEquals(Math.sqrt(0.17), result.uncertainties().get("y"), 1e-5);
    }

    @Test
    void evaluatesUncertaintyOfAccessor() {
        var specs = Map.of("x", new VariableSpec("x", 5.0, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, 0.15));
        var result = solver.solve("y = x\nx = 5\nu_y = UncertaintyOf(y)", SolverSettings.DEFAULTS, specs);
        assertEquals(5.0, result.variables().get("y"), 1e-6);
        assertEquals(0.15, result.variables().get("u_y"), 1e-6);
        assertEquals(0.15, result.uncertainties().get("y"), 1e-6);
    }
}

