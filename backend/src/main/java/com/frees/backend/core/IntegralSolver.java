package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.function.DoubleBinaryOperator;

/**
 * Equation-based Integral support (EES Calculus): F = Integral(f, t, a, b[, step]).
 *
 * The integration variable t is driven internally from a to b; at every step
 * the rest of the system is solved with t fixed and the integrand evaluated.
 * Accumulation uses a second-order predictor-corrector (Euler predictor,
 * trapezoidal corrector) with adaptive step sizing; a positive fifth argument
 * forces that fixed step instead.
 */
public final class IntegralSolver {

    public static final String FUNCTION_NAME = "integral";

    /** Step-doubling/halving tolerance on the predictor-corrector difference. */
    private static final double REL_TOL = 1e-6;
    private static final double ABS_FLOOR = 1e-10;
    private static final int INITIAL_STEPS = 20;
    private static final int MAX_STEPS = 200_000;

    private IntegralSolver() {}

    public record IntegralEquation(Equation original,
                                   String resultVar,
                                   Expr integrand,
                                   String integrationVar,
                                   double lower,
                                   double upper,
                                   double fixedStep) {}

    /**
     * Finds every Integral equation. Throws when Integral is used anywhere
     * except alone on one side of an equation, or with non-constant limits.
     */
    public static List<IntegralEquation> extract(List<Equation> equations,
                                                 Map<String, ProcDef> defs) {
        List<IntegralEquation> integrals = new ArrayList<>();
        for (Equation eq : equations) {
            IntegralEquation ie = matchIntegralEquation(eq, defs);
            if (ie != null) {
                integrals.add(ie);
            } else if (mentionsIntegral(eq.lhs()) || mentionsIntegral(eq.rhs())) {
                throw new SolverException(
                        "Integral must appear alone on one side of an equation: "
                                + "F = Integral(f, t, a, b). Offending equation: "
                                + eq.sourceText());
            }
        }
        return integrals;
    }

    private static IntegralEquation matchIntegralEquation(Equation eq,
                                                          Map<String, ProcDef> defs) {
        if (eq.lhs() instanceof Expr.Var v && isIntegralCall(eq.rhs())
                && !mentionsIntegral(eq.lhs())) {
            return toIntegralEquation(eq, v.name(), (Expr.Call) eq.rhs(), defs);
        }
        if (eq.rhs() instanceof Expr.Var v && isIntegralCall(eq.lhs())
                && !mentionsIntegral(eq.rhs())) {
            return toIntegralEquation(eq, v.name(), (Expr.Call) eq.lhs(), defs);
        }
        return null;
    }

    private static boolean isIntegralCall(Expr e) {
        return e instanceof Expr.Call c && c.function().equals(FUNCTION_NAME);
    }

    private static IntegralEquation toIntegralEquation(Equation eq, String resultVar,
                                                       Expr.Call call,
                                                       Map<String, ProcDef> defs) {
        List<Expr> args = call.args();
        if (args.size() < 4 || args.size() > 5) {
            throw new SolverException(
                    "Integral expects Integral(f, t, lower, upper[, step]): "
                            + eq.sourceText());
        }
        if (!(args.get(1) instanceof Expr.Var tVar)) {
            throw new SolverException(
                    "The second argument of Integral must be the integration variable: "
                            + eq.sourceText());
        }
        double lower = constantArg(args.get(2), "lower limit", eq, defs);
        double upper = constantArg(args.get(3), "upper limit", eq, defs);
        double step = args.size() == 5
                ? constantArg(args.get(4), "step size", eq, defs)
                : 0.0;
        return new IntegralEquation(eq, resultVar, args.get(0), tVar.name(),
                lower, upper, step);
    }

    private static double constantArg(Expr e, String what, Equation eq,
                                      Map<String, ProcDef> defs) {
        try {
            return Evaluator.eval(e, Map.of(), defs);
        } catch (IllegalStateException ex) {
            throw new SolverException(
                    "The " + what + " of Integral must be a numeric constant: "
                            + eq.sourceText());
        }
    }

    public static boolean mentionsIntegral(Expr e) {
        return switch (e) {
            case Expr.Num n -> false;
            case Expr.Var v -> false;
            case Expr.Neg neg -> mentionsIntegral(neg.operand());
            case Expr.BinOp b -> mentionsIntegral(b.left()) || mentionsIntegral(b.right());
            case Expr.Call c -> c.function().equals(FUNCTION_NAME)
                    || c.args().stream().anyMatch(IntegralSolver::mentionsIntegral);
            case Expr.ArrayAccess aa ->
                    aa.indices().stream().anyMatch(IntegralSolver::mentionsIntegral);
            case Expr.Range r -> mentionsIntegral(r.start()) || mentionsIntegral(r.end());
            case Expr.ArrayLiteral al ->
                    al.elements().stream().anyMatch(IntegralSolver::mentionsIntegral);
            case Expr.Compare cmp -> mentionsIntegral(cmp.left()) || mentionsIntegral(cmp.right());
            case Expr.Logical log -> mentionsIntegral(log.left()) || mentionsIntegral(log.right());
            case Expr.Not not -> mentionsIntegral(not.operand());
        };
    }

    /**
     * Equations equivalent to the originals for structure checking only:
     * each Integral equation pins its result variable, and each integration
     * variable gets a synthetic defining equation (it is driven internally).
     */
    public static List<Equation> structuralView(List<Equation> equations,
                                                List<IntegralEquation> integrals) {
        List<Equation> view = new ArrayList<>(ordinaryEquations(equations, integrals));
        TreeSet<String> pinnedIntegrationVars = new TreeSet<>();
        for (IntegralEquation ie : integrals) {
            view.add(new Equation(new Expr.Var(ie.resultVar()), new Expr.Num(0.0),
                    ie.original().sourceText()));
            if (pinnedIntegrationVars.add(ie.integrationVar())) {
                view.add(new Equation(new Expr.Var(ie.integrationVar()), new Expr.Num(0.0),
                        ie.integrationVar() + " (integration variable)"));
            }
        }
        return view;
    }

    /** The system without its Integral equations. */
    public static List<Equation> ordinaryEquations(List<Equation> equations,
                                                   List<IntegralEquation> integrals) {
        List<Equation> originals = integrals.stream()
                .map(IntegralEquation::original)
                .toList();
        return equations.stream()
                .filter(eq -> !originals.contains(eq))
                .toList();
    }

    /**
     * Second-order predictor-corrector integration with adaptive step sizing
     * (Heun's method). The integrand receives (t, F) where F is the running
     * integral value, so dF/dt = f(t, F) initial-value problems work too.
     * Per step: predictor F_p = F + h*f(t, F) (Euler), corrector
     * F_c = F + h*(f(t, F) + f(t+h, F_p))/2 (trapezoid); their difference
     * estimates the local error and drives halving/doubling of h. A positive
     * fixedStep disables adaptation.
     */
    public static double integrate(DoubleBinaryOperator integrand, double lower,
                                   double upper, double fixedStep, long deadlineNanos) {
        if (lower == upper) return 0.0;
        double direction = Math.signum(upper - lower);
        double span = Math.abs(upper - lower);
        boolean adaptive = fixedStep <= 0.0;
        double h = adaptive
                ? (upper - lower) / INITIAL_STEPS
                : Math.min(fixedStep, span) * direction;
        double hMax = span / 4.0;
        double hMin = span * 1e-9;

        double t = lower;
        double total = 0.0;
        double fLeft = integrand.applyAsDouble(lower, total);
        int steps = 0;
        while (direction * (upper - t) > span * 1e-12) {
            if (++steps > MAX_STEPS) {
                throw new SolverException(
                        "Integral did not converge within " + MAX_STEPS + " steps.");
            }
            if (System.nanoTime() > deadlineNanos) {
                throw new SolverException("Integral exceeded the elapsed time limit.");
            }
            if (direction * (t + h - upper) > 0) {
                h = upper - t;
            }
            double predicted = total + h * fLeft;
            double fRight = integrand.applyAsDouble(t + h, predicted);
            double corrected = total + h * (fLeft + fRight) / 2.0;
            double error = Math.abs(corrected - predicted);
            double scale = Math.max(Math.abs(corrected), ABS_FLOOR);
            if (adaptive && error > REL_TOL * scale && Math.abs(h) > hMin) {
                h /= 2.0;
                continue;
            }
            total = corrected;
            t += h;
            fLeft = integrand.applyAsDouble(t, total);
            if (adaptive && error < REL_TOL * scale / 16.0) {
                h = direction * Math.min(Math.abs(h) * 2.0, hMax);
            }
        }
        return total;
    }
}
