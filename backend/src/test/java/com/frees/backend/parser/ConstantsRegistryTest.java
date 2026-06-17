package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConstantsRegistryTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void hashSuffixedConstantsAreSubstitutedNotTreatedAsVariables() {
        List<Equation> equations = parser.parse("x = R#");
        // R# folds to a numeric literal, so the only variable is x.
        assertEquals(Set.of("x"), equations.get(0).variables());
    }

    @Test
    void userVariableNamedRIsIndependentOfConstantRHash() {
        List<Equation> equations = parser.parse("y = R + 1");
        assertTrue(equations.get(0).variables().contains("r"),
                "A bare 'R' must remain a user variable, distinct from R#");
    }

    @Test
    void gravityConstantHasExpectedValue() {
        List<Equation> equations = parser.parse("a = g#");
        // RHS evaluates to standard gravity with no free variables.
        double value = Evaluator.eval(equations.get(0).rhs(), Map.of());
        assertEquals(9.80665, value, 1e-9);
    }

    @Test
    void registryExposesCoreConstants() {
        assertNotNull(ConstantsRegistry.lookup("R#"));
        assertNotNull(ConstantsRegistry.lookup("pi#"));
        assertNotNull(ConstantsRegistry.lookup("sigma#"));
    }
}
