package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase AC — the application package: signal/RPM-driven and bridge components.
 * EXV opening, the volumetric (RPM) compressor, the two-lag TXV, and the AirCoil
 * (refrigerant ↔ moist air, sensible + latent).
 */
class AcComponentsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void exvOpeningSetsFlow() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String tmpl = """
                TwoPhasePressureSource HI(fluid$=R134a, P=900000, x=0)
                EXV V(fluid$=R134a, CdA_max=2e-6, u=%f)
                TwoPhasePressureSink LO(P=350000)
                connect(HI.out, V.in)
                connect(V.out, LO.in)
                """;
        double half = solver.solve(tmpl.formatted(0.5)).variables().get("v.in.mdot");
        double full = solver.solve(tmpl.formatted(1.0)).variables().get("v.in.mdot");
        assertTrue(full > half && half > 0, "a wider opening passes more flow: " + half + " -> " + full);
    }

    @Test
    void volumetricCompressorScalesFlowWithRpm() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String tmpl = """
                TwoPhasePressureSource SUC(fluid$=R134a, P=350000, x=1)
                TwoPhaseCompressor CMP(fluid$=R134a, eta=0.7, model$=volumetric, eta_v=0.9, disp=2e-5, rpm=%f)
                TwoPhaseSink DIS()
                connect(SUC.out, CMP.in)
                connect(CMP.out, DIS.in)
                CMP.out.P = 900000
                """;
        double lo = solver.solve(tmpl.formatted(1000.0)).variables().get("cmp.in.mdot");
        double hi = solver.solve(tmpl.formatted(2500.0)).variables().get("cmp.in.mdot");
        assertTrue(hi > lo && lo > 0, "mass flow scales with RPM: " + lo + " -> " + hi);
        // volumetric displacement is linear in RPM (same suction density)
        assertTrue(Math.abs(hi / lo - 2.5) < 0.05, "flow ratio ≈ RPM ratio");
    }

    @Test
    void txvRelaxesTowardItsSuperheatTarget() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        assumeTrue(SundialsIda.isAvailable(), "SUNDIALS IDA not available");
        // bulb senses a fixed 290 K; T_sat(350 kPa) ≈ 278.6 K → sensed SH ≈ 11.4.
        // The bulb-lag state relaxes to that and the valve area to its quasi-static
        // target CdA0 + Kv·(SH − SH_set).
        String src = """
                TwoPhasePressureSource HI(fluid$=R134a, P=900000, x=0)
                TXV V(fluid$=R134a, Kv=1e-8, SH_set=5, CdA0=2e-6, tau_valve=2, tau_bulb=5)
                TwoPhasePressureSink LO(P=350000)
                ThermalSource BULB(T=290)
                connect(HI.out, V.in)
                connect(V.out, LO.in)
                connect(V.bulb, BULB.port)
                DYNAMIC tune(method = ida, time = 0 .. 40, points = 40, rtol = 1e-6, atol = 1e-9)
                END
                SHb_final = FinalValue('v.sh_b')
                CdA_final = FinalValue('v.cda')
                CdA_start = MinValue('v.cda')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double tsat = CoolProp.propsSI("T", "P", 350000, "Q", 1.0, "R134a");
        double shSensed = 290.0 - tsat;
        assertTrue(Math.abs(v.get("shb_final") - shSensed) < 0.2, "bulb lag settles to sensed SH");
        double cdaTarget = 2e-6 + 1e-8 * (shSensed - 5.0);
        assertTrue(Math.abs(v.get("cda_final") - cdaTarget) / cdaTarget < 0.02, "valve opens to target");
        assertTrue(v.get("cda_final") > v.get("cda_start"), "valve opened from CdA0 as superheat rose");
    }

    @Test
    void airCoilCoolsAndDehumidifies() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                TwoPhaseSource RSRC(fluid$=R134a, mdot=0.01, P=300000, x=0.2)
                TwoPhaseSink RSNK()
                MoistAirSource ASRC(P=101325, T=300, W=0.012, mdot=0.05)
                MoistAirSink ASNK()
                AirCoil COIL(ref$=R134a, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.1, eps_air=0.8)
                connect(RSRC.out, COIL.ref_in)
                connect(COIL.ref_out, RSNK.in)
                connect(ASRC.out, COIL.air_in)
                connect(COIL.air_out, ASNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // air is cooled (enthalpy drops) and dehumidified (humidity ratio drops)
        assertTrue(v.get("coil.ac.out.h") < v.get("coil.ac.in.h"), "moist air is cooled");
        assertTrue(v.get("asnk.w") < 0.012, "moist air is dehumidified: W=" + v.get("asnk.w"));
        assertTrue(v.get("coil.ac.q_lat") > 0, "positive latent (dehumidification) duty");
        assertTrue(v.get("coil.ev.q") > 0, "refrigerant absorbs the coil duty");
    }
}
