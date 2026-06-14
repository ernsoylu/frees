package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;

class BitwiseAndSpecialMathTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void testBitwiseOperations() {
        String code = """
                a = bitand(5, 6)
                b = bitor(5, 6)
                c = bitxor(5, 6)
                d = bitnot(0)
                e = bitshiftl(2, 3)
                f = bitshiftr(16, 2)
                """;
        var result = solver.solve(code, SolverSettings.DEFAULTS);
        Map<String, Double> vars = result.variables();

        assertEquals(4.0, vars.get("a"), 1e-9);
        assertEquals(7.0, vars.get("b"), 1e-9);
        assertEquals(3.0, vars.get("c"), 1e-9);
        assertEquals(-1.0, vars.get("d"), 1e-9);
        assertEquals(16.0, vars.get("e"), 1e-9);
        assertEquals(4.0, vars.get("f"), 1e-9);
    }

    @Test
    void testCSNumberTheory() {
        String code = """
                a = mod(10.5, 3)
                b = gcd(24, 36)
                c = lcm(12, 18)
                """;
        var result = solver.solve(code, SolverSettings.DEFAULTS);
        Map<String, Double> vars = result.variables();

        assertEquals(1.5, vars.get("a"), 1e-9);
        assertEquals(12.0, vars.get("b"), 1e-9);
        assertEquals(36.0, vars.get("c"), 1e-9);
    }

    @Test
    void testSpecialMathFunctions() {
        String code = """
                a = erf(0)
                b = erfc(0)
                c = gamma(4)
                d = loggamma(4)
                e = beta(2, 3)
                f = besselj(2.5, 0)
                g = erfinv(0.5)
                """;
        var result = solver.solve(code, SolverSettings.DEFAULTS);
        Map<String, Double> vars = result.variables();

        assertEquals(0.0, vars.get("a"), 1e-9);
        assertEquals(1.0, vars.get("b"), 1e-9);
        assertEquals(6.0, vars.get("c"), 1e-9);
        assertEquals(Math.log(6.0), vars.get("d"), 1e-9);
        assertEquals(1.0 / 12.0, vars.get("e"), 1e-9);
        // J0(2.5) ≈ -0.048383776
        assertEquals(-0.048383776, vars.get("f"), 1e-6);
        // erfinv(0.5) ≈ 0.476936276
        assertEquals(0.476936276, vars.get("g"), 1e-6);
    }

    @Test
    void testBesselI() {
        // Signature matches besselj: besseli(x, order)
        String code = """
                a = besseli(0, 0)
                b = besseli(0, 1)
                c = besseli(1, 0)
                d = besseli(2, 1)
                e = besseli(2.5, 1)
                """;
        var result = solver.solve(code, SolverSettings.DEFAULTS);
        Map<String, Double> vars = result.variables();

        assertEquals(1.0, vars.get("a"), 1e-12);          // I_0(0) = 1
        assertEquals(0.0, vars.get("b"), 1e-12);          // I_1(0) = 0
        // I_0(1) ≈ 1.2660658778
        assertEquals(1.2660658778, vars.get("c"), 1e-9);
        // I_1(2) ≈ 1.5906368546
        assertEquals(1.5906368546, vars.get("d"), 1e-9);
        // I_1(2.5) ≈ 2.5167162452
        assertEquals(2.5167162452, vars.get("e"), 1e-9);
    }

    @Test
    void testBaseConvert() {
        String code = """
                a = BaseConvert('FF', 16, 10)
                b = BaseConvert('1010', 2, 10)
                c = BaseConvert('255', 10, 2)
                d = BaseConvert(777, 8, 10)
                """;
        var result = solver.solve(code, SolverSettings.DEFAULTS);
        Map<String, Double> vars = result.variables();

        assertEquals(255.0, vars.get("a"), 1e-9);
        assertEquals(10.0, vars.get("b"), 1e-9);
        assertEquals(11111111.0, vars.get("c"), 1e-9);
        assertEquals(511.0, vars.get("d"), 1e-9);
    }

    @Test
    void testNewBesselAndChiSquare() {
        String code = """
                j0_val = bessel_j0(2)
                j1_val = bessel_j1(2)
                i0_val = bessel_i0(2)
                i1_val = bessel_i1(2)
                k0_val = bessel_k0(2)
                k1_val = bessel_k1(2)
                y0_val = bessel_y0(2)
                y1_val = bessel_y1(2)
                
                k_order2 = bessel_k(2, 2)
                y_order2 = bessel_y(2, 2)
                
                chi2_val = chi_square(4, 2)
                """;
        var result = solver.solve(code, SolverSettings.DEFAULTS);
        Map<String, Double> vars = result.variables();

        assertEquals(0.2238907791, vars.get("j0_val"), 1e-6);
        assertEquals(0.5767248078, vars.get("j1_val"), 1e-6);
        assertEquals(2.2795853023, vars.get("i0_val"), 1e-6);
        assertEquals(1.5906368546, vars.get("i1_val"), 1e-6);
        assertEquals(0.1138938727, vars.get("k0_val"), 1e-6);
        assertEquals(0.1398658818, vars.get("k1_val"), 1e-6);
        assertEquals(0.5103756726, vars.get("y0_val"), 1e-6);
        assertEquals(-0.1070324315, vars.get("y1_val"), 1e-6);

        // K2(2) = K0(2) + 2/2 * K1(2) = K0(2) + K1(2) ≈ 0.1138938727 + 0.1398658818 = 0.2537597545
        assertEquals(0.2537597545, vars.get("k_order2"), 1e-6);
        
        // Y2(2) = 2/2 * Y1(2) - Y0(2) = Y1(2) - Y0(2) ≈ -0.1070324315 - 0.5103756726 = -0.6174081041
        assertEquals(-0.6174081041, vars.get("y_order2"), 1e-6);

        // Chi-Square(4, 2) ≈ 0.86466471676
        assertEquals(0.86466471676, vars.get("chi2_val"), 1e-6);
    }
}
