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
 *
 * <p><b>No defaults — every parameter is required.</b> A silent default for a
 * physical input (a pipe length, a fluid, an efficiency) is a footgun: a model
 * of an R134a system that forgets {@code fluid$} should error, not quietly run
 * as water. So all library parameters must be supplied at instantiation; an
 * omission is a clear parse error. (The optional-default <em>language feature</em>
 * remains available for user-authored components that genuinely want it.)
 */
public final class ComponentLibrary {

    private ComponentLibrary() {}

    /** Standard fluid-domain components (Phase 1). */
    static final String SOURCE = """
            COMPONENT Pump(in, out)
              PARAM eta, fluid$
              v        = Volume(fluid$, P=in.P, h=in.h)
              out.mdot = in.mdot
              out.h    = in.h + v * (out.P - in.P) / eta
              W        = in.mdot * (out.h - in.h)
            END

            COMPONENT Turbine(in, out)
              PARAM eta, fluid$
              s_in     = Entropy(fluid$, P=in.P, h=in.h)
              h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
              out.mdot = in.mdot
              out.h    = in.h - eta * (in.h - h_s)
              W        = in.mdot * (in.h - out.h)
            END

            COMPONENT Compressor(in, out)
              PARAM eta, fluid$
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
              PARAM fluid$, L, D, rough
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
              PARAM fluid$, dP0, Q0, eta
              rho      = Density(fluid$, P=in.P, h=in.h)
              Q        = in.mdot / rho
              dP       = dP0 * (1 - (Q / Q0)^2)
              out.mdot = in.mdot
              out.P    = in.P + dP
              out.h    = in.h + dP / (rho * eta)
            END

            COMPONENT Duct(in, out)
              PARAM rho, mu, L, D, rough
              out.mdot = in.mdot
              A        = pi# / 4 * D^2
              V        = in.mdot / (rho * A)
              Re_d     = reynolds(rho, V, D, mu)
              f        = friction_factor(Re_d, rough / D)
              out.P    = in.P - f * (L / D) * rho * V^2 / 2
            END

            COMPONENT FanCurve(in, out)
              PARAM rho, dP0, Q0
              Q        = in.mdot / rho
              dP       = dP0 * (1 - (Q / Q0)^2)
              out.mdot = in.mdot
              out.P    = in.P + dP
            END

            COMPONENT Splitter(in, out1, out2)
              out1.P   = in.P
              out2.P   = in.P
              out1.h   = in.h
              out2.h   = in.h
              in.mdot  = out1.mdot + out2.mdot
            END

            COMPONENT Mixer(in1, in2, out)
              out.P    = in1.P
              out.mdot = in1.mdot + in2.mdot
              out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
            END

            COMPONENT HeatExchanger(hot_in, hot_out, cold_in, cold_out)
              PARAM UA, hot$, cold$, arr$
              hot_out.mdot  = hot_in.mdot
              hot_out.P     = hot_in.P
              cold_out.mdot = cold_in.mdot
              cold_out.P    = cold_in.P
              Th   = Temperature(hot$,  P=hot_in.P,  h=hot_in.h)
              Tc   = Temperature(cold$, P=cold_in.P, h=cold_in.h)
              C_h  = hot_in.mdot  * Cp(hot$,  P=hot_in.P,  h=hot_in.h)
              C_c  = cold_in.mdot * Cp(cold$, P=cold_in.P, h=cold_in.h)
              Cmin = min(C_h, C_c)
              Cmax = max(C_h, C_c)
              eps  = hx_effectiveness(arr$, UA / Cmin, Cmin / Cmax)
              Q    = eps * Cmin * (Th - Tc)
              hot_out.h  = hot_in.h  - Q / hot_in.mdot
              cold_out.h = cold_in.h + Q / cold_in.mdot
            END

            COMPONENT Source(out)
              PARAM fluid$, mdot, P, T
              out.mdot = mdot
              out.P    = P
              out.h    = Enthalpy(fluid$, P=P, T=T)
            END

            COMPONENT Sink(in)
              mdot = in.mdot
              P    = in.P
              h    = in.h
            END

            COMPONENT Nozzle(in, out)
              PARAM k, R, A_throat, A_exit, P_amb, T0
              out.mdot = in.mdot
              M_exit   = mach_A_Astar(A_exit / A_throat, k, 'supersonic')
              out.P    = in.P / P0_P(M_exit, k)
              T_exit   = T0 / T0_T(M_exit, k)
              V_exit   = M_exit * sqrt(k * R * T_exit)
              out.h    = in.h - V_exit^2 / 2
              thrust   = in.mdot * V_exit + (out.P - P_amb) * A_exit
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
