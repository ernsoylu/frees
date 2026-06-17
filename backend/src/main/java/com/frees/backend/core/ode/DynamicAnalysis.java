package com.frees.backend.core.ode;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.Statement;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * Lightweight, tolerant static analysis of a {@link DynamicSystem} — its states,
 * algebraic auxiliaries, output columns, and the set of <em>input variables</em>
 * it reads from the analytic system. Used to map ODE-table column names to their
 * owning block and to wire the structural dependency between an accessor
 * constraint and the analytic variables that feed the block (so Tarjan blocking
 * and the Newton Jacobian see the coupling). Unlike {@code DynamicSolver} this
 * never throws on unsupported shapes — it analyzes best-effort.
 */
public final class DynamicAnalysis {

    public record Shape(List<String> states, List<String> aux,
                        List<String> columns, Set<String> inputVars) {}

    private DynamicAnalysis() {}

    public static Shape analyze(DynamicSystem ds) {
        LinkedHashSet<String> states = new LinkedHashSet<>();
        LinkedHashSet<String> aux = new LinkedHashSet<>();
        Set<String> refs = new TreeSet<>();

        for (Equation eq : ds.bodyEquations()) {
            classify(eq, states, aux);
            refs.addAll(eq.lhs().variables());
            refs.addAll(eq.rhs().variables());
        }
        for (Statement.For fb : ds.forBlocks()) {
            collectFor(fb, states, aux, refs);
        }
        for (DynamicSystem.InitialCondition ic : ds.initials()) {
            refs.addAll(ic.value().variables());
        }
        for (DynamicSystem.Event ev : ds.events()) {
            refs.addAll(ev.lhs().variables());
            refs.addAll(ev.rhs().variables());
        }

        String timeVar = ds.options().timeVar();
        Set<String> inputs = new TreeSet<>(refs);
        inputs.removeAll(states);
        inputs.removeAll(aux);
        inputs.remove(timeVar);

        List<String> columns = new ArrayList<>();
        columns.add(timeVar);
        columns.addAll(states);
        columns.addAll(aux);
        return new Shape(new ArrayList<>(states), new ArrayList<>(aux), columns, inputs);
    }

    private static void classify(Equation eq, Set<String> states, Set<String> aux) {
        String s = derStateName(eq.lhs());
        if (s != null) {
            states.add(s);
        } else {
            String a = simpleVar(eq.lhs());
            if (a != null) {
                aux.add(a);
            }
        }
    }

    private static void collectFor(Statement.For fb, Set<String> states, Set<String> aux,
                                   Set<String> refs) {
        String loopVar = fb.varName().toLowerCase();
        for (Statement st : fb.body()) {
            if (st instanceof Statement.Eq(Expr lhs, Expr rhs, String src)) {
                classify(new Equation(lhs, rhs, src), states, aux);
                refs.addAll(lhs.variables());
                refs.addAll(rhs.variables());
            } else if (st instanceof Statement.For inner) {
                collectFor(inner, states, aux, refs);
            }
        }
        refs.remove(loopVar);
    }

    static String derStateName(Expr lhs) {
        if (lhs instanceof Expr.Call(String fn, List<Expr> args)
                && fn.equals("der") && args.size() == 1) {
            if (args.get(0) instanceof Expr.Var(String name)) {
                return name;
            }
            if (args.get(0) instanceof Expr.ArrayAccess(String name, List<Expr> idx)) {
                return name;
            }
        }
        return null;
    }

    static String simpleVar(Expr lhs) {
        if (lhs instanceof Expr.Var(String name)) {
            return name;
        }
        if (lhs instanceof Expr.ArrayAccess(String name, List<Expr> idx)) {
            return name;
        }
        return null;
    }
}
