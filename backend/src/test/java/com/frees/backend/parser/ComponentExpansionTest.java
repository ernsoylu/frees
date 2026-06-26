package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 1 of the acausal component-modeling layer: the {@code COMPONENT} block,
 * shared-name instantiation, dotted port-member access, parameter substitution,
 * and the expansion into flat scalar equations the existing solver handles.
 * These cases use pure-algebra components so they need no CoolProp backend.
 */
class ComponentExpansionTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final EquationParser parser = new EquationParser();

    /**
     * A two-port heater carries mass and pressure through, adds heat duty Q to
     * the stream enthalpy, and exposes the duty as a named output. Two heaters
     * sharing stream {@code s2} form a series chain: mass conservation and the
     * enthalpy rise must propagate through the shared stream variables.
     */
    private static final String HEATER_LIB = """
            COMPONENT Heater(in, out)
              PARAM Q = 1000
              out.mdot = in.mdot
              out.P    = in.P
              out.h    = in.h + Q / in.mdot
              duty     = Q
            END
            """;

    @Test
    void heaterChainSharesStreamsAndConservesMass() {
        String src = HEATER_LIB + """
                Heater H1(s1, s2, Q=5000)
                Heater H2(s2, s3, Q=3000)

                s1.P    = 100000
                s1.mdot = 2
                s1.h    = 10000
                """;
        EquationSystemSolver.Result r = solver.solve(src);
        Map<String, Double> v = r.variables();

        // Mass propagates unchanged through the shared streams.
        assertEquals(2.0, v.get("s1.mdot"), 1e-9);
        assertEquals(2.0, v.get("s2.mdot"), 1e-9);
        assertEquals(2.0, v.get("s3.mdot"), 1e-9);
        // Pressure passes through.
        assertEquals(100000.0, v.get("s3.p"), 1e-6);
        // Enthalpy rises by Q/mdot across each heater.
        assertEquals(10000.0 + 5000.0 / 2.0, v.get("s2.h"), 1e-6);
        assertEquals(12500.0 + 3000.0 / 2.0, v.get("s3.h"), 1e-6);
    }

    @Test
    void namedOutputsAreInstanceNamespacedAndParamDefaultsApply() {
        String src = HEATER_LIB + """
                Heater H1(s1, s2, Q=5000)
                Heater H2(s2, s3)
                s1.P = 100000
                s1.mdot = 4
                s1.h = 0
                """;
        EquationSystemSolver.Result r = solver.solve(src);
        Map<String, Double> v = r.variables();
        // Named output `duty` is namespaced per instance.
        assertEquals(5000.0, v.get("h1.duty"), 1e-9);
        // H2 uses the default Q = 1000.
        assertEquals(1000.0, v.get("h2.duty"), 1e-9);
        // Default duty raises the enthalpy by 1000/4 = 250.
        assertEquals(5000.0 / 4.0 + 1000.0 / 4.0, v.get("s3.h"), 1e-6);
    }

    @Test
    void topLevelInstanceAndStreamMemberRefsResolveToSameVariable() {
        // A boundary condition written on the instance port (H1.out.h) must hit
        // the same solver variable as the shared stream member (s2.h).
        String src = HEATER_LIB + """
                Heater H1(s1, s2, Q=5000)
                s1.P = 100000
                s1.mdot = 2
                H1.in.h = 20000
                """;
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(22500.0, r.variables().get("s2.h"), 1e-6);
    }

    @Test
    void fluidStringParamIsBakedIntoPropertyCallNames() {
        // Each instance bakes its own fluid into the encoded prop$ call name, so
        // two instances of the same component can carry different fluids.
        String src = """
                COMPONENT Probe(p)
                  PARAM fluid$ = Water
                  p.rho = Density(fluid$, T=p.T, P=p.P)
                END
                Probe A(a)
                Probe B(b, fluid$=Air)
                """;
        List<String> fns = propFunctionNames(parser.parseResult(src).equations());
        assertTrue(fns.stream().anyMatch(f -> f.startsWith("prop$density$water$")),
                "expected a water-baked density call, got: " + fns);
        assertTrue(fns.stream().anyMatch(f -> f.startsWith("prop$density$air$")),
                "expected an air-baked density call, got: " + fns);
    }

    @Test
    void unknownComponentTypeIsRejected() {
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult("Mystery X(a, b)"));
        assertTrue(ex.getMessage().contains("Unknown component type"), ex.getMessage());
    }

    @Test
    void portCountMismatchIsRejected() {
        String src = HEATER_LIB + "Heater H1(s1)";
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("port"), ex.getMessage());
    }

    @Test
    void unknownParameterOverrideIsRejected() {
        String src = HEATER_LIB + "Heater H1(s1, s2, bogus=3)";
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("unknown parameter"), ex.getMessage());
    }

    // Collects the function names of all prop$ property calls in the equations.
    private static List<String> propFunctionNames(List<Equation> equations) {
        List<String> out = new ArrayList<>();
        for (Equation eq : equations) {
            collect(eq.lhs(), out);
            collect(eq.rhs(), out);
        }
        return out;
    }

    private static void collect(Expr e, List<String> out) {
        switch (e) {
            case Expr.Call(String fn, List<Expr> args) -> {
                if (fn.startsWith("prop$")) {
                    out.add(fn);
                }
                args.forEach(a -> collect(a, out));
            }
            case Expr.BinOp(char op, Expr l, Expr rr) -> {
                collect(l, out);
                collect(rr, out);
            }
            case Expr.Neg(Expr o) -> collect(o, out);
            default -> {
                // leaf or unhandled node: nothing to collect
            }
        }
    }
}
