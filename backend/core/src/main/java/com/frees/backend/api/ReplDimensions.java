package com.frees.backend.api;

import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.units.Quantity;
import com.frees.backend.units.UnitChecker;
import com.frees.backend.units.UnitRegistry;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Best-effort dimensional analysis of a single REPL expression: walks the AST
 * combining the SI dimensions of its parts so the REPL can label a result with
 * a unit. Returns {@code null} for anything whose dimension can't be determined
 * (e.g. property/control-system functions) — the REPL then shows no unit rather
 * than a wrong one.
 */
final class ReplDimensions {

    private ReplDimensions() {}

    /** Functions whose result is dimensionless regardless of argument units. */
    private static final Set<String> DIMENSIONLESS = Set.of(
            "sin", "cos", "tan", "arcsin", "arccos", "arctan", "atan2",
            "sinh", "cosh", "tanh", "arcsinh", "arccosh", "arctanh",
            "exp", "ln", "log10", "log2");

    /** Functions whose result carries the dimension of their (first) argument. */
    private static final Set<String> ARG_PRESERVING = Set.of(
            "abs", "min", "max", "sum", "average", "avg");

    /**
     * @param unitOf   maps a lowercased variable name to its display-unit string
     *                 (used to look up the variable's dimension), or null/blank.
     * @param values   SI values, so a power exponent can be evaluated numerically.
     */
    static Quantity dimensionOf(Expr e, Function<String, String> unitOf,
                                Map<String, Double> values, Map<String, ProcDef> defs) {
        return switch (e) {
            case Expr.Num(double v, String unit, boolean imaginary) -> unitDim(unit);
            case Expr.Var(String name) -> unitDim(unitOf.apply(name.toLowerCase()));
            case Expr.Neg(Expr operand) -> dimensionOf(operand, unitOf, values, defs);
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                Quantity dl = dimensionOf(left, unitOf, values, defs);
                Quantity dr = dimensionOf(right, unitOf, values, defs);
                yield switch (op) {
                    case '*' -> (dl == null || dr == null) ? null : dl.multiply(dr);
                    case '/' -> (dl == null || dr == null) ? null : dl.divide(dr);
                    // A sum/difference keeps the operands' shared dimension; trust
                    // the side we could resolve (the unit checker already flags
                    // genuine mismatches at solve time).
                    case '+', '-' -> dl != null ? dl : dr;
                    case '^' -> powDim(dl, right, values, defs);
                    default -> null;
                };
            }
            case Expr.Call(String fn, List<Expr> args) -> callDim(fn.toLowerCase(), args, unitOf, values, defs);
            default -> null; // ArrayAccess, Range, ArrayLiteral, Str, Compare, Logical, Not
        };
    }

    private static Quantity powDim(Quantity base, Expr exponent, Map<String, Double> values, Map<String, ProcDef> defs) {
        if (base == null) return null;
        if (base.isDimensionless()) return Quantity.dimensionless(1);
        try {
            double p = Evaluator.eval(exponent, values, defs);
            return base.pow(p);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private static Quantity callDim(String fn, List<Expr> args, Function<String, String> unitOf,
                                    Map<String, Double> values, Map<String, ProcDef> defs) {
        if (DIMENSIONLESS.contains(fn)) return Quantity.dimensionless(1);
        if ("sqrt".equals(fn) && args.size() == 1) {
            Quantity d = dimensionOf(args.get(0), unitOf, values, defs);
            return d == null ? null : d.pow(0.5);
        }
        if (ARG_PRESERVING.contains(fn) && !args.isEmpty()) {
            return dimensionOf(args.get(0), unitOf, values, defs);
        }
        // Fluid property calls (Enthalpy/Density/…) arrive as prop$<output>$<fluid>$…
        // and carry the SI unit of the requested output.
        if (fn.startsWith("prop$")) {
            String[] parts = fn.split("\\$");
            String unit = parts.length > 1 ? UnitChecker.propertyUnit(parts[1]) : null;
            return unit == null ? null : unitDim(unit);
        }
        return null;
    }

    /** Dimension (factor ignored) of a unit string; dimensionless for blank/"-". */
    private static Quantity unitDim(String unit) {
        if (unit == null || unit.isBlank() || unit.equals("-")) {
            return Quantity.dimensionless(1);
        }
        try {
            Quantity q = UnitRegistry.parse(unit);
            return new Quantity(1.0, q.dims());
        } catch (RuntimeException ex) {
            return null;
        }
    }

    // --- naming a dimension for display ------------------------------------

    /**
     * Converts an SI value carrying dimension {@code q} into a display value and
     * unit string for the given system, naming the unit exactly as the workspace
     * does ({@link UnitRegistry#siName}, e.g. "J/kg", "Pa", "kg/m^3").
     *
     * @return {@code [displayValue, unitString]} as an Object[2], or null when the
     *         quantity is dimensionless (caller shows the raw number, no unit).
     */
    static Object[] toDisplay(double si, Quantity q, UnitRegistry.UnitSystem system) {
        if (q == null || q.isDimensionless()) return null;
        UnitRegistry.DisplayUnit du = UnitRegistry.preferredDisplayUnit(q.dims(), system);
        if (du != null) {
            return new Object[]{(si - du.offset()) / du.factor(), du.name()};
        }
        return new Object[]{si, UnitRegistry.siName(q.dims())};
    }
}
