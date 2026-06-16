package com.frees.backend.ast;

import java.util.List;

/**
 * A fluid state table declared in the editor text with a
 * {@code STATE TABLE name(var1, var2, ...) ... END} block. Like a
 * {@link ParametricTable} or {@link PlotDef}, it never enters the equation
 * system: it groups the listed state-point variables into one circuit and
 * declares the fluid those states belong to, so property look-ups and the
 * frontend state table are fluid-aware.
 *
 * @param name      the circuit/table name (e.g. {@code WaterCircuit1})
 * @param variables the declared state-point variables, lowercased
 *                  (e.g. {@code [pw1, pw_2, tw1]}); their numeric values are
 *                  captured automatically from the solve
 * @param fluid     the CoolProp fluid for every state in this block (e.g.
 *                  {@code Water}, {@code R134a}); {@code null} if not declared
 */
public record StateTableDef(String name, List<String> variables, String fluid) {}
