package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import org.jgrapht.Graph;
import org.jgrapht.alg.interfaces.MatchingAlgorithm;
import org.jgrapht.alg.matching.HopcroftKarpMaximumCardinalityBipartiteMatching;
import org.jgrapht.graph.DefaultEdge;
import org.jgrapht.graph.SimpleGraph;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Decomposes an equation system into sequentially solvable blocks
 * (the "blocking" step).
 *
 * 1. A maximum bipartite matching assigns each equation the variable it will
 *    determine (Hopcroft-Karp via JGraphT).
 * 2. A dependency digraph between equations is condensed with Tarjan's
 *    strongly-connected-components algorithm; each SCC is one block. Tarjan
 *    emits SCCs sinks-first, which is exactly the solve order.
 */
public class Blocker {

    public List<Block> block(List<Equation> equations) {
        Map<Integer, String> assignment = verifyStructure(equations);
        return tarjanBlocks(equations, assignment);
    }

    /**
     * Permissive variant used for parametric-table row solves: skips the
     * global underdetermination check so independent equation blocks that
     * are not covered by the table's columns (e.g. a second circuit whose
     * variables are not table columns) are still blocked and solved. Unmatched
     * variables (those with no equation assigned to them by the bipartite
     * matching) are treated as constants fixed at their initial guess; the
     * Tarjan blocks that contain equations referencing only matched variables
     * are solved normally.
     */
    public List<Block> blockPermissive(List<Equation> equations) {
        if (equations.isEmpty()) return List.of();
        Set<String> allVars = new TreeSet<>();
        for (Equation eq : equations) allVars.addAll(eq.variables());
        // Run bipartite matching — for underdetermined systems every equation
        // gets a match even though some variables remain unmatched.
        Map<Integer, String> assignment = matchEquationsToVariables(equations, allVars);
        return tarjanBlocks(equations, assignment);
    }

    /**
     * structural solvability check: zero degrees of freedom and a
     * complete equation-to-variable assignment. Throws SolverException with an
     * message if the system cannot be solved; returns the matching
     * otherwise.
     */
    public Map<Integer, String> verifyStructure(List<Equation> equations) {
        Set<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }

        if (equations.isEmpty()) {
            throw new SolverException("No equations to solve.");
        }
        if (allVars.size() != equations.size()) {
            String kind = equations.size() < allVars.size() ? "underspecified" : "overspecified";
            // Source-mapped hint (§14.1): list the involved variables in their
            // dotted display form ($→.) so the gap localises to a component/stream
            // (e.g. "s1.mdot, s2.h") rather than a bare count.
            String sample = allVars.stream().limit(16)
                    .map(v -> v.replace('$', '.')).collect(java.util.stream.Collectors.joining(", "));
            String more = allVars.size() > 16 ? ", …" : "";
            throw new SolverException(String.format(
                    "There are %d equations and %d variables. The problem is %s and cannot be solved. "
                            + "Variables involved: %s%s.",
                    equations.size(), allVars.size(), kind, sample, more));
        }

        return matchEquationsToVariables(equations, allVars);
    }

    private Map<Integer, String> matchEquationsToVariables(List<Equation> equations,
                                                           Set<String> allVars) {
        Graph<String, DefaultEdge> graph = new SimpleGraph<>(DefaultEdge.class);
        Set<String> eqNodes = new LinkedHashSet<>();
        Set<String> varNodes = new LinkedHashSet<>();

        for (int i = 0; i < equations.size(); i++) {
            String eqNode = "eq:" + i;
            eqNodes.add(eqNode);
            graph.addVertex(eqNode);
        }
        for (String varName : allVars) {
            String varNode = "var:" + varName;
            varNodes.add(varNode);
            graph.addVertex(varNode);
        }
        for (int i = 0; i < equations.size(); i++) {
            for (String varName : equations.get(i).variables()) {
                graph.addEdge("eq:" + i, "var:" + varName);
            }
        }

        MatchingAlgorithm.Matching<String, DefaultEdge> matching =
                new HopcroftKarpMaximumCardinalityBipartiteMatching<>(graph, eqNodes, varNodes)
                        .getMatching();

        if (matching.getEdges().size() != equations.size()) {
            throw new SolverException(
                    "The equation system is structurally singular: no complete "
                            + "assignment of equations to variables exists.");
        }

        Map<Integer, String> assignment = new HashMap<>();
        for (DefaultEdge edge : matching.getEdges()) {
            String source = graph.getEdgeSource(edge);
            String target = graph.getEdgeTarget(edge);
            String eqNode = source.startsWith("eq:") ? source : target;
            String varNode = source.startsWith("eq:") ? target : source;
            assignment.put(Integer.parseInt(eqNode.substring(3)), varNode.substring(4));
        }
        return assignment;
    }

    /**
     * Tarjan's SCC over the equation dependency graph. Edge i -> j means
     * equation i uses the variable that equation j determines, i.e. i depends
     * on j. Tarjan identifies SCCs in reverse topological order (dependencies
     * first), so emitted components are already in solve order.
     */
    private List<Block> tarjanBlocks(List<Equation> equations, Map<Integer, String> assignment) {
        int n = equations.size();
        Map<String, Integer> varToEq = new HashMap<>();
        assignment.forEach((eq, varName) -> varToEq.put(varName, eq));

        List<List<Integer>> adjacency = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            List<Integer> edges = new ArrayList<>();
            for (String varName : equations.get(i).variables()) {
                Integer j = varToEq.get(varName);
                // null means this variable is unmatched (free / external constant)
                if (j != null && j != i) {
                    edges.add(j);
                }
            }
            adjacency.add(edges);
        }

        TarjanContext ctx = new TarjanContext(n, adjacency);

        for (int v = 0; v < n; v++) {
            if (ctx.indices[v] == -1) {
                strongConnect(v, ctx);
            }
        }

        List<Block> blocks = new ArrayList<>();
        for (List<Integer> component : ctx.components) {
            List<Equation> blockEquations = new ArrayList<>();
            List<String> blockVars = new ArrayList<>();
            for (int eqIndex : component) {
                blockEquations.add(equations.get(eqIndex));
                blockVars.add(assignment.get(eqIndex));
            }
            blocks.add(new Block(blocks.size(), blockEquations, blockVars));
        }
        return blocks;
    }

    private void strongConnect(int v, TarjanContext ctx) {
        // Iterative Tarjan to avoid stack overflow on large systems (EES
        // supports thousands of equations).
        Deque<int[]> work = new ArrayDeque<>();
        work.push(new int[]{v, 0});

        while (!work.isEmpty()) {
            processTarjanFrame(work, ctx);
        }
    }

    private void processTarjanFrame(Deque<int[]> work, TarjanContext ctx) {
        int[] frame = work.peek();
        if (frame == null || frame.length < 2) {
            work.pop();
            return;
        }
        int node = frame[0];

        if (frame[1] == 0) {
            ctx.indices[node] = ctx.counter;
            ctx.lowLinks[node] = ctx.counter;
            ctx.counter++;
            ctx.stack.push(node);
            ctx.onStack[node] = true;
        }

        List<Integer> edges = ctx.adjacency.get(node);
        while (frame[1] < edges.size()) {
            int next = edges.get(frame[1]);
            frame[1]++;
            if (ctx.indices[next] == -1) {
                work.push(new int[]{next, 0});
                return;
            } else if (ctx.onStack[next]) {
                ctx.lowLinks[node] = Math.min(ctx.lowLinks[node], ctx.indices[next]);
            }
        }

        if (ctx.lowLinks[node] == ctx.indices[node]) {
            List<Integer> component = new ArrayList<>();
            int popped;
            do {
                popped = ctx.stack.pop();
                ctx.onStack[popped] = false;
                component.add(popped);
            } while (popped != node);
            ctx.components.add(component);
        }

        work.pop();
        if (!work.isEmpty()) {
            int[] parentFrame = work.peek();
            if (parentFrame != null && parentFrame.length >= 1) {
                int parent = parentFrame[0];
                ctx.lowLinks[parent] = Math.min(ctx.lowLinks[parent], ctx.lowLinks[node]);
            }
        }
    }

    private static class TarjanContext {
        final List<List<Integer>> adjacency;
        final int[] indices;
        final int[] lowLinks;
        final boolean[] onStack;
        final Deque<Integer> stack;
        final List<List<Integer>> components;
        int counter = 0;

        TarjanContext(int n, List<List<Integer>> adjacency) {
            this.adjacency = adjacency;
            this.indices = new int[n];
            this.lowLinks = new int[n];
            this.onStack = new boolean[n];
            java.util.Arrays.fill(this.indices, -1);
            this.stack = new ArrayDeque<>();
            this.components = new ArrayList<>();
        }
    }
}
