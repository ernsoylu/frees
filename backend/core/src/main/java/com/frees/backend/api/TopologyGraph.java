package com.frees.backend.api;

import com.frees.backend.ast.ComponentInst;
import com.frees.backend.ast.ConnectDecl;
import com.frees.backend.parser.AstBuilder;
import com.frees.backend.parser.FreesLexer;
import com.frees.backend.parser.FreesParser;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Read-only Mermaid topology emitter (§14.2). Renders a document's COMPONENT
 * network — instances as nodes, connections as edges — into a Mermaid
 * {@code flowchart} string the frontend draws for instant visual validation of a
 * code-based model. It is a diagnostic view (itself code, Mermaid markup),
 * explicitly distinct from the interactive Diagram editor.
 *
 * <p>Edges come from both connection models: a {@code connect(a, b, …)} links the
 * instances whose ports it ties, and shared-name binding links two instances that
 * name the same stream positionally.
 */
public final class TopologyGraph {

    private TopologyGraph() {}

    /** Builds the Mermaid flowchart for the COMPONENT network in {@code source};
     *  returns null when the document has no components (nothing to draw). */
    public static String mermaid(String source) {
        AstBuilder.ProgramResult program;
        try {
            program = parse(source);
        } catch (RuntimeException e) {
            return null;   // a topology view never blocks a solve on a parse hiccup
        }
        List<ComponentInst> insts = program.componentInsts();
        if (insts.isEmpty()) {
            return null;
        }

        StringBuilder sb = new StringBuilder("flowchart LR\n");
        Map<String, String> nodeId = new LinkedHashMap<>();
        int n = 0;
        for (ComponentInst inst : insts) {
            String id = "n" + (n++);
            nodeId.put(inst.name(), id);
            sb.append("  ").append(id).append("[\"")
                    .append(escape(inst.name())).append("<br/>").append(escape(inst.type()))
                    .append("\"]\n");
        }

        Set<String> edges = new LinkedHashSet<>();
        // Shared-name binding: instances naming the same positional stream are tied.
        Map<String, List<String>> streamInsts = new LinkedHashMap<>();
        for (ComponentInst inst : insts) {
            for (String stream : inst.portArgs()) {
                streamInsts.computeIfAbsent(stream.toLowerCase(), k -> new ArrayList<>()).add(inst.name());
            }
        }
        for (List<String> shared : streamInsts.values()) {
            for (int i = 0; i + 1 < shared.size(); i++) {
                addEdge(edges, nodeId, shared.get(i), shared.get(i + 1), null);
            }
        }
        // connect(...) endpoints: link the instances they tie.
        for (ConnectDecl c : program.connects()) {
            List<String> connectInsts = new ArrayList<>();
            for (String ref : c.ports()) {
                int dot = ref.indexOf('.');
                String name = dot > 0 ? ref.substring(0, dot) : ref;
                if (nodeId.containsKey(name)) {
                    connectInsts.add(name);
                }
            }
            for (int i = 0; i + 1 < connectInsts.size(); i++) {
                addEdge(edges, nodeId, connectInsts.get(i), connectInsts.get(i + 1), null);
            }
        }
        edges.forEach(e -> sb.append("  ").append(e).append('\n'));
        return sb.toString();
    }

    private static void addEdge(Set<String> edges, Map<String, String> nodeId,
                                String a, String b, String label) {
        String ia = nodeId.get(a);
        String ib = nodeId.get(b);
        if (ia == null || ib == null || ia.equals(ib)) {
            return;
        }
        // Canonical order so A–B and B–A collapse to one edge.
        String lo = ia.compareTo(ib) <= 0 ? ia : ib;
        String hi = ia.compareTo(ib) <= 0 ? ib : ia;
        edges.add(lo + " --- " + hi);
    }

    private static String escape(String s) {
        return s.replace("\"", "'");
    }

    private static AstBuilder.ProgramResult parse(String source) {
        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        return new AstBuilder().buildProgram(parser.program());
    }
}
