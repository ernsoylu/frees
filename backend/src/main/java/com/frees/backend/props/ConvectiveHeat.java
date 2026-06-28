package com.frees.backend.props;

/**
 * Convective heat-transfer correlations for the two-phase component layer
 * (Phase&nbsp;T3): single-phase Nusselt numbers (Dittus–Boelter, Gnielinski),
 * the Chen flow-boiling enhancement/suppression factors, and condensation
 * Nusselt numbers (Shah, Cavallini–Zecchin). Plus the §4.8 {@code zone_ramp}
 * smoothing used to make a moving-boundary zone's heat-transfer and storage
 * terms fade to zero as it collapses (so the integrator steps through, rather
 * than over, a structural event).
 *
 * <p>All Nusselt numbers are dimensionless; {@code zone_ramp} is dimensionless.
 */
public final class ConvectiveHeat {

    private ConvectiveHeat() {}

    /**
     * Dittus–Boelter single-phase Nusselt number {@code 0.023·Re^0.8·Pr^n}
     * ({@code n = 0.4} heating the fluid, {@code 0.3} cooling).
     */
    public static double dittusBoelter(double re, double pr, double n) {
        if (re <= 0 || pr <= 0) {
            throw new PropertyEvaluationException("nu_dittus_boelter: Re and Pr must be > 0.");
        }
        return 0.023 * Math.pow(re, 0.8) * Math.pow(pr, n);
    }

    /**
     * Gnielinski single-phase Nusselt number (more accurate than Dittus–Boelter
     * over {@code 3000 < Re < 5e6}), using the smooth-tube friction factor
     * {@code f = (0.790·ln Re − 1.64)^-2}.
     */
    public static double gnielinski(double re, double pr) {
        if (re <= 0 || pr <= 0) {
            throw new PropertyEvaluationException("nu_gnielinski: Re and Pr must be > 0.");
        }
        double f = Math.pow(0.790 * Math.log(re) - 1.64, -2.0);
        double num = (f / 8.0) * (re - 1000.0) * pr;
        double den = 1.0 + 12.7 * Math.sqrt(f / 8.0) * (Math.pow(pr, 2.0 / 3.0) - 1.0);
        return num / den;
    }

    /**
     * Chen flow-boiling <b>convective enhancement</b> factor {@code F} as a
     * function of the inverse Martinelli parameter {@code 1/X_tt}:
     * {@code F = 1} for {@code 1/X_tt ≤ 0.1}, else {@code 2.35·(1/X_tt + 0.213)^0.736}.
     */
    public static double chenF(double xtt) {
        if (xtt <= 0) {
            throw new PropertyEvaluationException("chen_f: Martinelli parameter X_tt must be > 0.");
        }
        double inv = 1.0 / xtt;
        return inv <= 0.1 ? 1.0 : 2.35 * Math.pow(inv + 0.213, 0.736);
    }

    /**
     * Chen flow-boiling <b>nucleate-suppression</b> factor {@code S} from the
     * liquid Reynolds number and the convective factor {@code F}:
     * {@code S = 1 / (1 + 2.53e-6·Re_tp^1.17)}, {@code Re_tp = Re_l·F^1.25}.
     */
    public static double chenS(double reL, double f) {
        if (reL <= 0 || f <= 0) {
            throw new PropertyEvaluationException("chen_s: Re_l and F must be > 0.");
        }
        double reTp = reL * Math.pow(f, 1.25);
        return 1.0 / (1.0 + 2.53e-6 * Math.pow(reTp, 1.17));
    }

    /**
     * Shah condensation Nusselt number — the liquid-only Nu boosted by the
     * two-phase factor:
     * <pre>
     *   Nu = Nu_l · [ (1−x)^0.8 + 3.8·x^0.76·(1−x)^0.04 / p_red^0.38 ]
     *   Nu_l = 0.023·Re_l^0.8·Pr_l^0.4
     * </pre>
     * with reduced pressure {@code p_red = P/P_crit}. Quality clamped to {@code (0,1)}.
     */
    public static double shah(double reL, double prL, double x, double pRed) {
        if (reL <= 0 || prL <= 0) {
            throw new PropertyEvaluationException("nu_shah: Re_l and Pr_l must be > 0.");
        }
        if (pRed <= 0 || pRed >= 1) {
            throw new PropertyEvaluationException("nu_shah: reduced pressure must be in (0,1).");
        }
        double xx = Math.max(1e-6, Math.min(1.0 - 1e-6, x));
        double nuL = 0.023 * Math.pow(reL, 0.8) * Math.pow(prL, 0.4);
        return nuL * (Math.pow(1.0 - xx, 0.8)
                + 3.8 * Math.pow(xx, 0.76) * Math.pow(1.0 - xx, 0.04) / Math.pow(pRed, 0.38));
    }

    /**
     * Cavallini–Zecchin condensation Nusselt number
     * {@code Nu = 0.05·Re_eq^0.8·Pr_l^0.33} with the equivalent Reynolds number
     * {@code Re_eq = Re_l·[(1−x) + x·(ρ_l/ρ_g)^0.5]}. Quality clamped to {@code (0,1)}.
     */
    public static double cavalliniZecchin(double reL, double prL, double x, double rhoL, double rhoG) {
        if (reL <= 0 || prL <= 0 || rhoL <= 0 || rhoG <= 0) {
            throw new PropertyEvaluationException(
                    "nu_cavallini_zecchin: Re_l, Pr_l and densities must be > 0.");
        }
        double xx = Math.max(1e-6, Math.min(1.0 - 1e-6, x));
        double reEq = reL * ((1.0 - xx) + xx * Math.sqrt(rhoL / rhoG));
        return 0.05 * Math.pow(reEq, 0.8) * Math.pow(prL, 0.33);
    }

    /**
     * Smooth zone-collapse ramp {@code tanh(L/ε)} (§4.8): {@code →1} for a healthy
     * zone, {@code →0} as the zone length {@code L} shrinks toward the floor
     * {@code ε}. Multiplying both a moving-boundary zone's heat-transfer and its
     * storage terms by this makes a collapsing zone a true (mass/energy-conserving)
     * passthrough, so the BDF integrates through the event instead of stalling.
     */
    public static double zoneRamp(double length, double eps) {
        if (eps <= 0) {
            throw new PropertyEvaluationException("zone_ramp: ε must be > 0.");
        }
        return Math.tanh(Math.max(0.0, length) / eps);
    }
}
