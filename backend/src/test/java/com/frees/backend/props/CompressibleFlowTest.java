package com.frees.backend.props;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Ideal-gas compressible-flow relations, checked against standard gas-dynamics
 * tables (k = 1.4) from a standard thermodynamics textbook,
 * Appendix tables A-13..A-15, cross-checked against published tables.
 */
class CompressibleFlowTest {

    private static final double K = 1.4;
    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void isentropicRatiosAtMach2() {
        assertEquals(1.8, CompressibleFlow.t0OverT(2.0, K), 1e-9);
        assertEquals(7.824, CompressibleFlow.p0OverP(2.0, K), 0.002);
        assertEquals(4.347, CompressibleFlow.rho0OverRho(2.0, K), 0.002);
        assertEquals(1.6875, CompressibleFlow.aOverAstar(2.0, K), 1e-4);
        // Sonic throat: every ratio collapses to its M=1 reference.
        assertEquals(1.0, CompressibleFlow.aOverAstar(1.0, K), 1e-12);
    }

    @Test
    void areaRatioInvertsToBothBranches() {
        double ar = CompressibleFlow.aOverAstar(2.0, K);
        assertEquals(2.0, CompressibleFlow.machFromAOverAstar(ar, K, "supersonic"), 1e-6);
        // The same area ratio has a subsonic root below 1.
        double msub = CompressibleFlow.machFromAOverAstar(ar, K, "subsonic");
        assertTrue(msub > 0.0 && msub < 1.0, "subsonic root must be < 1, got " + msub);
        assertEquals(ar, CompressibleFlow.aOverAstar(msub, K), 1e-6);
    }

    @Test
    void normalShockAtMach2() {
        assertEquals(0.57735, CompressibleFlow.machBehindShock(2.0, K), 1e-4);
        assertEquals(4.5, CompressibleFlow.shockPressureRatio(2.0, K), 1e-6);
        assertEquals(1.6875, CompressibleFlow.shockTemperatureRatio(2.0, K), 1e-4);
        assertEquals(2.6667, CompressibleFlow.shockDensityRatio(2.0, K), 1e-3);
        assertEquals(0.7209, CompressibleFlow.shockStagnationPressureRatio(2.0, K), 1e-3);
        // A normal shock requires a supersonic upstream Mach number.
        assertThrows(PropertyEvaluationException.class,
                () -> CompressibleFlow.machBehindShock(0.8, K));
    }

    @Test
    void rayleighAndFannoSonicLimitsAndMach2() {
        // At M = 1 every sonic-referenced ratio is unity (Fanno duct length 0).
        assertEquals(1.0, CompressibleFlow.rayleighPOverPstar(1.0, K), 1e-12);
        assertEquals(1.0, CompressibleFlow.rayleighT0OverT0star(1.0, K), 1e-12);
        assertEquals(1.0, CompressibleFlow.fannoTOverTstar(1.0, K), 1e-12);
        assertEquals(0.0, CompressibleFlow.fanno4fLmaxOverD(1.0, K), 1e-12);
        // Rayleigh at M = 2.
        assertEquals(0.36364, CompressibleFlow.rayleighPOverPstar(2.0, K), 1e-4);
        assertEquals(0.52893, CompressibleFlow.rayleighTOverTstar(2.0, K), 1e-4);
        assertEquals(0.79339, CompressibleFlow.rayleighT0OverT0star(2.0, K), 1e-4);
        // Fanno at M = 2.
        assertEquals(0.66667, CompressibleFlow.fannoTOverTstar(2.0, K), 1e-4);
        assertEquals(0.40825, CompressibleFlow.fannoPOverPstar(2.0, K), 1e-4);
        assertEquals(1.6875, CompressibleFlow.fannoP0OverP0star(2.0, K), 1e-4);
        assertEquals(0.30499, CompressibleFlow.fanno4fLmaxOverD(2.0, K), 1e-4);
    }

    @Test
    void prandtlMeyerForwardAndInverse() {
        // nu(2) = 26.38 deg, nu(3) = 49.76 deg (k = 1.4).
        assertEquals(Math.toRadians(26.380), CompressibleFlow.prandtlMeyer(2.0, K), 1e-4);
        assertEquals(Math.toRadians(49.757), CompressibleFlow.prandtlMeyer(3.0, K), 1e-4);
        double nu = CompressibleFlow.prandtlMeyer(2.5, K);
        assertEquals(2.5, CompressibleFlow.machFromPrandtlMeyer(nu, K), 1e-6);
    }

    @Test
    void obliqueShockWeakAndStrongRoots() {
        double theta = Math.toRadians(20.0);
        double betaWeak = CompressibleFlow.betaOblique(2.0, theta, K, "weak");
        double betaStrong = CompressibleFlow.betaOblique(2.0, theta, K, "strong");
        // Standard chart: M1 = 2, theta = 20 deg -> weak ~53.4 deg, strong ~74.3 deg.
        assertEquals(Math.toRadians(53.42), betaWeak, 1e-3);
        assertEquals(Math.toRadians(74.30), betaStrong, 1e-3);
        assertTrue(betaStrong > betaWeak);
        // Both wave angles reproduce the requested deflection.
        assertEquals(theta, CompressibleFlow.thetaOblique(2.0, betaWeak, K), 1e-6);
        assertEquals(theta, CompressibleFlow.thetaOblique(2.0, betaStrong, K), 1e-6);
        // Beyond the detachment angle there is no attached oblique shock.
        assertThrows(PropertyEvaluationException.class,
                () -> CompressibleFlow.betaOblique(2.0, Math.toRadians(40.0), K, "weak"));
    }

    @Test
    void wiredThroughSolverAndInvertedByNewton() {
        // Forward call inside an equation, plus Newton inverting P0_P for the Mach
        // number that yields a given stagnation-to-static pressure ratio.
        EquationSystemSolver.Result result = solver.solve("""
                k = 1.4
                ratio = P0_P(2.0, k)
                P0_P(M, k) = 4.0
                """);
        assertEquals(7.824, result.variables().get("ratio"), 0.002);
        assertEquals(1.55876, result.variables().get("M"), 1e-3);
    }
}
