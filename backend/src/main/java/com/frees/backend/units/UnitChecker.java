package com.frees.backend.units;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * EES Check Units: traverses each equation's AST verifying dimensional
 * homogeneity across '=' and '+'/'-'. Inconsistencies are warnings — they
 * never block solving, exactly as in EES.
 *
 * Variables with blank units are wildcards (unknown); the explicit
 * dimensionless marker is "-".
 */
public final class UnitChecker {

    /** A dimension that may be unknown (wildcard from a variable with blank units). */
    private record Dim(Quantity quantity, boolean known) {
        static final Dim UNKNOWN = new Dim(Quantity.dimensionless(1.0), false);

        static Dim of(Quantity q) {
            return new Dim(q, true);
        }
    }

    /** Warnings plus SI units derived for computed variables (lowercase keys). */
    public record Result(List<String> warnings, Map<String, String> derivedUnits) {}

    private final Map<String, Quantity> variableDims;
    private final List<String> warnings = new ArrayList<>();
    private final boolean collectWarnings;
    private String currentEquation;

    private UnitChecker(Map<String, Quantity> variableDims, boolean collectWarnings) {
        this.variableDims = variableDims;
        this.collectWarnings = collectWarnings;
    }

    private void warn(String message) {
        if (collectWarnings) {
            warnings.add(message);
        }
    }

    /**
     * Checks all equations against the declared variable units
     * (variable name -> unit expression, blank/null = unspecified) and derives
     * SI units for variables defined by equations whose other side has known
     * dimensions (P = m*g/A gets Pa once m, g, A are known).
     */
    public static Result check(List<Equation> equations,
                               Map<String, String> variableUnits) {
        Map<String, Quantity> dims = new java.util.HashMap<>();
        List<String> warnings = new ArrayList<>();

        for (Map.Entry<String, String> entry : variableUnits.entrySet()) {
            String units = entry.getValue();
            if (units == null || units.isBlank()) {
                continue;
            }
            try {
                dims.put(entry.getKey().toLowerCase(), UnitRegistry.parse(units));
            } catch (UnitRegistry.UnknownUnitException e) {
                warnings.add("Variable " + entry.getKey() + ": " + e.getMessage());
            }
        }

        // Derivation passes (warnings suppressed): propagate dimensions to
        // variables defined as Var = expr until a fixpoint is reached.
        Map<String, String> derived = new java.util.HashMap<>();
        UnitChecker deriver = new UnitChecker(dims, false);
        for (int pass = 0; pass < 5; pass++) {
            boolean changed = false;
            for (Equation eq : equations) {
                String var = null;
                Expr defining = null;
                if (eq.lhs() instanceof Expr.Var v && !dims.containsKey(v.name())) {
                    var = v.name();
                    defining = eq.rhs();
                } else if (eq.rhs() instanceof Expr.Var v && !dims.containsKey(v.name())) {
                    var = v.name();
                    defining = eq.lhs();
                }
                if (var != null) {
                    deriver.currentEquation = eq.sourceText();
                    Dim dim = deriver.dimOf(defining);
                    if (dim.known()) {
                        dims.put(var, dim.quantity());
                        derived.put(var, UnitRegistry.siName(dim.quantity().dims()));
                        changed = true;
                    }
                }
            }
            if (!changed) {
                break;
            }
        }

        UnitChecker checker = new UnitChecker(dims, true);
        for (Equation eq : equations) {
            checker.currentEquation = eq.sourceText();
            Dim lhs = checker.dimOf(eq.lhs());
            Dim rhs = checker.dimOf(eq.rhs());
            if (lhs.known() && rhs.known()
                    && !lhs.quantity().sameDimensionsAs(rhs.quantity())) {
                checker.warnings.add(String.format(
                        "%s: the units of the left side [%s] do not match the right side [%s].",
                        eq.sourceText(),
                        lhs.quantity().dimensionString(),
                        rhs.quantity().dimensionString()));
            }
        }

        warnings.addAll(checker.warnings);
        return new Result(warnings, derived);
    }

    private Dim dimOf(Expr e) {
        return switch (e) {
            case Expr.Num n -> dimOfNum(n);
            case Expr.Var v -> {
                Quantity q = variableDims.get(v.name());
                yield q != null ? Dim.of(q) : Dim.UNKNOWN;
            }
            case Expr.Neg neg -> dimOf(neg.operand());
            case Expr.BinOp b -> dimOfBinOp(b);
            case Expr.Call c -> dimOfCall(c);
            case Expr.ArrayAccess aa -> Dim.UNKNOWN;
            case Expr.Range r -> Dim.UNKNOWN;
            case Expr.ArrayLiteral al -> Dim.UNKNOWN;
        };
    }

    private Dim dimOfNum(Expr.Num n) {
        if (n.unit() == null) {
            // A bare numeric constant adapts to its context (EES behavior).
            return Dim.UNKNOWN;
        }
        try {
            return Dim.of(UnitRegistry.parse(n.unit()));
        } catch (UnitRegistry.UnknownUnitException e) {
            warn(currentEquation + ": " + e.getMessage());
            return Dim.UNKNOWN;
        }
    }

    private Dim dimOfBinOp(Expr.BinOp b) {
        Dim left = dimOf(b.left());
        Dim right = dimOf(b.right());
        return switch (b.op()) {
            case '+', '-' -> {
                if (left.known() && right.known()
                        && !left.quantity().sameDimensionsAs(right.quantity())) {
                    warn(String.format(
                            "%s: cannot add/subtract [%s] and [%s].",
                            currentEquation,
                            left.quantity().dimensionString(),
                            right.quantity().dimensionString()));
                    yield left;
                }
                yield left.known() ? left : right;
            }
            case '*' -> left.known() && right.known()
                    ? Dim.of(left.quantity().multiply(right.quantity()))
                    : (bothDimensionless(left, right) ? left : Dim.UNKNOWN);
            case '/' -> left.known() && right.known()
                    ? Dim.of(left.quantity().divide(right.quantity()))
                    : Dim.UNKNOWN;
            case '^' -> dimOfPower(b, left);
            default -> Dim.UNKNOWN;
        };
    }

    private static boolean bothDimensionless(Dim a, Dim b) {
        return a.known() && b.known()
                && a.quantity().isDimensionless() && b.quantity().isDimensionless();
    }

    private Dim dimOfPower(Expr.BinOp b, Dim base) {
        if (!base.known()) {
            return Dim.UNKNOWN;
        }
        if (base.quantity().isDimensionless()) {
            return Dim.of(Quantity.dimensionless(1.0));
        }
        if (b.right() instanceof Expr.Num n) {
            return Dim.of(base.quantity().pow(n.value()));
        }
        warn(String.format(
                "%s: a dimensional quantity [%s] is raised to a non-constant exponent.",
                currentEquation, base.quantity().dimensionString()));
        return Dim.UNKNOWN;
    }

    private Dim dimOfCall(Expr.Call c) {
        List<Expr> args = c.args();
        return switch (c.function()) {
            case "abs" -> dimOf(args.get(0));
            case "min", "max" -> {
                Dim first = dimOf(args.get(0));
                Dim second = args.size() > 1 ? dimOf(args.get(1)) : first;
                if (first.known() && second.known()
                        && !first.quantity().sameDimensionsAs(second.quantity())) {
                    warn(String.format(
                            "%s: %s arguments have different units [%s] vs [%s].",
                            currentEquation, c.function(),
                            first.quantity().dimensionString(),
                            second.quantity().dimensionString()));
                }
                yield first.known() ? first : second;
            }
            case "sqrt" -> {
                Dim arg = dimOf(args.get(0));
                yield arg.known() ? Dim.of(arg.quantity().pow(0.5)) : Dim.UNKNOWN;
            }
            default -> {
                // sin, cos, tan, exp, ln, log10, arc*: argument must be dimensionless.
                Dim arg = dimOf(args.get(0));
                if (arg.known() && !arg.quantity().isDimensionless()) {
                    warn(String.format(
                            "%s: the argument of %s must be dimensionless but has units [%s].",
                            currentEquation, c.function(),
                            arg.quantity().dimensionString()));
                }
                yield Dim.of(Quantity.dimensionless(1.0));
            }
        };
    }
}
