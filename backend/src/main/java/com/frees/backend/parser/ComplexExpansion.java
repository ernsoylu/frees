package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Splits equations and variables into real (_r) and imaginary (_i) parts
 * when complex mode is active.
 */
public final class ComplexExpansion {

    private ComplexExpansion() {}

    public static List<Equation> expand(List<Equation> equations, Map<String, String> displayNames) {
        List<Equation> expanded = new ArrayList<>();
        for (Equation eq : equations) {
            Expr lr = realPart(eq.lhs());
            Expr rr = realPart(eq.rhs());
            Expr li = imagPart(eq.lhs());
            Expr ri = imagPart(eq.rhs());

            expanded.add(new Equation(lr, rr, eq.sourceText() + " (real)"));
            expanded.add(new Equation(li, ri, eq.sourceText() + " (imag)"));

            for (String var : eq.variables()) {
                String disp = displayNames.getOrDefault(var, var);
                displayNames.put(var + "_r", disp + "_r");
                displayNames.put(var + "_i", disp + "_i");
            }
        }
        return expanded;
    }

    public static Expr realPart(Expr e) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var v -> new Expr.Var(v.name() + "_r");
            case Expr.Neg neg -> new Expr.Neg(realPart(neg.operand()));
            case Expr.BinOp b -> {
                Expr lr = realPart(b.left());
                Expr li = imagPart(b.left());
                Expr rr = realPart(b.right());
                Expr ri = imagPart(b.right());
                yield switch (b.op()) {
                    case '+' -> new Expr.BinOp('+', lr, rr);
                    case '-' -> new Expr.BinOp('-', lr, rr);
                    case '*' -> new Expr.BinOp('-', new Expr.BinOp('*', lr, rr), new Expr.BinOp('*', li, ri));
                    case '/' -> {
                        Expr denom = new Expr.BinOp('+', new Expr.BinOp('*', rr, rr), new Expr.BinOp('*', ri, ri));
                        Expr num = new Expr.BinOp('+', new Expr.BinOp('*', lr, rr), new Expr.BinOp('*', li, ri));
                        yield new Expr.BinOp('/', num, denom);
                    }
                    case '^' -> {
                        Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', lr, lr), new Expr.BinOp('*', li, li));
                        Expr r = new Expr.Call("sqrt", List.of(r2));
                        Expr theta = new Expr.Call("atan2", List.of(li, lr));
                        Expr power = new Expr.BinOp('^', r, rr);
                        Expr arg = new Expr.BinOp('*', rr, theta);
                        yield new Expr.BinOp('*', power, new Expr.Call("cos", List.of(arg)));
                    }
                    default -> throw new IllegalStateException("Unknown operator: " + b.op());
                };
            }
            case Expr.Call c -> {
                if ("real".equals(c.function())) {
                    yield realPart(c.args().get(0));
                }
                if ("imag".equals(c.function())) {
                    yield imagPart(c.args().get(0));
                }
                if ("sin".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr expY = new Expr.Call("exp", List.of(y));
                    Expr expNegY = new Expr.Call("exp", List.of(new Expr.Neg(y)));
                    Expr coshY = new Expr.BinOp('*', new Expr.Num(0.5), new Expr.BinOp('+', expY, expNegY));
                    yield new Expr.BinOp('*', new Expr.Call("sin", List.of(x)), coshY);
                }
                if ("cos".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr expY = new Expr.Call("exp", List.of(y));
                    Expr expNegY = new Expr.Call("exp", List.of(new Expr.Neg(y)));
                    Expr coshY = new Expr.BinOp('*', new Expr.Num(0.5), new Expr.BinOp('+', expY, expNegY));
                    yield new Expr.BinOp('*', new Expr.Call("cos", List.of(x)), coshY);
                }
                if ("exp".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr expX = new Expr.Call("exp", List.of(x));
                    yield new Expr.BinOp('*', expX, new Expr.Call("cos", List.of(y)));
                }
                if ("ln".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr arg = new Expr.BinOp('+', new Expr.BinOp('*', x, x), new Expr.BinOp('*', y, y));
                    yield new Expr.BinOp('*', new Expr.Num(0.5), new Expr.Call("ln", List.of(arg)));
                }
                if ("sqrt".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', x, x), new Expr.BinOp('*', y, y));
                    Expr r = new Expr.Call("sqrt", List.of(r2));
                    Expr theta = new Expr.Call("atan2", List.of(y, x));
                    Expr sqrtR = new Expr.Call("sqrt", List.of(r));
                    Expr halfTheta = new Expr.BinOp('*', new Expr.Num(0.5), theta);
                    yield new Expr.BinOp('*', sqrtR, new Expr.Call("cos", List.of(halfTheta)));
                }
                List<Expr> realArgs = c.args().stream().map(ComplexExpansion::realPart).toList();
                yield new Expr.Call(c.function(), realArgs);
            }
            case Expr.ArrayAccess aa -> new Expr.ArrayAccess(aa.name() + "_r", aa.indices());
            case Expr.Range r -> new Expr.Range(realPart(r.start()), realPart(r.end()));
            case Expr.ArrayLiteral al -> new Expr.ArrayLiteral(al.elements().stream().map(ComplexExpansion::realPart).toList());
        };
    }

    public static Expr imagPart(Expr e) {
        return switch (e) {
            case Expr.Num n -> new Expr.Num(0.0);
            case Expr.Var v -> new Expr.Var(v.name() + "_i");
            case Expr.Neg neg -> new Expr.Neg(imagPart(neg.operand()));
            case Expr.BinOp b -> {
                Expr lr = realPart(b.left());
                Expr li = imagPart(b.left());
                Expr rr = realPart(b.right());
                Expr ri = imagPart(b.right());
                yield switch (b.op()) {
                    case '+' -> new Expr.BinOp('+', li, ri);
                    case '-' -> new Expr.BinOp('-', li, ri);
                    case '*' -> new Expr.BinOp('+', new Expr.BinOp('*', lr, ri), new Expr.BinOp('*', li, rr));
                    case '/' -> {
                        Expr denom = new Expr.BinOp('+', new Expr.BinOp('*', rr, rr), new Expr.BinOp('*', ri, ri));
                        Expr num = new Expr.BinOp('-', new Expr.BinOp('*', li, rr), new Expr.BinOp('*', lr, ri));
                        yield new Expr.BinOp('/', num, denom);
                    }
                    case '^' -> {
                        Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', lr, lr), new Expr.BinOp('*', li, li));
                        Expr r = new Expr.Call("sqrt", List.of(r2));
                        Expr theta = new Expr.Call("atan2", List.of(li, lr));
                        Expr power = new Expr.BinOp('^', r, rr);
                        Expr arg = new Expr.BinOp('*', rr, theta);
                        yield new Expr.BinOp('*', power, new Expr.Call("sin", List.of(arg)));
                    }
                    default -> throw new IllegalStateException("Unknown operator: " + b.op());
                };
            }
            case Expr.Call c -> {
                if ("real".equals(c.function())) {
                    yield imagPart(c.args().get(0));
                }
                if ("imag".equals(c.function())) {
                    yield new Expr.Num(0.0);
                }
                if ("sin".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr expY = new Expr.Call("exp", List.of(y));
                    Expr expNegY = new Expr.Call("exp", List.of(new Expr.Neg(y)));
                    Expr sinhY = new Expr.BinOp('*', new Expr.Num(0.5), new Expr.BinOp('-', expY, expNegY));
                    yield new Expr.BinOp('*', new Expr.Call("cos", List.of(x)), sinhY);
                }
                if ("cos".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr expY = new Expr.Call("exp", List.of(y));
                    Expr expNegY = new Expr.Call("exp", List.of(new Expr.Neg(y)));
                    Expr sinhY = new Expr.BinOp('*', new Expr.Num(0.5), new Expr.BinOp('-', expY, expNegY));
                    yield new Expr.Neg(new Expr.BinOp('*', new Expr.Call("sin", List.of(x)), sinhY));
                }
                if ("exp".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr expX = new Expr.Call("exp", List.of(x));
                    yield new Expr.BinOp('*', expX, new Expr.Call("sin", List.of(y)));
                }
                if ("ln".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    yield new Expr.Call("atan2", List.of(y, x));
                }
                if ("sqrt".equals(c.function())) {
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', x, x), new Expr.BinOp('*', y, y));
                    Expr r = new Expr.Call("sqrt", List.of(r2));
                    Expr theta = new Expr.Call("atan2", List.of(y, x));
                    Expr sqrtR = new Expr.Call("sqrt", List.of(r));
                    Expr halfTheta = new Expr.BinOp('*', new Expr.Num(0.5), theta);
                    yield new Expr.BinOp('*', sqrtR, new Expr.Call("sin", List.of(halfTheta)));
                }
                List<Expr> imagArgs = c.args().stream().map(ComplexExpansion::imagPart).toList();
                yield new Expr.Call(c.function(), imagArgs);
            }
            case Expr.ArrayAccess aa -> new Expr.ArrayAccess(aa.name() + "_i", aa.indices());
            case Expr.Range r -> new Expr.Range(imagPart(r.start()), imagPart(r.end()));
            case Expr.ArrayLiteral al -> new Expr.ArrayLiteral(al.elements().stream().map(ComplexExpansion::imagPart).toList());
        };
    }
}
