package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase D — fuel cell (PEMFC). A self-contained cross-domain component reusing
 * the electrical {@code (V,I)} and heat {@code (T,Q̇)} ports already shipped. The
 * cell voltage follows the standard polarization curve — reversible EMF minus
 * activation (Butler–Volmer / Tafel), ohmic, and concentration overpotentials —
 * and the waste heat is {@code I·n·(E_th − V_cell)}. Pure component body over
 * {@code ln} (no new backend function). A {@code CurrentDraw} boundary fixes the
 * stack current so the polarization voltage and waste heat are deterministic.
 */
class ComponentFuelCellTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** The single-cell polarization voltage mirrored from the component body. */
    private static double vCell(double e0, double alpha, double t, double i, double i0,
                                double rohm, double ilim) {
        return e0
                - (8.314 * t / (alpha * 96485)) * Math.log(i / i0)
                - i * rohm
                - (8.314 * t / (2 * 96485)) * Math.log(ilim / (ilim - i));
    }

    @Test
    void stackProducesItsPolarizationVoltageAndWasteHeat() {
        // 10-cell stack, 100 cm² (0.01 m²) active area, drawing 50 A → 0.5 A/cm².
        String src = """
                COMPONENT CurrentDraw(p, n)
                  PARAM Idraw
                  p.I = Idraw
                  p.I + n.I = 0
                END
                FuelCellStack FC(ncells=10, area=0.01, i0=10, ilim=20000, Rohm=1e-5, E0=1.18, alpha=0.5, Eth=1.48, T=343)
                CurrentDraw   LOAD(Idraw=50)
                ThermalSource COOL(T=343)
                Convection    HS(htc=200, area=1)
                Ground        G()
                connect(FC.p, LOAD.p)
                connect(FC.n, LOAD.n, G.port)
                connect(FC.heat, HS.a)
                connect(HS.b, COOL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double i = 50.0 / 0.01;
        double vc = vCell(1.18, 0.5, 343, i, 10, 1e-5, 20000);
        assertEquals(10.0 * vc, v.get("fc.p.v") - v.get("fc.n.v"), 1e-6);   // stack terminal voltage
        assertEquals(50.0 * 10.0 * (1.48 - vc), v.get("fc.q"), 1e-3);       // waste heat
        // Sane physics: each cell well below its 1.18 V OCV but still positive.
        assertTrue(vc > 0.5 && vc < 1.18, "cell voltage in band: " + vc);
    }

    @Test
    void higherCurrentLowersVoltageAndRaisesHeat() {
        // Polarization: drawing more current drops the voltage and dumps more heat.
        String base = """
                COMPONENT CurrentDraw(p, n)
                  PARAM Idraw
                  p.I = Idraw
                  p.I + n.I = 0
                END
                FuelCellStack FC(ncells=10, area=0.01, i0=10, ilim=20000, Rohm=1e-5, E0=1.18, alpha=0.5, Eth=1.48, T=343)
                CurrentDraw   LOAD(Idraw=IVAL)
                ThermalSource COOL(T=343)
                Convection    HS(htc=200, area=1)
                Ground        G()
                connect(FC.p, LOAD.p)
                connect(FC.n, LOAD.n, G.port)
                connect(FC.heat, HS.a)
                connect(HS.b, COOL.port)
                """;
        Map<String, Double> lo = solver.solve(base.replace("IVAL", "30")).variables();
        Map<String, Double> hi = solver.solve(base.replace("IVAL", "120")).variables();
        double vLo = lo.get("fc.p.v") - lo.get("fc.n.v");
        double vHi = hi.get("fc.p.v") - hi.get("fc.n.v");
        assertTrue(vHi < vLo, "higher current → lower voltage");
        assertTrue(hi.get("fc.q") > lo.get("fc.q"), "higher current → more waste heat");
    }
}
