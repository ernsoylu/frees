package com.frees.backend.props;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Cubic equation-of-state (SRK/PR) backend. Checks the ideal-gas limit, real-gas
 * compressibility, P-v-T self-consistency, and vapour pressure against known
 * data and (when available) CoolProp.
 */
class CubicEosTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void idealGasLimitAtLowPressure() {
        // Nitrogen at 400 K, 1 bar is nearly ideal: Z ~ 1, rho ~ P*M/(Ru*T).
        double z = CubicEos.z("nitrogen", "PR", 400.0, 1.0e5, "vapor");
        assertEquals(1.0, z, 5e-3);
        double rhoIdeal = 1.0e5 * 0.028013 / (8.314462618 * 400.0);
        assertEquals(rhoIdeal, CubicEos.density("nitrogen", "PR", 400.0, 1.0e5, "vapor"), 0.02 * rhoIdeal);
    }

    @Test
    void realGasCompressibilityBelowUnity() {
        // CO2 at 300 K, 6 MPa is a dense vapour; Z well below 1 for both models.
        double zPr = CubicEos.z("co2", "PR", 300.0, 6.0e6, "vapor");
        double zSrk = CubicEos.z("co2", "SRK", 300.0, 6.0e6, "vapor");
        assertTrue(zPr > 0.0 && zPr < 0.8, "PR Z should be a dense-vapour value, got " + zPr);
        assertTrue(zSrk > 0.0 && zSrk < 0.85, "SRK Z should be < 1, got " + zSrk);
    }

    @Test
    void pressureVolumeRoundTrip() {
        double v = CubicEos.volume("co2", "PR", 320.0, 5.0e6, "vapor");
        assertEquals(5.0e6, CubicEos.pressure("co2", "PR", 320.0, v), 1.0); // back out P from (T, v)
        // Liquid root is denser than the vapour root at the same state.
        double vLiq = CubicEos.volume("propane", "PR", 300.0, 1.0e6, "liquid");
        double vVap = CubicEos.volume("propane", "PR", 300.0, 1.0e6, "vapor");
        assertTrue(vLiq < vVap, "liquid specific volume must be smaller than vapour");
    }

    @Test
    void saturationPressureOfPropane() {
        // Propane vapour pressure at 300 K is ~0.997 MPa (NIST); PR within a few %.
        double psat = CubicEos.saturationPressure("propane", "PR", 300.0);
        assertEquals(9.97e5, psat, 0.06 * 9.97e5);
        assertThrows(PropertyEvaluationException.class,
                () -> CubicEos.saturationPressure("propane", "PR", 400.0)); // above Tc... (Tc=369.9)
    }

    @Test
    void enthalpyRisesWithTemperature() {
        double h300 = CubicEos.enthalpy("co2", "PR", 300.0, 1.0e6, "vapor");
        double h350 = CubicEos.enthalpy("co2", "PR", 350.0, 1.0e6, "vapor");
        assertTrue(h350 > h300, "enthalpy must increase with temperature at fixed P");
    }

    @Test
    void matchesCoolPropDensityWithinFewPercent() {
        assumeTrue(com.frees.backend.props.CoolProp.isAvailable(),
                "CoolProp not available; skipping cross-check");
        double rhoEos = CubicEos.density("co2", "PR", 350.0, 5.0e6, "vapor");
        double rhoRef = com.frees.backend.props.CoolProp.propsSI(
                "Dmass", "T", 350.0, "P", 5.0e6, "CO2");
        assertEquals(rhoRef, rhoEos, 0.06 * rhoRef); // cubic EOS within ~6% of reference
    }

    @Test
    void wiredThroughSolver() {
        EquationSystemSolver.Result result = solver.solve("""
                T = 320
                P = 4e6
                Z = eos_z('co2', 'PR', T, P, 'vapor')
                rho = eos_density('co2', 'PR', T, P, 'vapor')
                Psat = eos_psat('propane', 'PR', 300)
                """);
        assertTrue(result.variables().get("Z") < 0.95);
        assertTrue(result.variables().get("rho") > 60.0);
        assertEquals(9.97e5, result.variables().get("Psat"), 0.06 * 9.97e5);
    }

    @Test
    void unknownFluidOrModelIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> CubicEos.z("unobtainium", "PR", 300.0, 1e5, "vapor"));
        assertThrows(PropertyEvaluationException.class,
                () -> CubicEos.z("co2", "vdw", 300.0, 1e5, "vapor"));
    }
}
