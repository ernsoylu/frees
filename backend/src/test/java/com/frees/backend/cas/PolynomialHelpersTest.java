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

    private void sortRoots(double[][] roots) {
        java.util.Arrays.sort(roots, (a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            if (cmp != 0) return cmp;
            return Double.compare(a[1], b[1]);
        });
    }
}
