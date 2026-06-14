package com.frees.backend.ast;

import java.util.List;

/**
 * A parametric run-table declared in the editor text with a PARAMETRIC ... END
 * block. Unlike a {@link ProcDef}, it is not a callable definition and never
 * enters the equation system: it only describes a sweep (the declared variables
 * and the value of each column per row) that the frontend turns into a
 * Parametric Table and runs one solve per row. {@code rows} is row-major and
 * aligned to {@code vars}; a {@code null} cell means that column has no value
 * for that row.
 */
public record ParametricTable(String name, List<String> vars, List<List<Double>> rows) {}
