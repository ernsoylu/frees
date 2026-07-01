package com.frees.backend.ast;

import java.util.List;
import java.util.Map;

/**
 * Control-systems intrinsic evaluation (Epic 12): the {@code series},
 * {@code parallel}, {@code feedback}, {@code pole}/{@code zero}, {@code bode},
 * {@code nyquist}, {@code margin}, {@code routh}, {@code residue},
 * {@code nichols}, {@code step}/{@code impulse}/{@code lsim},
 * {@code lqr}/{@code place}/{@code pidtune}, {@code ctrb}/{@code obsv}/
 * {@code rank}, SS interconnection, {@code stepinfo}, {@code pade},
 * {@code rlocus}, {@code discretize}, {@code errorconst}, {@code mason} and
 * their helpers.
 *
 * <p>Extracted from the monolithic {@link Evaluator} (was ~1160 of its 2468
 * lines). These handlers are pure functions of an {@link Expr.Call} and the
 * variable/def maps; the only cross-class dependency is {@link Evaluator#eval}
 * for sub-expression evaluation, so they collapse into this one sibling class
 * without behaviour change. {@link Evaluator#evalBuiltin} dispatches each
 * control-systems call here.
 */
final class ControlSystemsEvaluator {

    private ControlSystemsEvaluator() {}

    static double evalSeries(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantNum = parts[1].equals("num");
        int index = Integer.parseInt(parts[2]);
        int L1 = Integer.parseInt(parts[3]);
        int L2 = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num1 = new double[L1];
        double[] den1 = new double[L1];
        double[] num2 = new double[L2];
        double[] den2 = new double[L2];

        int idx = 0;
        for (int i = 0; i < L1; i++) num1[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L1; i++) den1[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) num2[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) den2[i] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] result = com.frees.backend.cas.PolynomialHelpers.series(num1, den1, num2, den2);
        double[] coeffs = wantNum ? result[0] : result[1];
        return coeffs[index];
    }

    static double evalParallel(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantNum = parts[1].equals("num");
        int index = Integer.parseInt(parts[2]);
        int L1 = Integer.parseInt(parts[3]);
        int L2 = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num1 = new double[L1];
        double[] den1 = new double[L1];
        double[] num2 = new double[L2];
        double[] den2 = new double[L2];

        int idx = 0;
        for (int i = 0; i < L1; i++) num1[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L1; i++) den1[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) num2[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) den2[i] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] result = com.frees.backend.cas.PolynomialHelpers.parallel(num1, den1, num2, den2);
        double[] coeffs = wantNum ? result[0] : result[1];
        return coeffs[index];
    }

    static double evalFeedback(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantNum = parts[1].equals("num");
        int index = Integer.parseInt(parts[2]);
        int L1 = Integer.parseInt(parts[3]);
        int L2 = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num1 = new double[L1];
        double[] den1 = new double[L1];
        double[] num2 = new double[L2];
        double[] den2 = new double[L2];

        int idx = 0;
        for (int i = 0; i < L1; i++) num1[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L1; i++) den1[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) num2[i] = Evaluator.eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) den2[i] = Evaluator.eval(args.get(idx++), values, defs);
        double sign = Evaluator.eval(args.get(idx), values, defs);

        double[][] result = com.frees.backend.cas.PolynomialHelpers.feedback(num1, den1, num2, den2, sign);
        double[] coeffs = wantNum ? result[0] : result[1];
        return coeffs[index];
    }

    static double evalPole(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantReal = parts[1].equals("pr");
        int index = Integer.parseInt(parts[2]);
        int numInputs = Integer.parseInt(parts[3]);
        int n = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[][] result;
        if (numInputs == 1) {
            double[][] a = new double[n][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            result = com.frees.backend.cas.PolynomialHelpers.poleSS(a);
        } else {
            int len = n + 1;
            double[] den = new double[len];
            for (int i = 0; i < len; i++) {
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
            result = com.frees.backend.cas.PolynomialHelpers.roots(den);
        }

        java.util.Arrays.sort(result, (a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            if (cmp != 0) return cmp;
            return Double.compare(a[1], b[1]);
        });

        return wantReal ? result[index][0] : result[index][1];
    }

    static double evalZero(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantReal = parts[1].equals("zr");
        int index = Integer.parseInt(parts[2]);
        int numInputs = Integer.parseInt(parts[3]);
        int nz = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num;
        if (numInputs == 2) {
            int len = args.size() / 2;
            num = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
            }
        } else {
            int total = args.size();
            int n = (int) Math.round(Math.sqrt(total)) - 1;
            double[][] a = new double[n][n];
            double[][] b = new double[n][1];
            double[][] cm = new double[1][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
            double d = Evaluator.eval(args.get(idx), values, defs);
            com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                    com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
            num = tc.num();
        }

        double[][] result = com.frees.backend.cas.PolynomialHelpers.roots(num);
        if (result.length == 0) {
            return 0.0;
        }

        java.util.Arrays.sort(result, (a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            if (cmp != 0) return cmp;
            return Double.compare(a[1], b[1]);
        });

        if (index < result.length) {
            return wantReal ? result[index][0] : result[index][1];
        }
        return 0.0;
    }

    static double evalBode(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantMag = parts[1].equals("mag");
        int index = Integer.parseInt(parts[2]);
        int numInputs = Integer.parseInt(parts[3]);
        int N = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num, den;
        double[] omega = new double[N];
        if (numInputs == 3) {
            int len = (args.size() - N) / 2;
            num = new double[len];
            den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                omega[i] = Evaluator.eval(args.get(2 * len + i), values, defs);
            }
        } else {
            int total = args.size();
            int n = (int) Math.round(Math.sqrt(total - (double) N)) - 1;
            double[][] a = new double[n][n];
            double[][] b = new double[n][1];
            double[][] cm = new double[1][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
            double d = Evaluator.eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                omega[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                    com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
            num = tc.num();
            den = tc.den();
        }

        double[][] result = com.frees.backend.cas.PolynomialHelpers.bode(num, den, omega);
        return wantMag ? result[0][index] : result[1][index];
    }

    static double evalNyquist(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantReal = parts[1].equals("real");
        int index = Integer.parseInt(parts[2]);
        int numInputs = Integer.parseInt(parts[3]);
        int N = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num, den;
        double[] omega = new double[N];
        if (numInputs == 3) {
            int len = (args.size() - N) / 2;
            num = new double[len];
            den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                omega[i] = Evaluator.eval(args.get(2 * len + i), values, defs);
            }
        } else {
            int total = args.size();
            int n = (int) Math.round(Math.sqrt(total - (double) N)) - 1;
            double[][] a = new double[n][n];
            double[][] b = new double[n][1];
            double[][] cm = new double[1][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
            double d = Evaluator.eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                omega[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                    com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
            num = tc.num();
            den = tc.den();
        }

        double[][] result = com.frees.backend.cas.PolynomialHelpers.nyquist(num, den, omega);
        return wantReal ? result[0][index] : result[1][index];
    }

    static double evalMargin(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String output = parts[1]; // "gm", "pm", "wcg", "wcp"
        int numInputs = Integer.parseInt(parts[2]);

        List<Expr> args = c.args();
        double[] num, den;
        if (numInputs == 2) {
            int len = args.size() / 2;
            num = new double[len];
            den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
        } else {
            int total = args.size();
            int n = (int) Math.round(Math.sqrt(total)) - 1;
            double[][] a = new double[n][n];
            double[][] b = new double[n][1];
            double[][] cm = new double[1][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
            double d = Evaluator.eval(args.get(idx), values, defs);
            com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                    com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
            num = tc.num();
            den = tc.den();
        }

        double[] result = com.frees.backend.cas.PolynomialHelpers.margin(num, den);
        return switch (output) {
            case "gm" -> result[0];
            case "pm" -> result[1];
            case "wcg" -> result[2];
            case "wcp" -> result[3];
            default -> 0.0;
        };
    }

    // Synthetic Routh-Hurwitz call: routh$<nrhp|stable>$<L>, with the L
    // characteristic-polynomial coefficients (descending powers) as arguments.
    static double evalRouth(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String output = parts[1]; // "nrhp" or "stable"
        int len = Integer.parseInt(parts[2]);

        List<Expr> args = c.args();
        double[] den = new double[len];
        for (int i = 0; i < len; i++) {
            den[i] = Evaluator.eval(args.get(i), values, defs);
        }
        int nRhp = com.frees.backend.cas.PolynomialHelpers.routh(den);
        if (output.equals("stable")) {
            return nRhp == 0 ? 1.0 : 0.0;
        }
        return nRhp;
    }

    // Synthetic partial-fraction call:
    //   residue$<rr|ri|pr|pi|ord>$<form>$<index>$<numLen>$<n>  or
    //   residue$k$<form>$<numLen>$<n>
    // where <form> is "s" (5-output simple) or "o" (6-output, with the order
    // array). The numerator then denominator coefficients are the arguments.
    // Residue terms are sorted by (pole, order) so the i-th outputs stay aligned.
    static double evalResidue(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String which = parts[1]; // rr, ri, pr, pi, ord, or k
        boolean isK = which.equals("k");
        String form = parts[2];
        int numLen = Integer.parseInt(parts[isK ? 3 : 4]);
        int n = Integer.parseInt(parts[isK ? 4 : 5]);

        List<Expr> args = c.args();
        double[] num = new double[numLen];
        double[] den = new double[n + 1];
        int idx = 0;
        for (int i = 0; i < numLen; i++) {
            num[i] = Evaluator.eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < den.length; i++) {
            den[i] = Evaluator.eval(args.get(idx++), values, defs);
        }

        com.frees.backend.cas.PolynomialHelpers.ResidueResult res =
                com.frees.backend.cas.PolynomialHelpers.residue(num, den);
        int[] orders = res.orders();
        if (form.equals("s") && hasRepeatedPole(orders)) {
            throw new IllegalStateException("residue: repeated poles require the 6-output form with an "
                    + "order array, e.g. CALL residue(num, den : r_r, r_i, p_r, p_i, ord, k)");
        }
        if (isK) {
            return res.k();
        }

        double[][] poles = res.poles();
        double[][] residues = res.residues();
        int src = sortedResidueIndex(poles, orders, Integer.parseInt(parts[3]));
        return switch (which) {
            case "rr" -> residues[src][0];
            case "ri" -> residues[src][1];
            case "pr" -> poles[src][0];
            case "pi" -> poles[src][1];
            case "ord" -> orders[src];
            default -> 0.0;
        };
    }

    static boolean hasRepeatedPole(int[] orders) {
        for (int o : orders) {
            if (o > 1) {
                return true;
            }
        }
        return false;
    }

    /** Source index of the rank-th residue term, sorted by (pole real, imag, order). */
    static int sortedResidueIndex(double[][] poles, int[] orders, int rank) {
        Integer[] perm = new Integer[poles.length];
        for (int i = 0; i < perm.length; i++) {
            perm[i] = i;
        }
        java.util.Arrays.sort(perm, (i, j) -> {
            int cmp = Double.compare(poles[i][0], poles[j][0]);
            if (cmp != 0) {
                return cmp;
            }
            cmp = Double.compare(poles[i][1], poles[j][1]);
            if (cmp != 0) {
                return cmp;
            }
            return Integer.compare(orders[i], orders[j]);
        });
        return perm[rank];
    }

    // Synthetic Nichols call: nichols$<mag|phase>$<index>$<numInputs>$<N>.
    // Same data as bode (magnitude in dB, unwrapped phase in deg); the pair is
    // plotted as magnitude vs phase to form a Nichols chart.
    static double evalNichols(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantMag = parts[1].equals("mag");
        int index = Integer.parseInt(parts[2]);
        int numInputs = Integer.parseInt(parts[3]);
        int N = Integer.parseInt(parts[4]);

        double[][] model = freqResponseModel(c.args(), numInputs, N, values, defs);
        double[][] result = com.frees.backend.cas.PolynomialHelpers.bode(model[0], model[1], model[2]);
        return wantMag ? result[0][index] : result[1][index];
    }

    /** Reads {num, den, omega} from a flattened frequency-response call's args. */
    static double[][] freqResponseModel(List<Expr> args, int numInputs, int N,
                                                Map<String, Double> values, Map<String, ProcDef> defs) {
        if (numInputs == 3) {
            int len = (args.size() - N) / 2;
            double[] num = new double[len];
            double[] den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
            double[] omega = readTail(args, 2 * len, N, values, defs);
            return new double[][]{num, den, omega};
        }
        int n = (int) Math.round(Math.sqrt(args.size() - (double) N)) - 1;
        double[][] nd = ssArgsToNumDen(args, n, values, defs);
        double[] omega = readTail(args, n * n + 2 * n + 1, N, values, defs);
        return new double[][]{nd[0], nd[1], omega};
    }

    /** Reads {@code count} consecutive scalar args starting at {@code from}. */
    static double[] readTail(List<Expr> args, int from, int count,
                                     Map<String, Double> values, Map<String, ProcDef> defs) {
        double[] out = new double[count];
        for (int i = 0; i < count; i++) {
            out[i] = Evaluator.eval(args.get(from + i), values, defs);
        }
        return out;
    }

    /** Reads an n-state SS model (A, B, C, D) from the start of args and converts to {num, den}. */
    static double[][] ssArgsToNumDen(List<Expr> args, int n,
                                             Map<String, Double> values, Map<String, ProcDef> defs) {
        double[][] a = new double[n][n];
        double[][] b = new double[n][1];
        double[][] cm = new double[1][n];
        int idx = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
        }
        for (int i = 0; i < n; i++) {
            b[i][0] = Evaluator.eval(args.get(idx++), values, defs);
        }
        for (int j = 0; j < n; j++) {
            cm[0][j] = Evaluator.eval(args.get(idx++), values, defs);
        }
        double d = Evaluator.eval(args.get(idx), values, defs);
        com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
        return new double[][]{tc.num(), tc.den()};
    }

    // Synthetic error-constant call: errorconst$<kp|kv|ka>$<numLen>$<denLen>,
    // with the open-loop numerator then denominator coefficients as arguments.
    static double evalErrorConst(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String which = parts[1];
        int numLen = Integer.parseInt(parts[2]);
        int denLen = Integer.parseInt(parts[3]);

        List<Expr> args = c.args();
        double[] num = new double[numLen];
        double[] den = new double[denLen];
        int idx = 0;
        for (int i = 0; i < numLen; i++) {
            num[i] = Evaluator.eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < denLen; i++) {
            den[i] = Evaluator.eval(args.get(idx++), values, defs);
        }
        double[] k = com.frees.backend.cas.PolynomialHelpers.errorConstants(num, den);
        return switch (which) {
            case "kp" -> k[0];
            case "kv" -> k[1];
            case "ka" -> k[2];
            default -> 0.0;
        };
    }

    // Synthetic Mason call: mason$<n>, with the n*n node-gain matrix entries
    // (row-major) followed by the 1-based source and sink node numbers.
    static double evalMason(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        int n = Integer.parseInt(c.function().substring("mason$".length()));
        List<Expr> args = c.args();
        double[][] g = new double[n][n];
        int idx = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                g[i][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
        }
        int source = (int) Math.round(Evaluator.eval(args.get(idx++), values, defs)) - 1;
        int sink = (int) Math.round(Evaluator.eval(args.get(idx), values, defs)) - 1;
        if (source < 0 || source >= n || sink < 0 || sink >= n) {
            throw new IllegalStateException("mason: source/sink node out of range 1.." + n);
        }
        return com.frees.backend.cas.PolynomialHelpers.mason(g, source, sink);
    }

    // Synthetic discretisation call: <c2d|d2c>$<num|den>$<method>$<index>$<L>,
    // with the L numerator coefficients, L denominator coefficients, and Ts as
    // arguments. The full conversion runs and one coefficient is returned
    // (mirroring the series/parallel pattern).
    static double evalDiscretize(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String op = parts[0];            // "c2d" or "d2c"
        boolean wantNum = parts[1].equals("num");
        String method = parts[2];
        int index = Integer.parseInt(parts[3]);
        int len = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] num = new double[len];
        double[] den = new double[len];
        int idx = 0;
        for (int i = 0; i < len; i++) {
            num[i] = Evaluator.eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < len; i++) {
            den[i] = Evaluator.eval(args.get(idx++), values, defs);
        }
        double ts = Evaluator.eval(args.get(idx), values, defs);

        double[][] result = op.equals("c2d")
                ? com.frees.backend.cas.PolynomialHelpers.c2d(num, den, ts, method)
                : com.frees.backend.cas.PolynomialHelpers.d2c(num, den, ts, method);
        double[] coeffs = wantNum ? result[0] : result[1];
        // Right-align the coefficients into the requested length, padding any
        // missing high-power terms with leading zeros (ZOH numerators may be
        // shorter than the denominator).
        int off = coeffs.length - len + index;
        return off >= 0 && off < coeffs.length ? coeffs[off] : 0.0;
    }

    // Synthetic time-response call: <step|impulse>$<index>$<numInputs>$<N>, with
    // the serialized model entries (num,den or A,B,C,D) followed by the N time
    // samples. The full response is computed and one sample returned (mirroring
    // the bode/nyquist pattern).
    static double evalTimeResponse(com.frees.backend.cas.TimeResponse.Kind kind,
                                           Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int index = Integer.parseInt(parts[1]);
        int numInputs = Integer.parseInt(parts[2]);
        int N = Integer.parseInt(parts[3]);

        List<Expr> args = c.args();
        double[] t = new double[N];
        double[] y;
        if (numInputs == 3) {
            int len = (args.size() - N) / 2;
            double[] num = new double[len];
            double[] den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                t[i] = Evaluator.eval(args.get(2 * len + i), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.response(kind, num, den, null, t);
        } else {
            int n = (int) Math.round(Math.sqrt(args.size() - (double) N)) - 1;
            double[][] a = new double[n][n];
            double[] b = new double[n];
            double[] cm = new double[n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[j] = Evaluator.eval(args.get(idx++), values, defs);
            }
            double d = Evaluator.eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                t[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.responseSS(kind, a, b, cm, d, null, t);
        }
        return y[index];
    }

    // Synthetic forced-response call: lsim$<index>$<numInputs>$<N>, with the
    // serialized model entries followed by the N input samples u then the N time
    // samples t.
    static double evalLsim(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int index = Integer.parseInt(parts[1]);
        int numInputs = Integer.parseInt(parts[2]);
        int N = Integer.parseInt(parts[3]);

        List<Expr> args = c.args();
        double[] u = new double[N];
        double[] t = new double[N];
        double[] y;
        if (numInputs == 4) {
            int len = (args.size() - 2 * N) / 2;
            double[] num = new double[len];
            double[] den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = Evaluator.eval(args.get(i), values, defs);
                den[i] = Evaluator.eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                u[i] = Evaluator.eval(args.get(2 * len + i), values, defs);
                t[i] = Evaluator.eval(args.get(2 * len + N + i), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.response(
                    com.frees.backend.cas.TimeResponse.Kind.LSIM, num, den, u, t);
        } else {
            int n = (int) Math.round(Math.sqrt(args.size() - 2.0 * N)) - 1;
            double[][] a = new double[n][n];
            double[] b = new double[n];
            double[] cm = new double[n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[j] = Evaluator.eval(args.get(idx++), values, defs);
            }
            double d = Evaluator.eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                u[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            for (int i = 0; i < N; i++) {
                t[i] = Evaluator.eval(args.get(idx++), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.responseSS(
                    com.frees.backend.cas.TimeResponse.Kind.LSIM, a, b, cm, d, u, t);
        }
        return y[index];
    }

    // Synthetic LQR call: lqr$<index>$<n>, with arguments A (row-major, n*n),
    // then B (n), then Q (row-major, n*n), then R (scalar). Returns gain K[index].
    
    static double evalLqrLike(String op, Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int idx1 = Integer.parseInt(parts[1]);
        int idx2 = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        int m = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        int idx = 0;
        
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] b = new double[n][m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) b[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] q = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) q[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] r = new double[m][m];
        for (int i = 0; i < m; i++) for (int j = 0; j < m; j++) r[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] res;
        if (op.equals("lqr")) res = com.frees.backend.cas.ControllerDesign.lqr(a, b, q, r);
        else if (op.equals("dlqr")) res = com.frees.backend.cas.ControllerDesign.dlqr(a, b, q, r);
        else res = com.frees.backend.cas.ControllerDesign.dare(a, b, q, r);
        
        return res[idx1][idx2];
    }

    static double evalLqr(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalLqrLike("lqr", c, values, defs);
    }
    static double evalDlqr(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalLqrLike("dlqr", c, values, defs);
    }
    static double evalDare(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalLqrLike("dare", c, values, defs);
    }

    static double evalLyapLike(String op, Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int idx1 = Integer.parseInt(parts[1]);
        int idx2 = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);

        List<Expr> args = c.args();
        int idx = 0;
        
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] q = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) q[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] res;
        if (op.equals("lyap")) res = com.frees.backend.cas.ControllerDesign.lyap(a, q);
        else res = com.frees.backend.cas.ControllerDesign.dlyap(a, q);
        
        return res[idx1][idx2];
    }
    
    static double evalLyap(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalLyapLike("lyap", c, values, defs);
    }
    static double evalDlyap(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalLyapLike("dlyap", c, values, defs);
    }

    static double evalCtrbObsv(String op, Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int idx1 = Integer.parseInt(parts[1]);
        int idx2 = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        int r = Integer.parseInt(parts[4]);
        int cols = Integer.parseInt(parts[5]);

        List<Expr> args = c.args();
        int idx = 0;
        
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] b_or_c = new double[r][cols];
        for (int i = 0; i < r; i++) for (int j = 0; j < cols; j++) b_or_c[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] res;
        if (op.equals("ctrb")) res = com.frees.backend.cas.ControllerDesign.ctrb(a, b_or_c);
        else res = com.frees.backend.cas.ControllerDesign.obsv(a, b_or_c);
        
        return res[idx1][idx2];
    }
    
    static double evalCtrb(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalCtrbObsv("ctrb", c, values, defs);
    }
    static double evalObsv(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalCtrbObsv("obsv", c, values, defs);
    }

    // Synthetic LQE call: lqe$<i>$<j>$<n>$<g>$<p>, with arguments A (n×n),
    // G (n×g), C (p×n), Q (g×g), R (p×p), all row-major. Returns gain L[i][j].
    static double evalLqe(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int idx1 = Integer.parseInt(parts[1]);
        int idx2 = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        int g = Integer.parseInt(parts[4]);
        int p = Integer.parseInt(parts[5]);

        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] gMat = new double[n][g];
        for (int i = 0; i < n; i++) for (int j = 0; j < g; j++) gMat[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] cMat = new double[p][n];
        for (int i = 0; i < p; i++) for (int j = 0; j < n; j++) cMat[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] q = new double[g][g];
        for (int i = 0; i < g; i++) for (int j = 0; j < g; j++) q[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] r = new double[p][p];
        for (int i = 0; i < p; i++) for (int j = 0; j < p; j++) r[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] res = com.frees.backend.cas.ControllerDesign.lqe(a, gMat, cMat, q, r);
        return res[idx1][idx2];
    }

    // Synthetic gramian call: gram$<type>$<i>$<j>$<n>$<r>$<cols>, with arguments
    // A (n×n) then M (r×cols), row-major. type is 'c' (controllability, M=B) or
    // 'o' (observability, M=C). Returns the n×n gramian element [i][j].
    static double evalGram(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        char type = parts[1].charAt(0);
        int idx1 = Integer.parseInt(parts[2]);
        int idx2 = Integer.parseInt(parts[3]);
        int n = Integer.parseInt(parts[4]);
        int r = Integer.parseInt(parts[5]);
        int cols = Integer.parseInt(parts[6]);

        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] m = new double[r][cols];
        for (int i = 0; i < r; i++) for (int j = 0; j < cols; j++) m[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        double[][] res = com.frees.backend.cas.ControllerDesign.gramian(a, m, type);
        return res[idx1][idx2];
    }

    // Synthetic balreal call: balreal$<tag>$<i>$<j>$<n>$<m>$<p>, with arguments
    // A (n×n), B (n×m), C (p×n), row-major. tag selects the output matrix:
    // 'a' -> Ab (n×n), 'b' -> Bb (n×m), 'c' -> Cb (p×n). Returns element [i][j].
    static double evalBalreal(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String tag = parts[1];
        int idx1 = Integer.parseInt(parts[2]);
        int idx2 = Integer.parseInt(parts[3]);
        int n = Integer.parseInt(parts[4]);
        int m = Integer.parseInt(parts[5]);
        int p = Integer.parseInt(parts[6]);

        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] b = new double[n][m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) b[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] cMat = new double[p][n];
        for (int i = 0; i < p; i++) for (int j = 0; j < n; j++) cMat[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        com.frees.backend.cas.ControllerDesign.BalrealResult res =
                com.frees.backend.cas.ControllerDesign.balreal(a, b, cMat);
        double[][] out = tag.equals("a") ? res.a : (tag.equals("b") ? res.b : res.c);
        return out[idx1][idx2];
    }


    // Synthetic pole-placement call: place$<index>$<n>, with arguments A
    // (row-major, n*n), then B (n), then pr (n), then pi (n). Returns K[index].
    static double evalPlace(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int row = Integer.parseInt(parts[1]);
        int col = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        int m = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
        }
        double[][] b = new double[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                b[i][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
        }
        double[][] roots = new double[n][2];
        for (int i = 0; i < n; i++) {
            roots[i][0] = Evaluator.eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < n; i++) {
            roots[i][1] = Evaluator.eval(args.get(idx++), values, defs);
        }

        if (m != 1) {
            throw new UnsupportedOperationException("place currently only supports SISO systems (m=1)");
        }
        double[] bVector = new double[n];
        for (int i = 0; i < n; i++) bVector[i] = b[i][0];
        
        double[] k = com.frees.backend.cas.ControllerDesign.place(a, bVector, roots);
        return k[col];
    }

    // Synthetic PID-tuning call: pidtune$<kp|ki|kd>$<type>, with arguments num
    // (L), then den (L), then wc (scalar). Returns the requested gain.
    static double evalPidtune(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String output = parts[1]; // "kp", "ki", "kd"
        String type = parts[2];   // "p", "pi", "pid"

        List<Expr> args = c.args();
        int len = (args.size() - 1) / 2;
        double[] num = new double[len];
        double[] den = new double[len];
        for (int i = 0; i < len; i++) {
            num[i] = Evaluator.eval(args.get(i), values, defs);
            den[i] = Evaluator.eval(args.get(len + i), values, defs);
        }
        double wc = Evaluator.eval(args.get(2 * len), values, defs);

        double[] gains = com.frees.backend.cas.ControllerDesign.pidtune(num, den, type, wc);
        return switch (output) {
            case "kp" -> gains[0];
            case "ki" -> gains[1];
            case "kd" -> gains[2];
            default -> 0.0;
        };
    }

    static double evalRank(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int rows = Integer.parseInt(parts[1]);
        int cols = Integer.parseInt(parts[2]);
        List<Expr> args = c.args();
        double[][] m = new double[rows][cols];
        int idx = 0;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                m[i][j] = Evaluator.eval(args.get(idx++), values, defs);
            }
        }
        return com.frees.backend.cas.ControllerDesign.rank(m);
    }


    static double evalSs2ss(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = Integer.parseInt(parts[2]);
        int idx2 = Integer.parseInt(parts[3]);
        int n = Integer.parseInt(parts[4]);
        int m = Integer.parseInt(parts[5]);
        int p = Integer.parseInt(parts[6]);
        
        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) a[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        
        double[][] b = new double[n][m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) b[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        
        double[][] cv = new double[p][n];
        for (int i = 0; i < p; i++) for (int j = 0; j < n; j++) cv[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        
        double[][] d = new double[p][m];
        for (int i = 0; i < p; i++) for (int j = 0; j < m; j++) d[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        
        double[][] transform = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) transform[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        
        com.frees.backend.cas.StateSpace.StateSpaceMatrices res =
                com.frees.backend.cas.ControllerDesign.ss2ss(a, b, cv, d, transform);
        if (varType.equals("a")) return res.a()[idx1][idx2];
        else if (varType.equals("b")) return res.b()[idx1][idx2];
        else if (varType.equals("c")) return res.c()[idx1][idx2];
        else return res.d()[idx1][idx2];
    }

    static double evalSsCombine(String op, Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = Integer.parseInt(parts[2]);
        int idx2 = Integer.parseInt(parts[3]);
        int n1 = Integer.parseInt(parts[4]);
        int p1 = Integer.parseInt(parts[5]);
        int q1 = Integer.parseInt(parts[6]);
        int n2 = Integer.parseInt(parts[7]);
        int p2 = Integer.parseInt(parts[8]);
        int q2 = Integer.parseInt(parts[9]);

        List<Expr> args = c.args();
        int idx = 0;
        
        double[][] a1 = new double[n1][n1];
        for (int i = 0; i < n1; i++) for (int j = 0; j < n1; j++) a1[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] b1 = new double[n1][p1];
        for (int i = 0; i < n1; i++) for (int j = 0; j < p1; j++) b1[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] c1 = new double[q1][n1];
        for (int i = 0; i < q1; i++) for (int j = 0; j < n1; j++) c1[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] d1 = new double[q1][p1];
        for (int i = 0; i < q1; i++) for (int j = 0; j < p1; j++) d1[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        
        double[][] a2 = new double[n2][n2];
        for (int i = 0; i < n2; i++) for (int j = 0; j < n2; j++) a2[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] b2 = new double[n2][p2];
        for (int i = 0; i < n2; i++) for (int j = 0; j < p2; j++) b2[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] c2 = new double[q2][n2];
        for (int i = 0; i < q2; i++) for (int j = 0; j < n2; j++) c2[i][j] = Evaluator.eval(args.get(idx++), values, defs);
        double[][] d2 = new double[q2][p2];
        for (int i = 0; i < q2; i++) for (int j = 0; j < p2; j++) d2[i][j] = Evaluator.eval(args.get(idx++), values, defs);

        com.frees.backend.cas.StateSpace.StateSpaceMatrices res;
        if (op.equals("series")) res = com.frees.backend.cas.ControllerDesign.ssSeries(a1, b1, c1, d1, a2, b2, c2, d2);
        else if (op.equals("parallel")) res = com.frees.backend.cas.ControllerDesign.ssParallel(a1, b1, c1, d1, a2, b2, c2, d2);
        else {
            double sign = Evaluator.eval(args.get(idx++), values, defs);
            res = com.frees.backend.cas.ControllerDesign.ssFeedback(a1, b1, c1, d1, a2, b2, c2, d2, sign);
        }
        
        if (varType.equals("a")) return res.a()[idx1][idx2];
        else if (varType.equals("b")) return res.b()[idx1][idx2];
        else if (varType.equals("c")) return res.c()[idx1][idx2];
        else return res.d()[idx1][idx2];
    }





    static double evalSsSeries(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalSsCombine("series", c, values, defs);
    }

    static double evalSsParallel(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalSsCombine("parallel", c, values, defs);
    }

    static double evalSsFeedback(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        return evalSsCombine("feedback", c, values, defs);
    }

    static double evalStepInfo(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int N = Integer.parseInt(parts[2]);
        List<Expr> args = c.args();
        double[] t = new double[N];
        double[] y = new double[N];
        for (int i = 0; i < N; i++) {
            t[i] = Evaluator.eval(args.get(i), values, defs);
        }
        for (int i = 0; i < N; i++) {
            y[i] = Evaluator.eval(args.get(N + i), values, defs);
        }
        double[] res = com.frees.backend.cas.ControllerDesign.stepinfo(t, y);
        return switch (varType) {
            case "tr" -> res[0];
            case "tp" -> res[1];
            case "ts" -> res[2];
            default -> res[3];
        };
    }

    static double evalPade(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx = Integer.parseInt(parts[2]);
        int order = Integer.parseInt(parts[3]);
        List<Expr> args = c.args();
        double Td = Evaluator.eval(args.get(0), values, defs);
        double[][] res = com.frees.backend.cas.ControllerDesign.pade(Td, order);
        if (varType.equals("num")) {
            return res[0][idx];
        } else {
            return res[1][idx];
        }
    }

    static double evalRlocus(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = Integer.parseInt(parts[2]);
        int idx2 = -1;
        int numSize, denSize, M, N;
        if (varType.equals("k")) {
            numSize = Integer.parseInt(parts[3]);
            denSize = Integer.parseInt(parts[4]);
            M = Integer.parseInt(parts[5]);
            N = Integer.parseInt(parts[6]);
        } else {
            idx2 = Integer.parseInt(parts[3]);
            numSize = Integer.parseInt(parts[4]);
            denSize = Integer.parseInt(parts[5]);
            M = Integer.parseInt(parts[6]);
            N = Integer.parseInt(parts[7]);
        }

        List<Expr> args = c.args();
        int idx = 0;
        double[] num = new double[numSize];
        for (int i = 0; i < numSize; i++) {
            num[i] = Evaluator.eval(args.get(idx++), values, defs);
        }
        double[] den = new double[denSize];
        for (int i = 0; i < denSize; i++) {
            den[i] = Evaluator.eval(args.get(idx++), values, defs);
        }

        com.frees.backend.cas.ControllerDesign.RlocusResult res =
                com.frees.backend.cas.ControllerDesign.rlocus(num, den, M);

        if (varType.equals("k")) {
            return res.k[idx1];
        } else if (varType.equals("cpr")) {
            return res.cpr[idx1][idx2];
        } else {
            return res.cpi[idx1][idx2];
        }
    }

}
