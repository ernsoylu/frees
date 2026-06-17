package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EquationParserTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void parsesSimpleEquations() {
        List<Equation> equations = parser.parse("x + y = 3\ny = z - 4\nz = x^2 - 3");
        assertEquals(3, equations.size());
        assertEquals(Set.of("x", "y"), equations.get(0).variables());
        assertEquals(Set.of("y", "z"), equations.get(1).variables());
        assertEquals(Set.of("x", "z"), equations.get(2).variables());
    }

    @Test
    void parsesArrayAccessInNamedArg() {
        List<Equation> equations = parser.parse("s[2] = Entropy(Water, P=P_low, h=h[2])");
        assertEquals(1, equations.size());
        assertEquals(Set.of("s[2]", "p_low", "h[2]"), equations.get(0).variables());
    }

    @Test
    void acceptsSemicolonSeparators() {
        assertEquals(3, parser.parse("x+y=3; y=z-4; z=x^2-3").size());
    }

    @Test
    void variableNamesAreCaseInsensitive() {
        List<Equation> equations = parser.parse("X + x = 4");
        assertEquals(Set.of("x"), equations.get(0).variables());
    }

    @Test
    void skipsBraceAndQuoteComments() {
        List<Equation> equations = parser.parse(
                "{ this is a comment } x = 2 \"another comment\"\ny = x + 1");
        assertEquals(2, equations.size());
    }

    @Test
    void evaluatesOperatorPrecedence() {
        Equation eq = parser.parse("q = 2 + 3 * 4 ^ 2").get(0);
        assertEquals(50.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void powerIsRightAssociative() {
        Equation eq = parser.parse("q = 2 ^ 3 ^ 2").get(0);
        assertEquals(512.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void parsesScientificNotation() {
        Equation eq = parser.parse("q = 1.5e3 + 0.5E-1").get(0);
        assertEquals(1500.05, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void parsesFunctionCalls() {
        Equation eq = parser.parse("q = SQRT(16) + Max(2, 5)").get(0);
        assertEquals(9.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void rejectsInvalidSyntax() {
        assertThrows(EquationParser.ParseException.class, () -> parser.parse("x + = 3"));
    }

    @Test
    void unitAnnotatedConstantsAreConvertedToSi() {
        // All calculations run in SI: 140 kPa becomes 140000 Pa at parse time.
        Equation eq = parser.parse("P = 140 [kPa]").get(0);
        assertEquals(140000.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);
        assertEquals("Pa", ((com.frees.backend.ast.Expr.Num) eq.rhs()).unit());

        Equation mass = parser.parse("m = 120 [lb]").get(0);
        assertEquals(54.4310844, Evaluator.eval(mass.rhs(), Map.of()), 1e-6);
        assertEquals("kg", ((com.frees.backend.ast.Expr.Num) mass.rhs()).unit());
    }

    @Test
    void convertFoldsToConstantFactor() {
        Equation eq = parser.parse("A = Convert(ft^2, in^2)").get(0);
        assertEquals(144.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);
    }

    @Test
    void convertInsideExpression() {
        Equation eq = parser.parse("L_in = 2 * Convert(ft, in)").get(0);
        assertEquals(24.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);
    }

    @Test
    void convertTempIsAffine() {
        Equation eq = parser.parse("T = ConvertTemp(C, K, 25)").get(0);
        assertEquals(298.15, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);

        Equation boiling = parser.parse("T = ConvertTemp(F, C, 212)").get(0);
        assertEquals(100.0, Evaluator.eval(boiling.rhs(), Map.of()), 1e-9);

        Equation rankine = parser.parse("T = ConvertTemp(K, R, 100)").get(0);
        assertEquals(180.0, Evaluator.eval(rankine.rhs(), Map.of()), 1e-9);
    }

    @Test
    void bareTemperatureAnnotationsConvertAffinely() {
        Equation celsius = parser.parse("T = 25 [C]").get(0);
        assertEquals(298.15, Evaluator.eval(celsius.rhs(), Map.of()), 1e-9);
        assertEquals("K", ((com.frees.backend.ast.Expr.Num) celsius.rhs()).unit());

        Equation fahrenheit = parser.parse("T = 80 [F]").get(0);
        assertEquals(299.81666666666666, Evaluator.eval(fahrenheit.rhs(), Map.of()), 1e-9);
    }

    @Test
    void convertTempRejectsUnknownScale() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("T = ConvertTemp(X, K, 25)"));
    }

    @Test
    void convertWithUnknownUnitFailsAtParseTime() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("x = Convert(blorbs, kg)"));
    }

    @Test
    void convertWithMismatchedDimensionsFailsAtParseTime() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("x = Convert(kg, m)"));
    }

    @Test
    void parsesSimpleArrayAccess() {
        List<Equation> equations = parser.parse("X[1] = 5\nY = X[1] + 2");
        assertEquals(2, equations.size());
        assertEquals("x[1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
    }

    @Test
    void parsesDuplicateLoop() {
        List<Equation> equations = parser.parse(
                "N = 3\n" +
                "FOR i = 1 TO N\n" +
                "   X[i] = i * 2\n" +
                "End"
        );
        // N = 3 (1 equation) plus 3 duplicated equations = 4 equations
        assertEquals(4, equations.size());

        // Check the generated equations: X[1] = 1 * 2, X[2] = 2 * 2, X[3] = 3 * 2
        assertEquals("x[1]", ((com.frees.backend.ast.Expr.Var) equations.get(1).lhs()).name());
        assertEquals("x[2]", ((com.frees.backend.ast.Expr.Var) equations.get(2).lhs()).name());
        assertEquals("x[3]", ((com.frees.backend.ast.Expr.Var) equations.get(3).lhs()).name());
    }

    @Test
    void parsesPlotBlockIntoDefinedPlot() {
        EquationParser.ParseResult parsed = parser.parseResult(
                "N = 3\n" +
                "PLOT 'Speed vs Distance'\n" +
                "  kind = xy\n" +
                "  x = speed[1..N]\n" +
                "  y = distance[1..N], time[1..N]\n" +
                "  type = line\n" +
                "  xlabel = 'Speed [m/s]'\n" +
                "END");
        // The PLOT block is a directive, not an equation: only N = 3 is solved.
        assertEquals(1, parsed.equations().size());
        assertEquals(1, parsed.plots().size());

        com.frees.backend.ast.PlotDef plot = parsed.plots().get(0);
        assertEquals("Speed vs Distance", plot.name());
        assertEquals(List.of("xy"), plot.attributes().get("kind"));
        assertEquals(List.of("speed"), plot.attributes().get("x"));
        assertEquals(List.of("distance", "time"), plot.attributes().get("y"));
        assertEquals(List.of("line"), plot.attributes().get("type"));
        assertEquals(List.of("Speed [m/s]"), plot.attributes().get("xlabel"));
    }

    @Test
    void parsesPropertyPlotBlock() {
        EquationParser.ParseResult parsed = parser.parseResult(
                "PLOT 'Rankine Cycle'\n" +
                "  kind = property\n" +
                "  fluid = Water\n" +
                "  diagram = 'T-s'\n" +
                "  overlaystates = true\n" +
                "END");
        assertEquals(1, parsed.plots().size());
        com.frees.backend.ast.PlotDef plot = parsed.plots().get(0);
        assertEquals("Rankine Cycle", plot.name());
        assertEquals(List.of("property"), plot.attributes().get("kind"));
        assertEquals(List.of("Water"), plot.attributes().get("fluid"));
        assertEquals(List.of("T-s"), plot.attributes().get("diagram"));
        assertEquals(List.of("true"), plot.attributes().get("overlaystates"));
    }

    @Test
    void rejectsOversizedForLoop() {
        // DoS guard: a tiny input must not expand to a huge equation system.
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("FOR i = 1 TO 2000000\n  x[i] = i\nEND"));
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().toLowerCase().contains("too large"));
    }

    @Test
    void rejectsOversizedArrayRange() {
        // DoS guard: an array slice range is bounded too.
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("x[1..3000000] = 5"));
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().toLowerCase().contains("too large"));
    }

    @Test
    void allowsReasonableLoop() {
        // A normal loop within the limit still works.
        List<Equation> equations = parser.parse("FOR i = 1 TO 50\n  x[i] = i\nEND");
        assertEquals(50, equations.size());
    }

    @Test
    void parsesNestedDuplicateLoops() {
        List<Equation> equations = parser.parse(
                "FOR i = 1 TO 2\n" +
                "   FOR j = 1 TO 3\n" +
                "      A[i,j] = i + j\n" +
                "   End\n" +
                "End"
        );
        // Generates 2 * 3 = 6 equations
        assertEquals(6, equations.size());
        assertEquals("a[1,1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
        assertEquals("a[2,3]", ((com.frees.backend.ast.Expr.Var) equations.get(5).lhs()).name());
    }

    @Test
    void parsesArrayRangeAssignmentWithList() {
        List<Equation> equations = parser.parse("X[1..3] = [10, 20, 30]");
        assertEquals(3, equations.size());
        assertEquals("x[1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
        assertEquals(10.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
        assertEquals("x[3]", ((com.frees.backend.ast.Expr.Var) equations.get(2).lhs()).name());
        assertEquals(30.0, Evaluator.eval(equations.get(2).rhs(), Map.of()), 1e-9);
    }

    @Test
    void parsesArrayRangeAssignmentWithScalar() {
        List<Equation> equations = parser.parse("Y[1..3] = 100");
        assertEquals(3, equations.size());
        assertEquals("y[1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
        assertEquals(100.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
        assertEquals("y[3]", ((com.frees.backend.ast.Expr.Var) equations.get(2).lhs()).name());
        assertEquals(100.0, Evaluator.eval(equations.get(2).rhs(), Map.of()), 1e-9);
    }

    @Test
    void parsesFunctionCallWithArrayRange() {
        List<Equation> equations = parser.parse(
                "X[1..3] = [10, 20, 30]\n" +
                "Total = Sum(X[1..3])\n" +
                "Avg = Average(X[1..3])"
        );
        // 3 + 1 + 1 = 5 equations
        assertEquals(5, equations.size());

        // Check Sum call expansion
        Expr.Call sumCall = (Expr.Call) equations.get(3).rhs();
        assertEquals("sum", sumCall.function());
        assertEquals(3, sumCall.args().size());
        assertEquals("x[1]", ((Expr.Var) sumCall.args().get(0)).name());
        assertEquals("x[3]", ((Expr.Var) sumCall.args().get(2)).name());

        // Check Average call expansion
        Expr.Call avgCall = (Expr.Call) equations.get(4).rhs();
        assertEquals("average", avgCall.function());
        assertEquals(3, avgCall.args().size());
    }

    @Test
    void parsesPredefinedConstantPi() {
        Equation eq = parser.parse("omega = 2 * pi# * 50").get(0);
        Expr.BinOp mul = (Expr.BinOp) eq.rhs();
        Expr.BinOp leftMul = (Expr.BinOp) mul.left();
        Expr.Num piNum = (Expr.Num) leftMul.right();
        assertEquals(Math.PI, piNum.value(), 1e-12);
    }

    @Test
    void parsesFullRankineCycleMarkdownReport() {
        String report = "# Ideal Rankine Steam Power Cycle\n" +
                "\n" +
                "This report analyzes an ideal Rankine steam power cycle with isentropic efficiency constraints.\n" +
                "\n" +
                "## Inputs and Parameters\n" +
                "* Boiler Pressure: P_high = 8000 [kPa]\n" +
                "* Condenser Pressure: P_low = 10 [kPa]\n" +
                "* Boiler Temperature: T_boiler = 500 [C]\n" +
                "* Turbine Isentropic Efficiency: eta_turb = 0.85\n" +
                "* Pump Isentropic Efficiency: eta_pump = 0.90\n" +
                "* Target Net Power Output: W_dot_net = 10000 [kW]\n" +
                "\n" +
                "## State 1: HP Turbine Inlet (Superheated Steam)\n" +
                "We evaluate enthalpy and entropy at state 1:\n" +
                "h[1] = Enthalpy(Water, P=P_high, T=T_boiler)\n" +
                "s[1] = Entropy(Water, P=P_high, T=T_boiler)\n" +
                "T[1] = T_boiler\n" +
                "\n" +
                "## State 2: Actual Turbine Exit\n" +
                "First we compute the isentropic exit enthalpy:\n" +
                "s_2s = s[1]\n" +
                "h_2s = Enthalpy(Water, P=P_low, s=s_2s)\n" +
                "\n" +
                "Then actual exit conditions using isentropic efficiency:\n" +
                "h[2] = h[1] - eta_turb * (h[1] - h_2s)\n" +
                "s[2] = Entropy(Water, P=P_low, h=h[2])\n" +
                "T[2] = Temperature(Water, P=P_low, h=h[2])\n" +
                "\n" +
                "## State 3: Condenser Exit (Saturated Liquid)\n" +
                "h[3] = Enthalpy(Water, P=P_low, x=0)\n" +
                "v[3] = Volume(Water, P=P_low, x=0)\n" +
                "s[3] = Entropy(Water, P=P_low, x=0)\n" +
                "T[3] = Temperature(Water, P=P_low, x=0)\n" +
                "\n" +
                "## State 4: Actual Pump Exit\n" +
                "s_4s = s[3]\n" +
                "h_4s = Enthalpy(Water, P=P_high, s=s_4s)\n" +
                "h[4] = h[3] + (h_4s - h[3]) / eta_pump\n" +
                "s[4] = Entropy(Water, P=P_high, h=h[4])\n" +
                "T[4] = Temperature(Water, P=P_high, h=h[4])\n" +
                "\n" +
                "## Performance Analysis\n" +
                "Let's compute the work and heat rates:\n" +
                "w_turb = h[1] - h[2]\n" +
                "w_pump = h[4] - h[3]\n" +
                "q_boiler = h[1] - h[4]\n" +
                "q_cond = h[2] - h[3]\n" +
                "\n" +
                "Net work output, thermal efficiency, and mass flow rate:\n" +
                "w_net = w_turb - w_pump\n" +
                "eta_th = w_net / q_boiler * 100\n" +
                "W_dot_net = m_dot * w_net";
        
        String clean = MarkdownEquationExtractor.extract(report).cleanText;
        // 30 equations survive extraction (including the six inline
        // bullet-point assignments); headings and prose are dropped.
        assertEquals(30, parser.parse(clean).size());
    }

    @Test
    void testMatrixVectorOperations() {
        // Transpose test
        List<Equation> transposeEqs = parser.parse(
                "A[1..2, 1..3] = 1\n" +
                "B[1..3, 1..2] = transpose(A[1..2, 1..3])"
        );
        assertEquals(12, transposeEqs.size());

        // Dot product test
        List<Equation> dotEqs = parser.parse(
                "u[1..3] = [1, 2, 3]\n" +
                "v[1..3] = [4, 5, 6]\n" +
                "d = dot(u[1..3], v[1..3])"
        );
        assertEquals(7, dotEqs.size());

        // Determinant test
        List<Equation> detEqs = parser.parse(
                "A[1..2,1..2] = 1\n" +
                "det = determinant(A[1..2,1..2])"
        );
        assertEquals(5, detEqs.size());

        // Cross product test
        List<Equation> crossEqs = parser.parse(
                "u[1..3] = [1, 0, 0]\n" +
                "v[1..3] = [0, 1, 0]\n" +
                "w[1..3] = cross(u[1..3], v[1..3])"
        );
        assertEquals(9, crossEqs.size());

        // LUDecompose test
        List<Equation> luEqs = parser.parse(
                "A[1..2, 1..2] = 1\n" +
                "CALL LUDecompose(A[1..2, 1..2] : L[1..2, 1..2], U[1..2, 1..2])"
        );
        assertEquals(12, luEqs.size());

        // EulerRotate test
        List<Equation> eulerEqs = parser.parse(
                "phi = 0\n" +
                "theta = 0\n" +
                "psi = 0\n" +
                "CALL EulerRotate(phi, theta, psi : R[1..3, 1..3])"
        );
        assertEquals(12, eulerEqs.size());

        // SolveLinear test
        List<Equation> solveEqs = parser.parse(
                "A[1..2, 1..2] = 1\n" +
                "b[1..2] = [2, 3]\n" +
                "x[1..2] = SolveLinear(A[1..2, 1..2], b[1..2])"
        );
        assertEquals(8, solveEqs.size());
    }

    @Test
    void expandsInverseIntoProductEquations() {
        // A * B = I row by row: n^2 equations plus the 4 matrix entries.
        List<Equation> eqs = parser.parse(
                "A[1..2,1..2] = 1\n"
                        + "B[1..2,1..2] = Inverse(A[1..2,1..2])");
        assertEquals(8, eqs.size());
    }

    @Test
    void expandsNormIntoSqrtOfSquares() {
        List<Equation> eqs = parser.parse(
                "u[1..3] = [3, 0, 4]\n"
                        + "n = Norm(u[1..3])");
        assertEquals(4, eqs.size());
        assertEquals(Set.of("n", "u[1]", "u[2]", "u[3]"), eqs.get(3).variables());
    }

    @Test
    void expandsRangeToRangeAssignment() {
        List<Equation> eqs = parser.parse("a[1..3] = 1\nb[1..3] = a[1..3]");
        assertEquals(6, eqs.size());
        assertEquals(Set.of("a[2]", "b[2]"), eqs.get(4).variables());
    }

    @Test
    void expandsEulerDecomposeIntoAngleEquations() {
        // 9 matrix entries + 3 decomposition equations.
        List<Equation> eqs = parser.parse(
                "R[1..3,1..3] = 0.5\n"
                        + "CALL EulerDecompose(R[1..3,1..3] : phi, theta, psi)");
        assertEquals(12, eqs.size());
    }

    @Test
    void rejectsMismatchedMatrixAndVectorDimensions() {
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("a[1..3] = 1\nb[1..2] = a[1..3]"));
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("a[1..2] = [1, 2, 3]"));
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("A[1..2,1..3] = 1\nB[1..2,1..3] = transpose(A[1..2,1..3])"));
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("u[1..2] = [1, 2]\nv[1..3] = [1, 2, 3]\nd = dot(u[1..2], v[1..3])"));
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("A[1..2,1..3] = 1\nd = determinant(A[1..2,1..3])"));
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("u[1..2] = [1, 2]\nv[1..2] = [3, 4]\nw[1..2] = cross(u[1..2], v[1..2])"));
        assertThrows(EquationParser.ParseException.class, () ->
                parser.parse("R[1..2,1..2] = 1\nCALL EulerDecompose(R[1..2,1..2] : phi, theta, psi)"));
    }

    @Test
    void expandsEigenCallsIntoElementEquations() {
        EquationParser parser = new EquationParser();
        // 4 matrix entries + 2 eigenvalue equations
        List<Equation> valEqs = parser.parse(
                "A[1,1] = 2; A[1,2] = 1\n" +
                "A[2,1] = 1; A[2,2] = 2\n" +
                "CALL Eigenvalues(A[1..2,1..2] : lambda[1..2])"
        );
        assertEquals(6, valEqs.size());

        // 4 matrix entries + 2 eigenvalue equations + 4 eigenvector component equations + 1 trailing
        List<Equation> pairEqs = parser.parse(
                "A[1,1] = 2; A[1,2] = 1\n" +
                "A[2,1] = 1; A[2,2] = 2\n" +
                "CALL Eigen(A[1..2,1..2] : lambda[1..2], V[1..2,1..2])\n" +
                "trace = lambda[1] + lambda[2]"
        );
        assertEquals(11, pairEqs.size());
    }

    @Test
    void equationsAfterMatrixFunctionsAreKept() {
        EquationParser parser = new EquationParser();
        List<Equation> eqs = parser.parse(
                "A[1,1] = 2; A[1,2] = 0\n" +
                "A[2,1] = 0; A[2,2] = 2\n" +
                "b[1..2] = [4, 6]\n" +
                "x[1..2] = SolveLinear(A[1..2, 1..2], b[1..2])\n" +
                "y = x[1] + 1\n" +
                "d = Determinant(A[1..2, 1..2])\n" +
                "z = y + d"
        );
        // 4 matrix entries + 2 b + 2 SolveLinear rows + y + d + z
        assertEquals(11, eqs.size());
    }

    @Test
    void testBlasFunctions() {
        EquationParser parser = new EquationParser();
        
        // Level 1: axpy, scal, copy, asum, nrm2
        List<Equation> axpyEqs = parser.parse(
                "x[1..2] = [1, 2]\n" +
                "y[1..2] = [3, 4]\n" +
                "z[1..2] = axpy(2, x[1..2], y[1..2])"
        );
        assertEquals(6, axpyEqs.size()); // 2 + 2 + 2 = 6

        List<Equation> scalEqs = parser.parse(
                "x[1..2] = [1, 2]\n" +
                "y[1..2] = scal(3, x[1..2])"
        );
        assertEquals(4, scalEqs.size()); // 2 + 2 = 4

        List<Equation> copyEqs = parser.parse(
                "x[1..2] = [1, 2]\n" +
                "y[1..2] = copy(x[1..2])"
        );
        assertEquals(4, copyEqs.size()); // 2 + 2 = 4

        List<Equation> asumEq = parser.parse(
                "x[1..2] = [1, -2]\n" +
                "val = asum(x[1..2])"
        );
        assertEquals(3, asumEq.size()); // 2 + 1 = 3

        List<Equation> nrm2Eq = parser.parse(
                "x[1..2] = [3, 4]\n" +
                "val = nrm2(x[1..2])"
        );
        assertEquals(3, nrm2Eq.size()); // 2 + 1 = 3

        // Level 2: gemv, ger
        List<Equation> gemvEqs = parser.parse(
                "A[1..2, 1..2] = 1\n" +
                "x[1..2] = [2, 3]\n" +
                "y[1..2] = [4, 5]\n" +
                "z[1..2] = gemv(2, A[1..2, 1..2], x[1..2], 3, y[1..2])"
        );
        assertEquals(10, gemvEqs.size()); // 4 + 2 + 2 + 2 = 10

        List<Equation> gerEqs = parser.parse(
                "x[1..2] = [2, 3]\n" +
                "y[1..2] = [4, 5]\n" +
                "A[1..2, 1..2] = 1\n" +
                "B[1..2, 1..2] = ger(2, x[1..2], y[1..2], A[1..2, 1..2])"
        );
        assertEquals(12, gerEqs.size()); // 2 + 2 + 4 + 4 = 12

        // Level 3: gemm
        List<Equation> gemmEqs = parser.parse(
                "A[1..2, 1..2] = 1\n" +
                "B[1..2, 1..2] = 2\n" +
                "C[1..2, 1..2] = 3\n" +
                "D[1..2, 1..2] = gemm(2, A[1..2, 1..2], B[1..2, 1..2], 3, C[1..2, 1..2])"
        );
        assertEquals(16, gemmEqs.size()); // 4 + 4 + 4 + 4 = 16
    }
}
