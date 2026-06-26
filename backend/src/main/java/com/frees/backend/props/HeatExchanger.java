package com.frees.backend.props;

/**
 * Heat-exchanger effectiveness-NTU relations, the log-mean temperature
 * difference, and fin efficiency. The epsilon-NTU correlations are the standard
 * forms from Kays &amp; London, <i>Compact Heat Exchangers</i>, and Kakac,
 * <i>Heat Exchangers: Selection, Rating and Thermal Design</i> (cross-checked
 * via NotebookLM against those texts and the VDI Heat Atlas).
 *
 * <p>Conventions: {@code NTU = UA/Cmin}, capacity ratio
 * {@code Cr = Cmin/Cmax in [0, 1]}, effectiveness {@code eps in [0, 1]}. A
 * capacity ratio of 0 is the boiling/condensing limit (one stream isothermal).
 * All quantities are dimensionless except {@link #lmtd} which carries the
 * temperature-difference units of its arguments.
 */
public final class HeatExchanger {

    private HeatExchanger() {}

    /** Canonical flow arrangements understood by the effectiveness/NTU functions. */
    public enum Arrangement {
        COUNTERFLOW, PARALLELFLOW,
        CROSSFLOW_BOTH_UNMIXED, CROSSFLOW_CMAX_MIXED, CROSSFLOW_CMIN_MIXED,
        SHELL_AND_TUBE
    }

    /**
     * Resolves a user-supplied arrangement spelling to an {@link Arrangement},
     * ignoring case, spaces and punctuation so 'counter-flow', 'CounterFlow'
     * and 'counter flow' all match.
     */
    public static Arrangement arrangement(String name) {
        String key = name == null ? "" : name.toLowerCase().replaceAll("[^a-z0-9]", "");
        return switch (key) {
            case "counterflow", "counter", "countercurrent" -> Arrangement.COUNTERFLOW;
            case "parallelflow", "parallel", "cocurrent", "coflow" -> Arrangement.PARALLELFLOW;
            case "crossflow", "crossflowbothunmixed", "crossbothunmixed",
                 "crossflowunmixed", "bothunmixed" -> Arrangement.CROSSFLOW_BOTH_UNMIXED;
            case "crossflowcmaxmixed", "cmaxmixed", "crossflowcminunmixed" -> Arrangement.CROSSFLOW_CMAX_MIXED;
            case "crossflowcminmixed", "cminmixed", "crossflowcmaxunmixed" -> Arrangement.CROSSFLOW_CMIN_MIXED;
            case "shelltube", "shellandtube", "shellandtube1", "shell", "shelltube1" -> Arrangement.SHELL_AND_TUBE;
            default -> throw new PropertyEvaluationException(
                    "Heat exchanger: unknown flow arrangement '" + name + "'. Use one of "
                            + "counterflow, parallelflow, crossflow_both_unmixed, "
                            + "crossflow_cmax_mixed, crossflow_cmin_mixed, shell&tube.");
        };
    }

    private static void requireNtu(double ntu) {
        if (!(ntu >= 0.0)) {
            throw new PropertyEvaluationException("Heat exchanger: NTU must be >= 0, got " + ntu + ".");
        }
    }

    private static void requireCr(double cr) {
        if (!(cr >= 0.0 && cr <= 1.0)) {
            throw new PropertyEvaluationException(
                    "Heat exchanger: capacity ratio Cr = Cmin/Cmax must be in [0, 1], got " + cr + ".");
        }
    }

    private static void requireEps(double eps) {
        if (!(eps > 0.0 && eps < 1.0)) {
            throw new PropertyEvaluationException(
                    "Heat exchanger: effectiveness must be in (0, 1), got " + eps + ".");
        }
    }

    /** Effectiveness eps(NTU, Cr) for the given flow arrangement. */
    public static double effectiveness(Arrangement type, double ntu, double cr) {
        requireNtu(ntu);
        requireCr(cr);
        // Boiling/condensing limit: one stream isothermal, identical for all types.
        if (cr == 0.0) {
            return 1.0 - Math.exp(-ntu);
        }
        return switch (type) {
            case COUNTERFLOW -> {
                if (Math.abs(cr - 1.0) < 1e-10) {
                    yield ntu / (1.0 + ntu);
                }
                double e = Math.exp(-ntu * (1.0 - cr));
                yield (1.0 - e) / (1.0 - cr * e);
            }
            case PARALLELFLOW -> (1.0 - Math.exp(-ntu * (1.0 + cr))) / (1.0 + cr);
            case CROSSFLOW_BOTH_UNMIXED -> {
                // Standard approximate correlation (no simple closed exact form):
                // eps = 1 - exp[ (1/Cr) NTU^0.22 (exp(-Cr NTU^0.78) - 1) ].
                double n022 = Math.pow(ntu, 0.22);
                double n078 = Math.pow(ntu, 0.78);
                yield 1.0 - Math.exp((1.0 / cr) * n022 * (Math.exp(-cr * n078) - 1.0));
            }
            case CROSSFLOW_CMAX_MIXED ->
                // Cmax mixed, Cmin unmixed.
                (1.0 / cr) * (1.0 - Math.exp(-cr * (1.0 - Math.exp(-ntu))));
            case CROSSFLOW_CMIN_MIXED ->
                // Cmin mixed, Cmax unmixed.
                1.0 - Math.exp(-(1.0 / cr) * (1.0 - Math.exp(-cr * ntu)));
            case SHELL_AND_TUBE -> {
                // One shell pass, 2,4,... tube passes.
                double root = Math.sqrt(1.0 + cr * cr);
                double e = Math.exp(-ntu * root);
                yield 2.0 / (1.0 + cr + root * (1.0 + e) / (1.0 - e));
            }
        };
    }

    /**
     * Inverse relation NTU(eps, Cr): the number of transfer units needed to
     * reach effectiveness {@code eps}. Closed form where one exists, otherwise
     * a monotone bisection on the forward correlation (crossflow both unmixed).
     */
    public static double ntu(Arrangement type, double eps, double cr) {
        requireEps(eps);
        requireCr(cr);
        if (cr == 0.0) {
            return -Math.log(1.0 - eps);
        }
        double epsMax = maxEffectiveness(type, cr);
        if (eps >= epsMax) {
            throw new PropertyEvaluationException(String.format(
                    "Heat exchanger: effectiveness %.4f is unreachable for this arrangement at Cr=%.4f "
                            + "(limit %.4f as NTU->inf).", eps, cr, epsMax));
        }
        return switch (type) {
            case COUNTERFLOW -> {
                if (Math.abs(cr - 1.0) < 1e-10) {
                    yield eps / (1.0 - eps);
                }
                yield (1.0 / (cr - 1.0)) * Math.log((eps - 1.0) / (eps * cr - 1.0));
            }
            case PARALLELFLOW -> -Math.log(1.0 - eps * (1.0 + cr)) / (1.0 + cr);
            case CROSSFLOW_CMAX_MIXED -> -Math.log(1.0 + Math.log(1.0 - cr * eps) / cr);
            case CROSSFLOW_CMIN_MIXED -> -(1.0 / cr) * Math.log(1.0 + cr * Math.log(1.0 - eps));
            case SHELL_AND_TUBE -> {
                double root = Math.sqrt(1.0 + cr * cr);
                double e = (2.0 / eps - (1.0 + cr)) / root;
                yield -Math.log((e - 1.0) / (e + 1.0)) / root;
            }
            case CROSSFLOW_BOTH_UNMIXED ->
                bisectNtu(n -> effectiveness(type, n, cr) - eps);
        };
    }

    /** Maximum reachable effectiveness as NTU -> infinity, used to guard inversion. */
    private static double maxEffectiveness(Arrangement type, double cr) {
        return switch (type) {
            case COUNTERFLOW, CROSSFLOW_BOTH_UNMIXED -> 1.0;
            case PARALLELFLOW -> 1.0 / (1.0 + cr);
            case CROSSFLOW_CMAX_MIXED -> (1.0 / cr) * (1.0 - Math.exp(-cr));
            case CROSSFLOW_CMIN_MIXED -> 1.0 - Math.exp(-1.0 / cr);
            case SHELL_AND_TUBE -> 2.0 / (1.0 + cr + Math.sqrt(1.0 + cr * cr));
        };
    }

    /**
     * Log-mean temperature difference from the two terminal temperature
     * differences (same units in, same units out). For equal differences it
     * returns that common value (the removable singularity of the log mean).
     */
    public static double lmtd(double dt1, double dt2) {
        if (dt1 <= 0.0 || dt2 <= 0.0) {
            throw new PropertyEvaluationException(
                    "Heat exchanger: LMTD terminal differences must be positive (a temperature cross "
                            + "or pinch gives a non-physical LMTD); got " + dt1 + ", " + dt2 + ".");
        }
        if (Math.abs(dt1 - dt2) < 1e-12 * Math.max(dt1, dt2)) {
            return 0.5 * (dt1 + dt2);
        }
        return (dt1 - dt2) / Math.log(dt1 / dt2);
    }

    /**
     * Efficiency of a straight fin with an adiabatic tip,
     * {@code eta = tanh(mL)/(mL)}, where {@code mL = L*sqrt(2h/(k*t))} is the
     * dimensionless fin parameter (use the corrected length for a convective
     * tip). Approaches 1 as mL -> 0.
     */
    public static double finEfficiency(double mL) {
        if (mL < 0.0) {
            throw new PropertyEvaluationException(
                    "Heat exchanger: fin parameter mL must be >= 0, got " + mL + ".");
        }
        if (mL < 1e-8) {
            return 1.0;
        }
        return Math.tanh(mL) / mL;
    }

    /** Bisection for a monotone-increasing-in-NTU residual on [0, 200]. */
    private static double bisectNtu(java.util.function.DoubleUnaryOperator residual) {
        double lo = 0.0;
        double hi = 200.0;
        double flo = residual.applyAsDouble(lo);
        double fhi = residual.applyAsDouble(hi);
        if (flo * fhi > 0.0) {
            throw new PropertyEvaluationException(
                    "Heat exchanger: requested effectiveness is out of the solvable NTU range.");
        }
        for (int i = 0; i < 200; i++) {
            double mid = 0.5 * (lo + hi);
            double fm = residual.applyAsDouble(mid);
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
