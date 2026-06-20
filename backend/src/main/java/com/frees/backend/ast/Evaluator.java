package com.frees.backend.ast;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.EigenDecomposition;
import org.apache.commons.math3.linear.RealVector;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Evaluates an expression AST against current variable values. */
public final class Evaluator {

    private Evaluator() {}

    public static double eval(Expr e, Map<String, Double> values) {
        return eval(e, values, Map.of());
    }

    public static double eval(Expr e, Map<String, Double> values, Map<String, ProcDef> defs) {
        return switch (e) {
            case Expr.Num(double value, String unit, boolean isImaginary) -> value;
            case Expr.Str(String value) -> throw new IllegalStateException(
                    "String literal '" + value + "' cannot be evaluated as a number. "
                    + "String literals are only valid in function arguments like property calls.");
            case Expr.Var(String name) -> {
                Double value = values.get(name);
                if (value == null) {
                    throw new IllegalStateException("Variable has no value: " + name);
                }
                yield value;
            }
            case Expr.Neg(Expr operand) -> -eval(operand, values, defs);
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                double l = eval(left, values, defs);
                double r = eval(right, values, defs);
                yield switch (op) {
                    case '+' -> l + r;
                    case '-' -> l - r;
                    case '*' -> l * r;
                    case '/' -> l / r;
                    case '^' -> Math.pow(l, r);
                    default -> throw new IllegalStateException("Unknown operator: " + op);
                };
            }
            case Expr.Call(String function, List<Expr> args) -> evalCall(new Expr.Call(function, args), values, defs);
            case Expr.ArrayAccess(String name, List<Expr> indices) -> throw new IllegalStateException("ArrayAccess cannot be evaluated directly: " + name);
            case Expr.Range(Expr start, Expr end) -> throw new IllegalStateException("Range cannot be evaluated directly: " + start + ".." + end);
            case Expr.ArrayLiteral(List<Expr> elements) -> throw new IllegalStateException("ArrayLiteral cannot be evaluated directly: " + elements);
            case Expr.Compare(String op, Expr left, Expr right) -> {
                double l = eval(left, values, defs);
                double r = eval(right, values, defs);
                boolean result = switch (op) {
                    case "<"  -> l < r;
                    case ">"  -> l > r;
                    case "<=" -> l <= r;
                    case ">=" -> l >= r;
                    case "<>" -> l != r;
                    case "="  -> l == r;
                    default -> throw new IllegalStateException("Unknown comparison operator: " + op);
                };
                yield result ? 1.0 : 0.0;
            }
            case Expr.Logical(String op, Expr left, Expr right) -> {
                double l = eval(left, values, defs);
                double r = eval(right, values, defs);
                boolean result = switch (op) {
                    case "and" -> l != 0.0 && r != 0.0;
                    case "or"  -> l != 0.0 || r != 0.0;
                    default -> throw new IllegalStateException("Unknown logical operator: " + op);
                };
                yield result ? 1.0 : 0.0;
            }
            case Expr.Not(Expr operand) -> eval(operand, values, defs) == 0.0 ? 1.0 : 0.0;
        };
    }

    private static double evalCall(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        ProcDef def = defs.get(c.function());

        // Tabulated Function Table function: name(x) or name(x, param)
        if (def instanceof ProcDef.FunctionTableDef cd) {
            return evalFunctionTable(cd, c, values, defs);
        }

        // Dispatch to user-defined FUNCTION
        if (def instanceof ProcDef.FunctionDef fd) {
            List<Double> args = c.args().stream()
                    .map(a -> eval(a, values, defs))
                    .toList();
            return new com.frees.backend.parser.ProcedureEvaluator(defs).callFunction(fd, args, values);
        }

        // EES-compatible lookup/interpolation over a named TABLE (the table name
        // is the first, string, argument): Interpolate/Interpolate1/Interpolate2D,
        // Lookup, LookupRow, NLookupRows, Differentiate/Differentiate1.
        if (TABLE_FUNCTIONS.contains(c.function())) {
            return evalTableFunction(c, values, defs);
        }

        // Parametric-table accessors, resolved against the active parametric solve.
        if (PARAMETRIC_ACCESSORS.contains(c.function())) {
            return evalParametricAccessor(c, values, defs);
        }

        // Fluid property call: prop$<output>$<fluid>$<ind1>$<ind2>(values...)
        // Generated by AstBuilder from e.g. Enthalpy(R134a, T=T1, x=1).
        // Chemistry calls (MolarMass/HeatingValue/StoichAFR) instead carry their
        // fluid/formula/mode as case-preserving string-literal arguments.
        if (c.function().startsWith(com.frees.backend.props.PropertyFunctions.PREFIX)) {
            return evalProperty(c, values, defs);
        }

        // Synthetic procedure output call: proc$<name>$<outputIndex>(inputs...)
        // Generated by EquationParser when flattening CALL statements.
        if (c.function().startsWith("proc$")) {
            return evalProcedureOutput(c, values, defs);
        }

        // Synthetic eigendecomposition call: eigen$val$<k>$<n> or eigen$vec$<i>$<k>$<n>,
        // with the n*n matrix entries (row-major) as arguments.
        // Generated by EquationParser when flattening CALL Eigenvalues / CALL Eigen.
        if (c.function().startsWith("eigen$")) {
            return evalEigen(c, values, defs);
        }

        if (c.function().startsWith("ss2tf$")) {
            return evalSs2tf(c, values, defs);
        }
        if (c.function().startsWith("tf2ss$")) {
            return evalTf2ss(c, values, defs);
        }
        if (c.function().startsWith("zp2tf$")) {
            return evalZp2tf(c, values, defs);
        }
        if (c.function().startsWith("tf2zp$")) {
            return evalTf2zp(c, values, defs);
        }
        if (c.function().startsWith("series$")) {
            return evalSeries(c, values, defs);
        }
        if (c.function().startsWith("parallel$")) {
            return evalParallel(c, values, defs);
        }
        if (c.function().startsWith("feedback$")) {
            return evalFeedback(c, values, defs);
        }
        if (c.function().startsWith("pole$")) {
            return evalPole(c, values, defs);
        }
        if (c.function().startsWith("zero$")) {
            return evalZero(c, values, defs);
        }
        if (c.function().startsWith("bode$")) {
            return evalBode(c, values, defs);
        }
        if (c.function().startsWith("nyquist$")) {
            return evalNyquist(c, values, defs);
        }
        if (c.function().startsWith("margin$")) {
            return evalMargin(c, values, defs);
        }
        if (c.function().startsWith("step$")) {
            return evalTimeResponse(com.frees.backend.cas.TimeResponse.Kind.STEP, c, values, defs);
        }
        if (c.function().startsWith("impulse$")) {
            return evalTimeResponse(com.frees.backend.cas.TimeResponse.Kind.IMPULSE, c, values, defs);
        }
        if (c.function().startsWith("lsim$")) {
            return evalLsim(c, values, defs);
        }
        if (c.function().startsWith("lqr$")) {
            return evalLqr(c, values, defs);
        }
        if (c.function().startsWith("place$")) {
            return evalPlace(c, values, defs);
        }
        if (c.function().startsWith("pidtune$")) {
            return evalPidtune(c, values, defs);
        }
        if (c.function().startsWith("rank$")) {
            return evalRank(c, values, defs);
        }
        if (c.function().startsWith("ctrb$")) {
            return evalCtrb(c, values, defs);
        }
        if (c.function().startsWith("obsv$")) {
            return evalObsv(c, values, defs);
        }
        if (c.function().startsWith("ss2ss$")) {
            return evalSs2ss(c, values, defs);
        }
        if (c.function().startsWith("ss_series$")) {
            return evalSsSeries(c, values, defs);
        }
        if (c.function().startsWith("ss_parallel$")) {
            return evalSsParallel(c, values, defs);
        }
        if (c.function().startsWith("ss_feedback$")) {
            return evalSsFeedback(c, values, defs);
        }
        if (c.function().startsWith("stepinfo$")) {
            return evalStepInfo(c, values, defs);
        }
        if (c.function().startsWith("pade$")) {
            return evalPade(c, values, defs);
        }
        if (c.function().startsWith("rlocus$")) {
            return evalRlocus(c, values, defs);
        }
        if (c.function().startsWith("routh$")) {
            return evalRouth(c, values, defs);
        }
        if (c.function().startsWith("c2d$") || c.function().startsWith("d2c$")) {
            return evalDiscretize(c, values, defs);
        }
        if (c.function().startsWith("residue$")) {
            return evalResidue(c, values, defs);
        }
        if (c.function().startsWith("nichols$")) {
            return evalNichols(c, values, defs);
        }
        if (c.function().startsWith("errorconst$")) {
            return evalErrorConst(c, values, defs);
        }
        if (c.function().startsWith("mason$")) {
            return evalMason(c, values, defs);
        }

        return evalBuiltin(c, values, defs);
    }

    private static double evalBuiltin(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        List<Expr> args = c.args();
        return switch (c.function()) {
            case "abs"    -> Math.abs(arg(c, args, 0, values, defs));
            case "exp"    -> Math.exp(arg(c, args, 0, values, defs));
            case "ln"     -> Math.log(arg(c, args, 0, values, defs));
            case "log10"  -> Math.log10(arg(c, args, 0, values, defs));
            case "sqrt"   -> Math.sqrt(arg(c, args, 0, values, defs));
            case "sin"    -> Math.sin(arg(c, args, 0, values, defs));
            case "cos"    -> Math.cos(arg(c, args, 0, values, defs));
            case "tan"    -> Math.tan(arg(c, args, 0, values, defs));
            case "real"   -> arg(c, args, 0, values, defs);
            case "imag"   -> 0.0;
            case "arcsin" -> Math.asin(arg(c, args, 0, values, defs));
            case "arccos" -> Math.acos(arg(c, args, 0, values, defs));
            case "arctan" -> Math.atan(arg(c, args, 0, values, defs));
            case "atan2"  -> Math.atan2(arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "min"    -> args.stream().mapToDouble(a -> eval(a, values, defs)).min()
                    .orElseThrow(() -> new IllegalStateException("min expects at least 1 argument"));
            case "max"    -> args.stream().mapToDouble(a -> eval(a, values, defs)).max()
                    .orElseThrow(() -> new IllegalStateException("max expects at least 1 argument"));
            case "sum"    -> evalSummation(c, args, values, defs);
            case "average", "avg" -> args.stream().mapToDouble(a -> eval(a, values, defs))
                    .average().orElse(0.0);
            case "integral" -> integralQuadrature(c, values, defs);

            // Hyperbolic functions
            case "sinh" -> Math.sinh(arg(c, args, 0, values, defs));
            case "cosh" -> Math.cosh(arg(c, args, 0, values, defs));
            case "tanh" -> Math.tanh(arg(c, args, 0, values, defs));
            case "arcsinh" -> {
                double val = arg(c, args, 0, values, defs);
                yield Math.log(val + Math.sqrt(val * val + 1.0));
            }
            case "arccosh" -> {
                double val = arg(c, args, 0, values, defs);
                if (val < 1.0) {
                    throw new IllegalStateException("ArcCosh argument must be >= 1.0, got: " + val);
                }
                yield Math.log(val + Math.sqrt(val * val - 1.0));
            }
            case "arctanh" -> {
                double val = arg(c, args, 0, values, defs);
                if (Math.abs(val) >= 1.0) {
                    throw new IllegalStateException("ArcTanh argument must be in (-1, 1), got: " + val);
                }
                yield 0.5 * Math.log((1.0 + val) / (1.0 - val));
            }

            // Radiation view factors (closed-form, Howell catalog). Arguments are
            // lengths in consistent units; the result is the dimensionless F_12.
            case "viewfactor_perp" -> viewFactorPerpendicular(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            case "viewfactor_plates" -> viewFactorParallelPlates(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            case "viewfactor_disks" -> viewFactorCoaxialDisks(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));

            // Compressible Flow Stagnation Properties
            case "stagnationtemp" -> {
                double t = arg(c, args, 0, values, defs);
                double v = arg(c, args, 1, values, defs);
                double cp = arg(c, args, 2, values, defs);
                yield t + (v * v) / (2.0 * cp);
            }
            case "stagnationpres" -> {
                double p = arg(c, args, 0, values, defs);
                double t = arg(c, args, 1, values, defs);
                double t0 = arg(c, args, 2, values, defs);
                double k = arg(c, args, 3, values, defs);
                yield p * Math.pow(t0 / t, k / (k - 1.0));
            }

            // Elementary rounding & integer functions
            case "round" -> {
                double val = arg(c, args, 0, values, defs);
                if (args.size() == 2) {
                    double digits = arg(c, args, 1, values, defs);
                    double factor = Math.pow(10.0, Math.round(digits));
                    yield Math.round(val * factor) / factor;
                }
                yield Math.round(val);
            }
            case "floor" -> Math.floor(arg(c, args, 0, values, defs));
            case "ceil"  -> Math.ceil(arg(c, args, 0, values, defs));
            case "trunc" -> {
                double val = arg(c, args, 0, values, defs);
                yield val < 0 ? Math.ceil(val) : Math.floor(val);
            }
            case "sign"  -> Math.signum(arg(c, args, 0, values, defs));
            case "factorial" -> {
                double val = arg(c, args, 0, values, defs);
                if (val < -1.0) {
                    throw new IllegalStateException("Factorial argument must be > -1, got: " + val);
                }
                yield org.apache.commons.math3.special.Gamma.gamma(val + 1.0);
            }
            case "step"  -> arg(c, args, 0, values, defs) >= 0.0 ? 1.0 : 0.0;

            // Conditional & Series Functions
            case "if" -> evalIf(args, values, defs);
            case "product" -> evalProduct(c, args, values, defs);

            // Complex-Number functions
            case "conj" -> arg(c, args, 0, values, defs);
            case "magnitude" -> Math.abs(arg(c, args, 0, values, defs));
            case "angle", "anglerad" -> Math.atan2(0.0, arg(c, args, 0, values, defs));
            case "angledeg" -> Math.atan2(0.0, arg(c, args, 0, values, defs)) * 180.0 / Math.PI;
            case "cis" -> Math.cos(arg(c, args, 0, values, defs));

            // Bitwise operations
            case "bitand" -> ((long) arg(c, args, 0, values, defs) & (long) arg(c, args, 1, values, defs));
            case "bitor"  -> ((long) arg(c, args, 0, values, defs) | (long) arg(c, args, 1, values, defs));
            case "bitxor" -> ((long) arg(c, args, 0, values, defs) ^ (long) arg(c, args, 1, values, defs));
            case "bitnot" -> (~((long) arg(c, args, 0, values, defs)));
            case "bitshiftl" -> ((long) arg(c, args, 0, values, defs) << (int) arg(c, args, 1, values, defs));
            case "bitshiftr" -> ((long) arg(c, args, 0, values, defs) >> (int) arg(c, args, 1, values, defs));

            // CS & Number theory
            case "mod" -> arg(c, args, 0, values, defs) % arg(c, args, 1, values, defs);
            case "gcd" -> org.apache.commons.math3.util.ArithmeticUtils.gcd((long) arg(c, args, 0, values, defs), (long) arg(c, args, 1, values, defs));
            case "lcm" -> org.apache.commons.math3.util.ArithmeticUtils.lcm((long) arg(c, args, 0, values, defs), (long) arg(c, args, 1, values, defs));

            // Special math functions
            case "erf"     -> org.apache.commons.math3.special.Erf.erf(arg(c, args, 0, values, defs));
            case "erfc"    -> org.apache.commons.math3.special.Erf.erfc(arg(c, args, 0, values, defs));
            case "erfinv"  -> org.apache.commons.math3.special.Erf.erfInv(arg(c, args, 0, values, defs));
            case "gamma"   -> org.apache.commons.math3.special.Gamma.gamma(arg(c, args, 0, values, defs));
            case "loggamma"-> org.apache.commons.math3.special.Gamma.logGamma(arg(c, args, 0, values, defs));
            case "digamma" -> org.apache.commons.math3.special.Gamma.digamma(arg(c, args, 0, values, defs));
            case "beta"    -> Math.exp(org.apache.commons.math3.special.Beta.logBeta(arg(c, args, 0, values, defs), arg(c, args, 1, values, defs)));
            case "besselj", "bessel_j" -> org.apache.commons.math3.special.BesselJ.value(arg(c, args, 1, values, defs), arg(c, args, 0, values, defs));
            case "besseli", "bessel_i" -> besselI(arg(c, args, 1, values, defs), arg(c, args, 0, values, defs));
            case "bessely", "bessel_y" -> besselY(arg(c, args, 1, values, defs), arg(c, args, 0, values, defs));
            case "besselk", "bessel_k" -> besselK(arg(c, args, 1, values, defs), arg(c, args, 0, values, defs));
            case "besselj0", "bessel_j0" -> bessj0(arg(c, args, 0, values, defs));
            case "besselj1", "bessel_j1" -> bessj1(arg(c, args, 0, values, defs));
            case "besseli0", "bessel_i0" -> bessi0(arg(c, args, 0, values, defs));
            case "besseli1", "bessel_i1" -> bessi1(arg(c, args, 0, values, defs));
            case "bessely0", "bessel_y0" -> bessy0(arg(c, args, 0, values, defs));
            case "bessely1", "bessel_y1" -> bessy1(arg(c, args, 0, values, defs));
            case "besselk0", "bessel_k0" -> bessk0(arg(c, args, 0, values, defs));
            case "besselk1", "bessel_k1" -> bessk1(arg(c, args, 0, values, defs));
            case "chi_square" -> evalChiSquare(c, args, values, defs);
            case "random" -> evalRandom(c, values, defs);
            case "randg" -> evalRandG(c, values, defs);
            case "probability" -> evalProbability(c, args, values, defs);
            case "uncertaintyof" -> {
                String varName = evalString(args.get(0));
                Double uncVal = values.get("uncertaintyof$" + varName.toLowerCase());
                yield uncVal != null ? uncVal : 0.0;
            }

            // Base conversion: BaseConvert('FF', 16, 10) -> 255
            case "baseconvert" -> evalBaseConvert(c, values, defs);

            // ODE Table accessors — read cells/extrema/aggregates out of a solved
            // DYNAMIC block; live against the current Newton iterate.
            case "odevalue", "finalvalue", "maxvalue", "minvalue", "timeat",
                 "odeavg", "odesum", "odestddev", "odemin", "odemax" -> {
                String column = evalString(args.get(0));
                Double arg = args.size() > 1 ? eval(args.get(1), values, defs) : null;
                yield com.frees.backend.core.ode.DynamicAccessorContext.resolve(
                        c.function(), column, arg, values);
            }

            default -> throw new IllegalStateException("Unknown function: " + c.function());
        };
    }

    private static double evalFunctionTable(ProcDef.FunctionTableDef cd, Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (c.args().isEmpty() || c.args().size() > 2) {
            throw new IllegalStateException("Function table '" + cd.name()
                    + "' expects " + cd.name() + "(x) or " + cd.name() + "(x, param).");
        }
        double x = eval(c.args().get(0), values, defs);
        Double param = c.args().size() == 2 ? eval(c.args().get(1), values, defs) : null;
        return com.frees.backend.core.CurveInterpolator.evaluate(cd, x, param);
    }

    /** EES-compatible TABLE lookup/interpolation function names. */
    private static final java.util.Set<String> TABLE_FUNCTIONS = java.util.Set.of(
            "interpolate", "interpolate1", "interpolate2d",
            "lookup", "lookuprow", "nlookuprows", "differentiate", "differentiate1");

    // EES-compatible lookup/interpolation functions delegating to a named TABLE.
    // The table name is the first (string) argument; the remaining arguments are
    // the lookup coordinates or 1-based column indices.
    private static double evalTableFunction(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String fn = c.function();
        List<Expr> args = c.args();
        if (args.isEmpty()) {
            throw new IllegalStateException(fn + " expects a table name as its first argument.");
        }
        String tableName = evalString(args.get(0)).toLowerCase();
        if (!(defs.get(tableName) instanceof ProcDef.FunctionTableDef cd)) {
            throw new IllegalStateException(fn + ": '" + tableName + "' is not a TABLE.");
        }
        return switch (fn) {
            case "interpolate" -> com.frees.backend.core.CurveInterpolator.evaluate(
                    cd, argAt(fn, args, 1, values, defs), null);
            case "interpolate1" -> com.frees.backend.core.CurveInterpolator.cubicEvaluate(
                    cd, argAt(fn, args, 1, values, defs));
            case "interpolate2d" -> com.frees.backend.core.CurveInterpolator.evaluate(
                    cd, argAt(fn, args, 1, values, defs), argAt(fn, args, 2, values, defs));
            case "nlookuprows" -> com.frees.backend.core.CurveInterpolator.rowCount(cd);
            case "lookup" -> com.frees.backend.core.CurveInterpolator.cell(cd,
                    (int) Math.round(argAt(fn, args, 1, values, defs)),
                    (int) Math.round(argAt(fn, args, 2, values, defs)));
            case "lookuprow" -> com.frees.backend.core.CurveInterpolator.lookupRow(cd,
                    (int) Math.round(argAt(fn, args, 1, values, defs)),
                    argAt(fn, args, 2, values, defs));
            case "differentiate", "differentiate1" -> com.frees.backend.core.CurveInterpolator.differentiate(cd,
                    (int) Math.round(argAt(fn, args, 1, values, defs)),
                    (int) Math.round(argAt(fn, args, 2, values, defs)),
                    argAt(fn, args, 3, values, defs), fn.equals("differentiate1"));
            default -> 0.0;
        };
    }

    private static double argAt(String fn, List<Expr> args, int i, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (i >= args.size()) {
            throw new IllegalStateException(fn + ": missing argument " + (i + 1) + ".");
        }
        return eval(args.get(i), values, defs);
    }

    /** Parametric-table accessor function names (resolved against the live sweep). */
    private static final java.util.Set<String> PARAMETRIC_ACCESSORS = java.util.Set.of(
            "tablerun#", "tablerun", "nparametricruns", "tablevalue",
            "tablesum", "tableavg", "tablemin", "tablemax", "tablestddev", "integralvalue");

    // Parametric-table accessors. Aggregates take a column-name string; TableValue
    // takes (run, col) indices; TableRun#/NParametricRuns take no arguments.
    private static double evalParametricAccessor(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String fn = c.function();
        List<Expr> args = c.args();
        return switch (fn) {
            case "tablerun#", "tablerun" -> com.frees.backend.core.ParametricAccessorContext.currentRun();
            case "nparametricruns" -> com.frees.backend.core.ParametricAccessorContext.runCount();
            case "tablevalue" -> com.frees.backend.core.ParametricAccessorContext.cell(
                    (int) Math.round(argAt(fn, args, 0, values, defs)),
                    (int) Math.round(argAt(fn, args, 1, values, defs)));
            case "tablesum" -> com.frees.backend.core.ParametricAccessorContext.aggregate("sum", evalString(args.get(0)));
            case "tableavg" -> com.frees.backend.core.ParametricAccessorContext.aggregate("avg", evalString(args.get(0)));
            case "tablemin" -> com.frees.backend.core.ParametricAccessorContext.aggregate("min", evalString(args.get(0)));
            case "tablemax" -> com.frees.backend.core.ParametricAccessorContext.aggregate("max", evalString(args.get(0)));
            case "tablestddev" -> com.frees.backend.core.ParametricAccessorContext.aggregate("stddev", evalString(args.get(0)));
            case "integralvalue" -> com.frees.backend.core.ParametricAccessorContext.integral(
                    evalString(args.get(0)), evalString(args.get(1)));
            default -> 0.0;
        };
    }

    private static double evalProperty(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        List<Double> numArgs = new java.util.ArrayList<>();
        List<String> tokenArgs = new java.util.ArrayList<>();
        for (Expr a : c.args()) {
            if (a instanceof Expr.Str(String s)) {
                tokenArgs.add(s);
            } else {
                numArgs.add(eval(a, values, defs));
            }
        }
        return com.frees.backend.props.PropertyFunctions.evaluate(c.function(), numArgs, tokenArgs);
    }

    private static double evalProcedureOutput(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$", 3);
        if (parts.length == 3 && defs.get(parts[1]) instanceof ProcDef.ProcedureDef pd) {
            int outputIndex = Integer.parseInt(parts[2]);
            List<Double> inputVals = c.args().stream().map(a -> eval(a, values, defs)).toList();
            Map<String, Double> outputs = new com.frees.backend.parser.ProcedureEvaluator(defs)
                    .callProcedure(pd, inputVals, values);
            return outputs.get(pd.outputs().get(outputIndex).toLowerCase());
        }
        throw new IllegalStateException("Unknown procedure output call: " + c.function());
    }

    private static boolean isIndexedForm(List<Expr> args) {
        return args.size() == 4 && args.get(0) instanceof Expr.Var;
    }

    /** Evaluates a bounded sum/product over an index variable bound from
     *  {@code args[1]..args[2]}, accumulating {@code eval(args[3])} with
     *  {@code combiner}, and restoring the loop variable afterward. */
    private static double evalIndexedReduction(List<Expr> args, Map<String, Double> values,
            Map<String, ProcDef> defs, double identity, java.util.function.DoubleBinaryOperator combiner) {
        String varName = ((Expr.Var) args.get(0)).name();
        int start = (int) Math.round(eval(args.get(1), values, defs));
        int end = (int) Math.round(eval(args.get(2), values, defs));
        Expr term = args.get(3);
        double acc = identity;
        boolean had = values.containsKey(varName);
        Double saved = had ? values.get(varName) : null;
        try {
            int dir = start <= end ? 1 : -1;
            for (int i = start; start <= end ? i <= end : i >= end; i += dir) {
                values.put(varName, (double) i);
                acc = combiner.applyAsDouble(acc, eval(term, values, defs));
            }
        } finally {
            if (had) {
                values.put(varName, saved);
            } else {
                values.remove(varName);
            }
        }
        return acc;
    }

    private static double evalSummation(Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (isIndexedForm(args)) {
            return evalIndexedReduction(args, values, defs, 0.0, Double::sum);
        }
        return args.stream().mapToDouble(a -> eval(a, values, defs)).sum();
    }

    private static double evalProduct(Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (isIndexedForm(args)) {
            return evalIndexedReduction(args, values, defs, 1.0, (x, y) -> x * y);
        }
        return args.stream().mapToDouble(a -> eval(a, values, defs)).reduce(1.0, (x, y) -> x * y);
    }

    private static double evalIf(List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (args.size() != 5) {
            throw new IllegalStateException("If expects 5 arguments: If(A, B, x, y, z)");
        }
        double a = eval(args.get(0), values, defs);
        double b = eval(args.get(1), values, defs);
        if (a < b) {
            return eval(args.get(2), values, defs);
        } else if (a == b) {
            return eval(args.get(3), values, defs);
        }
        return eval(args.get(4), values, defs);
    }

    private static double evalChiSquare(Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        double x = arg(c, args, 0, values, defs);
        double df = arg(c, args, 1, values, defs);
        if (x <= 0.0) {
            return 0.0;
        }
        if (df <= 0.0) {
            throw new IllegalStateException("Chi_Square degrees of freedom must be > 0, got: " + df);
        }
        return org.apache.commons.math3.special.Gamma.regularizedGammaP(df / 2.0, x / 2.0);
    }

    private static double evalProbability(Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        double x1 = arg(c, args, 0, values, defs);
        double x2 = arg(c, args, 1, values, defs);
        double mean = arg(c, args, 2, values, defs);
        double stdDev = arg(c, args, 3, values, defs);
        if (stdDev <= 0.0) {
            throw new IllegalStateException("Probability standard deviation must be > 0, got: " + stdDev);
        }
        double z1 = (x1 - mean) / (stdDev * Math.sqrt(2.0));
        double z2 = (x2 - mean) / (stdDev * Math.sqrt(2.0));
        return 0.5 * (org.apache.commons.math3.special.Erf.erf(z2) - org.apache.commons.math3.special.Erf.erf(z1));
    }

    /**
     * Evaluates a synthetic eigen$val$<k>$<n> or eigen$vec$<i>$<k>$<n> call.
     * Eigenpairs are sorted ascending by eigenvalue; eigenvectors are unit-normalized
     * with their largest-magnitude component made positive so results are deterministic.
     */
    private static double evalEigen(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantVector = parts[1].equals("vec");
        int n = Integer.parseInt(parts[parts.length - 1]);
        double[][] m = new double[n][n];
        List<Expr> args = c.args();
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                m[i][j] = eval(args.get(i * n + j), values, defs);
            }
        }
        EigenDecomposition ed = new EigenDecomposition(new Array2DRowRealMatrix(m, false));
        if (ed.hasComplexEigenvalues()) {
            throw new IllegalStateException(
                    "Matrix has complex eigenvalues; Eigenvalues/Eigen support real spectra only "
                    + "(symmetric matrices always qualify).");
        }
        Integer[] order = new Integer[n];
        for (int i = 0; i < n; i++) {
            order[i] = i;
        }
        java.util.Arrays.sort(order, Comparator.comparingDouble(ed::getRealEigenvalue));
        int k = Integer.parseInt(parts[2 + (wantVector ? 1 : 0)]);
        if (!wantVector) {
            return ed.getRealEigenvalue(order[k]);
        }
        int component = Integer.parseInt(parts[2]);
        RealVector v = ed.getEigenvector(order[k]);
        v = v.mapDivide(v.getNorm());
        int maxIdx = 0;
        for (int i = 1; i < n; i++) {
            if (Math.abs(v.getEntry(i)) > Math.abs(v.getEntry(maxIdx))) {
                maxIdx = i;
            }
        }
        if (v.getEntry(maxIdx) < 0) {
            v = v.mapMultiply(-1.0);
        }
        return v.getEntry(component);
    }

    /**
     * Evaluates a synthetic ss2tf$num$<k>$<n> or ss2tf$den$<k>$<n> call: rebuilds
     * the state-space matrices from the argument list and returns the k-th
     * transfer-function coefficient (descending powers) via the symbolic
     * conversion in {@link com.frees.backend.cas.StateSpace}.
     */
    private static double evalSs2tf(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantNum = parts[1].equals("num");
        int k = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] b = new double[n][1];
        for (int i = 0; i < n; i++) {
            b[i][0] = eval(args.get(idx++), values, defs);
        }
        double[][] cm = new double[1][n];
        for (int j = 0; j < n; j++) {
            cm[0][j] = eval(args.get(idx++), values, defs);
        }
        double d = eval(args.get(idx), values, defs);
        com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
        double[] coeffs = wantNum ? tc.num() : tc.den();
        return coeffs[k];
    }

    private static double evalTf2ss(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String matrix = parts[1]; // "a", "b", "c", "d"
        int n = Integer.parseInt(parts[parts.length - 1]);
        int np = n + 1;
        List<Expr> args = c.args();
        double[] num = new double[np];
        double[] den = new double[np];
        for (int i = 0; i < np; i++) {
            num[i] = eval(args.get(i), values, defs);
            den[i] = eval(args.get(np + i), values, defs);
        }
        com.frees.backend.cas.StateSpace.StateSpaceMatrices ssm =
                com.frees.backend.cas.StateSpace.tf2ss(num, den);
        if (matrix.equals("a")) {
            int row = Integer.parseInt(parts[2]);
            int col = Integer.parseInt(parts[3]);
            return ssm.a()[row][col];
        } else if (matrix.equals("b")) {
            int row = Integer.parseInt(parts[2]);
            return ssm.b()[row];
        } else if (matrix.equals("c")) {
            int col = Integer.parseInt(parts[2]);
            return ssm.c()[col];
        } else {
            return ssm.d();
        }
    }

    private static double evalZp2tf(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantNum = parts[1].equals("num");
        int k = Integer.parseInt(parts[2]);
        int nz = Integer.parseInt(parts[3]);
        int np = Integer.parseInt(parts[4]);

        List<Expr> args = c.args();
        double[] z_r = new double[nz];
        double[] z_i = new double[nz];
        double[] p_r = new double[np];
        double[] p_i = new double[np];

        int idx = 0;
        for (int i = 0; i < nz; i++) z_r[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < nz; i++) z_i[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < np; i++) p_r[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < np; i++) p_i[i] = eval(args.get(idx++), values, defs);
        double gain = eval(args.get(idx), values, defs);

        double[][] tfCoeffs = com.frees.backend.cas.PolynomialHelpers.zp2tf(z_r, z_i, p_r, p_i, gain);
        double[] coeffs = wantNum ? tfCoeffs[0] : tfCoeffs[1];
        return coeffs[k];
    }

    private static double evalTf2zp(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String output = parts[1]; // "zr", "zi", "pr", "pi", "k"
        int nz, np;
        if (output.equals("k")) {
            nz = Integer.parseInt(parts[2]);
            np = Integer.parseInt(parts[3]);
        } else {
            nz = Integer.parseInt(parts[3]);
            np = Integer.parseInt(parts[4]);
        }
        int numLen = np + 1;

        List<Expr> args = c.args();
        double[] num = new double[numLen];
        double[] den = new double[numLen];
        for (int i = 0; i < numLen; i++) {
            num[i] = eval(args.get(i), values, defs);
            den[i] = eval(args.get(numLen + i), values, defs);
        }

        com.frees.backend.cas.PolynomialHelpers.ZpkResult zpk =
                com.frees.backend.cas.PolynomialHelpers.tf2zp(num, den);

        if (output.equals("zr")) {
            int k = Integer.parseInt(parts[2]);
            return k < zpk.zeros().length ? zpk.zeros()[k][0] : 0.0;
        } else if (output.equals("zi")) {
            int k = Integer.parseInt(parts[2]);
            return k < zpk.zeros().length ? zpk.zeros()[k][1] : 0.0;
        } else if (output.equals("pr")) {
            int k = Integer.parseInt(parts[2]);
            return k < zpk.poles().length ? zpk.poles()[k][0] : 0.0;
        } else if (output.equals("pi")) {
            int k = Integer.parseInt(parts[2]);
            return k < zpk.poles().length ? zpk.poles()[k][1] : 0.0;
        } else {
            return zpk.k();
        }
    }

    private static double evalSeries(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
        for (int i = 0; i < L1; i++) num1[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L1; i++) den1[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) num2[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) den2[i] = eval(args.get(idx++), values, defs);

        double[][] result = com.frees.backend.cas.PolynomialHelpers.series(num1, den1, num2, den2);
        double[] coeffs = wantNum ? result[0] : result[1];
        return coeffs[index];
    }

    private static double evalParallel(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
        for (int i = 0; i < L1; i++) num1[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L1; i++) den1[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) num2[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) den2[i] = eval(args.get(idx++), values, defs);

        double[][] result = com.frees.backend.cas.PolynomialHelpers.parallel(num1, den1, num2, den2);
        double[] coeffs = wantNum ? result[0] : result[1];
        return coeffs[index];
    }

    private static double evalFeedback(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
        for (int i = 0; i < L1; i++) num1[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L1; i++) den1[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) num2[i] = eval(args.get(idx++), values, defs);
        for (int i = 0; i < L2; i++) den2[i] = eval(args.get(idx++), values, defs);
        double sign = eval(args.get(idx), values, defs);

        double[][] result = com.frees.backend.cas.PolynomialHelpers.feedback(num1, den1, num2, den2, sign);
        double[] coeffs = wantNum ? result[0] : result[1];
        return coeffs[index];
    }

    private static double evalPole(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            result = com.frees.backend.cas.PolynomialHelpers.poleSS(a);
        } else {
            int len = n + 1;
            double[] den = new double[len];
            for (int i = 0; i < len; i++) {
                den[i] = eval(args.get(len + i), values, defs);
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

    private static double evalZero(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
                num[i] = eval(args.get(i), values, defs);
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
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = eval(args.get(idx++), values, defs);
            }
            double d = eval(args.get(idx), values, defs);
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

    private static double evalBode(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
                num[i] = eval(args.get(i), values, defs);
                den[i] = eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                omega[i] = eval(args.get(2 * len + i), values, defs);
            }
        } else {
            int total = args.size();
            int n = (int) Math.round(Math.sqrt(total - N)) - 1;
            double[][] a = new double[n][n];
            double[][] b = new double[n][1];
            double[][] cm = new double[1][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = eval(args.get(idx++), values, defs);
            }
            double d = eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                omega[i] = eval(args.get(idx++), values, defs);
            }
            com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                    com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
            num = tc.num();
            den = tc.den();
        }

        double[][] result = com.frees.backend.cas.PolynomialHelpers.bode(num, den, omega);
        return wantMag ? result[0][index] : result[1][index];
    }

    private static double evalNyquist(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
                num[i] = eval(args.get(i), values, defs);
                den[i] = eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                omega[i] = eval(args.get(2 * len + i), values, defs);
            }
        } else {
            int total = args.size();
            int n = (int) Math.round(Math.sqrt(total - N)) - 1;
            double[][] a = new double[n][n];
            double[][] b = new double[n][1];
            double[][] cm = new double[1][n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = eval(args.get(idx++), values, defs);
            }
            double d = eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                omega[i] = eval(args.get(idx++), values, defs);
            }
            com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                    com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
            num = tc.num();
            den = tc.den();
        }

        double[][] result = com.frees.backend.cas.PolynomialHelpers.nyquist(num, den, omega);
        return wantReal ? result[0][index] : result[1][index];
    }

    private static double evalMargin(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
                num[i] = eval(args.get(i), values, defs);
                den[i] = eval(args.get(len + i), values, defs);
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
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i][0] = eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[0][j] = eval(args.get(idx++), values, defs);
            }
            double d = eval(args.get(idx), values, defs);
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
    private static double evalRouth(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String output = parts[1]; // "nrhp" or "stable"
        int len = Integer.parseInt(parts[2]);

        List<Expr> args = c.args();
        double[] den = new double[len];
        for (int i = 0; i < len; i++) {
            den[i] = eval(args.get(i), values, defs);
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
    private static double evalResidue(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
            num[i] = eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < den.length; i++) {
            den[i] = eval(args.get(idx++), values, defs);
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

    private static boolean hasRepeatedPole(int[] orders) {
        for (int o : orders) {
            if (o > 1) {
                return true;
            }
        }
        return false;
    }

    /** Source index of the rank-th residue term, sorted by (pole real, imag, order). */
    private static int sortedResidueIndex(double[][] poles, int[] orders, int rank) {
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
    private static double evalNichols(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
    private static double[][] freqResponseModel(List<Expr> args, int numInputs, int N,
                                                Map<String, Double> values, Map<String, ProcDef> defs) {
        if (numInputs == 3) {
            int len = (args.size() - N) / 2;
            double[] num = new double[len];
            double[] den = new double[len];
            for (int i = 0; i < len; i++) {
                num[i] = eval(args.get(i), values, defs);
                den[i] = eval(args.get(len + i), values, defs);
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
    private static double[] readTail(List<Expr> args, int from, int count,
                                     Map<String, Double> values, Map<String, ProcDef> defs) {
        double[] out = new double[count];
        for (int i = 0; i < count; i++) {
            out[i] = eval(args.get(from + i), values, defs);
        }
        return out;
    }

    /** Reads an n-state SS model (A, B, C, D) from the start of args and converts to {num, den}. */
    private static double[][] ssArgsToNumDen(List<Expr> args, int n,
                                             Map<String, Double> values, Map<String, ProcDef> defs) {
        double[][] a = new double[n][n];
        double[][] b = new double[n][1];
        double[][] cm = new double[1][n];
        int idx = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        for (int i = 0; i < n; i++) {
            b[i][0] = eval(args.get(idx++), values, defs);
        }
        for (int j = 0; j < n; j++) {
            cm[0][j] = eval(args.get(idx++), values, defs);
        }
        double d = eval(args.get(idx), values, defs);
        com.frees.backend.cas.StateSpace.TransferCoefficients tc =
                com.frees.backend.cas.StateSpace.ss2tf(a, b, cm, d);
        return new double[][]{tc.num(), tc.den()};
    }

    // Synthetic error-constant call: errorconst$<kp|kv|ka>$<numLen>$<denLen>,
    // with the open-loop numerator then denominator coefficients as arguments.
    private static double evalErrorConst(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String which = parts[1];
        int numLen = Integer.parseInt(parts[2]);
        int denLen = Integer.parseInt(parts[3]);

        List<Expr> args = c.args();
        double[] num = new double[numLen];
        double[] den = new double[denLen];
        int idx = 0;
        for (int i = 0; i < numLen; i++) {
            num[i] = eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < denLen; i++) {
            den[i] = eval(args.get(idx++), values, defs);
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
    private static double evalMason(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        int n = Integer.parseInt(c.function().substring("mason$".length()));
        List<Expr> args = c.args();
        double[][] g = new double[n][n];
        int idx = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                g[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        int source = (int) Math.round(eval(args.get(idx++), values, defs)) - 1;
        int sink = (int) Math.round(eval(args.get(idx), values, defs)) - 1;
        if (source < 0 || source >= n || sink < 0 || sink >= n) {
            throw new IllegalStateException("mason: source/sink node out of range 1.." + n);
        }
        return com.frees.backend.cas.PolynomialHelpers.mason(g, source, sink);
    }

    // Synthetic discretisation call: <c2d|d2c>$<num|den>$<method>$<index>$<L>,
    // with the L numerator coefficients, L denominator coefficients, and Ts as
    // arguments. The full conversion runs and one coefficient is returned
    // (mirroring the series/parallel pattern).
    private static double evalDiscretize(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
            num[i] = eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < len; i++) {
            den[i] = eval(args.get(idx++), values, defs);
        }
        double ts = eval(args.get(idx), values, defs);

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
    private static double evalTimeResponse(com.frees.backend.cas.TimeResponse.Kind kind,
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
                num[i] = eval(args.get(i), values, defs);
                den[i] = eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                t[i] = eval(args.get(2 * len + i), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.response(kind, num, den, null, t);
        } else {
            int n = (int) Math.round(Math.sqrt(args.size() - N)) - 1;
            double[][] a = new double[n][n];
            double[] b = new double[n];
            double[] cm = new double[n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i] = eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[j] = eval(args.get(idx++), values, defs);
            }
            double d = eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                t[i] = eval(args.get(idx++), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.responseSS(kind, a, b, cm, d, null, t);
        }
        return y[index];
    }

    // Synthetic forced-response call: lsim$<index>$<numInputs>$<N>, with the
    // serialized model entries followed by the N input samples u then the N time
    // samples t.
    private static double evalLsim(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
                num[i] = eval(args.get(i), values, defs);
                den[i] = eval(args.get(len + i), values, defs);
            }
            for (int i = 0; i < N; i++) {
                u[i] = eval(args.get(2 * len + i), values, defs);
                t[i] = eval(args.get(2 * len + N + i), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.response(
                    com.frees.backend.cas.TimeResponse.Kind.LSIM, num, den, u, t);
        } else {
            int n = (int) Math.round(Math.sqrt(args.size() - 2 * N)) - 1;
            double[][] a = new double[n][n];
            double[] b = new double[n];
            double[] cm = new double[n];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    a[i][j] = eval(args.get(idx++), values, defs);
                }
            }
            for (int i = 0; i < n; i++) {
                b[i] = eval(args.get(idx++), values, defs);
            }
            for (int j = 0; j < n; j++) {
                cm[j] = eval(args.get(idx++), values, defs);
            }
            double d = eval(args.get(idx++), values, defs);
            for (int i = 0; i < N; i++) {
                u[i] = eval(args.get(idx++), values, defs);
            }
            for (int i = 0; i < N; i++) {
                t[i] = eval(args.get(idx++), values, defs);
            }
            y = com.frees.backend.cas.TimeResponse.responseSS(
                    com.frees.backend.cas.TimeResponse.Kind.LSIM, a, b, cm, d, u, t);
        }
        return y[index];
    }

    // Synthetic LQR call: lqr$<index>$<n>, with arguments A (row-major, n*n),
    // then B (n), then Q (row-major, n*n), then R (scalar). Returns gain K[index].
    private static double evalLqr(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int index = Integer.parseInt(parts[1]);
        int n = Integer.parseInt(parts[2]);

        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] b = new double[n][1];
        for (int i = 0; i < n; i++) {
            b[i][0] = eval(args.get(idx++), values, defs);
        }
        double[][] q = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                q[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] r = {{eval(args.get(idx), values, defs)}};

        double[][] k = com.frees.backend.cas.ControllerDesign.lqr(a, b, q, r);
        return k[0][index];
    }

    // Synthetic pole-placement call: place$<index>$<n>, with arguments A
    // (row-major, n*n), then B (n), then pr (n), then pi (n). Returns K[index].
    private static double evalPlace(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int index = Integer.parseInt(parts[1]);
        int n = Integer.parseInt(parts[2]);

        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b = new double[n];
        for (int i = 0; i < n; i++) {
            b[i] = eval(args.get(idx++), values, defs);
        }
        double[][] roots = new double[n][2];
        for (int i = 0; i < n; i++) {
            roots[i][0] = eval(args.get(idx++), values, defs);
        }
        for (int i = 0; i < n; i++) {
            roots[i][1] = eval(args.get(idx++), values, defs);
        }

        double[] k = com.frees.backend.cas.ControllerDesign.place(a, b, roots);
        return k[index];
    }

    // Synthetic PID-tuning call: pidtune$<kp|ki|kd>$<type>, with arguments num
    // (L), then den (L), then wc (scalar). Returns the requested gain.
    private static double evalPidtune(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String output = parts[1]; // "kp", "ki", "kd"
        String type = parts[2];   // "p", "pi", "pid"

        List<Expr> args = c.args();
        int len = (args.size() - 1) / 2;
        double[] num = new double[len];
        double[] den = new double[len];
        for (int i = 0; i < len; i++) {
            num[i] = eval(args.get(i), values, defs);
            den[i] = eval(args.get(len + i), values, defs);
        }
        double wc = eval(args.get(2 * len), values, defs);

        double[] gains = com.frees.backend.cas.ControllerDesign.pidtune(num, den, type, wc);
        return switch (output) {
            case "kp" -> gains[0];
            case "ki" -> gains[1];
            case "kd" -> gains[2];
            default -> 0.0;
        };
    }

    private static double evalRank(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int rows = Integer.parseInt(parts[1]);
        int cols = Integer.parseInt(parts[2]);
        List<Expr> args = c.args();
        double[][] m = new double[rows][cols];
        int idx = 0;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                m[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        return com.frees.backend.cas.ControllerDesign.rank(m);
    }

    private static double evalCtrb(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int iOut = Integer.parseInt(parts[1]);
        int jOut = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        int m = Integer.parseInt(parts[4]);
        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] b = new double[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                b[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] ctrb = com.frees.backend.cas.ControllerDesign.ctrb(a, b);
        return ctrb[iOut][jOut];
    }

    private static double evalObsv(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int iOut = Integer.parseInt(parts[1]);
        int jOut = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        int p = Integer.parseInt(parts[4]);
        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] cv = new double[p][n];
        for (int i = 0; i < p; i++) {
            for (int j = 0; j < n; j++) {
                cv[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[][] obsv = com.frees.backend.cas.ControllerDesign.obsv(a, cv);
        return obsv[iOut][jOut];
    }

    private static double evalSs2ss(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = -1, idx2 = -1;
        int n, m, p;
        if (varType.equals("d")) {
            n = Integer.parseInt(parts[2]);
            m = Integer.parseInt(parts[3]);
            p = Integer.parseInt(parts[4]);
        } else {
            idx1 = Integer.parseInt(parts[2]);
            idx2 = Integer.parseInt(parts[3]);
            n = Integer.parseInt(parts[4]);
            m = Integer.parseInt(parts[5]);
            p = Integer.parseInt(parts[6]);
        }
        List<Expr> args = c.args();
        int idx = 0;
        double[][] a = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b = new double[n];
        for (int i = 0; i < n; i++) {
            b[i] = eval(args.get(idx++), values, defs);
        }
        double[] cv = new double[n];
        for (int i = 0; i < n; i++) {
            cv[i] = eval(args.get(idx++), values, defs);
        }
        double d = eval(args.get(idx++), values, defs);
        double[][] transform = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                transform[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        
        com.frees.backend.cas.StateSpace.StateSpaceMatrices res =
                com.frees.backend.cas.ControllerDesign.ss2ss(a, b, cv, d, transform);
        if (varType.equals("a")) {
            return res.a()[idx1][idx2];
        } else if (varType.equals("b")) {
            return res.b()[idx1];
        } else if (varType.equals("c")) {
            return res.c()[idx1];
        } else {
            return res.d();
        }
    }

    private static double evalSsSeries(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = -1, idx2 = -1;
        int n1, n2;
        if (varType.equals("d")) {
            n1 = Integer.parseInt(parts[2]);
            n2 = Integer.parseInt(parts[3]);
        } else {
            idx1 = Integer.parseInt(parts[2]);
            idx2 = Integer.parseInt(parts[3]);
            n1 = Integer.parseInt(parts[4]);
            n2 = Integer.parseInt(parts[5]);
        }
        List<Expr> args = c.args();
        int idx = 0;
        
        // System 1
        double[][] a1 = new double[n1][n1];
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                a1[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b1 = new double[n1];
        for (int i = 0; i < n1; i++) {
            b1[i] = eval(args.get(idx++), values, defs);
        }
        double[] c1 = new double[n1];
        for (int i = 0; i < n1; i++) {
            c1[i] = eval(args.get(idx++), values, defs);
        }
        double d1 = eval(args.get(idx++), values, defs);
        
        // System 2
        double[][] a2 = new double[n2][n2];
        for (int i = 0; i < n2; i++) {
            for (int j = 0; j < n2; j++) {
                a2[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b2 = new double[n2];
        for (int i = 0; i < n2; i++) {
            b2[i] = eval(args.get(idx++), values, defs);
        }
        double[] c2 = new double[n2];
        for (int i = 0; i < n2; i++) {
            c2[i] = eval(args.get(idx++), values, defs);
        }
        double d2 = eval(args.get(idx++), values, defs);
        
        com.frees.backend.cas.StateSpace.StateSpaceMatrices res =
                com.frees.backend.cas.ControllerDesign.ssSeries(a1, b1, c1, d1, a2, b2, c2, d2);
        
        if (varType.equals("a")) {
            return res.a()[idx1][idx2];
        } else if (varType.equals("b")) {
            return res.b()[idx1];
        } else if (varType.equals("c")) {
            return res.c()[idx1];
        } else {
            return res.d();
        }
    }

    private static double evalSsParallel(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = -1, idx2 = -1;
        int n1, n2;
        if (varType.equals("d")) {
            n1 = Integer.parseInt(parts[2]);
            n2 = Integer.parseInt(parts[3]);
        } else {
            idx1 = Integer.parseInt(parts[2]);
            idx2 = Integer.parseInt(parts[3]);
            n1 = Integer.parseInt(parts[4]);
            n2 = Integer.parseInt(parts[5]);
        }
        List<Expr> args = c.args();
        int idx = 0;
        
        // System 1
        double[][] a1 = new double[n1][n1];
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                a1[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b1 = new double[n1];
        for (int i = 0; i < n1; i++) {
            b1[i] = eval(args.get(idx++), values, defs);
        }
        double[] c1 = new double[n1];
        for (int i = 0; i < n1; i++) {
            c1[i] = eval(args.get(idx++), values, defs);
        }
        double d1 = eval(args.get(idx++), values, defs);
        
        // System 2
        double[][] a2 = new double[n2][n2];
        for (int i = 0; i < n2; i++) {
            for (int j = 0; j < n2; j++) {
                a2[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b2 = new double[n2];
        for (int i = 0; i < n2; i++) {
            b2[i] = eval(args.get(idx++), values, defs);
        }
        double[] c2 = new double[n2];
        for (int i = 0; i < n2; i++) {
            c2[i] = eval(args.get(idx++), values, defs);
        }
        double d2 = eval(args.get(idx++), values, defs);
        
        com.frees.backend.cas.StateSpace.StateSpaceMatrices res =
                com.frees.backend.cas.ControllerDesign.ssParallel(a1, b1, c1, d1, a2, b2, c2, d2);
        
        if (varType.equals("a")) {
            return res.a()[idx1][idx2];
        } else if (varType.equals("b")) {
            return res.b()[idx1];
        } else if (varType.equals("c")) {
            return res.c()[idx1];
        } else {
            return res.d();
        }
    }

    private static double evalSsFeedback(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx1 = -1, idx2 = -1;
        int n1, n2;
        if (varType.equals("d")) {
            n1 = Integer.parseInt(parts[2]);
            n2 = Integer.parseInt(parts[3]);
        } else {
            idx1 = Integer.parseInt(parts[2]);
            idx2 = Integer.parseInt(parts[3]);
            n1 = Integer.parseInt(parts[4]);
            n2 = Integer.parseInt(parts[5]);
        }
        List<Expr> args = c.args();
        int idx = 0;
        
        // System 1
        double[][] a1 = new double[n1][n1];
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                a1[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b1 = new double[n1];
        for (int i = 0; i < n1; i++) {
            b1[i] = eval(args.get(idx++), values, defs);
        }
        double[] c1 = new double[n1];
        for (int i = 0; i < n1; i++) {
            c1[i] = eval(args.get(idx++), values, defs);
        }
        double d1 = eval(args.get(idx++), values, defs);
        
        // System 2
        double[][] a2 = new double[n2][n2];
        for (int i = 0; i < n2; i++) {
            for (int j = 0; j < n2; j++) {
                a2[i][j] = eval(args.get(idx++), values, defs);
            }
        }
        double[] b2 = new double[n2];
        for (int i = 0; i < n2; i++) {
            b2[i] = eval(args.get(idx++), values, defs);
        }
        double[] c2 = new double[n2];
        for (int i = 0; i < n2; i++) {
            c2[i] = eval(args.get(idx++), values, defs);
        }
        double d2 = eval(args.get(idx++), values, defs);
        
        double sign = 1.0;
        if (idx < args.size()) {
            sign = eval(args.get(idx), values, defs);
        }
        
        com.frees.backend.cas.StateSpace.StateSpaceMatrices res =
                com.frees.backend.cas.ControllerDesign.ssFeedback(a1, b1, c1, d1, a2, b2, c2, d2, sign);
        
        if (varType.equals("a")) {
            return res.a()[idx1][idx2];
        } else if (varType.equals("b")) {
            return res.b()[idx1];
        } else if (varType.equals("c")) {
            return res.c()[idx1];
        } else {
            return res.d();
        }
    }

    private static double evalStepInfo(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int N = Integer.parseInt(parts[2]);
        List<Expr> args = c.args();
        double[] t = new double[N];
        double[] y = new double[N];
        for (int i = 0; i < N; i++) {
            t[i] = eval(args.get(i), values, defs);
        }
        for (int i = 0; i < N; i++) {
            y[i] = eval(args.get(N + i), values, defs);
        }
        double[] res = com.frees.backend.cas.ControllerDesign.stepinfo(t, y);
        return switch (varType) {
            case "tr" -> res[0];
            case "tp" -> res[1];
            case "ts" -> res[2];
            default -> res[3];
        };
    }

    private static double evalPade(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String varType = parts[1];
        int idx = Integer.parseInt(parts[2]);
        int order = Integer.parseInt(parts[3]);
        List<Expr> args = c.args();
        double Td = eval(args.get(0), values, defs);
        double[][] res = com.frees.backend.cas.ControllerDesign.pade(Td, order);
        if (varType.equals("num")) {
            return res[0][idx];
        } else {
            return res[1][idx];
        }
    }

    private static double evalRlocus(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
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
            num[i] = eval(args.get(idx++), values, defs);
        }
        double[] den = new double[denSize];
        for (int i = 0; i < denSize; i++) {
            den[i] = eval(args.get(idx++), values, defs);
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

    /**
     * Quadrature for an Integral whose limits contain unknowns (see
     * IntegralSolver.inlinedEquation): by construction the integrand is
     * closed-form in the integration variable, so the integral is an
     * ordinary function of its limits, re-evaluated at every Newton
     * residual evaluation. Adaptive Simpson is exact for the polynomial
     * c_p fits of combustion problems and refines only where needed
     * otherwise; the noise floor must stay far below the perturbations of
     * the numerical Jacobian, hence the tight tolerance.
     */
    private static final double SIMPSON_REL_TOL = 1e-12;
    private static final int SIMPSON_MAX_DEPTH = 24;

    private static double integralQuadrature(Expr.Call c, Map<String, Double> values,
                                             Map<String, ProcDef> defs) {
        List<Expr> args = c.args();
        if (args.size() < 4 || !(args.get(1) instanceof Expr.Var(String varName))) {
            throw new IllegalStateException(
                    "Integral expects Integral(f, t, lower, upper[, step]).");
        }
        double lower = eval(args.get(2), values, defs);
        double upper = eval(args.get(3), values, defs);
        if (lower == upper) {
            return 0.0;
        }
        boolean had = values.containsKey(varName);
        Double saved = had ? values.get(varName) : null;
        try {
            Expr f = args.get(0);
            SimpsonContext context = new SimpsonContext(f, varName, values, defs);
            double fa = context.evalAt(lower);
            double fm = context.evalAt((lower + upper) / 2.0);
            double fb = context.evalAt(upper);
            double whole = (upper - lower) / 6.0 * (fa + 4.0 * fm + fb);
            return context.adaptiveSimpson(lower, upper, fa, fm, fb, whole, SIMPSON_MAX_DEPTH);
        } finally {
            if (had) {
                values.put(varName, saved);
            } else {
                values.remove(varName);
            }
        }
    }

    private static class SimpsonContext {
        final Expr f;
        final String varName;
        final Map<String, Double> values;
        final Map<String, ProcDef> defs;

        SimpsonContext(Expr f, String varName, Map<String, Double> values, Map<String, ProcDef> defs) {
            this.f = f;
            this.varName = varName;
            this.values = values;
            this.defs = defs;
        }

        double evalAt(double t) {
            values.put(varName, t);
            return eval(f, values, defs);
        }

        double adaptiveSimpson(double a, double b, double fa, double fm, double fb, double whole, int depth) {
            double m = (a + b) / 2.0;
            double lm = (a + m) / 2.0;
            double rm = (m + b) / 2.0;
            double flm = evalAt(lm);
            double frm = evalAt(rm);
            double left = (m - a) / 6.0 * (fa + 4.0 * flm + fm);
            double right = (b - m) / 6.0 * (fm + 4.0 * frm + fb);
            double halves = left + right;
            double delta = halves - whole;
            if (depth <= 0
                    || Math.abs(delta) <= 15.0 * SIMPSON_REL_TOL * Math.max(Math.abs(halves), 1.0)) {
                return halves + delta / 15.0;
            }
            return adaptiveSimpson(a, m, fa, flm, fm, left, depth - 1)
                    + adaptiveSimpson(m, b, fm, frm, fb, right, depth - 1);
        }
    }

    private static double arg(Expr.Call c, List<Expr> args, int i,
                               Map<String, Double> values, Map<String, ProcDef> defs) {
        if (i >= args.size()) {
            throw new IllegalStateException(
                    "Function " + c.function() + " expects at least " + (i + 1) + " argument(s)");
        }
        return eval(args.get(i), values, defs);
    }

    /**
     * Modified Bessel function of the first kind I_order(x), via the ascending
     * series with log-space terms (overflow-safe up to x ≈ 700). Commons Math
     * provides BesselJ but not BesselI.
     */
    static double besselI(double order, double x) {
        if (x < 0) {
            if (order != Math.rint(order)) {
                throw new IllegalStateException(
                        "BesselI of a negative argument requires an integer order.");
            }
            double sign = ((long) Math.rint(order)) % 2 == 0 ? 1.0 : -1.0;
            return sign * besselI(order, -x);
        }
        if (order < 0) {
            if (order != Math.rint(order)) {
                throw new IllegalStateException(
                        "BesselI supports integer or non-negative orders, got " + order + ".");
            }
            order = -order; // I_{-n}(x) = I_n(x) for integer n
        }
        if (x == 0.0) {
            return order == 0.0 ? 1.0 : 0.0;
        }
        double lnHalfX = Math.log(x / 2.0);
        double sum = 0.0;
        for (int k = 0; k < 2000; k++) {
            double lnTerm = (2.0 * k + order) * lnHalfX
                    - org.apache.commons.math3.special.Gamma.logGamma(k + 1.0)
                    - org.apache.commons.math3.special.Gamma.logGamma(k + order + 1.0);
            double term = Math.exp(lnTerm);
            sum += term;
            if (term < sum * 1e-17 && k > x / 2.0) {
                break;
            }
        }
        return sum;
    }

    static double bessj0(double x) {
        double ax = Math.abs(x);
        double ans;
        if (ax < 8.0) {
            double y = x * x;
            double ans1 = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7
                    + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
            double ans2 = 57568490411.0 + y * (1029532985.0 + y * (9494680.718
                    + y * (59272.64853 + y * (267.8532712 + y * 1.0))));
            ans = ans1 / ans2;
        } else {
            double z = 8.0 / ax;
            double y = z * z;
            double xx = ax - 0.785398164;
            double ans1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4
                    + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
            double ans2 = -0.1562499995e-1 + y * (0.1430488765e-3
                    + y * (-0.6911147651e-5 + y * (0.7621095161e-6
                    - y * 0.934935152e-7)));
            ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
        }
        return ans;
    }

    static double bessj1(double x) {
        double ax = Math.abs(x);
        double ans;
        if (ax < 8.0) {
            double y = x * x;
            double ans1 = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1
                    + y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606))))));
            double ans2 = 144725228442.0 + y * (2300535178.0 + y * (18583304.74
                    + y * (99447.43394 + y * (376.9991397 + y * 1.0))));
            ans = ans1 / ans2;
        } else {
            double z = 8.0 / ax;
            double y = z * z;
            double xx = ax - 2.356194491;
            double ans1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4
                    + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
            double ans2 = 0.04687499995 + y * (-0.2002690873e-3
                    + y * (0.8449199096e-5 + y * (-0.88228987e-6
                    + y * 0.105787412e-6)));
            ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
            if (x < 0.0) ans = -ans;
        }
        return ans;
    }

    static double bessy0(double x) {
        if (x <= 0.0) {
            throw new IllegalArgumentException("BesselY0 requires x > 0, got: " + x);
        }
        double ans;
        if (x < 8.0) {
            double y = x * x;
            double ans1 = -2957821389.0 + y * (7062834065.0 + y * (-512359803.6
                    + y * (10879881.29 + y * (-86327.92757 + y * 228.4622733))));
            double ans2 = 40076544269.0 + y * (745249964.8 + y * (7189466.438
                    + y * (47447.26470 + y * (226.1030244 + y * 1.0))));
            ans = (ans1 / ans2) + 0.636619772 * bessj0(x) * Math.log(x);
        } else {
            double z = 8.0 / x;
            double y = z * z;
            double xx = x - 0.785398164;
            double ans1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4
                    + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
            double ans2 = -0.1562499995e-1 + y * (0.1430488765e-3
                    + y * (-0.6911147651e-5 + y * (0.7621095161e-6
                    + y * (-0.934945152e-7))));
            ans = Math.sqrt(0.636619772 / x) * (Math.sin(xx) * ans1 + z * Math.cos(xx) * ans2);
        }
        return ans;
    }

    static double bessy1(double x) {
        if (x <= 0.0) {
            throw new IllegalArgumentException("BesselY1 requires x > 0, got: " + x);
        }
        double ans;
        if (x < 8.0) {
            double y = x * x;
            double ans1 = x * (-0.4900604943e13 + y * (0.1275274390e13
                    + y * (-0.5153438139e11 + y * (0.7349264551e9
                    + y * (-0.4237922726e7 + y * 0.8511937935e4)))));
            double ans2 = 0.2499580570e14 + y * (0.4244419664e12
                    + y * (0.3733650367e10 + y * (0.2245904002e8
                    + y * (0.1020426050e6 + y * (0.3549632885e3 + y)))));
            ans = (ans1 / ans2) + 0.636619772 * (bessj1(x) * Math.log(x) - 1.0 / x);
        } else {
            double z = 8.0 / x;
            double y = z * z;
            double xx = x - 2.356194491;
            double ans1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4
                    + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
            double ans2 = 0.04687499995 + y * (-0.2002690873e-3
                    + y * (0.8449199096e-5 + y * (-0.88228987e-6
                    + y * 0.105787412e-6)));
            ans = Math.sqrt(0.636619772 / x) * (Math.sin(xx) * ans1 + z * Math.cos(xx) * ans2);
        }
        return ans;
    }

    static double bessi0(double x) {
        double ax = Math.abs(x);
        double ans;
        if (ax < 3.75) {
            double y = x / 3.75;
            y = y * y;
            ans = 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492
                    + y * (0.2659732 + y * (0.360768e-1 + y * 0.45813e-2)))));
        } else {
            double y = 3.75 / ax;
            ans = (Math.exp(ax) / Math.sqrt(ax)) * (0.39894228 + y * (0.1328592e-1
                    + y * (0.225319e-2 + y * (-0.157565e-2 + y * (0.916281e-2
                    + y * (-0.2057706e-1 + y * (0.2635537e-1 + y * (-0.1647633e-1
                    + y * 0.392377e-2))))))));
        }
        return ans;
    }

    static double bessi1(double x) {
        double ax = Math.abs(x);
        double ans;
        if (ax < 3.75) {
            double y = x / 3.75;
            y = y * y;
            ans = ax * (0.5 + y * (0.87890594 + y * (0.51498869 + y * (0.15084934
                    + y * (0.2658733e-1 + y * (0.301532e-2 + y * 0.32411e-3))))));
        } else {
            double y = 3.75 / ax;
            ans = 0.2282967e-1 + y * (-0.2895312e-1 + y * (0.1787654e-1 - y * 0.420059e-2));
            ans = 0.39894228 + y * (-0.3988024e-1 + y * (-0.362018e-2
                    + y * (0.163801e-2 + y * (-0.1031555e-1 + y * ans))));
            ans *= (Math.exp(ax) / Math.sqrt(ax));
        }
        return x < 0.0 ? -ans : ans;
    }

    static double bessk0(double x) {
        if (x <= 0.0) {
            throw new IllegalArgumentException("BesselK0 requires x > 0, got: " + x);
        }
        double ans;
        if (x <= 2.0) {
            double y = x * x / 4.0;
            ans = (-Math.log(x / 2.0) * bessi0(x)) + (-0.57721566 + y * (0.42278420
                    + y * (0.23069756 + y * (0.3488590e-1 + y * (0.262698e-2
                    + y * (0.10750e-3 + y * 0.74e-5))))));
        } else {
            double y = 2.0 / x;
            ans = (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + y * (-0.7832358e-1
                    + y * (0.2189568e-1 + y * (-0.1062446e-1 + y * (0.587872e-2
                    + y * (-0.251540e-2 + y * 0.53208e-3))))));
        }
        return ans;
    }

    static double bessk1(double x) {
        if (x <= 0.0) {
            throw new IllegalArgumentException("BesselK1 requires x > 0, got: " + x);
        }
        double ans;
        if (x <= 2.0) {
            double y = x * x / 4.0;
            ans = (Math.log(x / 2.0) * bessi1(x)) + (1.0 / x) * (1.0 + y * (0.15443144
                    + y * (-0.67278579 + y * (-0.18156897 + y * (-0.1919402e-1
                    + y * (-0.110404e-2 + y * (-0.4686e-4)))))));
        } else {
            double y = 2.0 / x;
            ans = (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + y * (0.23498619
                    + y * (-0.3655620e-1 + y * (0.1504268e-1 + y * (-0.780353e-2
                    + y * (0.325614e-2 + y * (-0.68245e-3)))))));
        }
        return ans;
    }

    static double bessy(int n, double x) {
        if (x <= 0.0) {
            throw new IllegalArgumentException("BesselY requires x > 0, got: " + x);
        }
        if (n < 0) {
            double sign = n % 2 == 0 ? 1.0 : -1.0;
            return sign * bessy(-n, x);
        }
        if (n == 0) return bessy0(x);
        if (n == 1) return bessy1(x);

        double tox = 2.0 / x;
        double by = bessy1(x);
        double bym = bessy0(x);
        double byp = 0.0;
        for (int j = 1; j < n; j++) {
            byp = j * tox * by - bym;
            bym = by;
            by = byp;
        }
        return by;
    }

    static double bessk(int n, double x) {
        if (x <= 0.0) {
            throw new IllegalArgumentException("BesselK requires x > 0, got: " + x);
        }
        if (n < 0) {
            return bessk(-n, x);
        }
        if (n == 0) return bessk0(x);
        if (n == 1) return bessk1(x);

        double tox = 2.0 / x;
        double bkm = bessk0(x);
        double bk = bessk1(x);
        double bkp = 0.0;
        for (int j = 1; j < n; j++) {
            bkp = bkm + j * tox * bk;
            bkm = bk;
            bk = bkp;
        }
        return bk;
    }

    static double besselK(double order, double x) {
        if (order != Math.rint(order)) {
            throw new IllegalStateException("BesselK requires an integer order, got: " + order);
        }
        return bessk((int) Math.round(order), x);
    }

    static double besselY(double order, double x) {
        if (order != Math.rint(order)) {
            throw new IllegalStateException("BesselY requires an integer order, got: " + order);
        }
        return bessy((int) Math.round(order), x);
    }

    /**
     * BaseConvert(digits, fromBase, toBase): converts a number between bases 2-36.
     * The digits argument is a string literal (e.g. 'FF') or a numeric expression
     * whose integer decimal representation is used. The result is returned as the
     * number whose decimal digits spell the converted value, so it must contain
     * only the digits 0-9 (i.e. toBase <= 10, or a value small enough to avoid
     * letter digits).
     */
    private static double evalBaseConvert(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (c.args().size() != 3) {
            throw new IllegalStateException(
                    "BaseConvert expects 3 arguments: BaseConvert('digits', fromBase, toBase).");
        }
        Expr first = c.args().get(0);
        String digits;
        if (first instanceof Expr.Str s) {
            digits = s.value().trim();
        } else {
            double v = eval(first, values, defs);
            if (v != Math.rint(v) || Double.isInfinite(v)) {
                throw new IllegalStateException(
                        "BaseConvert input must be an integer, got: " + v);
            }
            digits = Long.toString((long) v);
        }
        int fromBase = (int) Math.rint(eval(c.args().get(1), values, defs));
        int toBase = (int) Math.rint(eval(c.args().get(2), values, defs));
        if (fromBase < 2 || fromBase > 36 || toBase < 2 || toBase > 36) {
            throw new IllegalStateException(
                    "BaseConvert bases must be between 2 and 36, got " + fromBase + " and " + toBase + ".");
        }
        long value;
        try {
            value = Long.parseLong(digits, fromBase);
        } catch (NumberFormatException e) {
            throw new IllegalStateException(
                    "'" + digits + "' is not a valid base-" + fromBase + " number.");
        }
        String converted = Long.toString(value, toBase);
        if (!converted.matches("-?\\d+")) {
            throw new IllegalStateException(
                    "BaseConvert result '" + converted.toUpperCase() + "' in base " + toBase
                    + " contains letter digits and cannot be represented as a number; use toBase <= 10.");
        }
        return Double.parseDouble(converted);
    }

    private static double evalRandom(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        double a = arg(c, c.args(), 0, values, defs);
        double b = arg(c, c.args(), 1, values, defs);
        long seed = c.args().size() > 2 ? (long) arg(c, c.args(), 2, values, defs) : System.identityHashCode(c);
        if (seed == 0) {
            seed = System.identityHashCode(c);
        }
        java.util.Random rand = new java.util.Random(seed);
        double r = rand.nextDouble();
        return a + r * (b - a);
    }

    private static double evalRandG(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        double mean = arg(c, c.args(), 0, values, defs);
        double stdDev = arg(c, c.args(), 1, values, defs);
        long seed = c.args().size() > 2 ? (long) arg(c, c.args(), 2, values, defs) : System.identityHashCode(c);
        if (seed == 0) {
            seed = System.identityHashCode(c);
        }
        java.util.Random rand = new java.util.Random(seed);
        double g = rand.nextGaussian();
        return mean + g * stdDev;
    }

    /**
     * Extracts a string value from an expression.
     * Supports {@link Expr.Str} (quoted strings) and {@link Expr.Var}
     * (backward compatibility: bare identifiers treated as string labels).
     */
    public static String evalString(Expr e) {
        if (e instanceof Expr.Str s) return s.value();
        if (e instanceof Expr.Var v) return v.name();  // backward compat: bare idents as strings
        throw new IllegalStateException("Expected a string argument, got: " + e);
    }

    /**
     * View factor between two perpendicular rectangles sharing a common edge of
     * length {@code l}. Rectangle 1 (the emitter) extends {@code w1} from the
     * edge; rectangle 2 extends {@code w2}. Howell catalog C-14.
     */
    private static double viewFactorPerpendicular(double w1, double w2, double l) {
        if (l <= 0.0 || w1 <= 0.0 || w2 <= 0.0) {
            throw new IllegalStateException("viewfactor_perp: all dimensions must be positive");
        }
        double w = w1 / l;
        double h = w2 / l;
        double w2s = w * w;
        double h2s = h * h;
        double sum = w2s + h2s;
        double term = w * Math.atan(1.0 / w)
                + h * Math.atan(1.0 / h)
                - Math.sqrt(sum) * Math.atan(1.0 / Math.sqrt(sum));
        double logArg = ((1.0 + w2s) * (1.0 + h2s) / (1.0 + sum))
                * Math.pow(w2s * (1.0 + sum) / ((1.0 + w2s) * sum), w2s)
                * Math.pow(h2s * (1.0 + sum) / ((1.0 + h2s) * sum), h2s);
        return (term + 0.25 * Math.log(logArg)) / (Math.PI * w);
    }

    /**
     * View factor between two identical, directly opposed, aligned parallel
     * rectangles of sides {@code a} by {@code b} separated by distance
     * {@code l}. Howell catalog C-11.
     */
    private static double viewFactorParallelPlates(double a, double b, double l) {
        if (l <= 0.0 || a <= 0.0 || b <= 0.0) {
            throw new IllegalStateException("viewfactor_plates: all dimensions must be positive");
        }
        double x = a / l;
        double y = b / l;
        double x2 = x * x;
        double y2 = y * y;
        double term = Math.log(Math.sqrt((1.0 + x2) * (1.0 + y2) / (1.0 + x2 + y2)))
                + x * Math.sqrt(1.0 + y2) * Math.atan(x / Math.sqrt(1.0 + y2))
                + y * Math.sqrt(1.0 + x2) * Math.atan(y / Math.sqrt(1.0 + x2))
                - x * Math.atan(x)
                - y * Math.atan(y);
        return (2.0 / (Math.PI * x * y)) * term;
    }

    /**
     * View factor from coaxial parallel disk 1 (radius {@code r1}) to disk 2
     * (radius {@code r2}) separated by distance {@code l}. Howell catalog C-41.
     */
    private static double viewFactorCoaxialDisks(double r1, double r2, double l) {
        if (l <= 0.0 || r1 <= 0.0 || r2 <= 0.0) {
            throw new IllegalStateException("viewfactor_disks: all dimensions must be positive");
        }
        double bigR1 = r1 / l;
        double bigR2 = r2 / l;
        double s = 1.0 + (1.0 + bigR2 * bigR2) / (bigR1 * bigR1);
        double ratio = bigR2 / bigR1;
        return 0.5 * (s - Math.sqrt(s * s - 4.0 * ratio * ratio));
    }
}
