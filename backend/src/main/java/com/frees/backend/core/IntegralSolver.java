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
 * Equation-based Integral support (calculus): F = Integral(f, t, a, b[, step]).
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
                                   Expr lowerExpr,
                                   Expr upperExpr,
                                   Double lowerConst,
                                   Double upperConst,
                                   double fixedStep) {

        /** Constant limits use the stepping driver; variable limits (an
         * unknown like T_flame) are inlined into the equation system. */
        public boolean constantLimits() {
            return lowerConst != null && upperConst != null;
        }

        public double lower() {
            return lowerConst;
        }

        public double upper() {
            return upperConst;
        }
    }

    /**
     * Integral may appear inside arbitrary expressions
     * (y = y0 + Integral(f, t, a, b)). The solver drives integrals only in
     * the alone form F = Integral(...), so every nested call is hoisted into
     * a synthetic result variable with its own defining equation; the
     * rewritten system is otherwise unchanged.
     */
    public static List<Equation> hoistNested(List<Equation> equations) {
        boolean mentions = equations.stream().anyMatch(eq ->
                mentionsIntegral(eq.lhs()) || mentionsIntegral(eq.rhs()));
        if (!mentions) {
            return equations;
        }
        java.util.Set<String> taken = new java.util.HashSet<>();
        for (Equation eq : equations) {
            taken.addAll(eq.variables());
        }
        List<Equation> rewritten = new ArrayList<>();
        List<Equation> hoisted = new ArrayList<>();
        for (Equation eq : equations) {
            if (aloneForm(eq)) {
                rewritten.add(eq);
                continue;
            }
            Expr lhs = hoistCalls(eq.lhs(), eq.sourceText(), taken, hoisted);
            Expr rhs = hoistCalls(eq.rhs(), eq.sourceText(), taken, hoisted);
            rewritten.add(new Equation(lhs, rhs, eq.sourceText()));
        }
        rewritten.addAll(hoisted);
        return rewritten;
    }

    private static boolean aloneForm(Equation eq) {
        return (eq.lhs() instanceof Expr.Var && isIntegralCall(eq.rhs()))
                || (eq.rhs() instanceof Expr.Var && isIntegralCall(eq.lhs()));
    }

    /** Integral calls inside other node types (array indices, ranges) are
     * left in place; extract() rejects them with its usual guidance. */
    private static Expr hoistCalls(Expr e, String sourceText,
                                   java.util.Set<String> taken, List<Equation> hoisted) {
        return switch (e) {
            case Expr.Neg(Expr operand) ->
                    new Expr.Neg(hoistCalls(operand, sourceText, taken, hoisted));
            case Expr.BinOp(char op, Expr left, Expr right) -> new Expr.BinOp(op,
                    hoistCalls(left, sourceText, taken, hoisted),
                    hoistCalls(right, sourceText, taken, hoisted));
            case Expr.Call(String function, List<Expr> args) -> {
                if (function.equals(FUNCTION_NAME)) {
                    String name = freshName(taken);
                    hoisted.add(new Equation(new Expr.Var(name), e, sourceText));
                    yield new Expr.Var(name);
                }
                yield new Expr.Call(function, args.stream()
                        .map(a -> hoistCalls(a, sourceText, taken, hoisted)).toList());
            }
            default -> e;
        };
    }

    private static String freshName(java.util.Set<String> taken) {
        int n = 1;
        String name = "integral_" + n;
        while (!taken.add(name)) {
            name = "integral_" + (++n);
        }
        return name;
    }

    /**
     * Finds every Integral equation. Throws when Integral is used anywhere
     * except alone on one side of an equation.
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
        if (eq.lhs() instanceof Expr.Var(String name) && isIntegralCall(eq.rhs())
                && !mentionsIntegral(eq.lhs())) {
            return toIntegralEquation(eq, name, (Expr.Call) eq.rhs(), defs);
        }
        if (eq.rhs() instanceof Expr.Var(String name) && isIntegralCall(eq.lhs())
                && !mentionsIntegral(eq.rhs())) {
            return toIntegralEquation(eq, name, (Expr.Call) eq.lhs(), defs);
        }
        return null;
    }

    private static boolean isIntegralCall(Expr e) {
        return e instanceof Expr.Call(String function, List<Expr> args) && function.equals(FUNCTION_NAME);
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
        if (!(args.get(1) instanceof Expr.Var(String tName))) {
            throw new SolverException(
                    "The second argument of Integral must be the integration variable: "
                            + eq.sourceText());
        }
        Double lower = tryConstant(args.get(2), defs);
        Double upper = tryConstant(args.get(3), defs);
        double step = args.size() == 5
                ? constantArg(args.get(4), "step size", eq, defs)
                : 0.0;
        return new IntegralEquation(eq, resultVar, args.get(0), tName,
                args.get(2), args.get(3), lower, upper, step);
    }

    private static Double tryConstant(Expr e, Map<String, ProcDef> defs) {
        try {
            return Evaluator.eval(e, Map.of(), defs);
        } catch (IllegalStateException ex) {
            return null; // contains unknowns; resolved by the equation system
        }
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
            case Expr.Num(double value, String unit, boolean isImaginary) -> false;
            case Expr.Str s -> false;
            case Expr.Var(String name) -> false;
            case Expr.Neg(Expr operand) -> mentionsIntegral(operand);
            case Expr.BinOp(char op, Expr left, Expr right) -> mentionsIntegral(left) || mentionsIntegral(right);
            case Expr.Call(String function, List<Expr> args) -> function.equals(FUNCTION_NAME)
                    || args.stream().anyMatch(IntegralSolver::mentionsIntegral);
            case Expr.ArrayAccess(String name, List<Expr> indices) ->
                    indices.stream().anyMatch(IntegralSolver::mentionsIntegral);
            case Expr.Range(Expr start, Expr end) -> mentionsIntegral(start) || mentionsIntegral(end);
            case Expr.ArrayLiteral(List<Expr> elements) ->
                    elements.stream().anyMatch(IntegralSolver::mentionsIntegral);
            case Expr.Compare(String op, Expr left, Expr right) -> mentionsIntegral(left) || mentionsIntegral(right);
            case Expr.Logical(String op, Expr left, Expr right) -> mentionsIntegral(left) || mentionsIntegral(right);
            case Expr.Not(Expr operand) -> mentionsIntegral(operand);
        };
    }

    /**
     * Equations equivalent to the originals for structure checking only:
     * each constant-limit Integral pins its result variable (it is driven
     * internally) while variable-limit Integrals contribute their actual
     * inlined equation; each integration variable gets a synthetic defining
     * equation.
     */
    public static List<Equation> structuralView(List<Equation> equations,
                                                List<IntegralEquation> integrals) {
        List<Equation> ordinary = ordinaryEquations(equations, integrals);
        List<Equation> view = new ArrayList<>(ordinary);
        TreeSet<String> pinnedIntegrationVars = new TreeSet<>();
        for (IntegralEquation ie : integrals) {
            if (ie.constantLimits()) {
                view.add(new Equation(new Expr.Var(ie.resultVar()), new Expr.Num(0.0),
                        ie.original().sourceText()));
            } else {
                view.add(inlinedEquation(ie, ordinary));
            }
            if (pinnedIntegrationVars.add(ie.integrationVar())) {
                view.add(new Equation(new Expr.Var(ie.integrationVar()),
                        ie.constantLimits() ? new Expr.Num(0.0) : ie.upperExpr(),
                        ie.integrationVar() + " (integration variable)"));
            }
        }
        return view;
    }

    /**
     * An Integral with a variable limit (find T_flame such that the energy
     * balance closes) cannot be driven by stepping: the limit is unknown
     * until the system is solved. Instead the integral becomes an ordinary
     * equation, result = Integral(f, t, a, b), that the Evaluator computes
     * by quadrature at every Newton residual evaluation. For that, the
     * integrand must be closed-form in the integration variable, so every
     * variable in it that (transitively) depends on t is replaced by its
     * explicit definition: Cp_co2 = A + B*T + ... gets substituted into
     * Integral(Cp_co2, T, ...).
     */
    public static Equation inlinedEquation(IntegralEquation ie, List<Equation> ordinary) {
        if (ie.integrand().variables().contains(ie.resultVar())) {
            throw new SolverException(
                    "An Integral with variable limits cannot reference its own result: "
                            + ie.original().sourceText());
        }
        Map<String, Expr> definitions = explicitDefinitions(ordinary);
        Map<String, Boolean> dependsMemo = new java.util.HashMap<>();
        Expr inlined = inline(ie.integrand(), ie, definitions, dependsMemo,
                new java.util.HashSet<>());
        Expr call = new Expr.Call(FUNCTION_NAME, List.of(
                inlined, new Expr.Var(ie.integrationVar()), ie.lowerExpr(), ie.upperExpr()));
        return new Equation(new Expr.Var(ie.resultVar()), call, ie.original().sourceText());
    }

    /** Unambiguous explicit definitions: equations of the form v = expr
     * (or expr = v) where expr does not contain v and v is defined once. */
    private static Map<String, Expr> explicitDefinitions(List<Equation> equations) {
        Map<String, Expr> definitions = new java.util.HashMap<>();
        java.util.Set<String> ambiguous = new java.util.HashSet<>();
        for (Equation eq : equations) {
            String name = null;
            Expr expr = null;
            if (eq.lhs() instanceof Expr.Var(String lhsName) && !eq.rhs().variables().contains(lhsName)) {
                name = lhsName;
                expr = eq.rhs();
            } else if (eq.rhs() instanceof Expr.Var(String rhsName) && !eq.lhs().variables().contains(rhsName)) {
                name = rhsName;
                expr = eq.lhs();
            }
            if (name != null && (definitions.putIfAbsent(name, expr) != null)) {
                ambiguous.add(name);
            }
        }
        definitions.keySet().removeAll(ambiguous);
        return definitions;
    }

    private static boolean dependsOnIntegrationVar(String varName, IntegralEquation ie,
                                                   Map<String, Expr> definitions,
                                                   Map<String, Boolean> memo,
                                                   java.util.Set<String> visiting) {
        if (varName.equals(ie.integrationVar())) {
            return true;
        }
        Boolean known = memo.get(varName);
        if (known != null) {
            return known;
        }
        if (!visiting.add(varName)) {
            return false; // circular chains resolve through their other members
        }
        Expr definition = definitions.get(varName);
        boolean depends = false;
        if (definition != null) {
            for (String inner : definition.variables()) {
                if (dependsOnIntegrationVar(inner, ie, definitions, memo, visiting)) {
                    depends = true;
                    break;
                }
            }
        }
        visiting.remove(varName);
        memo.put(varName, depends);
        return depends;
    }

    private static Expr inline(Expr e, IntegralEquation ie, Map<String, Expr> definitions,
                               Map<String, Boolean> memo, java.util.Set<String> expanding) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var(String name) -> {
                if (name.equals(ie.integrationVar())
                        || !dependsOnIntegrationVar(name, ie, definitions, memo,
                                new java.util.HashSet<>())) {
                    yield new Expr.Var(name);
                }
                Expr definition = definitions.get(name);
                if (definition == null || !expanding.add(name)) {
                    throw new SolverException("In " + ie.original().sourceText()
                            + ": '" + name + "' depends on the integration variable "
                            + ie.integrationVar() + " but has no explicit definition "
                            + "of the form " + name + " = expression.");
                }
                Expr inlined = inline(definition, ie, definitions, memo, expanding);
                expanding.remove(name);
                yield inlined;
            }
            case Expr.Neg(Expr operand) -> new Expr.Neg(inline(operand, ie, definitions, memo, expanding));
            case Expr.BinOp(char op, Expr left, Expr right) -> new Expr.BinOp(op,
                    inline(left, ie, definitions, memo, expanding),
                    inline(right, ie, definitions, memo, expanding));
            case Expr.Call(String function, List<Expr> args) -> new Expr.Call(function, args.stream()
                    .map(a -> inline(a, ie, definitions, memo, expanding)).toList());
            case Expr.Compare(String op, Expr left, Expr right) -> new Expr.Compare(op,
                    inline(left, ie, definitions, memo, expanding),
                    inline(right, ie, definitions, memo, expanding));
            case Expr.Logical(String op, Expr left, Expr right) -> new Expr.Logical(op,
                    inline(left, ie, definitions, memo, expanding),
                    inline(right, ie, definitions, memo, expanding));
            case Expr.Not(Expr operand) -> new Expr.Not(inline(operand, ie, definitions, memo, expanding));
            default -> throw new SolverException("In " + ie.original().sourceText()
                    + ": unsupported construct inside an Integral with variable limits.");
        };
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
