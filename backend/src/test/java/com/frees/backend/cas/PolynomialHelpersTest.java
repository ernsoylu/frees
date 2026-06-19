package com.frees.backend.cas;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

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

    private void sortRoots(double[][] roots) {
        java.util.Arrays.sort(roots, (a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            if (cmp != 0) return cmp;
            return Double.compare(a[1], b[1]);
        });
    }
}
