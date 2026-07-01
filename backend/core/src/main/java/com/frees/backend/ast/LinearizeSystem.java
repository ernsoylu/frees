package com.frees.backend.ast;

import java.util.List;

/**
 * A {@code LINEARIZE … END} block (Phase 4, plant → control coupling). It names a
 * transient component network (a {@link DynamicSystem} by {@code dynamicName})
 * and the exogenous {@code inputs} / observed {@code outputs}; at solve time the
 * solver numerically linearizes that network about its operating point into the
 * state-space matrices {@code A, B, C, D} (output variable names from the header,
 * defaulting to {@code A/B/C/D}), which then feed the control suite
 * ({@code ss}/{@code lqr}/{@code place}/…).
 *
 * @param name        block name (diagnostics)
 * @param dynamicName the DYNAMIC block whose component network is linearized
 * @param aName       matrix variable name for A (state matrix), etc.
 * @param inputs      exogenous input variable names (dotted display names)
 * @param outputs     observed output variable names (dotted display names)
 */
public record LinearizeSystem(String name, String dynamicName,
                              String aName, String bName, String cName, String dName,
                              List<String> inputs, List<String> outputs,
                              String sourceText) implements java.io.Serializable {}
