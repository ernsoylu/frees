package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Low-GWP blend aliases: the parser lowercases unmapped fluid tokens, but
 * CoolProp's predefined-mixture registry needs the exact-case name — the alias
 * map bridges that. Each case is gated on the bundled CoolProp build actually
 * shipping the mixture, so a leaner build skips rather than fails.
 */
class BlendAliasTest {

    private static final List<String> BLENDS = List.of(
            "R448A", "R449A", "R452A", "R452B", "R454A",
            "R454B", "R454C", "R455A", "R513A", "R515B");

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @TestFactory
    Stream<DynamicTest> lowercaseSpellingReachesTheBlend() {
        return BLENDS.stream().map(fluid -> DynamicTest.dynamicTest(fluid, () -> {
            assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
            assumeTrue(coolPropHas(fluid), "CoolProp build lacks the " + fluid + " mixture");
            EquationSystemSolver.Result result = solver.solve(
                    "t_sat = Temperature(" + fluid.toLowerCase(Locale.ROOT) + ", P=400000, x=0)");
            double t = result.variables().get("t_sat");
            assertTrue(t > 150 && t < 350, fluid + " bubble point at 4 bar looks wrong: " + t + " K");
        }));
    }

    private static boolean coolPropHas(String fluid) {
        try {
            double t = CoolProp.propsSI("T", "P", 400000, "Q", 0.0, fluid);
            return Double.isFinite(t);
        } catch (RuntimeException e) {
            return false;
        }
    }
}
