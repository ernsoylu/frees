package com.frees.backend.props;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Parses a chemical formula into element counts and computes its molar mass
 * from {@link PeriodicTable}. Supports nested parentheses and multipliers, e.g.
 * "C8H18", "Ca(OH)2", "Al2(SO4)3", "KNO3". Element symbols are case-sensitive
 * (one uppercase letter optionally followed by one lowercase letter).
 */
public final class ChemicalFormula {

    public static class FormulaException extends RuntimeException {
        public FormulaException(String message) {
            super(message);
        }
    }

    private final String formula;
    private int pos;

    private ChemicalFormula(String formula) {
        this.formula = formula;
    }

    /** Element -> atom count for the formula (insertion-ordered). */
    public static Map<String, Integer> parse(String formula) {
        if (formula == null || formula.isBlank()) {
            throw new FormulaException("Empty chemical formula.");
        }
        ChemicalFormula p = new ChemicalFormula(formula.trim());
        Map<String, Integer> counts = p.parseGroup();
        if (p.pos != p.formula.length()) {
            throw new FormulaException("Unexpected character at position " + p.pos
                    + " in formula '" + formula + "'.");
        }
        return counts;
    }

    /** Molar mass of the formula in g/mol. */
    public static double molarMassGramsPerMole(String formula) {
        double total = 0.0;
        for (Map.Entry<String, Integer> e : parse(formula).entrySet()) {
            double w = PeriodicTable.atomicWeight(e.getKey());
            if (Double.isNaN(w)) {
                throw new FormulaException("Unknown element '" + e.getKey()
                        + "' in formula '" + formula + "'.");
            }
            total += w * e.getValue();
        }
        return total;
    }

    private Map<String, Integer> parseGroup() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        while (pos < formula.length()) {
            char c = formula.charAt(pos);
            if (c == '(') {
                pos++;
                Map<String, Integer> inner = parseGroup();
                if (pos >= formula.length() || formula.charAt(pos) != ')') {
                    throw new FormulaException("Unbalanced parentheses in '" + formula + "'.");
                }
                pos++;
                int mult = readNumber();
                for (Map.Entry<String, Integer> e : inner.entrySet()) {
                    counts.merge(e.getKey(), e.getValue() * mult, Integer::sum);
                }
            } else if (c == ')') {
                break;
            } else if (Character.isUpperCase(c)) {
                String element = readElement();
                int n = readNumber();
                counts.merge(element, n, Integer::sum);
            } else {
                throw new FormulaException("Unexpected character '" + c + "' in '" + formula + "'.");
            }
        }
        return counts;
    }

    private String readElement() {
        int start = pos;
        pos++; // uppercase letter
        if (pos < formula.length() && Character.isLowerCase(formula.charAt(pos))) {
            pos++;
        }
        return formula.substring(start, pos);
    }

    /** Reads an optional trailing integer multiplier; absent means 1. */
    private int readNumber() {
        int start = pos;
        while (pos < formula.length() && Character.isDigit(formula.charAt(pos))) {
            pos++;
        }
        return pos == start ? 1 : Integer.parseInt(formula.substring(start, pos));
    }
}
