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
            throw new SolverException(causalityDiagnosis(equations, allVars));
        }

        return matchEquationsToVariables(equations, allVars);
    }

    /**
     * Names the causality hole instead of dumping counts: runs the maximum
     * matching anyway and reports (a) the exact unmatched variables — the
     * quantities no equation determines — and (b) the full underdetermined
     * group (every variable reachable from an unmatched one by alternating
     * paths, the Dulmage–Mendelsohn under-determined part), so the modeler
     * sees which component chain leaves a flow/pressure free. Overdetermined
     * systems symmetrically name the unmatched (redundant) equations. This is
     * the acausal counterpart of the C/R causality discipline in
     * lumped-network tools: instead of forbidding topologies, frees points at
     * the element whose constitutive law is missing or duplicated.
     *
     * <p>Public entry for other structural checkers (e.g. the DAE assembler):
     * the same named diagnosis over an arbitrary equation set.
     */
    public static String diagnose(List<Equation> equations) {
        Set<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }
        return new Blocker().causalityDiagnosis(equations, allVars);
    }

    private String causalityDiagnosis(List<Equation> equations, Set<String> allVars) {
        boolean under = equations.size() < allVars.size();
        MatchingResult mr = runMatching(equations, allVars);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("There are %d equations and %d variables. The problem is %s "
                        + "and cannot be solved.",
                equations.size(), allVars.size(), under ? "underspecified" : "overspecified"));
        if (under) {
            appendFreeQuantities(sb, equations, allVars, mr);
        } else {
            appendRedundantRelations(sb, equations, mr);
        }
        return sb.toString();
    }

    private void appendFreeQuantities(StringBuilder sb, List<Equation> equations,
                                      Set<String> allVars, MatchingResult mr) {
        List<String> freeFlat = new ArrayList<>();
        for (String v : allVars) {
            if (!mr.matchedVars.contains(v)) {
                freeFlat.add(v);
            }
        }
        List<String> free = freeFlat.stream().map(v -> v.replace('$', '.')).toList();
        sb.append(" Free quantit").append(free.size() == 1 ? "y" : "ies")
          .append(" (no defining relation): ").append(limit(free, 8)).append('.');
        Set<String> group = alternatingReachable(equations, mr, free.size());
        freeFlat.forEach(group::remove);
        if (!group.isEmpty()) {
            List<String> disp = group.stream().sorted().limit(12)
                    .map(v -> v.replace('$', '.')).toList();
            sb.append(" Coupled to: ").append(String.join(", ", disp))
              .append(group.size() > 12 ? ", …" : "").append('.');
        }
        sb.append(" A common cause: an element chain with no constitutive law for that "
                + "quantity — e.g. an efficiency-only machine or rigid pass-through "
                + "between boundaries leaves its through-flow or a port pressure free; "
                + "add an orifice/valve/flow-map element or pin a boundary value.");
    }

    private void appendRedundantRelations(StringBuilder sb, List<Equation> equations,
                                          MatchingResult mr) {
        List<String> redundant = new ArrayList<>();
        for (int i = 0; i < equations.size() && redundant.size() < 4; i++) {
            if (!mr.matchedEqs.contains(i)) {
                redundant.add(equations.get(i).sourceText());
            }
        }
        sb.append(" Redundant relation").append(redundant.size() == 1 ? "" : "s")
          .append(" (no free variable left to determine): ")
          .append(String.join("; ", redundant)).append('.')
          .append(" A common cause: the same physics stated twice — a boundary pinning "
                + "a quantity a component already defines (a re-equated mixer pressure, "
                + "a T-pinned wall state), or two property calls restating one relation.");
    }

    private static String limit(List<String> items, int n) {
        return String.join(", ", items.subList(0, Math.min(n, items.size())))
                + (items.size() > n ? ", …" : "");
    }

    /** Variables reachable from the unmatched variables via alternating paths
     *  (var → any equation using it → that equation's matched variable → …):
     *  the whole structurally-underdetermined family. */
    private Set<String> alternatingReachable(List<Equation> equations, MatchingResult mr, int seeds) {
        if (seeds == 0) {
            return Set.of();
        }
        Map<String, List<Integer>> varToEqs = variableUsageIndex(equations);
        Deque<String> frontier = new ArrayDeque<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String v : varToEqs.keySet()) {
            if (!mr.matchedVars.contains(v)) {
                frontier.add(v);
                seen.add(v);
            }
        }
        Set<Integer> seenEq = new java.util.HashSet<>();
        while (!frontier.isEmpty()) {
            String v = frontier.poll();
            for (int eq : varToEqs.getOrDefault(v, List.of())) {
                String matched = seenEq.add(eq) ? mr.eqToVar.get(eq) : null;
                if (matched != null && seen.add(matched)) {
                    frontier.add(matched);
                }
            }
        }
        return seen;
    }

    private static Map<String, List<Integer>> variableUsageIndex(List<Equation> equations) {
        Map<String, List<Integer>> varToEqs = new HashMap<>();
        for (int i = 0; i < equations.size(); i++) {
            for (String v : equations.get(i).variables()) {
                varToEqs.computeIfAbsent(v, k -> new ArrayList<>()).add(i);
            }
        }
        return varToEqs;
    }

    /** A maximum matching plus its coverage sets, for diagnosis. */
    private record MatchingResult(Map<Integer, String> eqToVar,
                                  Set<String> matchedVars,
                                  Set<Integer> matchedEqs) {}

    private MatchingResult runMatching(List<Equation> equations, Set<String> allVars) {
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
        Map<Integer, String> eqToVar = new HashMap<>();
        Set<String> matchedVars = new LinkedHashSet<>();
        Set<Integer> matchedEqs = new java.util.HashSet<>();
        for (DefaultEdge edge : matching.getEdges()) {
            String source = graph.getEdgeSource(edge);
            String target = graph.getEdgeTarget(edge);
            String eqNode = source.startsWith("eq:") ? source : target;
            String varNode = source.startsWith("eq:") ? target : source;
            int eq = Integer.parseInt(eqNode.substring(3));
            String varName = varNode.substring(4);
            eqToVar.put(eq, varName);
            matchedVars.add(varName);
            matchedEqs.add(eq);
        }
        return new MatchingResult(eqToVar, matchedVars, matchedEqs);
    }

    private Map<Integer, String> matchEquationsToVariables(List<Equation> equations,
                                                           Set<String> allVars) {
        MatchingResult mr = runMatching(equations, allVars);
        if (mr.matchedEqs.size() != equations.size()) {
            // Square but singular: equal counts with no perfect matching means a
            // subset is overdetermined while another is underdetermined — name
            // both sides with the same causality diagnosis.
            throw new SolverException("The equation system is structurally singular: no complete "
                    + "assignment of equations to variables exists. "
                    + causalityDiagnosis(equations, allVars));
        }
        return mr.eqToVar;
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
        // Iterative Tarjan to avoid stack overflow on large systems (real-world
        // problems may have thousands of equations).
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
