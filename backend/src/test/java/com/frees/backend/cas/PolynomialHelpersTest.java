package com.frees.backend.cas;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

class PolynomialHelpersTest {

    @Test
    void addsPolynomialsCorrectly() {
        double[] p1 = {1.0, 2.0, 3.0};
        double[] p2 = {4.0, 5.0};
        double[] expected = {1.0, 6.0, 8.0};
        assertArrayEquals(expected, PolynomialHelpers.add(p1, p2), 1e-15);
    }

    @Test
    void multipliesPolynomialsCorrectly() {
        double[] p1 = {1.0, -2.0};
        double[] p2 = {1.0, -3.0};
        double[] expected = {1.0, -5.0, 6.0};
        assertArrayEquals(expected, PolynomialHelpers.multiply(p1, p2), 1e-15);
    }

    @Test
    void findsRootsCorrectlyForRealRoots() {
        // s^2 + 3s + 2 = 0 has roots -1, -2
        double[] coeffs = {1.0, 3.0, 2.0};
        double[][] roots = PolynomialHelpers.roots(coeffs);
        assertEquals(2, roots.length);

        // Sort roots to assert consistently
        sortRoots(roots);

        assertEquals(-2.0, roots[0][0], 1e-8);
        assertEquals(0.0, roots[0][1], 1e-8);
        assertEquals(-1.0, roots[1][0], 1e-8);
        assertEquals(0.0, roots[1][1], 1e-8);
    }

    @Test
    void findsRootsCorrectlyForComplexRoots() {
        // s^2 + 2s + 5 = 0 has roots -1 + 2j, -1 - 2j
        double[] coeffs = {1.0, 2.0, 5.0};
        double[][] roots = PolynomialHelpers.roots(coeffs);
        assertEquals(2, roots.length);

        sortRoots(roots);

        assertEquals(-1.0, roots[0][0], 1e-8);
        assertEquals(-2.0, roots[0][1], 1e-8);
        assertEquals(-1.0, roots[1][0], 1e-8);
        assertEquals(2.0, roots[1][1], 1e-8);
    }

    @Test
    void expandsRootsCorrectly() {
        double[][] roots = {
                {-2.0, 0.0},
                {-1.0, 0.0}
        };
        double[] expected = {1.0, 3.0, 2.0};
        assertArrayEquals(expected, PolynomialHelpers.expandRoots(roots), 1e-8);

        double[][] complexRoots = {
                {-1.0, -2.0},
                {-1.0, 2.0}
        };
        double[] expectedComplex = {1.0, 2.0, 5.0};
        assertArrayEquals(expectedComplex, PolynomialHelpers.expandRoots(complexRoots), 1e-8);
    }

    @Test
    void multiplyRawDoesNotTrimLeadingZeros() {
        double[] p1 = {0.0, 1.0, 2.0};
        double[] p2 = {0.0, 1.0, 3.0};
        // Raw multiplication output size: 3 + 3 - 1 = 5
        double[] expected = {0.0, 0.0, 1.0, 5.0, 6.0};
        assertArrayEquals(expected, PolynomialHelpers.multiplyRaw(p1, p2), 1e-15);
    }

    @Test
    void addRawDoesNotTrimLeadingZeros() {
        double[] p1 = {0.0, 1.0, 2.0};
        double[] p2 = {0.0, 4.0, 5.0};
        double[] expected = {0.0, 5.0, 7.0};
        assertArrayEquals(expected, PolynomialHelpers.addRaw(p1, p2), 1e-15);
    }

    @Test
    void seriesReturnsExpectedCoefficients() {
        double[] num1 = {0.0, 1.0};
        double[] den1 = {1.0, 1.0};
        double[] num2 = {0.0, 2.0};
        double[] den2 = {1.0, 3.0};

        double[][] result = PolynomialHelpers.series(num1, den1, num2, den2);
        double[] expectedNum = {0.0, 0.0, 2.0};
        double[] expectedDen = {1.0, 4.0, 3.0};

        assertArrayEquals(expectedNum, result[0], 1e-15);
        assertArrayEquals(expectedDen, result[1], 1e-15);
    }

    @Test
    void parallelReturnsExpectedCoefficients() {
        double[] num1 = {0.0, 1.0};
        double[] den1 = {1.0, 1.0};
        double[] num2 = {0.0, 2.0};
        double[] den2 = {1.0, 3.0};

        double[][] result = PolynomialHelpers.parallel(num1, den1, num2, den2);
        double[] expectedNum = {0.0, 3.0, 5.0};
        double[] expectedDen = {1.0, 4.0, 3.0};

        assertArrayEquals(expectedNum, result[0], 1e-15);
        assertArrayEquals(expectedDen, result[1], 1e-15);
    }

    @Test
    void feedbackReturnsExpectedCoefficients() {
        double[] num1 = {0.0, 1.0};
        double[] den1 = {1.0, 1.0};
        double[] num2 = {1.0};
        double[] den2 = {1.0};

        double[][] result = PolynomialHelpers.feedback(num1, den1, num2, den2, 1.0); // negative feedback
        double[] expectedNum = {0.0, 1.0};
        double[] expectedDen = {1.0, 2.0};

        assertArrayEquals(expectedNum, result[0], 1e-15);
        assertArrayEquals(expectedDen, result[1], 1e-15);
    }

    @Test
    void bodeCalculatesCorrectlyForFirstOrder() {
        // G(s) = 1 / (s + 1)
        double[] num = {1.0};
        double[] den = {1.0, 1.0};
        double[] omega = {1.0};
        double[][] res = PolynomialHelpers.bode(num, den, omega);
        // At w = 1, magnitude = 20 * log10(1/sqrt(2)) = -3.0102999566 dB
        // phase = -45 degrees
        assertEquals(-3.0102999566, res[0][0], 1e-6);
        assertEquals(-45.0, res[1][0], 1e-6);
    }

    @Test
    void nyquistCalculatesCorrectlyForFirstOrder() {
        // G(s) = 1 / (s + 1)
        double[] num = {1.0};
        double[] den = {1.0, 1.0};
        double[] omega = {1.0};
        double[][] res = PolynomialHelpers.nyquist(num, den, omega);
        // At w = 1, G(j) = 1/(j+1) = 0.5 - 0.5j
        assertEquals(0.5, res[0][0], 1e-6);
        assertEquals(-0.5, res[1][0], 1e-6);
    }

    @Test
    void marginCalculatesCorrectlyForThirdOrderSystem() {
        // G(s) = 2 / (s^3 + 3s^2 + 2s)
        double[] num = {2.0};
        double[] den = {1.0, 3.0, 2.0, 0.0};
        double[] res = PolynomialHelpers.margin(num, den);
        
        // gm_db should be ~20*log10(3) = 9.542425 dB
        // w_cp (phase crossover frequency) should be sqrt(2) = 1.41421356 rad/s
        assertEquals(20.0 * Math.log10(3.0), res[0], 1e-2);
        assertEquals(Math.sqrt(2.0), res[3], 1e-2);
        
        // w_cg (gain crossover frequency) should be ~0.75
        assertEquals(0.75, res[2], 1e-2);
    }

    @Test
    void routhReportsStableSystem() {
        // (s+1)(s+2)(s+3) = s^3 + 6s^2 + 11s + 6, all roots in LHP
        double[] den = {1.0, 6.0, 11.0, 6.0};
        assertEquals(0, PolynomialHelpers.routh(den));
    }

    @Test
    void routhCountsRightHalfPlanePoles() {
        // s^3 + s^2 + 2s + 8 has two right-half-plane roots (classic Nise example)
        double[] den = {1.0, 1.0, 2.0, 8.0};
        assertEquals(2, PolynomialHelpers.routh(den));
    }

    @Test
    void routhHandlesRowOfZeros() {
        // s^3 + 2s^2 + 3s + 6 = (s+2)(s^2+3): jw-axis roots, no RHP poles
        double[] den = {1.0, 2.0, 3.0, 6.0};
        assertEquals(0, PolynomialHelpers.routh(den));
    }

    @Test
    void c2dTustinMatchesKnownIntegratorMapping() {
        // 1/s with Tustin -> (Ts/2)(z+1)/(z-1)
        double ts = 0.1;
        double[][] hz = PolynomialHelpers.c2d(new double[]{1.0}, new double[]{1.0, 0.0}, ts, "tustin");
        assertArrayEquals(new double[]{ts / 2.0, ts / 2.0}, hz[0], 1e-12);
        assertArrayEquals(new double[]{1.0, -1.0}, hz[1], 1e-12);
    }

    @Test
    void d2cInvertsC2dTustin() {
        // Round-trip a first-order plant through c2d then d2c recovers it
        double ts = 0.05;
        double[] num = {2.0};
        double[] den = {1.0, 3.0}; // 2/(s+3)
        double[][] hz = PolynomialHelpers.c2d(num, den, ts, "tustin");
        double[][] back = PolynomialHelpers.d2c(hz[0], hz[1], ts, "tustin");
        // Normalise both to monic denominator for comparison
        assertEquals(num[0] / den[0], back[0][back[0].length - 1] / back[1][0], 1e-9);
        assertEquals(den[1] / den[0], back[1][1] / back[1][0], 1e-9);
    }

    @Test
    void c2dZohMatchesFirstOrderExact() {
        // a/(s+a) with ZOH -> (1 - e^{-aT}) z^-... : denominator pole at e^{-aT}
        double a = 2.0;
        double ts = 0.1;
        double[][] hz = PolynomialHelpers.c2d(new double[]{a}, new double[]{1.0, a}, ts, "zoh");
        double pole = Math.exp(-a * ts);
        // denominator z - e^{-aT}
        assertEquals(1.0, hz[1][0], 1e-9);
        assertEquals(-pole, hz[1][1], 1e-6);
        // numerator gain 1 - e^{-aT} on z^0 term
        assertEquals(1.0 - pole, hz[0][hz[0].length - 1], 1e-6);
    }

    @Test
    void residueComputesPartialFractions() {
        // (s+3)/(s^2+3s+2) = 2/(s+1) - 1/(s+2)
        PolynomialHelpers.ResidueResult res =
                PolynomialHelpers.residue(new double[]{1, 3}, new double[]{1, 3, 2});
        assertEquals(0.0, res.k(), 1e-12);
        assertEquals(2, res.poles().length);
        for (int i = 0; i < 2; i++) {
            double p = res.poles()[i][0];
            double r = res.residues()[i][0];
            assertEquals(0.0, res.poles()[i][1], 1e-9);
            assertEquals(0.0, res.residues()[i][1], 1e-9);
            if (Math.abs(p + 1.0) < 1e-6) {
                assertEquals(2.0, r, 1e-9);
            } else if (Math.abs(p + 2.0) < 1e-6) {
                assertEquals(-1.0, r, 1e-9);
            } else {
                fail("unexpected pole " + p);
            }
        }
    }

    @Test
    void residueSplitsDirectTermWhenBiproper() {
        // (s^2+3s+5)/(s^2+3s+2) = 1 + 3/(s+1) - 3/(s+2)
        PolynomialHelpers.ResidueResult res =
                PolynomialHelpers.residue(new double[]{1, 3, 5}, new double[]{1, 3, 2});
        assertEquals(1.0, res.k(), 1e-9);
        for (int i = 0; i < 2; i++) {
            double p = res.poles()[i][0];
            double r = res.residues()[i][0];
            if (Math.abs(p + 1.0) < 1e-6) {
                assertEquals(3.0, r, 1e-9);
            } else if (Math.abs(p + 2.0) < 1e-6) {
                assertEquals(-3.0, r, 1e-9);
            } else {
                fail("unexpected pole " + p);
            }
        }
    }

    @Test
    void errorConstantsForType0System() {
        // G = 5/(s+1): type 0 -> Kp = 5, Kv = 0, Ka = 0
        double[] k = PolynomialHelpers.errorConstants(new double[]{5}, new double[]{1, 1});
        assertEquals(5.0, k[0], 1e-9);
        assertEquals(0.0, k[1], 1e-9);
        assertEquals(0.0, k[2], 1e-9);
    }

    @Test
    void errorConstantsForType1System() {
        // G = 5/(s^2+s) = 5/(s(s+1)): type 1 -> Kp = inf, Kv = 5, Ka = 0
        double[] k = PolynomialHelpers.errorConstants(new double[]{5}, new double[]{1, 1, 0});
        assertEquals(Double.POSITIVE_INFINITY, k[0]);
        assertEquals(5.0, k[1], 1e-9);
        assertEquals(0.0, k[2], 1e-9);
    }

    @Test
    void errorConstantsForType2System() {
        // G = 5/(s^3+s^2) = 5/(s^2(s+1)): type 2 -> Kp = Kv = inf, Ka = 5
        double[] k = PolynomialHelpers.errorConstants(new double[]{5}, new double[]{1, 1, 0, 0});
        assertEquals(Double.POSITIVE_INFINITY, k[0]);
        assertEquals(Double.POSITIVE_INFINITY, k[1]);
        assertEquals(5.0, k[2], 1e-9);
    }

    @Test
    void masonSingleFeedbackLoop() {
        // 1 ->(2)-> 2 ->(3)-> 3, feedback 3 ->(0.5)-> 2: T = ab/(1 - bf) = 6/(1-1.5) = -12
        double[][] g = {
                {0, 2, 0},
                {0, 0, 3},
                {0, 0.5, 0}
        };
        assertEquals(-12.0, PolynomialHelpers.mason(g, 0, 2), 1e-9);
    }

    @Test
    void masonTwoNonTouchingLoops() {
        // path 1->2->3->4 (gain 1) with self-loops 0.5 at nodes 2 and 3 (non-touching):
        // delta = 1 - (0.5+0.5) + (0.25) = 0.25; T = 1/0.25 = 4
        double[][] g = {
                {0, 1, 0, 0},
                {0, 0.5, 1, 0},
                {0, 0, 0.5, 1},
                {0, 0, 0, 0}
        };
        assertEquals(4.0, PolynomialHelpers.mason(g, 0, 3), 1e-9);
    }

    @Test
    void residueHandlesRepeatedPole() {
        // 1/(s+1)^2 = 1/(s+1)^2 + 0/(s+1): A_2 = 1, A_1 = 0 at the double pole -1
        PolynomialHelpers.ResidueResult res =
                PolynomialHelpers.residue(new double[]{1}, new double[]{1, 2, 1});
        assertEquals(2, res.poles().length);
        assertEquals(0.0, res.k(), 1e-12);
        for (int i = 0; i < 2; i++) {
            assertEquals(-1.0, res.poles()[i][0], 1e-6);
            if (res.orders()[i] == 2) {
                assertEquals(1.0, res.residues()[i][0], 1e-9);
            } else {
                assertEquals(0.0, res.residues()[i][0], 1e-9);
            }
        }
    }

    @Test
    void residueRepeatedPoleWithNonzeroFirstOrderTerm() {
        // s/(s+1)^2 = -1/(s+1)^2 + 1/(s+1): A_2 = -1, A_1 = 1
        PolynomialHelpers.ResidueResult res =
                PolynomialHelpers.residue(new double[]{1, 0}, new double[]{1, 2, 1});
        for (int i = 0; i < 2; i++) {
            if (res.orders()[i] == 2) {
                assertEquals(-1.0, res.residues()[i][0], 1e-9);
            } else {
                assertEquals(1.0, res.residues()[i][0], 1e-9);
            }
        }
    }

    @Test
    void residueRepeatedPoleMixedWithSimplePole() {
        // 1/(s(s+1)^2) = 1/s - 1/(s+1) - 1/(s+1)^2
        PolynomialHelpers.ResidueResult res =
                PolynomialHelpers.residue(new double[]{1}, new double[]{1, 2, 1, 0});
        assertEquals(3, res.poles().length);
        for (int i = 0; i < 3; i++) {
            double p = res.poles()[i][0];
            int ord = res.orders()[i];
            double r = res.residues()[i][0];
            if (Math.abs(p) < 1e-6) {
                assertEquals(1.0, r, 1e-9);          // 1/s
            } else if (ord == 1) {
                assertEquals(-1.0, r, 1e-9);         // -1/(s+1)
            } else {
                assertEquals(-1.0, r, 1e-9);         // -1/(s+1)^2
            }
        }
    }

    private void sortRoots(double[][] roots) {
        java.util.Arrays.sort(roots, (a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            if (cmp != 0) return cmp;
            return Double.compare(a[1], b[1]);
        });
    }
}
