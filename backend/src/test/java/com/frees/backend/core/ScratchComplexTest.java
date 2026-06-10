package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import com.frees.backend.ast.Equation;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.parser.ComplexExpansion;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class ScratchComplexTest {

    @Test
    public void testComplex() {
        EquationSystemSolver solver = new EquationSystemSolver();
        SolverSettings settings = new SolverSettings(250, 1e-6, 1e-9, 3600.0, true);
        
        EquationParser parser = new EquationParser();
        EquationParser.ParseResult parsed = parser.parseResult("z^2 = -4");
        List<Equation> expanded = ComplexExpansion.expand(parsed.equations(), parsed.displayNames());
        
        System.out.println("EXPANDED EQUATIONS:");
        for (Equation eq : expanded) {
            System.out.println("  " + eq.lhs() + " = " + eq.rhs());
        }
        
        Blocker blocker = new Blocker();
        List<Block> blocks = blocker.block(expanded);
        System.out.println("BLOCKS:");
        for (Block b : blocks) {
            System.out.println("  Block " + b.index() + ": variables=" + b.variables() + ", equations=" + b.equations());
        }

        try {
            solver.solve("z^2 = -4", settings);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
