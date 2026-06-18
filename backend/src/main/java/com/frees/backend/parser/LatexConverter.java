package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;

import java.util.List;
import java.util.Map;

/**
 * Converts AST Equations and Expressions to LaTeX format for mathematical rendering.
 */
public final class LatexConverter {

    private static final String RIGHT_PAREN = "\\right)";
    private static final String TEXT_OPEN = "\\text{";
    private static final String CLOSE_LEFT_PAREN = "}\\left(";

    private LatexConverter() {}

    public static String toLatex(Equation eq, Map<String, String> displayNames) {
        return toLatex(eq.lhs(), displayNames) + " = " + toLatex(eq.rhs(), displayNames);
    }

    public static String toLatex(Expr e, Map<String, String> displayNames) {
        return switch (e) {
            case Expr.Num(double value, String unit, boolean isImaginary) -> {
                String val = formatValue(value);
                if (isImaginary) {
                    if (value == 1.0) {
                        val = "i";
                    } else if (value == -1.0) {
                        val = "-i";
                    } else {
                        val = val + "i";
                    }
                }
                if (unit != null && !unit.isBlank()) {
                    yield val + "\\,\\left[" + unit + "\\right]";
                }
                yield val;
            }
            case Expr.Str(String value) -> "\\text{'" + value + "'}";
            case Expr.Var(String name) -> {
                String disp = displayNames.getOrDefault(name, name);
                yield formatVariable(disp);
            }
            case Expr.Neg(Expr operand) -> {
                String opStr = toLatex(operand, displayNames);
                if (operand instanceof Expr.BinOp(char op, Expr left, Expr right) && (op == '+' || op == '-')) {
                    yield "-\\left(" + opStr + RIGHT_PAREN;
                }
                yield "-" + opStr;
            }
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                String leftStr = toLatex(left, displayNames);
                String rightStr = toLatex(right, displayNames);
                yield switch (op) {
                    case '+' -> leftStr + " + " + rightStr;
                    case '-' -> leftStr + " - " + rightStr;
                    case '*' -> {
                        if (left instanceof Expr.Num) {
                            yield leftStr + "\\," + rightStr;
                        }
                        yield leftStr + "\\cdot " + rightStr;
                    }
                    case '/' -> "\\frac{" + leftStr + "}{" + rightStr + "}";
                    case '^' -> {
                        String base = leftStr;
                        if (left instanceof Expr.BinOp || left instanceof Expr.Neg) {
                            base = "\\left(" + leftStr + RIGHT_PAREN;
                        }
                        yield base + "^{" + rightStr + "}";
                    }
                    default -> throw new IllegalStateException("Unknown operator: " + op);
                };
            }
            case Expr.Call(String function, List<Expr> args) -> {
                List<String> argLates = args.stream().map(a -> toLatex(a, displayNames)).toList();
                String argsStr = String.join(", ", argLates);
                if (function.startsWith("prop$")) {
                    yield propertyCallLatex(function, argLates);
                }
                yield switch (function) {
                    case "sqrt" -> "\\sqrt{" + argLates.get(0) + "}";
                    case "sin" -> "\\sin\\left(" + argsStr + RIGHT_PAREN;
                    case "cos" -> "\\cos\\left(" + argsStr + RIGHT_PAREN;
                    case "tan" -> "\\tan\\left(" + argsStr + RIGHT_PAREN;
                    case "asin", "arcsin" -> "\\arcsin\\left(" + argsStr + RIGHT_PAREN;
                    case "acos", "arccos" -> "\\arccos\\left(" + argsStr + RIGHT_PAREN;
                    case "atan", "arctan" -> "\\arctan\\left(" + argsStr + RIGHT_PAREN;
                    case "sinh" -> "\\sinh\\left(" + argsStr + RIGHT_PAREN;
                    case "cosh" -> "\\cosh\\left(" + argsStr + RIGHT_PAREN;
                    case "tanh" -> "\\tanh\\left(" + argsStr + RIGHT_PAREN;
                    case "arcsinh" -> "\\text{arcsinh}\\left(" + argsStr + RIGHT_PAREN;
                    case "arccosh" -> "\\text{arccosh}\\left(" + argsStr + RIGHT_PAREN;
                    case "arctanh" -> "\\text{arctanh}\\left(" + argsStr + RIGHT_PAREN;
                    case "ln" -> "\\ln\\left(" + argsStr + RIGHT_PAREN;
                    case "log10" -> "\\log_{10}\\left(" + argsStr + RIGHT_PAREN;
                    case "exp" -> "e^{" + argLates.get(0) + "}";
                    case "abs" -> "\\left|" + argLates.get(0) + "\\right|";
                    case "convert" -> "\\text{Convert}\\left(" + argsStr + RIGHT_PAREN;
                    case "besselj", "bessel_j" -> "J_{" + argLates.get(1) + CLOSE_LEFT_PAREN + argLates.get(0) + RIGHT_PAREN;
                    case "besseli", "bessel_i" -> "I_{" + argLates.get(1) + CLOSE_LEFT_PAREN + argLates.get(0) + RIGHT_PAREN;
                    case "bessely", "bessel_y" -> "Y_{" + argLates.get(1) + CLOSE_LEFT_PAREN + argLates.get(0) + RIGHT_PAREN;
                    case "besselk", "bessel_k" -> "K_{" + argLates.get(1) + CLOSE_LEFT_PAREN + argLates.get(0) + RIGHT_PAREN;
                    case "besselj0", "bessel_j0" -> "J_0\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "besselj1", "bessel_j1" -> "J_1\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "besseli0", "bessel_i0" -> "I_0\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "besseli1", "bessel_i1" -> "I_1\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "bessely0", "bessel_y0" -> "Y_0\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "bessely1", "bessel_y1" -> "Y_1\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "besselk0", "bessel_k0" -> "K_0\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "besselk1", "bessel_k1" -> "K_1\\left(" + argLates.get(0) + RIGHT_PAREN;
                    case "chi_square" -> "\\chi^2\\left(" + argsStr + RIGHT_PAREN;
                    default -> TEXT_OPEN + function + CLOSE_LEFT_PAREN + argsStr + RIGHT_PAREN;
                };
            }
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                String dispName = displayNames.getOrDefault(name, name);
                String base = formatVariable(dispName);
                List<String> idxLates = indices.stream().map(a -> toLatex(a, displayNames)).toList();
                yield base + "_{" + String.join(", ", idxLates) + "}";
            }
            case Expr.Range(Expr start, Expr end) -> toLatex(start, displayNames) + "\\dots" + toLatex(end, displayNames);
            case Expr.ArrayLiteral(List<Expr> elements) -> {
                List<String> elems = elements.stream().map(a -> toLatex(a, displayNames)).toList();
                yield "\\left[" + String.join(", ", elems) + "\\right]";
            }
            case Expr.Compare(String op, Expr left, Expr right) -> toLatex(left, displayNames) + " " + op + " " + toLatex(right, displayNames);
            case Expr.Logical(String op, Expr left, Expr right) -> toLatex(left, displayNames) + " \\text{ " + op + " } " + toLatex(right, displayNames);
            case Expr.Not(Expr operand) -> "\\neg " + toLatex(operand, displayNames);
        };
    }

    /** Enthalpy(R134a, T=T_1, x=1) from prop$enthalpy$r134a$t$x + rendered args. */
    private static String propertyCallLatex(String func, List<String> argLates) {
        String[] parts = func.split("\\$");
        String output = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1);
        // Chemistry calls (prop$molarmass, prop$heatingvalue, prop$stoichafr)
        // carry their fluid/formula/mode as string arguments rather than in the
        // encoded name, so render them straight from the args.
        if (parts.length < 3) {
            return TEXT_OPEN + output + CLOSE_LEFT_PAREN + String.join(", ", argLates) + RIGHT_PAREN;
        }
        StringBuilder sb = new StringBuilder(TEXT_OPEN).append(output)
                .append("}\\left(\\mathrm{").append(parts[2]).append("}");
        for (int i = 0; i + 3 < parts.length && i < argLates.size(); i++) {
            sb.append(", ").append(parts[i + 3]).append("=").append(argLates.get(i));
        }
        return sb.append(RIGHT_PAREN).toString();
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
