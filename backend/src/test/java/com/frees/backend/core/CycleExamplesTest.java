package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Validates the canonical-cycle example documents shipped in the frontend
 * examples library (frontend/src/examples.ts): every document must derive units
 * with zero warnings and solve to physically sane numbers. The example texts
 * here are the source of truth; keep them byte-identical with examples.ts.
 */
class CycleExamplesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private void assertUnitClean(String src) {
        List<String> warnings = solver.checkUnits(src, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);
    }

    static final String RANKINE = """
// Ideal Rankine Cycle
{ Steam power cycle: pump -> boiler -> turbine -> condenser.
  Real-water properties from CoolProp. Press Solve (F2). }
P_hi = 8000000 [Pa]      { boiler pressure, 8 MPa }
P_lo = 10000 [Pa]        { condenser pressure, 10 kPa }
eta_t = 0.85             { turbine isentropic efficiency }
eta_p = 0.80             { pump isentropic efficiency }

h1 = Enthalpy(Water, P=P_lo, x=0)    { saturated liquid leaving condenser }
v1 = Volume(Water, P=P_lo, x=0)

w_p = v1 * (P_hi - P_lo) / eta_p     { pump work }
h2 = h1 + w_p

T3 = 753.15 [K]                      { superheated steam, 480 C }
h3 = Enthalpy(Water, P=P_hi, T=T3)
s3 = Entropy(Water, P=P_hi, T=T3)

h4s = Enthalpy(Water, P=P_lo, s=s3)  { isentropic expansion }
w_t = eta_t * (h3 - h4s)
h4 = h3 - w_t

q_in = h3 - h2
w_net = w_t - w_p
eta_th = w_net / q_in
""";

    static final String BRAYTON = """
// Air-Standard Brayton Cycle
{ Gas-turbine cycle, cold air-standard (constant properties). }
cp = 1004 [J/kg-K]
k = 1.4
r_p = 10                 { compressor pressure ratio }
T1 = 300 [K]             { compressor inlet }
T3 = 1400 [K]            { turbine inlet }
eta_c = 0.82
eta_t = 0.85

tau = r_p^((k - 1) / k)  { isentropic temperature ratio }
T2 = T1 + T1 * (tau - 1) / eta_c
T4 = T3 - eta_t * T3 * (1 - 1 / tau)

w_c = cp * (T2 - T1)
w_t = cp * (T3 - T4)
q_in = cp * (T3 - T2)
w_net = w_t - w_c
eta_th = w_net / q_in
""";

    static final String OTTO = """
// Air-Standard Otto Cycle
{ Spark-ignition engine, cold air-standard. }
k = 1.4
r = 8                    { compression ratio }
T1 = 300 [K]
q_in = 1800000 [J/kg]    { heat added per unit mass }
cv = 718 [J/kg-K]

T2 = T1 * r^(k - 1)      { isentropic compression }
T3 = T2 + q_in / cv      { constant-volume heat addition }
T4 = T3 / r^(k - 1)      { isentropic expansion }
q_out = cv * (T4 - T1)
w_net = q_in - q_out
eta_th = w_net / q_in
eta_ideal = 1 - 1 / r^(k - 1)   { closed-form air-standard efficiency }
""";

    static final String REFRIGERATION = """
// Vapor-Compression Refrigeration (R134a)
{ Ideal VCR cycle. Real-refrigerant properties from CoolProp. }
T_evap = 263.15 [K]      { -10 C }
T_cond = 313.15 [K]      { 40 C }
eta_comp = 0.80

P1 = P_sat(R134a, T=T_evap)
h1 = Enthalpy(R134a, T=T_evap, x=1)  { saturated vapor leaving evaporator }
s1 = Entropy(R134a, T=T_evap, x=1)

P2 = P_sat(R134a, T=T_cond)
h2s = Enthalpy(R134a, P=P2, s=s1)
h2 = h1 + (h2s - h1) / eta_comp

h3 = Enthalpy(R134a, P=P2, x=0)      { saturated liquid leaving condenser }
h4 = h3                              { throttle is isenthalpic }

q_L = h1 - h4            { refrigeration effect }
w_c = h2 - h1
COP = q_L / w_c
""";

    static final String NOZZLE = """
// Converging-Diverging Nozzle with a Normal Shock
{ Air (k = 1.4) expands from a reservoir through a C-D nozzle. A normal
  shock stands in the diverging section where the local A/A* = 2.0. }
k = 1.4
P0 = 1000000 [Pa]        { reservoir (stagnation) pressure }
T0 = 500 [K]             { reservoir temperature }
A_ratio = 2.0            { local area / throat area at the shock }

M1 = mach_A_Astar(A_ratio, k, 'supersonic')   { supersonic Mach upstream }
T1 = T0 / T0_T(M1, k)
P1 = P0 / P0_P(M1, k)

M2 = M2_shock(M1, k)                 { Mach downstream of the shock }
P2 = P1 * P2_P1_shock(M1, k)
P02 = P0 * P02_P01_shock(M1, k)      { stagnation pressure after the loss }
""";

    static final String HEAT_EXCHANGER = """
// Heat Exchanger — Effectiveness-NTU Method
{ Counterflow water-to-water exchanger rated with the effectiveness-NTU method. }
mdot_h = 2.0 [kg/s]
cp_h = 4180 [J/kg-K]
mdot_c = 1.5 [kg/s]
cp_c = 4180 [J/kg-K]
Th_in = 360 [K]
Tc_in = 290 [K]
UA = 12000 [W/K]

C_h = mdot_h * cp_h
C_c = mdot_c * cp_c
C_min = min(C_h, C_c)
C_max = max(C_h, C_c)
Cr = C_min / C_max
NTU = UA / C_min

eps = hx_effectiveness('counterflow', NTU, Cr)
Q_max = C_min * (Th_in - Tc_in)
Q = eps * Q_max
Th_out = Th_in - Q / C_h
Tc_out = Tc_in + Q / C_c
dTlm = LMTD(Th_in - Tc_out, Th_out - Tc_in)
""";

    static final String CUBIC_EOS = """
// Real-Gas Properties from a Cubic EOS (Peng-Robinson)
{ A CoolProp-independent SRK/PR backend. CO2 at 6 MPa, 320 K. }
T = 320 [K]
P = 6000000 [Pa]
Z = eos_z('co2', 'PR', T, P, 'vapor')          { compressibility factor }
rho = eos_density('co2', 'PR', T, P, 'vapor')
v = eos_volume('co2', 'PR', T, P, 'vapor')
h = eos_enthalpy('co2', 'PR', T, P, 'vapor')
Psat_300 = eos_psat('co2', 'PR', 300)          { saturation pressure at 300 K }
""";

    @Test
    void allExamplesDeriveUnitsCleanly() {
        for (String src : List.of(RANKINE, BRAYTON, OTTO, REFRIGERATION, NOZZLE, HEAT_EXCHANGER, CUBIC_EOS)) {
            assertUnitClean(src);
        }
    }

    @Test
    void braytonSolves() {
        var r = solver.solve(BRAYTON);
        // Non-ideal cold air-standard cycle (eta_c=0.82, eta_t=0.85): ~0.31.
        assertEquals(0.307, r.variables().get("eta_th"), 0.02);
        assertTrue(r.variables().get("w_net") > 0.0);
    }

    @Test
    void ottoSolves() {
        var r = solver.solve(OTTO);
        // Closed-form efficiency 1 - r^-(k-1) = 0.5647 for r = 8, k = 1.4.
        assertEquals(0.5647, r.variables().get("eta_ideal"), 1e-3);
        assertTrue(r.variables().get("eta_th") > 0.5);
    }

    @Test
    void nozzleSolves() {
        var r = solver.solve(NOZZLE);
        assertEquals(2.197, r.variables().get("M1"), 2e-2);   // M at A/A* = 2 (supersonic)
        assertTrue(r.variables().get("M2") < 1.0, "flow is subsonic behind the shock");
        assertTrue(r.variables().get("P02") < r.variables().get("P0"), "stagnation pressure drops");
    }

    @Test
    void heatExchangerSolves() {
        var r = solver.solve(HEAT_EXCHANGER);
        assertEquals(1.914, r.variables().get("NTU"), 0.02);   // UA/Cmin = 12000/6270
        assertTrue(r.variables().get("eps") > 0.0 && r.variables().get("eps") < 1.0);
        assertTrue(r.variables().get("Q") > 0.0);
    }

    @Test
    void cubicEosSolves() {
        var r = solver.solve(CUBIC_EOS);
        assertTrue(r.variables().get("Z") < 0.9, "dense vapor Z below 1");
        assertTrue(r.variables().get("rho") > 100.0);
    }

    @Test
    void rankineSolvesWithCoolProp() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        var r = solver.solve(RANKINE);
        double eta = r.variables().get("eta_th");
        assertTrue(eta > 0.30 && eta < 0.45, "Rankine thermal efficiency ~0.35, got " + eta);
    }

    @Test
    void refrigerationSolvesWithCoolProp() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        var r = solver.solve(REFRIGERATION);
        double cop = r.variables().get("COP");
        assertTrue(cop > 2.0 && cop < 6.0, "VCR COP in a sane range, got " + cop);
    }
}
