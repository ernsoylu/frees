package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import org.jgrapht.Graph;
import org.jgrapht.graph.DefaultEdge;
import org.jgrapht.graph.SimpleGraph;
import org.jgrapht.alg.interfaces.MatchingAlgorithm;
import org.jgrapht.alg.matching.HopcroftKarpMaximumCardinalityBipartiteMatching;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.TreeSet;
import java.util.LinkedHashSet;

/**
 * Splits equations and variables into real (_r) and imaginary (_i) parts
 * when complex mode is active.
 */
public final class ComplexExpansion {

    private static final String ATAN2 = "atan2";

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
        Expr theta = new Expr.Call(ATAN2, List.of(b, a));
        Expr eTerm = new Expr.Call("exp",
                List.of(new Expr.Neg(new Expr.BinOp('*', d, theta))));
        return new Expr.BinOp('*', rPowC, eTerm);
    }

    /** arg(z^w): c*theta + d*ln(r), with the d-term omitted for real exponents. */
    private static Expr powerAngle(Expr a, Expr b, Expr c, Expr d) {
        Expr theta = new Expr.Call(ATAN2, List.of(b, a));
        Expr cTheta = new Expr.BinOp('*', c, theta);
        if (isLiteralZero(d)) {
            return cTheta;
        }
        Expr r2 = new Expr.BinOp('+', new Expr.BinOp('*', a, a), new Expr.BinOp('*', b, b));
        Expr lnR = new Expr.BinOp('*', new Expr.Num(0.5), new Expr.Call("ln", List.of(r2)));
        return new Expr.BinOp('+', cTheta, new Expr.BinOp('*', d, lnR));
    }

    private static Expr simplify(Expr e) {
        return switch (e) {
            case Expr.Neg(Expr operand) -> {
                Expr op = simplify(operand);
                if (op instanceof Expr.Num(double value, String unit, boolean isImaginary) && value == 0.0) {
                    yield op;
                }
                if (op instanceof Expr.Neg(Expr inner)) {
                    yield inner;
                }
                yield new Expr.Neg(op);
            }
            case Expr.BinOp(char op, Expr left, Expr right) -> simplifyBinOp(op, left, right);
            case Expr.Call(String function, List<Expr> args) -> {
                List<Expr> simplifiedArgs = args.stream().map(ComplexExpansion::simplify).toList();
                // The expansion rules wrap structurally real subtrees in
                // sin/cos/atan2 (e.g. |z|^w produces sin(w*atan2(0, sqrt(..)))).
                // Folding these reveals which imaginary parts are identically
                // zero, so the matching below sees the true structure.
                if (ATAN2.equals(function) && simplifiedArgs.size() == 2
                        && isLiteralZero(simplifiedArgs.get(0)) && isNonNegative(simplifiedArgs.get(1))) {
                    yield new Expr.Num(0.0);
                }
                if ("sin".equals(function) && simplifiedArgs.size() == 1 && isLiteralZero(simplifiedArgs.get(0))) {
                    yield new Expr.Num(0.0);
                }
                if ("cos".equals(function) && simplifiedArgs.size() == 1 && isLiteralZero(simplifiedArgs.get(0))) {
                    yield new Expr.Num(1.0);
                }
                yield new Expr.Call(function, simplifiedArgs);
            }
            default -> e;
        };
    }

    private static Expr simplifyBinOp(char op, Expr left, Expr right) {
        Expr l = simplify(left);
        Expr r = simplify(right);
        boolean lZero = l instanceof Expr.Num(double value, String unit, boolean isImaginary) && value == 0.0;
        boolean rZero = r instanceof Expr.Num(double value, String unit, boolean isImaginary) && value == 0.0;
        boolean lOne = l instanceof Expr.Num(double value, String unit, boolean isImaginary) && value == 1.0;
        boolean rOne = r instanceof Expr.Num(double value, String unit, boolean isImaginary) && value == 1.0;

        return switch (op) {
            case '+' -> {
                if (lZero) yield r;
                if (rZero) yield l;
                yield new Expr.BinOp('+', l, r);
            }
            case '-' -> {
                if (rZero) yield l;
                if (lZero) yield new Expr.Neg(r);
                yield new Expr.BinOp('-', l, r);
            }
            case '*' -> {
                if (lZero || rZero) yield new Expr.Num(0.0);
                if (lOne) yield r;
                if (rOne) yield l;
                yield new Expr.BinOp('*', l, r);
            }
            case '/' -> {
                if (lZero) yield new Expr.Num(0.0);
                if (rOne) yield l;
                yield new Expr.BinOp('/', l, r);
            }
            case '^' -> {
                if (rZero) yield new Expr.Num(1.0);
                if (rOne) yield l;
                if (lZero) yield new Expr.Num(0.0);
                yield new Expr.BinOp('^', l, r);
            }
            default -> new Expr.BinOp(op, l, r);
        };
    }

    /** Whether the expression is non-negative by construction. */
    private static boolean isNonNegative(Expr e) {
        return switch (e) {
            case Expr.Num n -> !n.isImaginary() && n.value() >= 0.0;
            case Expr.Call c -> ("sqrt".equals(c.function()) || "abs".equals(c.function()));
            default -> false;
        };
    }

    /** Whether any equation contains an imaginary literal (1i, 2j, ...). */
    public static boolean mentionsImaginary(List<Equation> equations) {
        return equations.stream().anyMatch(eq ->
                mentionsImaginary(eq.lhs()) || mentionsImaginary(eq.rhs()));
    }

    private static boolean mentionsImaginary(Expr e) {
        return switch (e) {
            case Expr.Num(double value, String unit, boolean isImaginary) -> isImaginary;
            case Expr.Var(String name) -> false;
            case Expr.Neg(Expr operand) -> mentionsImaginary(operand);
            case Expr.BinOp(char op, Expr left, Expr right) -> mentionsImaginary(left) || mentionsImaginary(right);
            case Expr.Call(String function, List<Expr> args) -> args.stream().anyMatch(ComplexExpansion::mentionsImaginary);
            case Expr.ArrayAccess(String name, List<Expr> indices) -> indices.stream().anyMatch(ComplexExpansion::mentionsImaginary);
            case Expr.Range(Expr start, Expr end) -> mentionsImaginary(start) || mentionsImaginary(end);
            case Expr.ArrayLiteral(List<Expr> elements) -> elements.stream().anyMatch(ComplexExpansion::mentionsImaginary);
            case Expr.Compare(String op, Expr left, Expr right) -> mentionsImaginary(left) || mentionsImaginary(right);
            case Expr.Logical(String op, Expr left, Expr right) -> mentionsImaginary(left) || mentionsImaginary(right);
            case Expr.Not(Expr operand) -> mentionsImaginary(operand);
        };
    }

    public static List<Equation> expand(List<Equation> equations, Map<String, String> displayNames) {
        List<Equation> expanded = new ArrayList<>();
        Set<String> baseVars = new TreeSet<>();

        generateRealImagEquations(equations, displayNames, baseVars, expanded);

        // Collect all expanded variables and their real/imag parts
        Set<String> allVars = new TreeSet<>();
        for (String baseVar : baseVars) {
            allVars.add(baseVar + "_r");
            allVars.add(baseVar + "_i");
        }

        // Run bipartite matching to find unmatched variables
        Map<String, Integer> varToEq = new HashMap<>();
        Map<Integer, String> eqToVar = new HashMap<>();
        matchExpandedVariables(expanded, allVars, varToEq, eqToVar);

        pinUnmatchedImaginaryParts(expanded, allVars, varToEq, eqToVar, equations);

        return expanded;
    }

    private static void generateRealImagEquations(List<Equation> equations, Map<String, String> displayNames,
                                                  Set<String> baseVars, List<Equation> expanded) {
        for (Equation eq : equations) {
            baseVars.addAll(eq.variables());

            Expr lr = simplify(realPart(eq.lhs()));
            Expr rr = simplify(realPart(eq.rhs()));
            expanded.add(new Equation(lr, rr, eq.sourceText() + " (real)"));

            Expr li = simplify(imagPart(eq.lhs()));
            Expr ri = simplify(imagPart(eq.rhs()));
            if (!(isLiteralZero(li) && isLiteralZero(ri))) {
                expanded.add(new Equation(li, ri, eq.sourceText() + " (imag)"));
            }

            for (String varName : eq.variables()) {
                String disp = displayNames.getOrDefault(varName, varName);
                displayNames.put(varName + "_r", disp + "_r");
                displayNames.put(varName + "_i", disp + "_i");
            }
        }
    }

    private static void matchExpandedVariables(List<Equation> expanded, Set<String> allVars,
                                               Map<String, Integer> varToEq, Map<Integer, String> eqToVar) {
        Graph<String, DefaultEdge> graph = new SimpleGraph<>(DefaultEdge.class);
        Set<String> eqNodes = new LinkedHashSet<>();
        Set<String> varNodes = new LinkedHashSet<>();

        for (int i = 0; i < expanded.size(); i++) {
            String eqNode = "eq:" + i;
            eqNodes.add(eqNode);
            graph.addVertex(eqNode);
        }
        for (String varName : allVars) {
            String varNode = "var:" + varName;
            varNodes.add(varNode);
            graph.addVertex(varNode);
        }
        for (int i = 0; i < expanded.size(); i++) {
            for (String varName : expanded.get(i).variables()) {
                graph.addEdge("eq:" + i, "var:" + varName);
            }
        }

        MatchingAlgorithm.Matching<String, DefaultEdge> matching =
                new HopcroftKarpMaximumCardinalityBipartiteMatching<>(graph, eqNodes, varNodes)
                        .getMatching();

        for (DefaultEdge edge : matching.getEdges()) {
            String source = graph.getEdgeSource(edge);
            String target = graph.getEdgeTarget(edge);
            String varNode = source.startsWith("var:") ? source : target;
            String eqNode = source.startsWith("eq:") ? source : target;
            String varName = varNode.substring(4);
            int eq = Integer.parseInt(eqNode.substring(3));
            varToEq.put(varName, eq);
            eqToVar.put(eq, varName);
        }
    }

    private static void pinUnmatchedImaginaryParts(List<Equation> expanded, Set<String> allVars,
                                                   Map<String, Integer> varToEq, Map<Integer, String> eqToVar,
                                                   List<Equation> equations) {
        // An exposed variable signals phase freedom: an equation like
        // Q = abs(V)^2 / abs(Z) constrains only the magnitude of Z, leaving a
        // rotational degree of freedom that some complex variable absorbs.
        // Ground it the way an EES user would: treat the least-referenced
        // base variable (an output-like leaf such as a capacitance) as real
        // by pinning its imaginary part to zero. The alternating-path swap
        // re-matches so exactly that component is the exposed one.
        Map<String, Integer> baseOccurrences = new HashMap<>();
        for (Equation eq : equations) {
            for (String v : eq.variables()) {
                baseOccurrences.merge(v, 1, Integer::sum);
            }
        }
        Map<String, List<Integer>> eqsByVar = new HashMap<>();
        for (int i = 0; i < expanded.size(); i++) {
            for (String varName : expanded.get(i).variables()) {
                eqsByVar.computeIfAbsent(varName, k -> new ArrayList<>()).add(i);
            }
        }
        int sizeBeforePins = expanded.size();
        for (String varName : allVars) {
            if (varToEq.containsKey(varName)) {
                continue;
            }
            String pin = swapToPreferredImaginary(varName, eqsByVar, varToEq, eqToVar,
                    baseOccurrences);
            if (pin == null) {
                continue; // structurally singular; the Blocker reports it
            }
            expanded.add(new Equation(new Expr.Var(pin), new Expr.Num(0.0),
                    pin + " = 0 (default complex real)"));
        }

        // Pinning adds equations; the matching left equally many equations
        // unmatched (the numerically redundant imaginary split of a
        // magnitude-only equation). Drop them to keep the system square.
        int excess = expanded.size() - allVars.size();
        if (excess > 0) {
            for (int i = sizeBeforePins - 1; i >= 0 && excess > 0; i--) {
                if (!eqToVar.containsKey(i)
                        && expanded.get(i).sourceText().endsWith("(imag)")) {
                    expanded.remove(i);
                    excess--;
                }
            }
        }
    }

    /**
     * BFS over alternating paths from the exposed variable: variable -> any
     * equation containing it -> that equation's matched variable. Every
     * reachable matched variable can trade places with the exposed one by
     * flipping the path. Picks the imaginary component whose base variable
     * appears in the fewest source equations, flips the matching so it
     * becomes the exposed one, and returns it; null when no imaginary
     * component is reachable.
     */
    private static String swapToPreferredImaginary(String exposedVar,
                                                   Map<String, List<Integer>> eqsByVar,
                                                   Map<String, Integer> varToEq,
                                                   Map<Integer, String> eqToVar,
                                                   Map<String, Integer> baseOccurrences) {
        Map<String, Integer> reachedViaEq = new HashMap<>();
        Map<Integer, String> reachedFromVar = new HashMap<>();
        Set<String> seenVars = new HashSet<>();
        Set<Integer> seenEqs = new HashSet<>();
        ArrayDeque<String> queue = new ArrayDeque<>();
        queue.add(exposedVar);
        seenVars.add(exposedVar);

        List<String> candidates = new ArrayList<>();
        if (exposedVar.endsWith("_i")) {
            candidates.add(exposedVar);
        }
        while (!queue.isEmpty()) {
            String v = queue.poll();
            for (int ei : eqsByVar.getOrDefault(v, List.of())) {
                if (!seenEqs.add(ei)) {
                    continue;
                }
                reachedFromVar.put(ei, v);
                String w = eqToVar.get(ei);
                if (w == null || !seenVars.add(w)) {
                    continue;
                }
                reachedViaEq.put(w, ei);
                if (w.endsWith("_i")) {
                    candidates.add(w);
                }
                queue.add(w);
            }
        }
        if (candidates.isEmpty()) {
            return null;
        }
        String best = candidates.stream()
                .min(java.util.Comparator
                        .comparingInt((String w) -> baseOccurrences
                                .getOrDefault(w.substring(0, w.length() - 2), 0))
                        .thenComparing(w -> w))
                .orElseThrow();
        // Flip the alternating path so `best` becomes the exposed variable.
        String cur = best;
        varToEq.remove(best);
        while (!cur.equals(exposedVar)) {
            int eq = reachedViaEq.get(cur);
            String prev = reachedFromVar.get(eq);
            eqToVar.put(eq, prev);
            varToEq.put(prev, eq);
            cur = prev;
        }
        return best;
    }

    public static Expr realPart(Expr e) {
        return switch (e) {
            case Expr.Num n -> n.isImaginary() ? new Expr.Num(0.0, n.unit()) : n;
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
            // Comparisons and logical ops are always real (evaluate to 1.0 or 0.0)
            case Expr.Compare cmp -> new Expr.Compare(cmp.op(), realPart(cmp.left()), realPart(cmp.right()));
            case Expr.Logical log -> new Expr.Logical(log.op(), realPart(log.left()), realPart(log.right()));
            case Expr.Not not -> new Expr.Not(realPart(not.operand()));
        };
    }

    public static Expr imagPart(Expr e) {
        return switch (e) {
            case Expr.Num n -> n.isImaginary() ? new Expr.Num(n.value(), n.unit()) : new Expr.Num(0.0);
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
                    yield new Expr.Num(0.0);
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
            // Comparisons and logical ops have zero imaginary part
            case Expr.Compare cmp -> new Expr.Num(0.0);
            case Expr.Logical log -> new Expr.Num(0.0);
            case Expr.Not not -> new Expr.Num(0.0);
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
