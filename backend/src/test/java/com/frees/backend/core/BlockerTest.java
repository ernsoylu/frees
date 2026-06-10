package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.parser.EquationParser;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BlockerTest {

    private final EquationParser parser = new EquationParser();
    private final Blocker blocker = new Blocker();

    @Test
    void sequentialSystemSplitsIntoSingletonBlocksInSolveOrder() {
        // x = 2 must be solved before y = x + 1, regardless of input order.
        List<Equation> equations = parser.parse("y = x + 1\nx = 2");
        List<Block> blocks = blocker.block(equations);

        assertEquals(2, blocks.size());
        assertEquals(List.of("x"), blocks.get(0).variables());
        assertEquals(List.of("y"), blocks.get(1).variables());
    }

    @Test
    void coupledSystemFormsOneBlock() {
        List<Equation> equations = parser.parse("x + y = 3\ny = z - 4\nz = x^2 - 3");
        List<Block> blocks = blocker.block(equations);

        assertEquals(1, blocks.size());
        assertEquals(3, blocks.get(0).equations().size());
    }

    @Test
    void mixedSystemOrdersBlocksByDependency() {
        // a is independent; (b, c) are coupled and depend on a; d depends on b.
        List<Equation> equations = parser.parse(
                "d = b + 1\nb + c = a\nb - c = 2\na = 10");
        List<Block> blocks = blocker.block(equations);

        assertEquals(3, blocks.size());
        assertEquals(List.of("a"), blocks.get(0).variables());
        assertTrue(blocks.get(1).variables().containsAll(List.of("b", "c")));
        assertEquals(List.of("d"), blocks.get(2).variables());
    }

    @Test
    void rejectsMismatchedEquationAndVariableCounts() {
        List<Equation> equations = parser.parse("x + y = 3");
        SolverException e = assertThrows(SolverException.class, () -> blocker.block(equations));
        assertTrue(e.getMessage().contains("underspecified"));
    }
}
