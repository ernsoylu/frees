package com.frees.backend.ast;

/**
 * An in-text {@code GUESS} directive: the guess and/or bounds a document
 * declares for one variable, so the solver's starting point travels with the
 * text (shared links, diffs, copy-paste) instead of living only in the
 * Variable Information window. Absent parts are {@code null}; at least one
 * of guess or bounds is present (the builder rejects a bare directive).
 * The name is stored canonically lowercased.
 */
public record GuessDirective(String name, Double guess, Double lower, Double upper) {}
