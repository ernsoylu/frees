package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Solver robustness for implicit-property inversions (todo §8.5 / finding 8). A
 * derived-property boundary such as {@code Temperature(P, h) = T} makes the
 * enthalpy {@code h} an implicit unknown the Newton solver must find by
 * inverting a CoolProp call. Three independent failure modes were diagnosed and
 * fixed:
 *
 * <ol>
 *   <li><b>Invalid base point</b> — {@code h} starts at the default guess 1.0
 *       (1 J/kg, below every fluid's table floor), so the first residual is NaN
 *       and the solve never starts. Fixed by domain-aware seeding of property
 *       arguments ({@code EquationSystemSolver.seedPropertyArgumentGuesses}).</li>
 *   <li><b>NaN-poisoned Jacobian</b> — a finite-difference probe steps a CoolProp
 *       argument outside its valid box, returning a NaN derivative column. Fixed
 *       by range-aware perturbation in {@code NewtonSolver.computeJacobianColumn}
 *       (respect bounds, flip direction on a NaN probe, never grow into an
 *       invalid region, guarantee a finite column).</li>
 *   <li><b>Two-phase dome</b> (§8.7) — crossing the saturation dome, {@code
 *       dT/dh≈0}, so Newton's gradient vanishes even though the residual is
 *       monotonic and sign-changing overall. Fixed by a single-unknown bracketing
 *       fallback ({@code EquationSystemSolver.tryUnivariateBracketingSolve}) that
 *       brackets the sign change and bisects across the plateau, plus a
 *       correctness fix so a NaN residual is no longer mistaken for convergence
 *       ({@code NewtonSolver.withinResidualTolerance}).</li>
 * </ol>
 */
class PropertyArgumentSeedingTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Supercritical 30 MPa: Temperature(P,h) is monotonic in h (no dome). */
    private static final String SUPERCRITICAL = """
            P = 30000000 [Pa]
            T = 753.15 [K]
            T = Temperature(Water, P=P, h=h)
            """;

    @Test
    void supercriticalInversionConvergesFromDefaultGuess() {
        // Mode 1: with no seed, h starts at 1.0 and the old solver could not even
        // evaluate the first residual. Property-argument seeding puts h inside the
        // valid box; the monotonic path then converges with no user guess.
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        double h = solver.solve(SUPERCRITICAL).variables().get("h");
        assertTrue(h > 2.7e6 && h < 3.3e6, "expected h ~3.0 MJ/kg, got " + h);
    }

    @Test
    void supercriticalInversionConvergesWithUserGuess() {
        // The same case with an explicit guess still works (the user guess wins
        // over the nominal seed) — guards against the seed overriding user info.
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, VariableSpec> specs = new HashMap<>();
        specs.put("h", new VariableSpec("h", 1.0e5,
                Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
        double h = solver.solve(SUPERCRITICAL, SolverSettings.DEFAULTS, specs)
                .variables().get("h");
        assertTrue(h > 2.7e6 && h < 3.3e6, "expected h ~3.0 MJ/kg, got " + h);
    }

    @Test
    void subcriticalInversionConvergesWhenSeededAtTheAnswer() {
        // Seeded inside the target (superheated) region, the subcritical case
        // converges — the dome is never crossed.
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, VariableSpec> specs = new HashMap<>();
        specs.put("h", new VariableSpec("h", 3.4e6,
                Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
        String src = """
                P = 8000000 [Pa]
                T = 753.15 [K]
                T = Temperature(Water, P=P, h=h)
                """;
        double h = solver.solve(src, SolverSettings.DEFAULTS, specs).variables().get("h");
        assertTrue(h > 3.0e6 && h < 3.8e6, "expected h ~3.4 MJ/kg, got " + h);
    }

    @Test
    void subcriticalInversionAcrossDomeConvergesFromDefaultGuess() {
        // Mode 3 (§8.7): the subcritical 8 MPa inversion to a superheated answer
        // must cross the two-phase dome, where dT/dh≈0 makes Newton stall. The
        // univariate bracketing fallback (Brent/bisection) crosses the plateau
        // because it is sign-bracketed, not gradient-based — so this now solves
        // from a plain default guess, no seed past the dome required.
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                P = 8000000 [Pa]
                T = 753.15 [K]
                T = Temperature(Water, P=P, h=h)
                """;
        double h = solver.solve(src).variables().get("h");
        assertTrue(h > 3.0e6 && h < 3.8e6, "expected h ~3.4 MJ/kg, got " + h);
    }
}
