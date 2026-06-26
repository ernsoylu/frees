package com.frees.backend.props;

/**
 * Two-phase (gas–liquid) flow constitutive functions for the component layer
 * (Phase C). The Lockhart–Martinelli / Chisholm correlation gives the two-phase
 * pressure-drop multiplier that turns a single-phase (liquid-alone) frictional
 * drop into the two-phase drop, so a refrigerant / steam pipe with a finite
 * quality closes a realistic {@code ΔP} equation instead of the homogeneous
 * Darcy approximation.
 *
 * <p>All SI; both functions are dimensionless.
 */
public final class TwoPhase {

    private TwoPhase() {}

    /**
     * Chisholm two-phase frictional multiplier on the liquid-alone drop,
     * {@code φ_l² = 1 + C/X + 1/X²}, where {@code X} is the Martinelli parameter
     * and {@code C} the Chisholm constant (20 turbulent–turbulent, 12 laminar–
     * turbulent, 10 turbulent–laminar, 5 laminar–laminar). The two-phase drop is
     * {@code ΔP_tp = φ_l² · ΔP_liquid-alone}.
     */
    public static double lmPhi2(double x, double c) {
        if (x <= 0.0) {
            throw new PropertyEvaluationException("lm_phi2: Martinelli parameter X must be > 0.");
        }
        return 1.0 + c / x + 1.0 / (x * x);
    }

    /**
     * Turbulent–turbulent Martinelli parameter
     * <pre>  X_tt = ((1−x)/x)^0.9 · (ρ_g/ρ_l)^0.5 · (μ_l/μ_g)^0.1 </pre>
     * from the vapor quality {@code x} (0–1) and the phase densities/viscosities.
     */
    public static double lmMartinelliTt(double quality, double rhoL, double rhoG,
                                        double muL, double muG) {
        if (quality <= 0.0 || quality >= 1.0) {
            throw new PropertyEvaluationException("lm_martinelli_tt: quality x must be in (0, 1).");
        }
        if (rhoL <= 0.0 || rhoG <= 0.0 || muL <= 0.0 || muG <= 0.0) {
            throw new PropertyEvaluationException("lm_martinelli_tt: densities and viscosities must be > 0.");
        }
        return Math.pow((1.0 - quality) / quality, 0.9)
                * Math.pow(rhoG / rhoL, 0.5)
                * Math.pow(muL / muG, 0.1);
    }
}
