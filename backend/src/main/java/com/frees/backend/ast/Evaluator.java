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
        if (c.function().startsWith("qr$")) {
            return evalQr(c, values, defs);
        }
        if (c.function().startsWith("chol$")) {
            return evalCholesky(c, values, defs);
        }
        if (c.function().startsWith("expm$")) {
            return evalMatExp(c, values, defs);
        }
        if (c.function().startsWith("svd$")) {
            return evalSvd(c, values, defs);
        }
        if (c.function().startsWith("fft$") || c.function().startsWith("ifft$")) {
            return evalFft(c, values, defs);
        }
        if (c.function().startsWith("conv$")) {
            return evalConvolve(c, values, defs);
        }
        if (c.function().startsWith("linfit$")) {
            return evalLinFit(c, values, defs);
        }
        if (c.function().startsWith("polyfit$")) {
            return evalPolyFit(c, values, defs);
        }
        if (c.function().startsWith("interp2$")) {
            return evalInterp2(c, values, defs);
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
            return ControlSystemsEvaluator.evalSeries(c, values, defs);
        }
        if (c.function().startsWith("parallel$")) {
            return ControlSystemsEvaluator.evalParallel(c, values, defs);
        }
        if (c.function().startsWith("feedback$")) {
            return ControlSystemsEvaluator.evalFeedback(c, values, defs);
        }
        if (c.function().startsWith("pole$")) {
            return ControlSystemsEvaluator.evalPole(c, values, defs);
        }
        if (c.function().startsWith("zero$")) {
            return ControlSystemsEvaluator.evalZero(c, values, defs);
        }
        if (c.function().startsWith("bode$")) {
            return ControlSystemsEvaluator.evalBode(c, values, defs);
        }
        if (c.function().startsWith("nyquist$")) {
            return ControlSystemsEvaluator.evalNyquist(c, values, defs);
        }
        if (c.function().startsWith("margin$")) {
            return ControlSystemsEvaluator.evalMargin(c, values, defs);
        }
        if (c.function().startsWith("step$")) {
            return ControlSystemsEvaluator.evalTimeResponse(com.frees.backend.cas.TimeResponse.Kind.STEP, c, values, defs);
        }
        if (c.function().startsWith("impulse$")) {
            return ControlSystemsEvaluator.evalTimeResponse(com.frees.backend.cas.TimeResponse.Kind.IMPULSE, c, values, defs);
        }
        if (c.function().startsWith("lsim$")) {
            return ControlSystemsEvaluator.evalLsim(c, values, defs);
        }
        if (c.function().startsWith("lqr$")) {
            return ControlSystemsEvaluator.evalLqr(c, values, defs);
        }
        if (c.function().startsWith("dlqr$")) {
            return ControlSystemsEvaluator.evalDlqr(c, values, defs);
        }
        if (c.function().startsWith("dare$")) {
            return ControlSystemsEvaluator.evalDare(c, values, defs);
        }
        if (c.function().startsWith("lyap$")) {
            return ControlSystemsEvaluator.evalLyap(c, values, defs);
        }
        if (c.function().startsWith("dlyap$")) {
            return ControlSystemsEvaluator.evalDlyap(c, values, defs);
        }
        if (c.function().startsWith("lqe$")) {
            return ControlSystemsEvaluator.evalLqe(c, values, defs);
        }
        if (c.function().startsWith("gram$")) {
            return ControlSystemsEvaluator.evalGram(c, values, defs);
        }
        if (c.function().startsWith("balreal$")) {
            return ControlSystemsEvaluator.evalBalreal(c, values, defs);
        }
        if (c.function().startsWith("place$")) {
            return ControlSystemsEvaluator.evalPlace(c, values, defs);
        }
        if (c.function().startsWith("pidtune$")) {
            return ControlSystemsEvaluator.evalPidtune(c, values, defs);
        }
        if (c.function().startsWith("rank$")) {
            return ControlSystemsEvaluator.evalRank(c, values, defs);
        }
        if (c.function().startsWith("ctrb$")) {
            return ControlSystemsEvaluator.evalCtrb(c, values, defs);
        }
        if (c.function().startsWith("obsv$")) {
            return ControlSystemsEvaluator.evalObsv(c, values, defs);
        }
        if (c.function().startsWith("ss2ss$")) {
            return ControlSystemsEvaluator.evalSs2ss(c, values, defs);
        }
        if (c.function().startsWith("ss_series$")) {
            return ControlSystemsEvaluator.evalSsSeries(c, values, defs);
        }
        if (c.function().startsWith("ss_parallel$")) {
            return ControlSystemsEvaluator.evalSsParallel(c, values, defs);
        }
        if (c.function().startsWith("ss_feedback$")) {
            return ControlSystemsEvaluator.evalSsFeedback(c, values, defs);
        }
        if (c.function().startsWith("stepinfo$")) {
            return ControlSystemsEvaluator.evalStepInfo(c, values, defs);
        }
        if (c.function().startsWith("pade$")) {
            return ControlSystemsEvaluator.evalPade(c, values, defs);
        }
        if (c.function().startsWith("rlocus$")) {
            return ControlSystemsEvaluator.evalRlocus(c, values, defs);
        }
        if (c.function().startsWith("routh$")) {
            return ControlSystemsEvaluator.evalRouth(c, values, defs);
        }
        if (c.function().startsWith("c2d$") || c.function().startsWith("d2c$")) {
            return ControlSystemsEvaluator.evalDiscretize(c, values, defs);
        }
        if (c.function().startsWith("residue$")) {
            return ControlSystemsEvaluator.evalResidue(c, values, defs);
        }
        if (c.function().startsWith("nichols$")) {
            return ControlSystemsEvaluator.evalNichols(c, values, defs);
        }
        if (c.function().startsWith("errorconst$")) {
            return ControlSystemsEvaluator.evalErrorConst(c, values, defs);
        }
        if (c.function().startsWith("mason$")) {
            return ControlSystemsEvaluator.evalMason(c, values, defs);
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
            case "gaussintegral" -> gaussLegendreQuadrature(c, values, defs);

            // Descriptive statistics over a list of values (array slices expand
            // into individual arguments, so Mean(v[1:n]) works directly).
            case "mean" -> mean(statValues(args, values, defs));
            case "median" -> median(statValues(args, values, defs));
            case "variance", "var" -> sampleVariance(statValues(args, values, defs));
            case "stdev", "stddev", "std" -> Math.sqrt(sampleVariance(statValues(args, values, defs)));
            case "rms" -> rootMeanSquare(statValues(args, values, defs));
            // Percentile(p, x1, x2, ...): p in [0, 100] is the first argument.
            case "percentile" -> percentile(c, args, values, defs);

            // Normal distribution: optional (mu, sigma) default to the standard normal.
            case "normalcdf" -> normal(c, args, values, defs).cumulativeProbability(arg(c, args, 0, values, defs));
            case "normalpdf" -> normal(c, args, values, defs).density(arg(c, args, 0, values, defs));
            case "normalinvcdf" -> normal(c, args, values, defs).inverseCumulativeProbability(arg(c, args, 0, values, defs));

            // Orthogonal polynomials of order n at x, via their three-term recurrences.
            case "legendrep" -> legendreP(orderArg(c, args, values, defs), arg(c, args, 1, values, defs));
            case "chebyshevt" -> chebyshevT(orderArg(c, args, values, defs), arg(c, args, 1, values, defs));
            case "chebyshevu" -> chebyshevU(orderArg(c, args, values, defs), arg(c, args, 1, values, defs));
            case "hermiteh" -> hermiteH(orderArg(c, args, values, defs), arg(c, args, 1, values, defs));
            case "laguerrel" -> laguerreL(orderArg(c, args, values, defs), arg(c, args, 1, values, defs));

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

            // Transient conduction (Heisler one-term approximation). The first
            // argument is the geometry string 'wall' | 'cylinder' | 'sphere'.
            case "heisler_temp" -> com.frees.backend.core.HeislerCharts.temperature(
                    evalString(args.get(0)), arg(c, args, 1, values, defs),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs));
            case "heisler_q" -> com.frees.backend.core.HeislerCharts.heatRatio(
                    evalString(args.get(0)), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));

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

            // Ideal-gas compressible-flow relations, functions of (M, k) unless
            // noted. Ratios are dimensionless; angles are in radians. See
            // props/CompressibleFlow.java (cross-checked vs Cengel / gdtk / EES).
            case "t0_t", "isen_t0_t" -> com.frees.backend.props.CompressibleFlow.t0OverT(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "p0_p", "isen_p0_p" -> com.frees.backend.props.CompressibleFlow.p0OverP(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "rho0_rho", "isen_rho0_rho" -> com.frees.backend.props.CompressibleFlow.rho0OverRho(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "a_astar", "isen_a_astar" -> com.frees.backend.props.CompressibleFlow.aOverAstar(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "mach_a_astar" -> com.frees.backend.props.CompressibleFlow.machFromAOverAstar(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs), evalString(args.get(2)));
            // Normal shock (state 2 downstream of upstream M1).
            case "m2_shock", "mach_shock" -> com.frees.backend.props.CompressibleFlow.machBehindShock(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "p2_p1_shock" -> com.frees.backend.props.CompressibleFlow.shockPressureRatio(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "t2_t1_shock" -> com.frees.backend.props.CompressibleFlow.shockTemperatureRatio(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "rho2_rho1_shock" -> com.frees.backend.props.CompressibleFlow.shockDensityRatio(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "p02_p01_shock" -> com.frees.backend.props.CompressibleFlow.shockStagnationPressureRatio(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            // Rayleigh flow (heat addition, sonic-reference *).
            case "rayleigh_t0_t0star" -> com.frees.backend.props.CompressibleFlow.rayleighT0OverT0star(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "rayleigh_t_tstar" -> com.frees.backend.props.CompressibleFlow.rayleighTOverTstar(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "rayleigh_p_pstar" -> com.frees.backend.props.CompressibleFlow.rayleighPOverPstar(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "rayleigh_p0_p0star" -> com.frees.backend.props.CompressibleFlow.rayleighP0OverP0star(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            // Fanno flow (friction, sonic-reference *).
            case "fanno_t_tstar" -> com.frees.backend.props.CompressibleFlow.fannoTOverTstar(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "fanno_p_pstar" -> com.frees.backend.props.CompressibleFlow.fannoPOverPstar(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "fanno_p0_p0star" -> com.frees.backend.props.CompressibleFlow.fannoP0OverP0star(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "fanno_fld" -> com.frees.backend.props.CompressibleFlow.fanno4fLmaxOverD(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            // Prandtl-Meyer expansion (angles in radians).
            case "prandtlmeyer", "prandtl_meyer" -> com.frees.backend.props.CompressibleFlow.prandtlMeyer(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "mach_prandtlmeyer" -> com.frees.backend.props.CompressibleFlow.machFromPrandtlMeyer(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "machangle" -> com.frees.backend.props.CompressibleFlow.machAngle(
                    arg(c, args, 0, values, defs));
            // Oblique shock theta-beta-M (angles in radians).
            case "theta_oblique" -> com.frees.backend.props.CompressibleFlow.thetaOblique(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            case "beta_oblique" -> com.frees.backend.props.CompressibleFlow.betaOblique(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs),
                    arg(c, args, 2, values, defs), evalString(args.get(3)));

            // Heat-exchanger effectiveness-NTU, LMTD and fin efficiency. The
            // arrangement is the leading string argument. See props/HeatExchanger.
            case "hx_effectiveness", "hx_epsilon" -> com.frees.backend.props.HeatExchanger.effectiveness(
                    com.frees.backend.props.HeatExchanger.arrangement(evalString(args.get(0))),
                    arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            case "hx_ntu" -> com.frees.backend.props.HeatExchanger.ntu(
                    com.frees.backend.props.HeatExchanger.arrangement(evalString(args.get(0))),
                    arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            case "lmtd" -> com.frees.backend.props.HeatExchanger.lmtd(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs));
            case "fin_efficiency" -> com.frees.backend.props.HeatExchanger.finEfficiency(
                    arg(c, args, 0, values, defs));

            // Cubic equation-of-state backend (SRK/PR), independent of CoolProp.
            // Signature: eos_*(fluid$, model$, T, P, phase$); pressure takes
            // (fluid$, model$, T, v) and psat takes (fluid$, model$, T).
            case "eos_z" -> com.frees.backend.props.CubicEos.z(
                    evalString(args.get(0)), evalString(args.get(1)),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), evalString(args.get(4)));
            case "eos_volume" -> com.frees.backend.props.CubicEos.volume(
                    evalString(args.get(0)), evalString(args.get(1)),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), evalString(args.get(4)));
            case "eos_density" -> com.frees.backend.props.CubicEos.density(
                    evalString(args.get(0)), evalString(args.get(1)),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), evalString(args.get(4)));
            case "eos_enthalpy" -> com.frees.backend.props.CubicEos.enthalpy(
                    evalString(args.get(0)), evalString(args.get(1)),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), evalString(args.get(4)));
            case "eos_entropy" -> com.frees.backend.props.CubicEos.entropy(
                    evalString(args.get(0)), evalString(args.get(1)),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), evalString(args.get(4)));
            case "eos_pressure" -> com.frees.backend.props.CubicEos.pressure(
                    evalString(args.get(0)), evalString(args.get(1)),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs));
            case "eos_psat" -> com.frees.backend.props.CubicEos.saturationPressure(
                    evalString(args.get(0)), evalString(args.get(1)), arg(c, args, 2, values, defs));

            // Combustion thermochemistry (NASA-7 / IdealGas). Fuel formula is a
            // string; phi is the fuel/air equivalence ratio. See Thermochemistry.
            case "adiabaticflametemp", "adiabaticflametemperature", "flametemp" ->
                    com.frees.backend.props.Thermochemistry.adiabaticFlameTemp(
                            evalString(args.get(0)), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            // Ideal-gas mixture properties from a 'species:amount, ...' string.
            case "mix_mw", "mix_molarmass" -> com.frees.backend.props.Thermochemistry.mixtureMolarMass(
                    evalString(args.get(0)));
            case "mix_cp" -> com.frees.backend.props.Thermochemistry.mixtureCp(
                    evalString(args.get(0)), arg(c, args, 1, values, defs));
            case "mix_enthalpy" -> com.frees.backend.props.Thermochemistry.mixtureEnthalpy(
                    evalString(args.get(0)), arg(c, args, 1, values, defs));
            case "mix_entropy" -> com.frees.backend.props.Thermochemistry.mixtureEntropy(
                    evalString(args.get(0)), arg(c, args, 1, values, defs), arg(c, args, 2, values, defs));
            case "mix_viscosity" -> com.frees.backend.props.GasTransport.mixtureViscosity(
                    evalString(args.get(0)), arg(c, args, 1, values, defs));
            case "mix_conductivity" -> com.frees.backend.props.GasTransport.mixtureConductivity(
                    evalString(args.get(0)), arg(c, args, 1, values, defs));
            // Combustion-product chemical equilibrium (dissociation).
            case "eq_molefraction" -> com.frees.backend.props.Equilibrium.moleFraction(
                    evalString(args.get(0)), arg(c, args, 1, values, defs),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), evalString(args.get(4)));
            case "adiabaticflametempeq", "flametemp_eq" -> com.frees.backend.props.Equilibrium.adiabaticFlameTemp(
                    evalString(args.get(0)), arg(c, args, 1, values, defs),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs));
            // Wiebe heat-release (engine combustion); angles are unit-agnostic.
            case "wiebe" -> com.frees.backend.props.Engine.wiebe(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), arg(c, args, 4, values, defs));
            case "wiebe_rate" -> com.frees.backend.props.Engine.wiebeRate(
                    arg(c, args, 0, values, defs), arg(c, args, 1, values, defs),
                    arg(c, args, 2, values, defs), arg(c, args, 3, values, defs), arg(c, args, 4, values, defs));

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

            // Dynamic array indexing: ArrayElmt(data[1:N], k) -> data[round(k)].
            // The range expands to N element args; the last arg is the index.
            case "arrayelmt" -> {
                int n = args.size() - 1;
                if (n < 1) {
                    throw new IllegalStateException("ArrayElmt expects an array range and an index, e.g. ArrayElmt(data[1:10], k).");
                }
                int i = (int) Math.round(eval(args.get(n), values, defs));
                if (i < 1 || i > n) {
                    throw new IllegalStateException("ArrayElmt: index " + i + " is out of range 1.." + n + ".");
                }
                yield eval(args.get(i - 1), values, defs);
            }

            // Numeric string functions (operate on string-literal arguments).
            case "stringlen" -> evalString(args.get(0)).length();
            case "stringval" -> Double.parseDouble(evalString(args.get(0)).trim());
            case "stringpos" -> {
                int idx = evalString(args.get(0)).indexOf(evalString(args.get(1)));
                yield idx < 0 ? 0 : idx + 1; // 1-based; 0 when not found
            }

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

    /** Reads {@code rows*cols} row-major entries starting at {@code offset} into a dense matrix. */
    private static double[][] readMatrix(List<Expr> args, int offset, int rows, int cols,
                                         Map<String, Double> values, Map<String, ProcDef> defs) {
        double[][] m = new double[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                m[i][j] = eval(args.get(offset + i * cols + j), values, defs);
            }
        }
        return m;
    }

    /** Reads {@code len} entries starting at {@code offset} into a vector. */
    private static double[] readVector(List<Expr> args, int offset, int len,
                                       Map<String, Double> values, Map<String, ProcDef> defs) {
        double[] v = new double[len];
        for (int i = 0; i < len; i++) {
            v[i] = eval(args.get(offset + i), values, defs);
        }
        return v;
    }

    // Synthetic qr$q$<i>$<j>$<m>$<n> / qr$r$<i>$<j>$<m>$<n>: reconstruct the m×n
    // matrix from row-major entries and return the requested Q or R element.
    private static double evalQr(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean wantQ = parts[1].equals("q");
        int i = Integer.parseInt(parts[2]);
        int j = Integer.parseInt(parts[3]);
        int m = Integer.parseInt(parts[4]);
        int n = Integer.parseInt(parts[5]);
        double[][] a = readMatrix(c.args(), 0, m, n, values, defs);
        double[][] factor = wantQ
                ? com.frees.backend.core.LinearAlgebra.qrQ(a)
                : com.frees.backend.core.LinearAlgebra.qrR(a);
        return factor[i][j];
    }

    // Synthetic chol$l$<i>$<j>$<n>: lower-triangular Cholesky factor element.
    private static double evalCholesky(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int i = Integer.parseInt(parts[2]);
        int j = Integer.parseInt(parts[3]);
        int n = Integer.parseInt(parts[4]);
        double[][] a = readMatrix(c.args(), 0, n, n, values, defs);
        return com.frees.backend.core.LinearAlgebra.choleskyL(a)[i][j];
    }

    // Synthetic expm$<i>$<j>$<n>: matrix-exponential element.
    private static double evalMatExp(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int i = Integer.parseInt(parts[1]);
        int j = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        double[][] a = readMatrix(c.args(), 0, n, n, values, defs);
        return com.frees.backend.core.LinearAlgebra.expm(a)[i][j];
    }

    // Synthetic svd$s$<k>$<m>$<n> or svd$u$<i>$<j>$<m>$<n> etc.
    private static double evalSvd(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String mat = parts[1];
        if (mat.equals("s")) {
            int k = Integer.parseInt(parts[2]);
            int m = Integer.parseInt(parts[3]);
            int n = Integer.parseInt(parts[4]);
            double[][] a = readMatrix(c.args(), 0, m, n, values, defs);
            return com.frees.backend.core.LinearAlgebra.singularValues(a)[k];
        } else {
            int i = Integer.parseInt(parts[2]);
            int j = Integer.parseInt(parts[3]);
            int m = Integer.parseInt(parts[4]);
            int n = Integer.parseInt(parts[5]);
            double[][] a = readMatrix(c.args(), 0, m, n, values, defs);
            if (mat.equals("u")) {
                return com.frees.backend.core.LinearAlgebra.svdU(a)[i][j];
            } else if (mat.equals("smat")) {
                return com.frees.backend.core.LinearAlgebra.svdS(a)[i][j];
            } else {
                return com.frees.backend.core.LinearAlgebra.svdV(a)[i][j];
            }
        }
    }

    // Synthetic fft$re|im$<k>$<n> / ifft$...: DFT (or inverse) of the complex
    // sequence carried as the first n args (real) followed by n args (imag).
    private static double evalFft(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        boolean inverse = parts[0].equals("ifft");
        boolean wantRe = parts[1].equals("re");
        int k = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        double[] re = readVector(c.args(), 0, n, values, defs);
        double[] im = readVector(c.args(), n, n, values, defs);
        double[][] out = com.frees.backend.core.SignalProcessing.dft(re, im, inverse);
        return wantRe ? out[0][k] : out[1][k];
    }

    // Synthetic conv$<k>$<m>$<n>: k-th element of the linear convolution.
    private static double evalConvolve(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int k = Integer.parseInt(parts[1]);
        int m = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        double[] a = readVector(c.args(), 0, m, values, defs);
        double[] b = readVector(c.args(), m, n, values, defs);
        return com.frees.backend.core.SignalProcessing.convolve(a, b)[k];
    }

    // Synthetic linfit$slope|intercept|r2$<n>: OLS line fit over (x, y).
    private static double evalLinFit(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        String which = parts[1];
        int n = Integer.parseInt(parts[2]);
        double[] x = readVector(c.args(), 0, n, values, defs);
        double[] y = readVector(c.args(), n, n, values, defs);
        double[] fit = com.frees.backend.core.Statistics.linFit(x, y);
        return switch (which) {
            case "slope" -> fit[0];
            case "intercept" -> fit[1];
            case "r2" -> fit[2];
            default -> throw new IllegalStateException("Unknown LinFit output: " + which);
        };
    }

    // Synthetic polyfit$<k>$<deg>$<n>: k-th (ascending-power) least-squares coefficient.
    private static double evalPolyFit(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int k = Integer.parseInt(parts[1]);
        int degree = Integer.parseInt(parts[2]);
        int n = Integer.parseInt(parts[3]);
        double[] x = readVector(c.args(), 0, n, values, defs);
        double[] y = readVector(c.args(), n, n, values, defs);
        return com.frees.backend.core.Statistics.polyFit(x, y, degree)[k];
    }

    // Synthetic interp2$<m>$<n>: regular-grid 2-D interpolation at (xq, yq).
    // Args: x (m), y (n), Z (m×n row-major), xq, yq.
    private static double evalInterp2(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        String[] parts = c.function().split("\\$");
        int m = Integer.parseInt(parts[1]);
        int n = Integer.parseInt(parts[2]);
        List<Expr> args = c.args();
        double[] x = readVector(args, 0, m, values, defs);
        double[] y = readVector(args, m, n, values, defs);
        double[][] z = readMatrix(args, m + n, m, n, values, defs);
        double xq = eval(args.get(m + n + m * n), values, defs);
        double yq = eval(args.get(m + n + m * n + 1), values, defs);
        return com.frees.backend.core.Interpolation2D.interpolate(x, y, z, xq, yq);
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
            return ssm.b()[row][0];
        } else if (matrix.equals("c")) {
            int col = Integer.parseInt(parts[2]);
            return ssm.c()[0][col];
        } else {
            return ssm.d()[0][0];
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

    /** Reads a non-negative polynomial order from argument 0. */
    private static int orderArg(Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        int n = (int) Math.round(arg(c, args, 0, values, defs));
        if (n < 0) {
            throw new IllegalStateException(c.function() + ": polynomial order must be >= 0, got " + n + ".");
        }
        return n;
    }

    /** Legendre polynomial Pₙ(x): P₀=1, P₁=x, (n+1)Pₙ₊₁=(2n+1)x·Pₙ − n·Pₙ₋₁. */
    private static double legendreP(int n, double x) {
        if (n == 0) {
            return 1.0;
        }
        double pPrev = 1.0;
        double pCurr = x;
        for (int k = 1; k < n; k++) {
            double pNext = ((2 * k + 1) * x * pCurr - k * pPrev) / (k + 1);
            pPrev = pCurr;
            pCurr = pNext;
        }
        return pCurr;
    }

    /** Chebyshev polynomial of the first kind Tₙ(x): T₀=1, T₁=x, Tₙ₊₁=2x·Tₙ − Tₙ₋₁. */
    private static double chebyshevT(int n, double x) {
        if (n == 0) {
            return 1.0;
        }
        double tPrev = 1.0;
        double tCurr = x;
        for (int k = 1; k < n; k++) {
            double tNext = 2 * x * tCurr - tPrev;
            tPrev = tCurr;
            tCurr = tNext;
        }
        return tCurr;
    }

    /** Chebyshev polynomial of the second kind Uₙ(x): U₀=1, U₁=2x, Uₙ₊₁=2x·Uₙ − Uₙ₋₁. */
    private static double chebyshevU(int n, double x) {
        if (n == 0) {
            return 1.0;
        }
        double uPrev = 1.0;
        double uCurr = 2 * x;
        for (int k = 1; k < n; k++) {
            double uNext = 2 * x * uCurr - uPrev;
            uPrev = uCurr;
            uCurr = uNext;
        }
        return uCurr;
    }

    /** Physicists' Hermite polynomial Hₙ(x): H₀=1, H₁=2x, Hₙ₊₁=2x·Hₙ − 2n·Hₙ₋₁. */
    private static double hermiteH(int n, double x) {
        if (n == 0) {
            return 1.0;
        }
        double hPrev = 1.0;
        double hCurr = 2 * x;
        for (int k = 1; k < n; k++) {
            double hNext = 2 * x * hCurr - 2 * k * hPrev;
            hPrev = hCurr;
            hCurr = hNext;
        }
        return hCurr;
    }

    /** Laguerre polynomial Lₙ(x): L₀=1, L₁=1−x, (n+1)Lₙ₊₁=(2n+1−x)Lₙ − n·Lₙ₋₁. */
    private static double laguerreL(int n, double x) {
        if (n == 0) {
            return 1.0;
        }
        double lPrev = 1.0;
        double lCurr = 1.0 - x;
        for (int k = 1; k < n; k++) {
            double lNext = ((2 * k + 1 - x) * lCurr - k * lPrev) / (k + 1);
            lPrev = lCurr;
            lCurr = lNext;
        }
        return lCurr;
    }

    /** Evaluates every argument into a flat array (used by the descriptive-statistics builtins). */
    private static double[] statValues(List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        return args.stream().mapToDouble(a -> eval(a, values, defs)).toArray();
    }

    private static double mean(double[] v) {
        if (v.length == 0) {
            throw new IllegalStateException("Mean requires at least one value.");
        }
        double s = 0.0;
        for (double x : v) {
            s += x;
        }
        return s / v.length;
    }

    private static double median(double[] v) {
        if (v.length == 0) {
            throw new IllegalStateException("Median requires at least one value.");
        }
        double[] sorted = v.clone();
        java.util.Arrays.sort(sorted);
        int n = sorted.length;
        return (n % 2 == 1) ? sorted[n / 2] : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]);
    }

    /** Unbiased (n−1) sample variance; 0 for a single value. */
    private static double sampleVariance(double[] v) {
        if (v.length == 0) {
            throw new IllegalStateException("Variance requires at least one value.");
        }
        if (v.length == 1) {
            return 0.0;
        }
        double m = mean(v);
        double ss = 0.0;
        for (double x : v) {
            double d = x - m;
            ss += d * d;
        }
        return ss / (v.length - 1);
    }

    private static double rootMeanSquare(double[] v) {
        if (v.length == 0) {
            throw new IllegalStateException("RMS requires at least one value.");
        }
        double ss = 0.0;
        for (double x : v) {
            ss += x * x;
        }
        return Math.sqrt(ss / v.length);
    }

    /** Percentile(p, x1, x2, …): linear-interpolation percentile of the data, p in [0, 100]. */
    private static double percentile(Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (args.size() < 2) {
            throw new IllegalStateException("Percentile expects Percentile(p, value1, value2, ...).");
        }
        double p = eval(args.get(0), values, defs);
        double[] data = statValues(args.subList(1, args.size()), values, defs);
        org.apache.commons.math3.stat.descriptive.rank.Percentile pct =
                new org.apache.commons.math3.stat.descriptive.rank.Percentile();
        pct.setData(data);
        return pct.evaluate(Math.max(1.0e-9, Math.min(100.0, p)));
    }

    /** Builds a normal distribution from optional (mu, sigma) trailing arguments. */
    private static org.apache.commons.math3.distribution.NormalDistribution normal(
            Expr.Call c, List<Expr> args, Map<String, Double> values, Map<String, ProcDef> defs) {
        double mu = args.size() > 1 ? eval(args.get(1), values, defs) : 0.0;
        double sigma = args.size() > 2 ? eval(args.get(2), values, defs) : 1.0;
        if (sigma <= 0.0) {
            throw new IllegalStateException(c.function() + ": standard deviation must be positive, got " + sigma + ".");
        }
        return new org.apache.commons.math3.distribution.NormalDistribution(mu, sigma);
    }

    /**
     * Adaptive Gauss–Legendre quadrature of {@code GaussIntegral(f, t, a, b[, points])}.
     * Complements the adaptive-Simpson {@code Integral}: Gauss–Legendre converges
     * faster on smooth integrands. {@code points} (per panel) defaults to 5.
     */
    private static double gaussLegendreQuadrature(Expr.Call c, Map<String, Double> values, Map<String, ProcDef> defs) {
        List<Expr> args = c.args();
        if (args.size() < 4 || !(args.get(1) instanceof Expr.Var(String varName))) {
            throw new IllegalStateException("GaussIntegral expects GaussIntegral(f, t, lower, upper[, points]).");
        }
        double lower = eval(args.get(2), values, defs);
        double upper = eval(args.get(3), values, defs);
        if (lower == upper) {
            return 0.0;
        }
        int points = args.size() > 4 ? (int) Math.round(eval(args.get(4), values, defs)) : 5;
        points = Math.max(2, Math.min(64, points));
        Expr f = args.get(0);
        boolean had = values.containsKey(varName);
        Double saved = had ? values.get(varName) : null;
        try {
            org.apache.commons.math3.analysis.UnivariateFunction fn = t -> {
                values.put(varName, t);
                return eval(f, values, defs);
            };
            org.apache.commons.math3.analysis.integration.IterativeLegendreGaussIntegrator integrator =
                    new org.apache.commons.math3.analysis.integration.IterativeLegendreGaussIntegrator(
                            points, 1.0e-10, 1.0e-10, 2, 64);
            return integrator.integrate(Integer.MAX_VALUE, fn, lower, upper);
        } finally {
            if (had) {
                values.put(varName, saved);
            } else {
                values.remove(varName);
            }
        }
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
