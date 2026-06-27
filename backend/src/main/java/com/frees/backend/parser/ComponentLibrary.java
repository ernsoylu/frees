package com.frees.backend.parser;

import com.frees.backend.ast.ComponentDef;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;

import java.util.List;

/**
 * The built-in standard component library — common thermo-fluid components
 * written in the frEES {@code COMPONENT} language and parsed once into
 * {@link ComponentDef}s that are available to every document (a user definition
 * of the same name overrides the built-in, see {@link ComponentExpander}).
 *
 * <p>Keeping the library in frEES source (rather than hand-built ASTs) keeps the
 * physics transparent and editable, and exercises the same parse path as
 * user-authored components. Property inputs use {@code (P, h)} so any state is
 * recoverable from a stream's canonical members; turbine/compressor isentropic
 * targets use {@code (P, s)}.
 *
 * <p><b>No defaults — every parameter is required.</b> A silent default for a
 * physical input (a pipe length, a fluid, an efficiency) is a footgun: a model
 * of an R134a system that forgets {@code fluid$} should error, not quietly run
 * as water. So all library parameters must be supplied at instantiation; an
 * omission is a clear parse error. (The optional-default <em>language feature</em>
 * remains available for user-authored components that genuinely want it.)
 */
public final class ComponentLibrary {

    private ComponentLibrary() {}

    /**
     * The built-in component library, split into per-domain frEES source files
     * under {@code resources/components/*.frees} (Phase L reorganization). They
     * are concatenated, in a fixed order, into the single {@code SOURCE} string
     * that is parsed once into the immutable {@link #BUILTINS} registry — same
     * parse-once, shared-immutable runtime as before, just maintainable per
     * domain as the two-phase/AC catalog grows. (No memory change: the library is
     * tens of KB parsed once and shared across all requests.)
     */
    private static final List<String> DOMAIN_FILES = List.of(
            "fluid", "liquid", "twophase", "heat", "electrical", "mechanical",
            "powertrain", "control", "moistair", "pneumatic", "hydraulic");

    static final String SOURCE = loadSource();

    private static String loadSource() {
        StringBuilder sb = new StringBuilder();
        for (String domain : DOMAIN_FILES) {
            String path = "/components/" + domain + ".frees";
            try (java.io.InputStream in = ComponentLibrary.class.getResourceAsStream(path)) {
                if (in == null) {
                    throw new IllegalStateException("Missing built-in component resource: " + path);
                }
                sb.append(new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
                  .append("\n\n");
            } catch (java.io.IOException e) {
                throw new IllegalStateException("Failed to read component resource " + path, e);
            }
        }
        return sb.toString();
    }

    private static final List<ComponentDef> BUILTINS = parse(SOURCE);

    /** The parsed built-in component definitions (immutable). */
    public static List<ComponentDef> builtins() {
        return BUILTINS;
    }

    private static List<ComponentDef> parse(String source) {
        EquationParser.CollectingErrorListener errors = new EquationParser.CollectingErrorListener();
        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);
        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);
        FreesParser.ProgramContext program = parser.program();
        if (!errors.errors.isEmpty()) {
            throw new IllegalStateException(
                    "Built-in component library failed to parse: " + String.join("\n", errors.errors));
        }
        return List.copyOf(new AstBuilder().buildProgram(program).componentDefs());
    }
}
