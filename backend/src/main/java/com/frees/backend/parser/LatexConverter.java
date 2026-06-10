package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;

import java.util.List;
import java.util.Map;

/**
 * Converts AST Equations and Expressions to LaTeX format for mathematical rendering.
 */
public final class LatexConverter {

    private LatexConverter() {}

    public static String toLatex(Equation eq, Map<String, String> displayNames) {
        return toLatex(eq.lhs(), displayNames) + " = " + toLatex(eq.rhs(), displayNames);
    }

    public static String toLatex(Expr e, Map<String, String> displayNames) {
        return switch (e) {
            case Expr.Num n -> {
                String val = formatValue(n.value());
                if (n.unit() != null && !n.unit().isBlank()) {
                    yield val + "\\,\\left[" + n.unit() + "\\right]";
                }
                yield val;
            }
            case Expr.Var v -> {
                String disp = displayNames.getOrDefault(v.name(), v.name());
                yield formatVariable(disp);
            }
            case Expr.Neg neg -> {
                String opStr = toLatex(neg.operand(), displayNames);
                if (neg.operand() instanceof Expr.BinOp b && (b.op() == '+' || b.op() == '-')) {
                    yield "-\\left(" + opStr + "\\right)";
                }
                yield "-" + opStr;
            }
            case Expr.BinOp b -> {
                String leftStr = toLatex(b.left(), displayNames);
                String rightStr = toLatex(b.right(), displayNames);
                yield switch (b.op()) {
                    case '+' -> leftStr + " + " + rightStr;
                    case '-' -> leftStr + " - " + rightStr;
                    case '*' -> {
                        if (b.left() instanceof Expr.Num) {
                            yield leftStr + "\\," + rightStr;
                        }
                        yield leftStr + "\\cdot " + rightStr;
                    }
                    case '/' -> "\\frac{" + leftStr + "}{" + rightStr + "}";
                    case '^' -> {
                        String base = leftStr;
                        if (b.left() instanceof Expr.BinOp || b.left() instanceof Expr.Neg) {
                            base = "\\left(" + leftStr + "\\right)";
                        }
                        yield base + "^{" + rightStr + "}";
                    }
                    default -> throw new IllegalStateException("Unknown operator: " + b.op());
                };
            }
            case Expr.Call c -> {
                String func = c.function();
                List<String> argLates = c.args().stream().map(a -> toLatex(a, displayNames)).toList();
                String argsStr = String.join(", ", argLates);
                yield switch (func) {
                    case "sqrt" -> "\\sqrt{" + argLates.get(0) + "}";
                    case "sin" -> "\\sin\\left(" + argsStr + "\\right)";
                    case "cos" -> "\\cos\\left(" + argsStr + "\\right)";
                    case "tan" -> "\\tan\\left(" + argsStr + "\\right)";
                    case "asin", "arcsin" -> "\\arcsin\\left(" + argsStr + "\\right)";
                    case "acos", "arccos" -> "\\arccos\\left(" + argsStr + "\\right)";
                    case "atan", "arctan" -> "\\arctan\\left(" + argsStr + "\\right)";
                    case "ln" -> "\\ln\\left(" + argsStr + "\\right)";
                    case "log10" -> "\\log_{10}\\left(" + argsStr + "\\right)";
                    case "exp" -> "e^{" + argLates.get(0) + "}";
                    case "abs" -> "\\left|" + argLates.get(0) + "\\right|";
                    case "convert" -> "\\text{Convert}\\left(" + argsStr + "\\right)";
                    default -> "\\text{" + func + "}\\left(" + argsStr + "\\right)";
                };
            }
            case Expr.ArrayAccess aa -> {
                String dispName = displayNames.getOrDefault(aa.name(), aa.name());
                String base = formatVariable(dispName);
                List<String> idxLates = aa.indices().stream().map(a -> toLatex(a, displayNames)).toList();
                yield base + "_{" + String.join(", ", idxLates) + "}";
            }
            case Expr.Range r -> toLatex(r.start(), displayNames) + "\\dots" + toLatex(r.end(), displayNames);
            case Expr.ArrayLiteral al -> {
                List<String> elems = al.elements().stream().map(a -> toLatex(a, displayNames)).toList();
                yield "\\left[" + String.join(", ", elems) + "\\right]";
            }
        };
    }

    private static String formatVariable(String displaySpelling) {
        String name = displaySpelling;
        boolean hasDot = false;
        boolean hasHat = false;

        if (name.toLowerCase().endsWith("_dot")) {
            hasDot = true;
            name = name.substring(0, name.length() - 4);
        } else if (name.toLowerCase().endsWith("_hat")) {
            hasHat = true;
            name = name.substring(0, name.length() - 4);
        }

        int firstUnderscore = name.indexOf('_');
        String base;
        String sub = null;
        if (firstUnderscore > 0) {
            base = name.substring(0, firstUnderscore);
            sub = name.substring(firstUnderscore + 1);
        } else {
            base = name;
        }

        String latex = base;
        if (sub != null) {
            latex += "_{" + sub + "}";
        }

        if (hasDot) {
            latex = "\\dot{" + latex + "}";
        } else if (hasHat) {
            latex = "\\hat{" + latex + "}";
        }

        return latex;
    }

    private static String formatValue(double val) {
        if (val == (long) val) {
            return String.format("%d", (long) val);
        }
        return String.valueOf(val);
    }
}
