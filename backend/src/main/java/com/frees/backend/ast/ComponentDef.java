package com.frees.backend.ast;

import java.util.List;

/**
 * An acausal {@code COMPONENT … END} template — a reusable, parameterized set
 * of equations with typed ports, the building block of the system-modeling
 * layer (pseudo bond graph). It is analogous to {@link ProcDef.ModuleDef} but
 * instantiated by binding its ports to shared <em>streams</em> (so two
 * components naming the same stream are connected) rather than by a CALL.
 *
 * <p>Body equations reference port members through a dotted accessor
 * ({@code in.P}, {@code out.h}, {@code out.mdot}); a bare name in the body is
 * either a declared {@link Param} or a component-local variable / named output.
 * {@link com.frees.backend.parser.ComponentExpander} clones the body per
 * instance, rewriting ports to the bound stream variables, locals/outputs to
 * instance-namespaced variables, and parameters to their values, emitting flat
 * scalar equations the existing Newton/Tarjan solver handles unchanged.
 */
public record ComponentDef(String name, List<String> ports,
                           List<Param> params, List<Equation> body,
                           List<Variant> variants)
        implements java.io.Serializable {

    /**
     * A component parameter: its name (a trailing {@code $} marks a string
     * parameter, e.g. a fluid name), an optional default value, and whether it
     * is a string parameter. A string parameter's value is baked into the
     * encoded {@code prop$} property-call names of the body at expansion time.
     */
    public record Param(String name, Expr defaultValue, boolean isString)
            implements java.io.Serializable {}

    /**
     * A selectable physics variant ("one component, many models", e.g. a
     * compressor as isentropic-η / volumetric-η / map). The component's
     * {@code model$} parameter picks one variant by {@code name}; the chosen
     * variant's {@code body} equations are expanded alongside the shared
     * {@link ComponentDef#body()}. {@code require} lists the parameters that
     * variant needs — validated only when it is the selected one, so parameters
     * used solely by an unselected variant need not be supplied.
     */
    public record Variant(String name, List<String> require, List<Equation> body)
            implements java.io.Serializable {}

    /** The declared parameter with the given (lowercase) name, or null. */
    public Param param(String paramName) {
        String key = paramName.toLowerCase();
        for (Param p : params) {
            if (p.name().equals(key)) {
                return p;
            }
        }
        return null;
    }

    /** The variant with the given (lowercase) name, or null. */
    public Variant variant(String variantName) {
        String key = variantName.toLowerCase();
        for (Variant v : variants) {
            if (v.name().equals(key)) {
                return v;
            }
        }
        return null;
    }
}
