package com.frees.backend.props;

import java.util.Map;

/**
 * Standard atomic weights (g/mol) for the elements, used to compute the molar
 * mass of an arbitrary chemical formula (see {@link ChemicalFormula}). Values
 * are IUPAC conventional atomic weights; sufficient for stoichiometry, mass
 * analysis and propellant calculations.
 */
public final class PeriodicTable {

    private static final Map<String, Double> WEIGHTS = Map.ofEntries(
            Map.entry("H", 1.008), Map.entry("He", 4.002602),
            Map.entry("Li", 6.94), Map.entry("Be", 9.0121831),
            Map.entry("B", 10.81), Map.entry("C", 12.011),
            Map.entry("N", 14.007), Map.entry("O", 15.999),
            Map.entry("F", 18.998403), Map.entry("Ne", 20.1797),
            Map.entry("Na", 22.989769), Map.entry("Mg", 24.305),
            Map.entry("Al", 26.981538), Map.entry("Si", 28.085),
            Map.entry("P", 30.973762), Map.entry("S", 32.06),
            Map.entry("Cl", 35.45), Map.entry("Ar", 39.948),
            Map.entry("K", 39.0983), Map.entry("Ca", 40.078),
            Map.entry("Sc", 44.955908), Map.entry("Ti", 47.867),
            Map.entry("V", 50.9415), Map.entry("Cr", 51.9961),
            Map.entry("Mn", 54.938044), Map.entry("Fe", 55.845),
            Map.entry("Co", 58.933194), Map.entry("Ni", 58.6934),
            Map.entry("Cu", 63.546), Map.entry("Zn", 65.38),
            Map.entry("Ga", 69.723), Map.entry("Ge", 72.630),
            Map.entry("As", 74.921595), Map.entry("Se", 78.971),
            Map.entry("Br", 79.904), Map.entry("Kr", 83.798),
            Map.entry("Rb", 85.4678), Map.entry("Sr", 87.62),
            Map.entry("Y", 88.90584), Map.entry("Zr", 91.224),
            Map.entry("Nb", 92.90637), Map.entry("Mo", 95.95),
            Map.entry("Ag", 107.8682), Map.entry("Cd", 112.414),
            Map.entry("Sn", 118.710), Map.entry("Sb", 121.760),
            Map.entry("I", 126.90447), Map.entry("Xe", 131.293),
            Map.entry("Cs", 132.905452), Map.entry("Ba", 137.327),
            Map.entry("Pt", 195.084), Map.entry("Au", 196.966569),
            Map.entry("Hg", 200.592), Map.entry("Pb", 207.2),
            Map.entry("Bi", 208.98040), Map.entry("W", 183.84),
            Map.entry("U", 238.02891), Map.entry("Th", 232.0377));

    private PeriodicTable() {}

    /** Standard atomic weight (g/mol) of an element symbol, or NaN if unknown. */
    public static double atomicWeight(String symbol) {
        Double w = WEIGHTS.get(symbol);
        return w == null ? Double.NaN : w;
    }

    public static boolean isElement(String symbol) {
        return WEIGHTS.containsKey(symbol);
    }
}
