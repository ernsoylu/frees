package com.frees.backend.props;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.props.HeatExchanger.Arrangement;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Heat-exchanger effectiveness-NTU relations checked against standard tables
 * (standard compact-heat-exchanger references), cross-checked
 * against multiple standard texts. NTU = 1, Cr = 0.5 unless noted.
 */
class HeatExchangerTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void effectivenessByArrangementAtNtu1Cr05() {
        assertEquals(0.56473, HeatExchanger.effectiveness(Arrangement.COUNTERFLOW, 1.0, 0.5), 1e-4);
        assertEquals(0.51791, HeatExchanger.effectiveness(Arrangement.PARALLELFLOW, 1.0, 0.5), 1e-4);
        assertEquals(0.54475, HeatExchanger.effectiveness(Arrangement.CROSSFLOW_BOTH_UNMIXED, 1.0, 0.5), 1e-4);
        assertEquals(0.54197, HeatExchanger.effectiveness(Arrangement.CROSSFLOW_CMAX_MIXED, 1.0, 0.5), 1e-4);
        assertEquals(0.54475, HeatExchanger.effectiveness(Arrangement.CROSSFLOW_CMIN_MIXED, 1.0, 0.5), 1e-4);
        assertEquals(0.54000, HeatExchanger.effectiveness(Arrangement.SHELL_AND_TUBE, 1.0, 0.5), 1e-4);
    }

    @Test
    void limitingCases() {
        // Cr = 0 (boiling/condensing): identical for every arrangement.
        double boil = 1.0 - Math.exp(-1.0);
        for (Arrangement a : Arrangement.values()) {
            assertEquals(boil, HeatExchanger.effectiveness(a, 1.0, 0.0), 1e-9);
        }
        // Counterflow with Cr = 1 reduces to NTU/(1+NTU).
        assertEquals(2.0 / 3.0, HeatExchanger.effectiveness(Arrangement.COUNTERFLOW, 2.0, 1.0), 1e-9);
        // Counterflow is the most effective arrangement at the same NTU, Cr.
        double counter = HeatExchanger.effectiveness(Arrangement.COUNTERFLOW, 1.0, 0.5);
        double parallel = HeatExchanger.effectiveness(Arrangement.PARALLELFLOW, 1.0, 0.5);
        assertTrue(counter > parallel, "counterflow beats parallel flow");
    }

    @Test
    void ntuInvertsEffectivenessForEachArrangement() {
        for (Arrangement a : Arrangement.values()) {
            double eps = HeatExchanger.effectiveness(a, 1.0, 0.5);
            assertEquals(1.0, HeatExchanger.ntu(a, eps, 0.5), 1e-5,
                    "NTU inverse mismatch for " + a);
        }
        // Boiling limit inverts in closed form too.
        double eps0 = HeatExchanger.effectiveness(Arrangement.COUNTERFLOW, 1.5, 0.0);
        assertEquals(1.5, HeatExchanger.ntu(Arrangement.COUNTERFLOW, eps0, 0.0), 1e-9);
    }

    @Test
    void unreachableEffectivenessIsRejected() {
        // Parallel flow caps at 1/(1+Cr) = 0.6667 for Cr = 0.5.
        assertThrows(PropertyEvaluationException.class,
                () -> HeatExchanger.ntu(Arrangement.PARALLELFLOW, 0.80, 0.5));
    }

    @Test
    void lmtdAndFinEfficiency() {
        assertEquals(30.0 / Math.log(2.5), HeatExchanger.lmtd(50.0, 20.0), 1e-9);
        assertEquals(10.0, HeatExchanger.lmtd(10.0, 10.0), 1e-9); // removable singularity
        assertThrows(PropertyEvaluationException.class, () -> HeatExchanger.lmtd(10.0, -5.0));
        assertEquals(Math.tanh(1.0), HeatExchanger.finEfficiency(1.0), 1e-9);
        assertEquals(1.0, HeatExchanger.finEfficiency(0.0), 1e-12);
    }

    @Test
    void arrangementSpellingIsForgiving() {
        assertEquals(Arrangement.COUNTERFLOW, HeatExchanger.arrangement("Counter-Flow"));
        assertEquals(Arrangement.SHELL_AND_TUBE, HeatExchanger.arrangement("shell&tube"));
        assertEquals(Arrangement.CROSSFLOW_BOTH_UNMIXED, HeatExchanger.arrangement("crossflow"));
        assertThrows(PropertyEvaluationException.class, () -> HeatExchanger.arrangement("zigzag"));
    }

    @Test
    void wiredThroughSolver() {
        // Forward effectiveness, an LMTD-based duty, and Newton inverting the
        // effectiveness correlation for the NTU that delivers eps = 0.75.
        EquationSystemSolver.Result result = solver.solve("""
                Cr = 0.5
                NTU = 1
                eps = hx_effectiveness('counterflow', NTU, Cr)
                hx_effectiveness('counterflow', NTU_req, Cr) = 0.75
                dTlm = LMTD(50, 20)
                Q = 1200 * dTlm
                """);
        assertEquals(0.56473, result.variables().get("eps"), 1e-4);
        assertEquals(32.740, result.variables().get("dTlm"), 1e-3);
        // Independent closed-form NTU for eps = 0.75, Cr = 0.5.
        double expectedNtu = HeatExchanger.ntu(Arrangement.COUNTERFLOW, 0.75, 0.5);
        assertEquals(expectedNtu, result.variables().get("NTU_req"), 1e-3);
        assertTrue(expectedNtu > 1.0);
    }
}
