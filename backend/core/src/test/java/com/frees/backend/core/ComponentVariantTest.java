package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The component physics-variant selector (§5.5, "one component, many models").
 * A {@code COMPONENT} may declare several {@code VARIANT … END} bodies; its
 * {@code model$} parameter picks one, whose equations are expanded alongside the
 * shared body. A parameter required only by an <em>unselected</em> variant need
 * not be supplied — so a {@code scaled} widget doesn't demand the {@code linear}
 * variant's {@code gain}, and vice versa. Pure-algebra component keeps it
 * CoolProp-free.
 */
class ComponentVariantTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final EquationParser parser = new EquationParser();

    private static final String WIDGET = """
            COMPONENT Widget(in, out)
              PARAM model$ = linear
              out.mdot = in.mdot
              out.P    = in.P
              VARIANT linear REQUIRE gain
                out.h = in.h + gain
              END
              VARIANT scaled REQUIRE factor
                out.h = in.h * factor
              END
            END
            """;

    private static String boundary() {
        return """
                s1.P    = 100000
                s1.mdot = 3
                s1.h    = 1000
                """;
    }

    @Test
    void selectsTheNamedVariantBody() {
        String src = WIDGET + "Widget W(s1, s2, model$=scaled, factor=2)\n" + boundary();
        Map<String, Double> v = solver.solve(src).variables();
        // The 'scaled' body: out.h = in.h * 2. (The 'linear' variant's `gain` is
        // not required and was not supplied.)
        assertEquals(2000.0, v.get("s2.h"), 1e-9);
        // Shared equations hold regardless of variant.
        assertEquals(3.0, v.get("s2.mdot"), 1e-9);
        assertEquals(100000.0, v.get("s2.p"), 1e-6);
    }

    @Test
    void defaultSelectorPicksTheDefaultVariant() {
        // No model$ override → the `PARAM model$ = linear` default applies; only
        // the linear variant's `gain` is needed.
        String src = WIDGET + "Widget W(s1, s2, gain=250)\n" + boundary();
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(1250.0, v.get("s2.h"), 1e-9);   // out.h = in.h + gain
    }

    @Test
    void unknownVariantIsRejected() {
        String src = WIDGET + "Widget W(s1, s2, model$=bogus, gain=1)\n" + boundary();
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("unknown model$ 'bogus'"), ex.getMessage());
        assertTrue(ex.getMessage().contains("linear") && ex.getMessage().contains("scaled"), ex.getMessage());
    }

    @Test
    void missingRequiredParamOfSelectedVariantErrors() {
        // `scaled` requires `factor`; omitting it is a hard error that names the
        // selected variant.
        String src = WIDGET + "Widget W(s1, s2, model$=scaled)\n" + boundary();
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("factor"), ex.getMessage());
        assertTrue(ex.getMessage().contains("scaled"), ex.getMessage());
    }

    @Test
    void unselectedVariantParamIsOptional() {
        // Selecting `linear` and supplying only `gain` solves — `factor` (needed
        // only by `scaled`) is not required and its absence is not an error.
        String src = WIDGET + "Widget W(s1, s2, model$=linear, gain=42)\n" + boundary();
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(1042.0, v.get("s2.h"), 1e-9);
    }

    @Test
    void libraryCompressorVolumetricVariantDeterminesMassFlow() {
        // The standard-library Compressor is now a variant ladder. The
        // `volumetric` variant pins the mass flow from displacement & speed
        // (ṁ = η_v · V_disp · N · ρ_suction) — the shared isentropic-η body still
        // computes the discharge state. Asserts the volumetric relation holds on
        // the solved suction density (no direct CoolProp call needed in the test).
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                Compressor K(s1, s2, model$=volumetric, eta=0.8, fluid$=R134a, eta_v=0.9, disp=30e-6, rpm=3000)
                s1.P = 200000
                s1.T = 283.15
                s2.P = 1000000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double rhoIn = v.get("k.rho_in");
        assertTrue(rhoIn > 0, "suction density must be positive: " + rhoIn);
        double expectMdot = 0.9 * 30e-6 * (3000.0 / 60.0) * rhoIn;
        // Mass flow is determined by the compressor and passes through.
        assertEquals(expectMdot, v.get("s1.mdot"), 1e-9);
        assertEquals(expectMdot, v.get("s2.mdot"), 1e-9);
        // Compression raises the enthalpy (shared isentropic-η head).
        assertTrue(v.get("s2.h") > v.get("s1.h"), "discharge enthalpy must exceed suction");
    }

    @Test
    void libraryCompressorDefaultsToIsentropicBackwardCompatible() {
        // With no model$ override the default `isentropic` variant applies and
        // mass flow is set by the network (boundary), exactly as before variants
        // existed — so volumetric-only params (eta_v/disp/rpm) are not required.
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                Compressor K(s1, s2, eta=0.8, fluid$=R134a)
                s1.P = 200000
                s1.T = 283.15
                s1.mdot = 0.05
                s2.P = 1000000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(0.05, v.get("s2.mdot"), 1e-9);            // network-set ṁ passes through
        assertTrue(v.get("s2.h") > v.get("s1.h"), "discharge enthalpy must exceed suction");
        assertTrue(v.get("k.w") > 0, "compressor work must be positive");
    }

    @Test
    void variantsWithoutSelectorParamAreRejected() {
        // A component with VARIANTs must declare a `model$` selector.
        String src = """
                COMPONENT NoSel(in, out)
                  out.mdot = in.mdot
                  VARIANT a REQUIRE k
                    out.h = in.h + k
                  END
                END
                NoSel N(s1, s2, k=1)
                """ + boundary();
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("model$"), ex.getMessage());
    }
}
