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
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Decomposes an equation system into sequentially solvable blocks
 * (the EES "blocking" step).
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
     * EES-style structural solvability check: zero degrees of freedom and a
     * complete equation-to-variable assignment. Throws SolverException with an
     * EES-style message if the system cannot be solved; returns the matching
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
            throw new SolverException(String.format(
                    "There are %d equations and %d variables. The problem is %s and cannot be solved.",
                    equations.size(), allVars.size(), kind));
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
        for (String var : allVars) {
            String varNode = "var:" + var;
            varNodes.add(varNode);
            graph.addVertex(varNode);
        }
        for (int i = 0; i < equations.size(); i++) {
            for (String var : equations.get(i).variables()) {
                graph.addEdge("eq:" + i, "var:" + var);
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
        assignment.forEach((eq, var) -> varToEq.put(var, eq));

        List<List<Integer>> adjacency = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            List<Integer> edges = new ArrayList<>();
            for (String var : equations.get(i).variables()) {
                int j = varToEq.get(var);
                if (j != i) {
                    edges.add(j);
                }
            }
            adjacency.add(edges);
        }

        int[] indices = new int[n];
        int[] lowLinks = new int[n];
        boolean[] onStack = new boolean[n];
        java.util.Arrays.fill(indices, -1);
        Deque<Integer> stack = new ArrayDeque<>();
        List<List<Integer>> components = new ArrayList<>();
        int[] counter = {0};

        for (int v = 0; v < n; v++) {
            if (indices[v] == -1) {
                strongConnect(v, adjacency, indices, lowLinks, onStack, stack, components, counter);
            }
        }

        List<Block> blocks = new ArrayList<>();
        for (List<Integer> component : components) {
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

    private void strongConnect(int v, List<List<Integer>> adjacency, int[] indices,
                               int[] lowLinks, boolean[] onStack, Deque<Integer> stack,
                               List<List<Integer>> components, int[] counter) {
        // Iterative Tarjan to avoid stack overflow on large systems (EES
        // supports thousands of equations).
        Deque<int[]> work = new ArrayDeque<>();
        work.push(new int[]{v, 0});

        while (!work.isEmpty()) {
            int[] frame = work.peek();
            int node = frame[0];

            if (frame[1] == 0) {
                indices[node] = counter[0];
                lowLinks[node] = counter[0];
                counter[0]++;
                stack.push(node);
                onStack[node] = true;
            }

            boolean recursed = false;
            List<Integer> edges = adjacency.get(node);
            while (frame[1] < edges.size()) {
                int next = edges.get(frame[1]);
                frame[1]++;
                if (indices[next] == -1) {
                    work.push(new int[]{next, 0});
                    recursed = true;
                    break;
                } else if (onStack[next]) {
                    lowLinks[node] = Math.min(lowLinks[node], indices[next]);
                }
            }
            if (recursed) {
                continue;
            }

            if (lowLinks[node] == indices[node]) {
                List<Integer> component = new ArrayList<>();
                int popped;
                do {
                    popped = stack.pop();
                    onStack[popped] = false;
                    component.add(popped);
                } while (popped != node);
                components.add(component);
            }

            work.pop();
            if (!work.isEmpty()) {
                int parent = work.peek()[0];
                lowLinks[parent] = Math.min(lowLinks[parent], lowLinks[node]);
            }
        }
    }
}
