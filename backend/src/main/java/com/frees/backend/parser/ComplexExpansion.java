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

    /** Functions with explicit complex-expansion rules below. */
    private static final java.util.Set<String> SUPPORTED_FUNCTIONS = java.util.Set.of(
            "real", "imag", "abs", "sin", "cos", "exp", "ln", "sqrt");

    private static boolean isLiteralZero(Expr e) {
        return e instanceof Expr.Num n && n.value() == 0.0;
    }

    /**
     * |z^w| for z = a+bi, w = c+di: r^c * e^(-d*theta). When d is the literal
     * zero (real exponent, the common case) the e-term is omitted so that
     * z = 0 does not produce ln(0)*0 = NaN during iteration.
     */
    private static Expr powerMagnitude(Expr a, Expr b, Expr c, Expr d) {
        Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', a, a), new Expr.BinOp('*', b, b));
        Expr r = new Expr.Call("sqrt", List.of(r2));
        Expr rPowC = new Expr.BinOp('^', r, c);
        if (isLiteralZero(d)) {
            return rPowC;
        }
        Expr theta = new Expr.Call("atan2", List.of(b, a));
        Expr eTerm = new Expr.Call("exp",
                List.of(new Expr.Neg(new Expr.BinOp('*', d, theta))));
        return new Expr.BinOp('*', rPowC, eTerm);
    }

    /** arg(z^w): c*theta + d*ln(r), with the d-term omitted for real exponents. */
    private static Expr powerAngle(Expr a, Expr b, Expr c, Expr d) {
        Expr theta = new Expr.Call("atan2", List.of(b, a));
        Expr cTheta = new Expr.BinOp('*', c, theta);
        if (isLiteralZero(d)) {
            return cTheta;
        }
        Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', a, a), new Expr.BinOp('*', b, b));
        Expr lnR = new Expr.BinOp('*', new Expr.Num(0.5), new Expr.Call("ln", List.of(r2)));
        return new Expr.BinOp('+', cTheta, new Expr.BinOp('*', d, lnR));
    }

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
                        Expr magnitude = powerMagnitude(lr, li, rr, ri);
                        Expr angle = powerAngle(lr, li, rr, ri);
                        yield new Expr.BinOp('*', magnitude, new Expr.Call("cos", List.of(angle)));
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
                if ("abs".equals(c.function())) {
                    // |z| = sqrt(x^2 + y^2): the complex magnitude.
                    Expr x = realPart(c.args().get(0));
                    Expr y = imagPart(c.args().get(0));
                    Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', x, x), new Expr.BinOp('*', y, y));
                    yield new Expr.Call("sqrt", List.of(r2));
                }
                throw unsupportedInComplexMode(c);
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
                        Expr magnitude = powerMagnitude(lr, li, rr, ri);
                        Expr angle = powerAngle(lr, li, rr, ri);
                        yield new Expr.BinOp('*', magnitude, new Expr.Call("sin", List.of(angle)));
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
                if ("abs".equals(c.function())) {
                    // The magnitude is real; its imaginary part is zero.
                    yield new Expr.Num(0.0);
                }
                throw unsupportedInComplexMode(c);
            }
            case Expr.ArrayAccess aa -> new Expr.ArrayAccess(aa.name() + "_i", aa.indices());
            case Expr.Range r -> new Expr.Range(imagPart(r.start()), imagPart(r.end()));
            case Expr.ArrayLiteral al -> new Expr.ArrayLiteral(al.elements().stream().map(ComplexExpansion::imagPart).toList());
        };
    }

    private static EquationParser.ParseException unsupportedInComplexMode(Expr.Call c) {
        // Silently mapping real/imag parts through an arbitrary function is
        // mathematically wrong (Im tan(z) != tan(Im z)); reject instead.
        return new EquationParser.ParseException(
                "Function '" + c.function() + "' is not supported in complex mode. "
                        + "Supported: " + String.join(", ",
                        SUPPORTED_FUNCTIONS.stream().sorted().toList()));
    }
}
