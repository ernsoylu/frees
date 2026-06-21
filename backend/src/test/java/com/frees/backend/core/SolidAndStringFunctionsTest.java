package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Bulk solid-material properties (k_/rho_/c_/E_/nu_) and numeric string functions. */
class SolidAndStringFunctionsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void solidMaterialProperties() {
        EquationSystemSolver.Result r = solver.solve(
                "k = k_(Aluminum)\n"
                        + "rho = rho_(Steel)\n"
                        + "c = c_(Copper)\n"
                        + "E = E_(Steel)\n"
                        + "nu = nu_(Copper)");
        assertEquals(237.0, r.variables().get("k"), 1e-6);
        assertEquals(7854.0, r.variables().get("rho"), 1e-6);
        assertEquals(385.0, r.variables().get("c"), 1e-6);
        assertEquals(200e9, r.variables().get("E"), 1.0);
        assertEquals(0.34, r.variables().get("nu"), 1e-9);
    }

    @Test
    void temperatureDependentSolidProperties() {
        EquationSystemSolver.Result r = solver.solve(
                "k_ref = k_(Aluminum)\n"
                        + "k_hot = k_(Aluminum, T=500)\n"   // 237 + (-0.02)(500-300) = 233
                        + "c_iron = c_(Iron, T=400)\n"      // 447 + 0.42(400-300) = 489
                        + "rho_hot = rho_(Steel, T=500)\n"  // density is constant
                        + "k_gold = k_(Gold, T=500)");      // no slope data -> constant
        assertEquals(237.0, r.variables().get("k_ref"), 1e-6);
        assertEquals(233.0, r.variables().get("k_hot"), 1e-6);
        assertEquals(489.0, r.variables().get("c_iron"), 1e-6);
        assertEquals(7854.0, r.variables().get("rho_hot"), 1e-6);
        assertEquals(317.0, r.variables().get("k_gold"), 1e-6);
    }

    @Test
    void solidPropertyParticipatesInHeatTransferCalc() {
        // Fourier conduction through an aluminum slab using the material DB.
        EquationSystemSolver.Result r = solver.solve(
                "q = k_(Aluminum) * A * dT / L\n"
                        + "A = 2\n"
                        + "dT = 50\n"
                        + "L = 0.1");
        assertEquals(237.0 * 2 * 50 / 0.1, r.variables().get("q"), 1e-6);
    }

    @Test
    void unknownMaterialIsAClearError() {
        assertThrows(Exception.class, () -> solver.solve("x = k_(Unobtanium)"));
    }

    @Test
    void arrayElmtDynamicIndexing() {
        EquationSystemSolver.Result r = solver.solve(
                "data[1] = 10\n"
                        + "data[2] = 20\n"
                        + "data[3] = 30\n"
                        + "data[4] = 40\n"
                        + "k = 3\n"
                        + "v = ArrayElmt(data[1:4], k)");
        assertEquals(30.0, r.variables().get("v"), 1e-9);
    }

    @Test
    void numericStringFunctions() {
        EquationSystemSolver.Result r = solver.solve(
                "n = StringLen('frees')\n"
                        + "p = StringPos('hello world', 'world')\n"
                        + "v = StringVal('3.14')");
        assertEquals(5.0, r.variables().get("n"), 1e-9);
        assertEquals(7.0, r.variables().get("p"), 1e-9);
        assertEquals(3.14, r.variables().get("v"), 1e-9);
    }
}
