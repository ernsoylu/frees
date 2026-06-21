package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** One-term-approximation transient conduction (Heisler/Gröber) solution. */
class HeislerChartsTest {

    @Test
    void planeWallCentreSurfaceAndHeat() {
        // Bi = 0.5, Fo = 0.5: zeta1 = 0.6533, C1 = 1.0696.
        double centre = HeislerCharts.temperature("wall", 0.5, 0.5, 0.0);
        double surface = HeislerCharts.temperature("wall", 0.5, 0.5, 1.0);
        double q = HeislerCharts.heatRatio("wall", 0.5, 0.5);
        assertEquals(0.864, centre, 0.005);
        assertEquals(0.686, surface, 0.005);
        assertEquals(0.196, q, 0.005);
        assertTrue(surface < centre, "surface cools faster than the centre");
    }

    @Test
    void smallBiotApproachesLumpedCapacitance() {
        // For Bi << 1 the centre temperature follows exp(-Bi*Fo) (lumped limit).
        double centre = HeislerCharts.temperature("wall", 0.01, 10.0, 0.0);
        assertEquals(Math.exp(-0.01 * 10.0), centre, 0.01);
    }

    @Test
    void cylinderAndSphereAreFiniteAndOrdered() {
        // Centre temperatures are valid fractions and the sphere (most surface
        // area per volume) cools fastest, the wall slowest, for the same Bi/Fo.
        double wall = HeislerCharts.temperature("wall", 1.0, 0.3, 0.0);
        double cyl = HeislerCharts.temperature("cylinder", 1.0, 0.3, 0.0);
        double sphere = HeislerCharts.temperature("sphere", 1.0, 0.3, 0.0);
        for (double v : new double[]{wall, cyl, sphere}) {
            assertTrue(v > 0.0 && v < 1.0, "theta* must be a fraction, got " + v);
        }
        assertTrue(sphere < cyl && cyl < wall, "sphere cools fastest, wall slowest");
        // Heat removed ordering follows the same way.
        assertTrue(HeislerCharts.heatRatio("sphere", 1.0, 0.3)
                > HeislerCharts.heatRatio("wall", 1.0, 0.3));
    }

    @Test
    void rejectsUnknownGeometry() {
        assertThrows(SolverException.class, () -> HeislerCharts.temperature("pyramid", 1.0, 0.3, 0.0));
    }

    @Test
    void heislerThroughTheSolver() {
        // Bi and Fo computed from physical quantities, then the centre temperature
        // and heat ratio read off — all dimensionless, so zero unit warnings.
        EquationSystemSolver.Result r = new EquationSystemSolver().solve(
                "h = 100 [W/m^2-K]\n"
                        + "k = 0.6 [W/m-K]\n"
                        + "alpha = 0.15e-6 [m^2/s]\n"
                        + "L = 0.02 [m]\n"
                        + "t = 600 [s]\n"
                        + "Bi = h * L / k\n"
                        + "Fo = alpha * t / L^2\n"
                        + "theta_c = heisler_temp('wall', Bi, Fo, 0)\n"
                        + "Q_ratio = heisler_q('wall', Bi, Fo)");
        double theta = r.variables().get("theta_c");
        double q = r.variables().get("Q_ratio");
        assertTrue(theta > 0.0 && theta < 1.0, "centre temperature ratio out of range: " + theta);
        assertTrue(q > 0.0 && q < 1.0, "heat ratio out of range: " + q);
    }
}
