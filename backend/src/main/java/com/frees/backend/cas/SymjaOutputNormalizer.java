package com.frees.backend.cas;

/**
 * Rewrites a Symja output string into something the frees expression parser
 * accepts.
 *
 * <p>Symja prints function calls with parentheses (e.g. {@code Cos(x)^2}), which
 * the frees grammar already accepts, and the frees AST lowercases every function
 * name on construction, so {@code Cos}, {@code Sqrt}, {@code ArcTan}, ... map to
 * their frees equivalents automatically. The only names that genuinely differ
 * are the logarithms: Symja's {@code Log} is the natural log (frees {@code ln})
 * and {@code Log10} is base-10 (frees {@code log10}).
 */
final class SymjaOutputNormalizer {

    private SymjaOutputNormalizer() {
    }

    static String normalize(String symjaOutput) {
        // Order matters: rewrite Log10 before the bare Log so the "10" survives.
        return symjaOutput
                .replace("Log10(", "log10(")
                .replace("Log(", "ln(");
    }
}
