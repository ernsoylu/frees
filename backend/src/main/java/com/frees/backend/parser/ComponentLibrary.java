package com.frees.backend.parser;

import com.frees.backend.ast.ComponentDef;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;

import java.util.List;

/**
 * The built-in standard component library — common thermo-fluid components
 * written in the frEES {@code COMPONENT} language and parsed once into
 * {@link ComponentDef}s that are available to every document (a user definition
 * of the same name overrides the built-in, see {@link ComponentExpander}).
 *
 * <p>Keeping the library in frEES source (rather than hand-built ASTs) keeps the
 * physics transparent and editable, and exercises the same parse path as
 * user-authored components. Property inputs use {@code (P, h)} so any state is
 * recoverable from a stream's canonical members; turbine/compressor isentropic
 * targets use {@code (P, s)}.
 */
public final class ComponentLibrary {

    private ComponentLibrary() {}

    /** Standard fluid-domain components (Phase 1). */
    static final String SOURCE = """
            COMPONENT Pump(in, out)
              PARAM eta = 0.7, fluid$ = Water
              v        = Volume(fluid$, P=in.P, h=in.h)
              out.mdot = in.mdot
              out.h    = in.h + v * (out.P - in.P) / eta
              W        = in.mdot * (out.h - in.h)
            END

            COMPONENT Turbine(in, out)
              PARAM eta = 0.85, fluid$ = Water
              s_in     = Entropy(fluid$, P=in.P, h=in.h)
              h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
              out.mdot = in.mdot
              out.h    = in.h - eta * (in.h - h_s)
              W        = in.mdot * (in.h - out.h)
            END

            COMPONENT Compressor(in, out)
              PARAM eta = 0.80, fluid$ = Air
              s_in     = Entropy(fluid$, P=in.P, h=in.h)
              h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
              out.mdot = in.mdot
              out.h    = in.h + (h_s - in.h) / eta
              W        = in.mdot * (out.h - in.h)
            END

            COMPONENT Boiler(in, out)
              out.mdot = in.mdot
              out.P    = in.P
              Q        = in.mdot * (out.h - in.h)
            END

            COMPONENT Condenser(in, out)
              out.mdot = in.mdot
              out.P    = in.P
              Q        = in.mdot * (in.h - out.h)
            END

            COMPONENT Throttle(in, out)
              out.mdot = in.mdot
              out.h    = in.h
            END

            COMPONENT Pipe(in, out)
              PARAM fluid$ = Water, L = 1 [m], D = 0.05 [m], rough = 0.000045 [m]
              out.mdot = in.mdot
              out.h    = in.h
              rho      = Density(fluid$, P=in.P, h=in.h)
              mu       = Viscosity(fluid$, P=in.P, h=in.h)
              A        = pi# / 4 * D^2
              V        = in.mdot / (rho * A)
              Re_d     = reynolds(rho, V, D, mu)
              f        = friction_factor(Re_d, rough / D)
              out.P    = in.P - f * (L / D) * rho * V^2 / 2
            END

            COMPONENT Fan(in, out)
              PARAM fluid$ = Air, dP0 = 500 [Pa], Q0 = 1 [m^3/s], eta = 0.6
              rho      = Density(fluid$, P=in.P, h=in.h)
              Q        = in.mdot / rho
              dP       = dP0 * (1 - (Q / Q0)^2)
              out.mdot = in.mdot
              out.P    = in.P + dP
              out.h    = in.h + dP / (rho * eta)
            END

            COMPONENT Duct(in, out)
              PARAM rho = 1.2 [kg/m^3], mu = 1.8e-5 [Pa-s], L = 1 [m], D = 0.05 [m], rough = 0.000045 [m]
              out.mdot = in.mdot
              A        = pi# / 4 * D^2
              V        = in.mdot / (rho * A)
              Re_d     = reynolds(rho, V, D, mu)
              f        = friction_factor(Re_d, rough / D)
              out.P    = in.P - f * (L / D) * rho * V^2 / 2
            END

            COMPONENT FanCurve(in, out)
              PARAM rho = 1.2 [kg/m^3], dP0 = 500 [Pa], Q0 = 1 [m^3/s]
              Q        = in.mdot / rho
              dP       = dP0 * (1 - (Q / Q0)^2)
              out.mdot = in.mdot
              out.P    = in.P + dP
            END
            """;

    private static final List<ComponentDef> BUILTINS = parse(SOURCE);

    /** The parsed built-in component definitions (immutable). */
    public static List<ComponentDef> builtins() {
        return BUILTINS;
    }

    private static List<ComponentDef> parse(String source) {
        EquationParser.CollectingErrorListener errors = new EquationParser.CollectingErrorListener();
        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);
        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);
        FreesParser.ProgramContext program = parser.program();
        if (!errors.errors.isEmpty()) {
            throw new IllegalStateException(
                    "Built-in component library failed to parse: " + String.join("\n", errors.errors));
        }
        return List.copyOf(new AstBuilder().buildProgram(program).componentDefs());
    }
}
