package com.frees.backend.ast;

import java.util.List;
import java.util.Map;

/**
 * One instantiation of a {@link ComponentDef}:
 * {@code Pump P1(s3, s4, eta=0.8, fluid$=Water)}.
 *
 * <p>{@code portArgs} are the stream names bound to the component's ports in
 * declaration order (shared-name connection: two instances naming the same
 * stream are joined). {@code params} are name=value overrides of the
 * component's defaults. {@link com.frees.backend.parser.ComponentExpander}
 * consumes these to expand the component body into scalar equations.
 */
public record ComponentInst(String type, String name,
                            List<String> portArgs, Map<String, Expr> params,
                            String sourceText)
        implements java.io.Serializable {}
