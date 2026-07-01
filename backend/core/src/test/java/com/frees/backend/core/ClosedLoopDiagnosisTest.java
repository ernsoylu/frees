package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * ROOT-CAUSE diagnosis for "the closed floating refrigerant cycle won't solve".
 *
 * Hypothesis: every HX I wrote uses a RELATIVE enthalpy update (out.h = in.h ± Q/ṁ)
 * and the compressor is out.h = in.h + Δh. Around a CLOSED loop the absolute
 * enthalpy LEVEL then cancels (Σ Δh = 0 is a constraint, not a level), so the
 * system is singular / underspecified in the enthalpy-level direction. The shipped
 * lumped components avoid this by anchoring the outlet to an ABSOLUTE saturation
 * state (out.h = Enthalpy(P, Tsat ± ΔT)). These tiny tests measure the DOF
 * (equations vs unknowns via check()) to confirm the cause.
 */
class ClosedLoopDiagnosisTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // RELATIVE-enthalpy components (no absolute anchor) — the suspected cause.
    private static final String REL = """
            COMPONENT RelComp(in, out)
              PARAM mdot0, dh, domain$ = twophase
              in.mdot  = mdot0
              out.mdot = in.mdot
              out.h    = in.h + dh
            END
            COMPONENT RelCond(in, out)
              PARAM fluid$, UA, Csec, Tair, domain$ = twophase
              out.mdot = in.mdot
              out.P    = in.P
              Tcond    = T_sat(fluid$, P=in.P)
              Q        = (1 - exp(-UA / Csec)) * Csec * (Tcond - Tair)
              out.h    = in.h - Q / in.mdot
            END
            COMPONENT RelEvap(in, out)
              PARAM fluid$, UA, Csec, Tcab, domain$ = twophase
              out.mdot = in.mdot
              out.P    = in.P
              Tevap    = T_sat(fluid$, P=in.P)
              Q        = (1 - exp(-UA / Csec)) * Csec * (Tcab - Tevap)
              out.h    = in.h + Q / in.mdot
            END
            COMPONENT Thr(in, out)
              PARAM domain$ = twophase
              out.mdot = in.mdot
              out.h    = in.h
            END
            """;

    private void report(String label, String src) {
        EquationSystemSolver.CheckResult r = solver.check(src);
        System.out.printf("%-34s eqs=%d  vars=%d  (DOF %+d)  solvable=%b%n",
                label, r.equationCount(), r.unknownCount(),
                r.equationCount() - r.unknownCount(), r.solvable());
    }

    @Test
    void measureDof() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");

        // (1) CLOSED loop, both pressures pinned, ALL relative-enthalpy components.
        String relCycle = REL + """
                RelComp CMP(mdot0=0.025, dh=45000)
                RelCond CND(fluid$=R1234yf, UA=900, Csec=600, Tair=318)
                Thr     TH()
                RelEvap EVP(fluid$=R1234yf, UA=500, Csec=350, Tcab=298)
                connect(CMP.out, CND.in)
                connect(CND.out, TH.in)
                connect(TH.out, EVP.in)
                connect(EVP.out, CMP.in)
                CMP.in.P  = 350000
                CMP.out.P = 1500000
                """;
        report("relative (closed, P pinned)", relCycle);

        // (2) same loop but the condenser ANCHORS the outlet to an absolute
        //     saturation state (out.h = h_f(P)) — the hypothesised fix.
        String anchored = REL + """
                COMPONENT SatCond(in, out)
                  PARAM fluid$, domain$ = twophase
                  out.mdot = in.mdot
                  out.P    = in.P
                  out.h    = Enthalpy(fluid$, P=in.P, x=0)
                END
                RelComp CMP(mdot0=0.025, dh=45000)
                SatCond CND(fluid$=R1234yf)
                Thr     TH()
                RelEvap EVP(fluid$=R1234yf, UA=500, Csec=350, Tcab=298)
                connect(CMP.out, CND.in)
                connect(CND.out, TH.in)
                connect(TH.out, EVP.in)
                connect(EVP.out, CMP.in)
                CMP.in.P  = 350000
                CMP.out.P = 1500000
                """;
        report("saturation-anchored (closed)", anchored);

        // probe the −2: add one candidate closure at a time and watch the DOF.
        String base = REL + """
                RelComp CMP(mdot0=0.025, dh=45000)
                RelCond CND(fluid$=R1234yf, UA=900, Csec=600, Tair=318)
                Thr     TH()
                RelEvap EVP(fluid$=R1234yf, UA=500, Csec=350, Tcab=298)
                connect(CMP.out, CND.in)
                connect(CND.out, TH.in)
                connect(TH.out, EVP.in)
                connect(EVP.out, CMP.in)
                CMP.in.P  = 350000
                CMP.out.P = 1500000
                """;
        report("base (-2 expected)", base);
        report("  + pin enthalpy level", base + "CMP.in.h = 410000\n");
        report("  + give throttle out.P", REL.replace(
                "COMPONENT Thr(in, out)\n              PARAM domain$ = twophase\n              out.mdot = in.mdot\n              out.h    = in.h\n            END",
                "COMPONENT Thr(in, out)\n              PARAM domain$ = twophase\n              out.mdot = in.mdot\n              out.h    = in.h\n              out.P    = in.P\n            END") + """
                RelComp CMP(mdot0=0.025, dh=45000)
                RelCond CND(fluid$=R1234yf, UA=900, Csec=600, Tair=318)
                Thr     TH()
                RelEvap EVP(fluid$=R1234yf, UA=500, Csec=350, Tcab=298)
                connect(CMP.out, CND.in)
                connect(CND.out, TH.in)
                connect(TH.out, EVP.in)
                connect(EVP.out, CMP.in)
                CMP.in.P  = 350000
                CMP.out.P = 1500000
                """);
        report("  + h-pin + 2nd enthalpy pin", base + "CMP.in.h = 410000\nCND.out.h = 250000\n");
        report("  + h-pin + mdot pin", base + "CMP.in.h = 410000\nTH.in.mdot = 0.025\n");

        // THE FIX: absolute saturation-anchored components (shipped lumped HX set the
        // outlet to Enthalpy(P, Tsat±ΔT) — an ABSOLUTE state) break the relative-loop
        // singularity. Same topology as the green TwoPhaseCycleTest.
        String fixed = """
                TwoPhaseSource SRC(fluid$=R1234yf, mdot=0.025, P=350000, x=0.2)
                TwoPhaseEvaporator EVP(fluid$=R1234yf, SH_set=8, dP=0)
                TwoPhaseCompressor CMP(fluid$=R1234yf, eta=0.7)
                TwoPhaseCondenser CND(fluid$=R1234yf, SC_set=5, dP=0)
                TwoPhaseExpansionValve EXV(fluid$=R1234yf, Cv=5e-7)
                TwoPhaseSink SNK()
                connect(SRC.out, EVP.in)
                connect(EVP.out, CMP.in)
                connect(CMP.out, CND.in)
                connect(CND.out, EXV.in)
                connect(EXV.out, SNK.in)
                CMP.out.P = 1500000
                """;
        report("FIX: absolute-anchored (open)", fixed);

        // CAPSTONE: a CLOSED, BOTH-PRESSURES-FLOAT cycle that is well-posed because
        // each ε-NTU HX anchors its outlet to an ABSOLUTE saturation state
        // (condenser→h_f(P), evaporator→h_g(P)) while the ε-NTU duty floats the
        // pressure. No relative-enthalpy cancellation, no pressure pins.
        String floatFixed = """
                COMPONENT CompDh(in, out)
                  PARAM mdot0, dh, domain$ = twophase
                  in.mdot = mdot0
                  out.mdot = in.mdot
                  out.h = in.h + dh
                END
                COMPONENT CondFloat(in, out)
                  PARAM fluid$, UA, Csec, Tair, domain$ = twophase
                  out.mdot = in.mdot
                  out.P    = in.P
                  Tcond    = T_sat(fluid$, P=in.P)
                  out.h    = Enthalpy(fluid$, P=in.P, x=0)
                  Q        = in.mdot * (in.h - out.h)
                  Q        = (1 - exp(-UA / Csec)) * Csec * (Tcond - Tair)
                END
                COMPONENT EvapFloat(in, out)
                  PARAM fluid$, UA, Csec, Tcab, domain$ = twophase
                  out.mdot = in.mdot
                  out.P    = in.P
                  Tevap    = T_sat(fluid$, P=in.P)
                  out.h    = Enthalpy(fluid$, P=in.P, x=1)
                  Q        = in.mdot * (out.h - in.h)
                  Q        = (1 - exp(-UA / Csec)) * Csec * (Tcab - Tevap)
                END
                CompDh    CMP(mdot0=0.025, dh=45000)
                CondFloat CND(fluid$=R1234yf, UA=900, Csec=600, Tair=318)
                TwoPhaseExpansionValve TH(fluid$=R1234yf, Cv=8e-7)
                EvapFloat EVP(fluid$=R1234yf, UA=500, Csec=350, Tcab=298)
                connect(CMP.out, CND.in)
                connect(CND.out, TH.in)
                connect(TH.out, EVP.in)
                connect(EVP.out, CMP.in)
                """;
        report("CAPSTONE: float cycle (abs-anchored)", floatFixed);
        // structurally solvable now; the ONLY remaining issue is cold-start init.
        // Seed the two pressures DIFFERENTLY (high side vs low side) + enthalpies,
        // and the well-posed cycle solves — confirming the residual issue is purely
        // numerical initialization, not structure.
        // PER-PORT seeds: enthalpy varies by LOCATION, not by pressure side
        // (the condenser inlet is hot vapor ~410 kJ, its outlet is liquid ~265 kJ).
        //   suction/evap-out (sat vapor) ~365 kJ ; discharge/cond-in (hot vapor) ~410 kJ ;
        //   cond-out/valve/evap-in (liquid) ~265 kJ.
        java.util.Map<String, VariableSpec> g = new java.util.HashMap<>();
        for (var eq : solver.parse(floatFixed).equations()) {
            for (String v : eq.variables()) {
                String m = v.substring(v.lastIndexOf('$') + 1);
                boolean highP = v.startsWith("cmp$out") || v.startsWith("cnd") || v.startsWith("th$in");
                if (m.equals("p")) {
                    g.put(v, new VariableSpec(v, highP ? 1.5e6 : 3.5e5, 1e4, 3.3e6));
                } else if (m.equals("h")) {
                    double h = v.startsWith("cmp$out") || v.startsWith("cnd$in") ? 4.1e5      // hot vapor
                             : v.startsWith("cnd$out") || v.startsWith("th") || v.startsWith("evp$in") ? 2.65e5 // liquid
                             : 3.65e5;                                                        // sat vapor (suction)
                    g.put(v, new VariableSpec(v, h, 1e4, 6e5));
                } else if (m.equals("mdot")) {
                    g.put(v, new VariableSpec(v, 0.025, 1e-4, 1.0));
                }
            }
        }
        try {
            var v = solver.solve(floatFixed, SolverSettings.DEFAULTS, g).variables();
            System.out.printf("   -> SOLVED with high/low init: P_cond=%.0f Pa (%.1f C)  P_evap=%.0f Pa (%.1f C)%n",
                    v.get("cnd.in.p"), v.get("cnd.tcond") - 273.15,
                    v.get("evp.in.p"), v.get("evp.tevap") - 273.15);
        } catch (RuntimeException ex) {
            // Layer 3: structurally solvable + NaN-free init, but plain Newton stalls
            // at a FINITE residual on the coupled cycle block -> continuation /
            // integrate-to-steady territory (not structure, not init).
            System.out.println("   -> high/low init removes the NaN; Newton stalls at a finite "
                    + "residual (Layer-3 nonlinear convergence): " + ex.getMessage());
        }
        report("  + UNUSED both (h & throttleP)", REL.replace(
                "COMPONENT Thr(in, out)\n              PARAM domain$ = twophase\n              out.mdot = in.mdot\n              out.h    = in.h\n            END",
                "COMPONENT Thr(in, out)\n              PARAM domain$ = twophase\n              out.mdot = in.mdot\n              out.h    = in.h\n              out.P    = in.P\n            END") + """
                RelComp CMP(mdot0=0.025, dh=45000)
                RelCond CND(fluid$=R1234yf, UA=900, Csec=600, Tair=318)
                Thr     TH()
                RelEvap EVP(fluid$=R1234yf, UA=500, Csec=350, Tcab=298)
                connect(CMP.out, CND.in)
                connect(CND.out, TH.in)
                connect(TH.out, EVP.in)
                connect(EVP.out, CMP.in)
                CMP.in.P  = 350000
                CMP.out.P = 1500000
                CMP.in.h  = 410000
                """);
    }
}
