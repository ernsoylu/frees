package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Solver robustness on Newton-hostile starts: near-singular or badly scaled
 * Jacobians, exchange-symmetric systems, cliffs and degenerate products.
 * The symmetric-start case failed outright before the symmetry-breaking
 * retry transforms existed; the rest pin the ladder's contract and route
 * through the damped (Levenberg-Marquardt) rescue on the way.
 */
class LmFallbackTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Badly scaled product/exponential pair; the standard start (0, 1). */
    @Test
    void badlyScaledProductExponentialPair() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 0.0, -10.0, 10.0),
                "y", new VariableSpec("y", 1.0, -10.0, 20.0));
        Map<String, Double> v = solver.solve(
                "10000*x*y = 1\nexp(-x) + exp(-y) = 1.0001",
                SolverSettings.DEFAULTS, specs).variables();
        assertEquals(1.0, 10000.0 * v.get("x") * v.get("y"), 1e-9);
        assertEquals(1.0001, Math.exp(-v.get("x")) + Math.exp(-v.get("y")), 1e-9);
    }

    /** Same pair from the symmetric start (1, 1): the Jacobian columns are
     *  identical on the x = y line, so the undamped step keeps the iterate
     *  trapped on the diagonal. */
    @Test
    void badlyScaledPairFromSymmetricStart() {
        Map<String, Double> v = solver.solve(
                "10000*x*y = 1\nexp(-x) + exp(-y) = 1.0001").variables();
        assertEquals(1.0, 10000.0 * v.get("x") * v.get("y"), 1e-9);
        assertEquals(1.0001, Math.exp(-v.get("x")) + Math.exp(-v.get("y")), 1e-9);
    }

    /** Zero column at the start: at y = 1 neither residual depends on x. */
    @Test
    void zeroColumnAtStart() {
        Map<String, Double> v = solver.solve(
                "1.5 = x*(1 - y)\n2.25 = x*(1 - y^2)").variables();
        assertEquals(1.5, v.get("x") * (1 - v.get("y")), 1e-9);
        assertEquals(2.25, v.get("x") * (1 - v.get("y") * v.get("y")), 1e-9);
    }

    /** Exponential cliff: the Newton step from the cliff side overshoots. */
    @Test
    void exponentialCliff() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 2.0, -5.0, 5.0),
                "y", new VariableSpec("y", 1.0, -5.0, 5.0));
        Map<String, Double> v = solver.solve(
                "exp(20*(x-1)) + y = 1\nx + y^2 = 2",
                SolverSettings.DEFAULTS, specs).variables();
        assertEquals(1.0, Math.exp(20 * (v.get("x") - 1)) + v.get("y"), 1e-9);
        assertEquals(2.0, v.get("x") + v.get("y") * v.get("y"), 1e-9);
    }

    /** Near-degenerate product: x*y must be tiny while the sum is ~2. */
    @Test
    void nearDegenerateProduct() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 0.3, 0.0, 10.0),
                "y", new VariableSpec("y", 1.5, 0.0, 10.0));
        Map<String, Double> v = solver.solve(
                "x^2*y^2 = 1e-8\nx + y = 2.0002",
                SolverSettings.DEFAULTS, specs).variables();
        assertEquals(1e-8, Math.pow(v.get("x") * v.get("y"), 2), 1e-12);
        assertEquals(2.0002, v.get("x") + v.get("y"), 1e-9);
    }

    /** Mixed transcendental coupling from a poor start. */
    @Test
    void trigHyperbolicCoupling() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 3.0, 0.0, 3.1),
                "y", new VariableSpec("y", 3.0, 0.0, 6.0));
        Map<String, Double> v = solver.solve(
                "sin(x)*cosh(y) = 1.2\nx*y = 0.5",
                SolverSettings.DEFAULTS, specs).variables();
        assertEquals(1.2, Math.sin(v.get("x")) * Math.cosh(v.get("y")), 1e-9);
        assertEquals(0.5, v.get("x") * v.get("y"), 1e-9);
    }
}
