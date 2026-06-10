package com.frees.backend.ast;

import java.util.List;
import java.util.Map;

/** Evaluates an expression AST against current variable values. */
public final class Evaluator {

    private Evaluator() {}

    public static double eval(Expr e, Map<String, Double> values) {
        return switch (e) {
            case Expr.Num n -> n.value();
            case Expr.Var v -> {
                Double value = values.get(v.name());
                if (value == null) {
                    throw new IllegalStateException("Variable has no value: " + v.name());
                }
                yield value;
            }
            case Expr.Neg neg -> -eval(neg.operand(), values);
            case Expr.BinOp b -> {
                double l = eval(b.left(), values);
                double r = eval(b.right(), values);
                yield switch (b.op()) {
                    case '+' -> l + r;
                    case '-' -> l - r;
                    case '*' -> l * r;
                    case '/' -> l / r;
                    case '^' -> Math.pow(l, r);
                    default -> throw new IllegalStateException("Unknown operator: " + b.op());
                };
            }
            case Expr.Call c -> evalCall(c, values);
        };
    }

    private static double evalCall(Expr.Call c, Map<String, Double> values) {
        List<Expr> args = c.args();
        return switch (c.function()) {
            case "abs" -> Math.abs(arg(c, args, 0, values));
            case "exp" -> Math.exp(arg(c, args, 0, values));
            case "ln" -> Math.log(arg(c, args, 0, values));
            case "log10" -> Math.log10(arg(c, args, 0, values));
            case "sqrt" -> Math.sqrt(arg(c, args, 0, values));
            case "sin" -> Math.sin(arg(c, args, 0, values));
            case "cos" -> Math.cos(arg(c, args, 0, values));
            case "tan" -> Math.tan(arg(c, args, 0, values));
            case "arcsin" -> Math.asin(arg(c, args, 0, values));
            case "arccos" -> Math.acos(arg(c, args, 0, values));
            case "arctan" -> Math.atan(arg(c, args, 0, values));
            case "min" -> Math.min(arg(c, args, 0, values), arg(c, args, 1, values));
            case "max" -> Math.max(arg(c, args, 0, values), arg(c, args, 1, values));
            default -> throw new IllegalStateException("Unknown function: " + c.function());
        };
    }

    private static double arg(Expr.Call c, List<Expr> args, int i, Map<String, Double> values) {
        if (i >= args.size()) {
            throw new IllegalStateException(
                    "Function " + c.function() + " expects at least " + (i + 1) + " argument(s)");
        }
        return eval(args.get(i), values);
    }
}
