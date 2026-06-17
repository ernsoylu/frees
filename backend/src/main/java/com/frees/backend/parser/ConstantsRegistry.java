package com.frees.backend.parser;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Built-in physical and mathematical constants (EES convention: a trailing
 * '#' marks a constant, e.g. pi#, R#, g#, sigma#).
 *
 * Constants are substituted at parse time as numeric literals carrying their
 * SI unit, so the unit checker can ground downstream variables. Names are
 * matched case-insensitively. Because the language reserves the '#' suffix for
 * built-ins, these never collide with user variable names (a user's {@code R}
 * is distinct from the constant {@code R#}).
 */
public final class ConstantsRegistry {

    /** A built-in constant: canonical display name (e.g. R#), SI value, SI unit
     * string (null = dimensionless), and a human label. */
    public record Constant(String name, double value, String unit, String description) {}

    private static final Map<String, Constant> CONSTANTS = new LinkedHashMap<>();

    private static void define(String name, double value, String unit, String description) {
        CONSTANTS.put(name.toLowerCase(), new Constant(name, value, unit, description));
    }

    static {
        // Mathematical
        define("pi#", Math.PI, null, "Ratio of a circle's circumference to its diameter");
        define("e#", Math.E, null, "Euler's number (base of the natural logarithm)");

        // Universal physical constants (CODATA / SI exact where applicable)
        define("R#", 8.314462618, "J/mol-K", "Universal (molar) gas constant");
        define("g#", 9.80665, "m/s^2", "Standard acceleration of gravity");
        define("Na#", 6.02214076e23, "1/mol", "Avogadro constant");
        define("k#", 1.380649e-23, "J/K", "Boltzmann constant");
        define("h#", 6.62607015e-34, "J-s", "Planck constant");
        define("c#", 299792458.0, "m/s", "Speed of light in vacuum");
        define("sigma#", 5.670374419e-8, "W/m^2-K^4", "Stefan-Boltzmann constant");
        define("Gc#", 6.67430e-11, "m^3/kg-s^2", "Newtonian constant of gravitation");
        define("qe#", 1.602176634e-19, "Coulomb", "Elementary charge");
    }

    private ConstantsRegistry() {}

    /** The constant for the given identifier, or null if the name is not a built-in. */
    public static Constant lookup(String name) {
        if (name == null) {
            return null;
        }
        return CONSTANTS.get(name.toLowerCase());
    }

    /** Unmodifiable view of all built-in constants, keyed by lowercased name. */
    public static Map<String, Constant> all() {
        return java.util.Collections.unmodifiableMap(CONSTANTS);
    }

    /** All built-in constants in declaration order, for the Help reference. */
    public static java.util.List<Constant> list() {
        return java.util.List.copyOf(CONSTANTS.values());
    }
}
