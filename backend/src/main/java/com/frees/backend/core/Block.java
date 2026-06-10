package com.frees.backend.core;

import com.frees.backend.ast.Equation;

import java.util.List;

/**
 * A group of equations that must be solved simultaneously, together with the
 * variables this block determines. Blocks are produced in solve order.
 */
public record Block(int index, List<Equation> equations, List<String> variables) {
}
