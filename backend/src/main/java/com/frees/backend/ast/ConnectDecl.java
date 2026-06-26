package com.frees.backend.ast;

import java.util.List;

/**
 * One {@code connect(a, b, …)} declaration in the system-modeling layer.
 *
 * <p>Each entry of {@code ports} is a connection endpoint written with a dotted
 * accessor — a port reference {@code instance.port} (e.g. {@code HP.out}) or a
 * bare stream name. {@link com.frees.backend.parser.ComponentExpander} ties the
 * endpoints into one node: pressure and enthalpy equal across all of them, and
 * mass conserved (Σ inlet = Σ outlet). A {@code connect} that closes a loop adds
 * no new equation (the quantities are already forced equal through the chain),
 * which removes the over-determination of a closed cycle.
 */
public record ConnectDecl(List<String> ports, String sourceText)
        implements java.io.Serializable {}
