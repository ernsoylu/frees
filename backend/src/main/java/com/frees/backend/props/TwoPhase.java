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

    private static final double GRAVITY = 9.80665;

    /**
     * Homogeneous (no-slip) void fraction
     * {@code α = 1 / (1 + ((1−x)/x)·(ρ_g/ρ_l))}. Clamped to {@code [0,1]} outside
     * the dome ({@code x≤0 → 0}, {@code x≥1 → 1}) so it is well-behaved as a
     * stream crosses the saturation lines.
     */
    public static double voidHomogeneous(double x, double rhoL, double rhoG) {
        if (x <= 0.0) {
            return 0.0;
        }
        if (x >= 1.0) {
            return 1.0;
        }
        requirePositive(rhoL, rhoG);
        return 1.0 / (1.0 + ((1.0 - x) / x) * (rhoG / rhoL));
    }

    /**
     * Zivi void fraction — a slip ratio {@code S = (ρ_l/ρ_g)^(1/3)} (minimum
     * entropy production) on the homogeneous form. Clamped to {@code [0,1]}.
     */
    public static double voidZivi(double x, double rhoL, double rhoG) {
        if (x <= 0.0) {
            return 0.0;
        }
        if (x >= 1.0) {
            return 1.0;
        }
        requirePositive(rhoL, rhoG);
        double s = Math.cbrt(rhoL / rhoG);
        return 1.0 / (1.0 + ((1.0 - x) / x) * (rhoG / rhoL) * s);
    }

    /**
     * Rouhani–Axelsson drift-flux void fraction (the orientation-aware default,
     * vertical/co-current form):
     * <pre>
     *   α = (x/ρ_g) / [ C0·(x/ρ_g + (1−x)/ρ_l) + u_gu/G ]
     *   C0 = 1 + 0.12·(1−x),   u_gu = 1.18·(1−x)·[g·σ·(ρ_l−ρ_g)/ρ_l²]^0.25
     * </pre>
     * with mass flux {@code G} [kg/m²s] and surface tension {@code σ} [N/m].
     * Clamped to {@code [0,1]}.
     */
    public static double voidRouhani(double x, double rhoL, double rhoG, double g, double sigma) {
        if (x <= 0.0) {
            return 0.0;
        }
        if (x >= 1.0) {
            return 1.0;
        }
        requirePositive(rhoL, rhoG);
        if (g <= 0.0 || sigma <= 0.0 || rhoL <= rhoG) {
            throw new PropertyEvaluationException(
                    "void_rouhani: mass flux G>0, surface tension σ>0 and ρ_l>ρ_g required.");
        }
        double c0 = 1.0 + 0.12 * (1.0 - x);
        double ugu = 1.18 * (1.0 - x)
                * Math.pow(GRAVITY * sigma * (rhoL - rhoG) / (rhoL * rhoL), 0.25);
        double denom = c0 * (x / rhoG + (1.0 - x) / rhoL) + ugu / g;
        double alpha = (x / rhoG) / denom;
        return Math.max(0.0, Math.min(1.0, alpha));
    }

    /**
     * Friedel two-phase frictional multiplier {@code φ_lo²} on the
     * <em>liquid-only</em> pressure drop:
     * <pre>
     *   φ_lo² = E + 3.24·F·H / (Fr^0.045 · We^0.035)
     * </pre>
     * with {@code E}, {@code F}, {@code H} the property/quality groups, the
     * homogeneous Froude {@code Fr = G²/(g·D·ρ_h²)} and Weber
     * {@code We = G²·D/(ρ_h·σ)} numbers, and liquid-/gas-only Fanning friction
     * factors from a Blasius law. {@code G} [kg/m²s], {@code D} [m], {@code σ}
     * [N/m]. Quality is clamped into {@code (0,1)}.
     */
    public static double friedelPhi2(double x, double rhoL, double rhoG,
                                     double muL, double muG, double g, double d, double sigma) {
        requirePositive(rhoL, rhoG);
        if (muL <= 0.0 || muG <= 0.0 || g <= 0.0 || d <= 0.0 || sigma <= 0.0) {
            throw new PropertyEvaluationException(
                    "friedel_phi2: viscosities, G, D and σ must be > 0.");
        }
        double xx = Math.max(1e-6, Math.min(1.0 - 1e-6, x));
        double rhoH = 1.0 / (xx / rhoG + (1.0 - xx) / rhoL);
        double fLo = blasiusFanning(g * d / muL);
        double fGo = blasiusFanning(g * d / muG);
        double e = (1.0 - xx) * (1.0 - xx) + xx * xx * (rhoL * fGo) / (rhoG * fLo);
        double f = Math.pow(xx, 0.78) * Math.pow(1.0 - xx, 0.224);
        double h = Math.pow(rhoL / rhoG, 0.91) * Math.pow(muG / muL, 0.19)
                * Math.pow(1.0 - muG / muL, 0.7);
        double fr = g * g / (GRAVITY * d * rhoH * rhoH);
        double we = g * g * d / (rhoH * sigma);
        return e + 3.24 * f * h / (Math.pow(fr, 0.045) * Math.pow(we, 0.035));
    }

    /**
     * Separated-flow momentum flux {@code G²·[x²/(ρ_g·α) + (1−x)²/(ρ_l·(1−α))]}
     * [Pa] at one station. The acceleration pressure drop across an element is the
     * difference of this term between outlet and inlet. {@code α} is clamped to
     * {@code (0,1)}.
     */
    public static double momentumFlux(double x, double rhoL, double rhoG, double alpha, double g) {
        requirePositive(rhoL, rhoG);
        double a = Math.max(1e-9, Math.min(1.0 - 1e-9, alpha));
        return g * g * (x * x / (rhoG * a) + (1.0 - x) * (1.0 - x) / (rhoL * (1.0 - a)));
    }

    /** Blasius Fanning friction factor 0.079·Re^-0.25, with a laminar floor 16/Re. */
    private static double blasiusFanning(double re) {
        double r = Math.max(re, 1.0);
        return r < 1187.0 ? 16.0 / r : 0.079 * Math.pow(r, -0.25);
    }

    private static void requirePositive(double rhoL, double rhoG) {
        if (rhoL <= 0.0 || rhoG <= 0.0) {
            throw new PropertyEvaluationException("two-phase: densities must be > 0.");
        }
    }
}
