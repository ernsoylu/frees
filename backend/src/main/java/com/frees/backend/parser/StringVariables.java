package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolution of string variables — identifiers with a trailing {@code $}
 * (EES convention), e.g. {@code R$ = 'R134a'}.
 *
 * <p>A string variable is defined by an equation binding it to a string
 * literal (on either side). Definitions are compile-time constants: every use
 * of the variable is replaced by its literal value — including fluid names
 * inside synthetic {@code prop$} property calls — and the definition
 * equations are removed from the numeric system, so they do not count
 * towards the degrees of freedom.
 */
public final class StringVariables {

    private StringVariables() {}

    public static List<Equation> resolve(List<Equation> equations,
                                         Map<String, String> displayNames) {
        Map<String, String> bindings = new HashMap<>();
        List<Equation> remaining = new ArrayList<>();

        for (Equation eq : equations) {
            String var = null;
            String value = null;
            if (eq.lhs() instanceof Expr.Var(String name) && name.endsWith("$")
                    && eq.rhs() instanceof Expr.Str(String v)) {
                var = name;
                value = v;
            } else if (eq.rhs() instanceof Expr.Var(String name) && name.endsWith("$")
                    && eq.lhs() instanceof Expr.Str(String v)) {
                var = name;
                value = v;
            }
            if (var != null) {
                String previous = bindings.put(var, value);
                if (previous != null && !previous.equals(value)) {
                    throw new EquationParser.ParseException(
                            "String variable '" + display(var, displayNames)
                            + "' is defined twice with different values ('"
                            + previous + "' and '" + value + "').");
                }
            } else {
                remaining.add(eq);
            }
        }

        List<Equation> out = new ArrayList<>(remaining.size());
        for (Equation eq : remaining) {
            out.add(new Equation(
                    substitute(eq.lhs(), bindings, displayNames),
                    substitute(eq.rhs(), bindings, displayNames),
                    eq.sourceText()));
        }
        return out;
    }

    private static String display(String name, Map<String, String> displayNames) {
        return displayNames != null ? displayNames.getOrDefault(name, name) : name;
    }

    private static Expr substitute(Expr e, Map<String, String> bindings,
                                   Map<String, String> displayNames) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Str s -> s;
            case Expr.Var(String name) -> {
                if (!name.endsWith("$")) yield e;
                String value = bindings.get(name);
                if (value == null) {
                    throw new EquationParser.ParseException(
                            "String variable '" + display(name, displayNames)
                            + "' is not defined. Assign it with "
                            + display(name, displayNames) + " = '...'.");
                }
                yield new Expr.Str(value);
            }
            case Expr.Neg(Expr operand) ->
                    new Expr.Neg(substitute(operand, bindings, displayNames));
            case Expr.BinOp(char op, Expr left, Expr right) -> new Expr.BinOp(op,
                    substitute(left, bindings, displayNames),
                    substitute(right, bindings, displayNames));
            case Expr.Call(String function, List<Expr> args) -> {
                List<Expr> newArgs = args.stream()
                        .map(a -> substitute(a, bindings, displayNames))
                        .toList();
                yield new Expr.Call(resolveFunction(function, bindings, displayNames), newArgs);
            }
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                List<Expr> newIdx = indices.stream()
                        .map(i -> substitute(i, bindings, displayNames))
                        .toList();
                yield new Expr.ArrayAccess(name, newIdx);
            }
            case Expr.Range(Expr start, Expr end) -> new Expr.Range(
                    substitute(start, bindings, displayNames),
                    substitute(end, bindings, displayNames));
            case Expr.ArrayLiteral(List<Expr> elements) -> new Expr.ArrayLiteral(
                    elements.stream().map(el -> substitute(el, bindings, displayNames)).toList());
            case Expr.Compare(String op, Expr left, Expr right) -> new Expr.Compare(op,
                    substitute(left, bindings, displayNames),
                    substitute(right, bindings, displayNames));
            case Expr.Logical(String op, Expr left, Expr right) -> new Expr.Logical(op,
                    substitute(left, bindings, displayNames),
                    substitute(right, bindings, displayNames));
            case Expr.Not(Expr operand) ->
                    new Expr.Not(substitute(operand, bindings, displayNames));
        };
    }

    /**
     * Resolves a string-variable fluid inside a synthetic property call name.
     * AstBuilder encodes {@code Enthalpy(R$, T=..., x=1)} as
     * {@code prop$enthalpy$r$$t$x}; the fluid's trailing '$' produces an empty
     * segment after it when split on '$'.
     */
    private static String resolveFunction(String function, Map<String, String> bindings,
                                          Map<String, String> displayNames) {
        if (!function.startsWith("prop$")) {
            return function;
        }
        String[] parts = function.split("\\$", -1);
        // parts: ["prop", output, fluid, ("" if fluid was a string var), indicators...]
        if (parts.length < 4 || !parts[3].isEmpty()) {
            return function;
        }
        String fluidVar = parts[2] + "$";
        String value = bindings.get(fluidVar);
        if (value == null) {
            throw new EquationParser.ParseException(
                    "String variable '" + display(fluidVar, displayNames)
                    + "' used as a fluid name is not defined. Assign it with "
                    + display(fluidVar, displayNames) + " = '...'.");
        }
        if (!value.matches("[A-Za-z]\\w*")) {
            throw new EquationParser.ParseException(
                    "'" + value + "' (value of " + display(fluidVar, displayNames)
                    + ") is not a valid fluid name.");
        }
        StringBuilder rebuilt = new StringBuilder("prop$")
                .append(parts[1]).append('$').append(value.toLowerCase());
        for (int i = 4; i < parts.length; i++) {
            rebuilt.append('$').append(parts[i]);
        }
        return rebuilt.toString();
    }
}
