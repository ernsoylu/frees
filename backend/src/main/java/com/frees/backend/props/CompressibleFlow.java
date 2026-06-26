package com.frees.backend.props;

/**
 * Ideal-gas (perfect-gas) compressible-flow relations as closed-form functions
 * of Mach number {@code M} and ratio of specific heats {@code k}. These mirror
 * the standalone ideal-gas-flow calculators in the Gas Dynamics Toolkit
 * (gdtk {@code idealgasflow.d}) and the Compressible-Flow function library in
 * EES, and were cross-checked against Cengel, <i>Thermodynamics: An Engineering
 * Approach</i> (isentropic, normal-shock and Rayleigh relations).
 *
 * <p>All ratios are dimensionless; angles (Prandtl-Meyer, oblique-shock theta
 * and beta) are in <b>radians</b>, the SI angle unit frees uses for the
 * trigonometric functions, so they compose directly with {@code sin}/{@code tan}.
 *
 * <p>The forward relations are pure functions; frees' Newton solver inverts them
 * numerically when an unknown appears inside one (e.g. {@code P0_P(M, 1.4) = 2}
 * solves for {@code M}). A few genuinely multi-valued inverses
 * ({@code mach_A_Astar}, {@code beta_oblique}) are provided explicitly with a
 * branch selector because Newton alone cannot choose between the two roots.
 */
public final class CompressibleFlow {

    private CompressibleFlow() {}

    private static void requireK(double k) {
        if (!(k > 1.0)) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: ratio of specific heats k must be > 1, got " + k + ".");
        }
    }

    private static void requireMach(double m) {
        if (!(m > 0.0)) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: Mach number must be > 0, got " + m + ".");
        }
    }

    private static void requireSupersonic(String what, double m) {
        if (!(m >= 1.0)) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: " + what + " requires a supersonic Mach number M >= 1, got " + m + ".");
        }
    }

    // ----- Isentropic flow (stagnation / area ratios) ------------------------

    /** Stagnation-to-static temperature ratio T0/T = 1 + (k-1)/2 M^2. */
    public static double t0OverT(double m, double k) {
        requireMach(m);
        requireK(k);
        return 1.0 + 0.5 * (k - 1.0) * m * m;
    }

    /** Stagnation-to-static pressure ratio P0/P. */
    public static double p0OverP(double m, double k) {
        return Math.pow(t0OverT(m, k), k / (k - 1.0));
    }

    /** Stagnation-to-static density ratio rho0/rho. */
    public static double rho0OverRho(double m, double k) {
        return Math.pow(t0OverT(m, k), 1.0 / (k - 1.0));
    }

    /** Isentropic area ratio A/A* (1 at M=1, increasing away from sonic). */
    public static double aOverAstar(double m, double k) {
        requireMach(m);
        requireK(k);
        double t = 1.0 + 0.5 * (k - 1.0) * m * m;
        double exponent = (k + 1.0) / (2.0 * (k - 1.0));
        return (1.0 / m) * Math.pow((2.0 / (k + 1.0)) * t, exponent);
    }

    /**
     * Inverts A/A* for Mach number on the requested branch.
     * @param regime "sub" / "subsonic" for M&lt;1, "sup" / "supersonic" for M&gt;1.
     */
    public static double machFromAOverAstar(double ratio, double k, String regime) {
        requireK(k);
        if (ratio < 1.0) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: A/A* must be >= 1, got " + ratio + ".");
        }
        String r = regime == null ? "" : regime.trim().toLowerCase();
        boolean subsonic = r.startsWith("sub");
        boolean supersonic = r.startsWith("sup");
        if (!subsonic && !supersonic) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: mach_A_Astar branch must be 'subsonic' or 'supersonic', got '" + regime + "'.");
        }
        if (ratio == 1.0) {
            return 1.0;
        }
        double lo = subsonic ? 1e-6 : 1.0;
        double hi = subsonic ? 1.0 : 50.0;
        // A/A* is monotone on each branch (decreasing for M<1, increasing for M>1).
        java.util.function.DoubleUnaryOperator f = m -> aOverAstar(m, k) - ratio;
        return bisect(f, lo, hi);
    }

    // ----- Normal shock (state 2 downstream of state 1) ----------------------

    /** Downstream Mach number M2 across a normal shock. */
    public static double machBehindShock(double m1, double k) {
        requireSupersonic("normal shock", m1);
        requireK(k);
        double m1s = m1 * m1;
        return Math.sqrt(((k - 1.0) * m1s + 2.0) / (2.0 * k * m1s - (k - 1.0)));
    }

    /** Static pressure ratio P2/P1 across a normal shock. */
    public static double shockPressureRatio(double m1, double k) {
        requireSupersonic("normal shock", m1);
        requireK(k);
        return (2.0 * k * m1 * m1 - (k - 1.0)) / (k + 1.0);
    }

    /** Static density ratio rho2/rho1 across a normal shock. */
    public static double shockDensityRatio(double m1, double k) {
        requireSupersonic("normal shock", m1);
        requireK(k);
        double m1s = m1 * m1;
        return (k + 1.0) * m1s / (2.0 + (k - 1.0) * m1s);
    }

    /** Static temperature ratio T2/T1 across a normal shock. */
    public static double shockTemperatureRatio(double m1, double k) {
        requireSupersonic("normal shock", m1);
        requireK(k);
        double m1s = m1 * m1;
        return (2.0 + (k - 1.0) * m1s) * (2.0 * k * m1s - (k - 1.0))
                / ((k + 1.0) * (k + 1.0) * m1s);
    }

    /** Stagnation pressure ratio P02/P01 across a normal shock (loss). */
    public static double shockStagnationPressureRatio(double m1, double k) {
        requireSupersonic("normal shock", m1);
        requireK(k);
        double m1s = m1 * m1;
        double a = (k + 1.0) * m1s / (2.0 + (k - 1.0) * m1s);
        double b = (k + 1.0) / (2.0 * k * m1s - (k - 1.0));
        return Math.pow(a, k / (k - 1.0)) * Math.pow(b, 1.0 / (k - 1.0));
    }

    // ----- Rayleigh flow (frictionless duct with heat addition) --------------

    /** Rayleigh T0/T0* (ratio to the sonic-reference stagnation temperature). */
    public static double rayleighT0OverT0star(double m, double k) {
        requireMach(m);
        requireK(k);
        double m2 = m * m;
        double denom = 1.0 + k * m2;
        return (k + 1.0) * m2 * (2.0 + (k - 1.0) * m2) / (denom * denom);
    }

    /** Rayleigh static temperature ratio T/T*. */
    public static double rayleighTOverTstar(double m, double k) {
        requireMach(m);
        requireK(k);
        double r = m * (1.0 + k) / (1.0 + k * m * m);
        return r * r;
    }

    /** Rayleigh static pressure ratio P/P*. */
    public static double rayleighPOverPstar(double m, double k) {
        requireMach(m);
        requireK(k);
        return (1.0 + k) / (1.0 + k * m * m);
    }

    /** Rayleigh stagnation pressure ratio P0/P0*. */
    public static double rayleighP0OverP0star(double m, double k) {
        requireMach(m);
        requireK(k);
        double base = (2.0 + (k - 1.0) * m * m) / (k + 1.0);
        return ((1.0 + k) / (1.0 + k * m * m)) * Math.pow(base, k / (k - 1.0));
    }

    // ----- Fanno flow (adiabatic duct with friction) -------------------------

    /** Fanno static temperature ratio T/T*. */
    public static double fannoTOverTstar(double m, double k) {
        requireMach(m);
        requireK(k);
        return (k + 1.0) / (2.0 + (k - 1.0) * m * m);
    }

    /** Fanno static pressure ratio P/P*. */
    public static double fannoPOverPstar(double m, double k) {
        requireMach(m);
        requireK(k);
        return (1.0 / m) * Math.sqrt((k + 1.0) / (2.0 + (k - 1.0) * m * m));
    }

    /** Fanno stagnation pressure ratio P0/P0*. */
    public static double fannoP0OverP0star(double m, double k) {
        requireMach(m);
        requireK(k);
        double base = (2.0 + (k - 1.0) * m * m) / (k + 1.0);
        return (1.0 / m) * Math.pow(base, (k + 1.0) / (2.0 * (k - 1.0)));
    }

    /** Fanno friction parameter 4 f Lmax / D (Fanning friction factor f). */
    public static double fanno4fLmaxOverD(double m, double k) {
        requireMach(m);
        requireK(k);
        double m2 = m * m;
        return (1.0 - m2) / (k * m2)
                + (k + 1.0) / (2.0 * k)
                * Math.log((k + 1.0) * m2 / (2.0 + (k - 1.0) * m2));
    }

    // ----- Prandtl-Meyer expansion -------------------------------------------

    /** Prandtl-Meyer function nu(M) [radians], the turn angle from M=1 to M. */
    public static double prandtlMeyer(double m, double k) {
        requireSupersonic("Prandtl-Meyer function", m);
        requireK(k);
        double t = Math.sqrt((k + 1.0) / (k - 1.0));
        double s = Math.sqrt(m * m - 1.0);
        return t * Math.atan(s / t) - Math.atan(s);
    }

    /** Inverts the Prandtl-Meyer function: Mach number for a given nu [radians]. */
    public static double machFromPrandtlMeyer(double nu, double k) {
        requireK(k);
        double nuMax = 0.5 * Math.PI * (Math.sqrt((k + 1.0) / (k - 1.0)) - 1.0);
        if (nu < 0.0 || nu >= nuMax) {
            throw new PropertyEvaluationException(String.format(
                    "Compressible-flow: Prandtl-Meyer angle %.4f rad is outside (0, %.4f) for k=%s.",
                    nu, nuMax, k));
        }
        if (nu == 0.0) {
            return 1.0;
        }
        java.util.function.DoubleUnaryOperator f = m -> prandtlMeyer(m, k) - nu;
        return bisect(f, 1.0, 1e4);
    }

    // ----- Oblique shock (theta-beta-M) --------------------------------------

    /** Mach angle mu = asin(1/M) [radians]. */
    public static double machAngle(double m) {
        requireSupersonic("Mach angle", m);
        return Math.asin(1.0 / m);
    }

    /**
     * Flow-deflection angle theta [rad] for an oblique shock of wave angle
     * beta [rad] on upstream Mach M1 (theta-beta-M relation).
     */
    public static double thetaOblique(double m1, double beta, double k) {
        requireSupersonic("oblique shock", m1);
        requireK(k);
        double m1n2 = m1 * m1 * Math.sin(beta) * Math.sin(beta);
        double num = 2.0 / Math.tan(beta) * (m1n2 - 1.0);
        double den = m1 * m1 * (k + Math.cos(2.0 * beta)) + 2.0;
        return Math.atan(num / den);
    }

    /**
     * Oblique-shock wave angle beta [rad] for a given deflection theta [rad].
     * @param branch "weak" (attached, smaller beta) or "strong" (larger beta).
     */
    public static double betaOblique(double m1, double theta, double k, String branch) {
        requireSupersonic("oblique shock", m1);
        requireK(k);
        if (theta <= 0.0) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: oblique-shock deflection theta must be > 0, got " + theta + ".");
        }
        String b = branch == null ? "" : branch.trim().toLowerCase();
        boolean weak = b.startsWith("weak");
        boolean strong = b.startsWith("strong");
        if (!weak && !strong) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: beta_oblique branch must be 'weak' or 'strong', got '" + branch + "'.");
        }
        double betaMin = Math.asin(1.0 / m1);          // Mach wave (theta -> 0)
        double betaMax = 0.5 * Math.PI;                // normal shock (theta -> 0)
        // theta(beta) rises from 0 at betaMin to a maximum then falls to 0 at pi/2.
        // Locate the peak, then bisect on the requested monotone branch.
        double betaPeak = betaMin;
        double thetaPeak = 0.0;
        int n = 400;
        for (int i = 0; i <= n; i++) {
            double beta = betaMin + (betaMax - betaMin) * i / n;
            double th = thetaOblique(m1, beta, k);
            if (th > thetaPeak) {
                thetaPeak = th;
                betaPeak = beta;
            }
        }
        if (theta > thetaPeak) {
            throw new PropertyEvaluationException(String.format(
                    "Compressible-flow: deflection theta=%.4f rad exceeds the maximum %.4f rad for M1=%s, k=%s "
                            + "(shock detaches).", theta, thetaPeak, m1, k));
        }
        java.util.function.DoubleUnaryOperator f = beta -> thetaOblique(m1, beta, k) - theta;
        if (weak) {
            return bisect(f, betaMin, betaPeak); // increasing branch
        }
        return bisect(f, betaPeak, betaMax);     // decreasing branch
    }

    // ----- shared numerics ---------------------------------------------------

    /**
     * Bisection root-finder for a continuous {@code f} sign-bracketed by
     * [lo, hi]; sign bookkeeping serves both monotone directions.
     */
    private static double bisect(java.util.function.DoubleUnaryOperator f, double lo, double hi) {
        double flo = f.applyAsDouble(lo);
        double fhi = f.applyAsDouble(hi);
        if (flo == 0.0) {
            return lo;
        }
        if (fhi == 0.0) {
            return hi;
        }
        if (flo * fhi > 0.0) {
            throw new PropertyEvaluationException(
                    "Compressible-flow: target is outside the solvable range for the requested branch.");
        }
        for (int i = 0; i < 200; i++) {
            double mid = 0.5 * (lo + hi);
            double fm = f.applyAsDouble(mid);
            if (Math.abs(fm) < 1e-12 || (hi - lo) < 1e-12) {
                return mid;
            }
            if ((fm > 0.0) == (flo > 0.0)) {
                lo = mid;
                flo = fm;
            } else {
                hi = mid;
            }
        }
        return 0.5 * (lo + hi);
    }
}
