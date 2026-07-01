package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase S1 — the {@code (P,h)} bicubic property table. The pure-Java accuracy
 * tests always run; the CoolProp-grounded tests (incl. an R744 transcritical
 * sweep) gate on the native library, like the rest of the property suite.
 */
class PhPropertyTableTest {

    private static double[] linspace(double a, double b, int n) {
        double[] g = new double[n];
        for (int i = 0; i < n; i++) {
            g[i] = a + (b - a) * i / (n - 1);
        }
        return g;
    }

    @Test
    void reproducesNodalValuesExactly() {
        double[] p = linspace(1e5, 1e7, 21);
        double[] h = linspace(1e5, 5e5, 21);
        PhPropertyTable t = PhPropertyTable.build(p, h, (pp, hh) -> 3.0 + 2e-6 * pp + 4e-6 * hh);
        for (double pp : p) {
            for (double hh : h) {
                assertEquals(3.0 + 2e-6 * pp + 4e-6 * hh, t.value(pp, hh), 1e-6);
            }
        }
    }

    @Test
    void reproducesBilinearFunctionAndItsDerivatives() {
        // f = a + b*p + c*h + d*p*h ; bicubic Hermite with FD nodal tangents is exact for this.
        double a = 1.0;
        double b = 2e-6;
        double c = 5e-6;
        double d = 1e-12;
        double[] p = linspace(1e5, 1e7, 17);
        double[] h = linspace(1e5, 5e5, 17);
        PhPropertyTable t = PhPropertyTable.build(p, h, (pp, hh) -> a + b * pp + c * hh + d * pp * hh);

        double pq = 3.21e6;
        double hq = 2.34e5;
        PhPropertyTable.Value v = t.eval(pq, hq);
        assertEquals(a + b * pq + c * hq + d * pq * hq, v.value(), 1e-6);
        assertEquals(b + d * hq, v.dValuedP(), 1e-12);
        assertEquals(c + d * pq, v.dValuedH(), 1e-12);
    }

    @Test
    void analyticPartialsMatchFiniteDifferenceOnSmoothSurface() {
        // A smooth nonlinear surface; check the returned partials against a central FD of value().
        java.util.function.DoubleBinaryOperator f =
                (pp, hh) -> Math.sin(pp / 2.0e6) * Math.cos(hh / 2.0e5);
        double[] p = linspace(1e5, 1e7, 81);
        double[] h = linspace(1e5, 5e5, 81);
        PhPropertyTable t = PhPropertyTable.build(p, h, f);

        double pq = 4.0e6;
        double hq = 3.0e5;
        PhPropertyTable.Value v = t.eval(pq, hq);
        double dp = 1e3;
        double dh = 1e2;
        double fdP = (t.value(pq + dp, hq) - t.value(pq - dp, hq)) / (2 * dp);
        double fdH = (t.value(pq, hq + dh) - t.value(pq, hq - dh)) / (2 * dh);
        // analytic partials of the interpolant agree with FD of the interpolant (C1 surface)
        assertEquals(fdP, v.dValuedP(), 1e-9);
        assertEquals(fdH, v.dValuedH(), 1e-9);
        // and the interpolant tracks the true function to grid accuracy
        assertEquals(f.applyAsDouble(pq, hq), v.value(), 1e-3);
    }

    @Test
    void clampsOutsideTheGrid() {
        double[] p = linspace(1e5, 1e7, 11);
        double[] h = linspace(1e5, 5e5, 11);
        PhPropertyTable t = PhPropertyTable.build(p, h, (pp, hh) -> pp + hh);
        // below/above both axes -> clamped to the nearest corner value
        assertEquals(1e5 + 1e5, t.value(-1, -1), 1e-3);
        assertEquals(1e7 + 5e5, t.value(1e9, 1e9), 1e-3);
    }

    @Test
    void backfillsNonFiniteSamplesIntoASmoothSurface() {
        // Simulate a near-critical region where CoolProp returns NaN.
        double[] p = linspace(1e5, 1e7, 21);
        double[] h = linspace(1e5, 5e5, 21);
        PhPropertyTable t = PhPropertyTable.build(p, h, (pp, hh) -> {
            if (pp > 4e6 && pp < 6e6 && hh > 2e5 && hh < 3e5) {
                return Double.NaN;
            }
            return 10.0 + 1e-6 * pp;
        });
        // every query is finite despite the NaN hole
        for (double pp : linspace(1e5, 1e7, 50)) {
            for (double hh : linspace(1e5, 5e5, 50)) {
                assertTrue(Double.isFinite(t.value(pp, hh)),
                        "value at (" + pp + "," + hh + ") must be finite");
            }
        }
    }

    @Test
    void matchesCoolPropDensityInSuperheatedRegion() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp native library not available");
        // Superheated R134a: well away from the dome, so the bicubic is tight.
        double pMin = 5e5;
        double pMax = 2e6;
        double hMin = 4.3e5;
        double hMax = 5.2e5;
        PhPropertyTable rho = PhPropertyTable.fromCoolProp("D", "R134a", pMin, pMax, 41, hMin, hMax, 41);
        double pq = 1.1e6;
        double hq = 4.8e5;
        double exact = CoolProp.propsSI("D", "P", pq, "H", hq, "R134a");
        assertEquals(exact, rho.value(pq, hq), 0.02 * exact);
    }

    @Test
    void handlesR744TranscriticalRegion() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp native library not available");
        // R744 critical pressure ~7.38 MPa; sample a supercritical high-side box.
        double pMin = 8e6;
        double pMax = 1.2e7;
        double hMin = 3.0e5;
        double hMax = 5.0e5;
        PhPropertyTable rho = PhPropertyTable.fromCoolProp("D", "CO2", pMin, pMax, 51, hMin, hMax, 51);
        double pq = 9.5e6;
        double hq = 4.0e5;
        double exact = CoolProp.propsSI("D", "P", pq, "H", hq, "CO2");
        assertTrue(Double.isFinite(rho.value(pq, hq)));
        assertEquals(exact, rho.value(pq, hq), 0.05 * exact);
    }
}
