package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Closed-form radiation view-factor built-ins, checked against standard
 * textbook values (the chart-lookup configurations in Long &amp; Sayma /
 * Incropera).
 */
class ViewFactorTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void perpendicularEqualSquaresSharingEdge() {
        // Two equal perpendicular squares sharing a common edge: F_12 ~ 0.2000.
        var result = solver.solve("F = viewfactor_perp(1, 1, 1)");
        assertEquals(0.20004, result.variables().get("F"), 1e-4);
    }

    @Test
    void alignedParallelEqualSquares() {
        // Two directly opposed equal squares, side = spacing: F_12 ~ 0.1998.
        var result = solver.solve("F = viewfactor_plates(1, 1, 1)");
        assertEquals(0.19982, result.variables().get("F"), 1e-4);
    }

    @Test
    void coaxialEqualDisks() {
        // Two equal coaxial disks, radius = spacing: F_12 ~ 0.3820.
        var result = solver.solve("F = viewfactor_disks(1, 1, 1)");
        assertEquals(0.5 * (3.0 - Math.sqrt(5.0)), result.variables().get("F"), 1e-6);
    }

    @Test
    void coaxialDisksReciprocityWithUnequalRadii() {
        // F_12 * A1 = F_21 * A2 reciprocity check for unequal disks (pi cancels,
        // so compare F12 * r1^2 against F21 * r2^2 with r1 = 0.5, r2 = 1.0).
        var result = solver.solve(
                "F12 = viewfactor_disks(0.5, 1.0, 0.4)\n"
                        + "F21 = viewfactor_disks(1.0, 0.5, 0.4)\n"
                        + "lhs = F12 * 0.25\n"
                        + "rhs = F21 * 1.0");
        Map<String, Double> v = result.variables();
        assertEquals(v.get("lhs"), v.get("rhs"), 1e-6);
    }
}
