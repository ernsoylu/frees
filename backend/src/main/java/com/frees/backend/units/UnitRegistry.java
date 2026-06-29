package com.frees.backend.units;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Engineering unit table and unit-expression parser.
 *
 * Rules honored here:
 *  - dash, space, star, or dot multiply units on the same side of the divisor
 *  - at most one '/' per unit term; everything to its right is the denominator
 *  - exponents may be written with or without '^' (m^2 == m2), negatives allowed
 *  - unit names are case-insensitive
 *  - '-' (alone) is the explicit dimensionless marker
 */
public final class UnitRegistry {

    public static class UnknownUnitException extends RuntimeException {
        public UnknownUnitException(String message) {
            super(message);
        }
    }

    private static final String DIMS_LABEL = ", dims=";
    private static final Map<String, Quantity> UNITS = new HashMap<>();

    /** SI symbols whose meaning depends on letter case (H henry vs h hour). */
    private static final Map<String, Quantity> CASE_SENSITIVE_UNITS = new HashMap<>();

    // dims index: [kg, m, s, K, mol, A, cd]
    private static void define(String name, double factor, double... exponents) {
        double[] dims = new double[Quantity.DIMENSIONS];
        System.arraycopy(exponents, 0, dims, 0, exponents.length);
        UNITS.put(name.toLowerCase(), new Quantity(factor, dims));
    }

    private static void defineCaseSensitive(String name, double factor, double... exponents) {
        double[] dims = new double[Quantity.DIMENSIONS];
        System.arraycopy(exponents, 0, dims, 0, exponents.length);
        CASE_SENSITIVE_UNITS.put(name, new Quantity(factor, dims));
    }

    static {
        // Dimensionless
        define("1", 1.0);
        define("rad", 1.0);
        define("deg", Math.PI / 180.0);
        define("db", 1.0);

        // Mass
        define("kg", 1.0, 1);
        define("g", 1e-3, 1);
        define("mg", 1e-6, 1);
        define("lbm", 0.45359237, 1);
        define("lb", 0.45359237, 1);
        define("lbs", 0.45359237, 1);
        define("slug", 14.59390294, 1);
        define("tonne", 1000.0, 1);

        // Length
        define("m", 1.0, 0, 1);
        define("cm", 0.01, 0, 1);
        define("mm", 0.001, 0, 1);
        define("km", 1000.0, 0, 1);
        define("in", 0.0254, 0, 1);
        define("inch", 0.0254, 0, 1);
        define("ft", 0.3048, 0, 1);
        define("yd", 0.9144, 0, 1);
        define("mile", 1609.344, 0, 1);

        // Time
        define("s", 1.0, 0, 0, 1);
        define("sec", 1.0, 0, 0, 1);
        define("secs", 1.0, 0, 0, 1);
        define("second", 1.0, 0, 0, 1);
        define("seconds", 1.0, 0, 0, 1);
        define("ms", 1e-3, 0, 0, 1);
        define("millisecond", 1e-3, 0, 0, 1);
        define("milliseconds", 1e-3, 0, 0, 1);
        define("us", 1e-6, 0, 0, 1);
        define("microsecond", 1e-6, 0, 0, 1);
        define("microseconds", 1e-6, 0, 0, 1);
        define("ns", 1e-9, 0, 0, 1);
        define("nanosecond", 1e-9, 0, 0, 1);
        define("nanoseconds", 1e-9, 0, 0, 1);
        define("min", 60.0, 0, 0, 1);
        define("mins", 60.0, 0, 0, 1);
        define("minute", 60.0, 0, 0, 1);
        define("minutes", 60.0, 0, 0, 1);
        define("hr", 3600.0, 0, 0, 1);
        define("hrs", 3600.0, 0, 0, 1);
        define("hour", 3600.0, 0, 0, 1);
        define("hours", 3600.0, 0, 0, 1);
        defineCaseSensitive("h", 3600.0, 0, 0, 1);
        define("day", 86400.0, 0, 0, 1);
        define("days", 86400.0, 0, 0, 1);
        define("week", 604800.0, 0, 0, 1);
        define("weeks", 604800.0, 0, 0, 1);
        define("year", 3.1536e7, 0, 0, 1);
        define("years", 3.1536e7, 0, 0, 1);
        define("yr", 3.1536e7, 0, 0, 1);

        // Temperature (multiplicative scale only; Convert is multiplicative)
        define("k", 1.0, 0, 0, 0, 1);
        define("c", 1.0, 0, 0, 0, 1);
        define("r", 5.0 / 9.0, 0, 0, 0, 1);
        define("f", 5.0 / 9.0, 0, 0, 0, 1);

        // Amount / current / luminosity
        define("mol", 1.0, 0, 0, 0, 0, 1);
        define("kmol", 1000.0, 0, 0, 0, 0, 1);
        define("a", 1.0, 0, 0, 0, 0, 0, 1);
        define("ma", 1e-3, 0, 0, 0, 0, 0, 1);
        define("cd", 1.0, 0, 0, 0, 0, 0, 0, 1);

        // Force: kg·m/s²
        define("n", 1.0, 1, 1, -2);
        define("kn", 1e3, 1, 1, -2);
        define("mn", 1e6, 1, 1, -2);
        define("lbf", 4.4482216152605, 1, 1, -2);
        define("dyne", 1e-5, 1, 1, -2);

        // Pressure: kg/(m·s²)
        define("pa", 1.0, 1, -1, -2);
        define("kpa", 1e3, 1, -1, -2);
        define("mpa", 1e6, 1, -1, -2);
        define("gpa", 1e9, 1, -1, -2);
        define("bar", 1e5, 1, -1, -2);
        define("atm", 101325.0, 1, -1, -2);
        define("psi", 6894.757293168, 1, -1, -2);
        define("psia", 6894.757293168, 1, -1, -2);
        define("torr", 133.3223684, 1, -1, -2);
        define("mmhg", 133.3223684, 1, -1, -2);

        // Energy: kg·m²/s²
        define("j", 1.0, 1, 2, -2);
        define("kj", 1e3, 1, 2, -2);
        define("mj", 1e6, 1, 2, -2);
        define("btu", 1055.05585262, 1, 2, -2);
        define("cal", 4.1868, 1, 2, -2);
        define("kcal", 4186.8, 1, 2, -2);
        define("kwh", 3.6e6, 1, 2, -2);

        // Power: kg·m²/s³
        define("w", 1.0, 1, 2, -3);
        define("kw", 1e3, 1, 2, -3);
        define("mw", 1e6, 1, 2, -3);
        define("hp", 745.69987158, 1, 2, -3);

        // Volume
        define("l", 1e-3, 0, 3);
        define("liter", 1e-3, 0, 3);
        define("ml", 1e-6, 0, 3);
        define("gal", 0.003785411784, 0, 3);

        // Frequency: Hz = s⁻¹
        define("hz", 1.0, 0, 0, -1);
        define("hertz", 1.0, 0, 0, -1);
        define("khz", 1e3, 0, 0, -1);
        define("mhz", 1e6, 0, 0, -1);
        define("ghz", 1e9, 0, 0, -1);

        // Angular velocity: rad/s (rad is dimensionless, so this is s⁻¹).
        // rpm = revolutions per minute = 2π rad / 60 s.
        define("rpm", 2.0 * Math.PI / 60.0, 0, 0, -1);

        // Electrical: derived from kg, m, s, A
        // Voltage: V = kg·m²·s⁻³·A⁻¹
        define("v", 1.0, 1, 2, -3, 0, 0, -1);
        define("kv", 1e3, 1, 2, -3, 0, 0, -1);
        define("mv", 1e-3, 1, 2, -3, 0, 0, -1);

        // Resistance: Ω = kg·m²·s⁻³·A⁻²
        define("Ω", 1.0, 1, 2, -3, 0, 0, -2);
        define("ohm", 1.0, 1, 2, -3, 0, 0, -2);
        define("ohms", 1.0, 1, 2, -3, 0, 0, -2);
        define("kohm", 1e3, 1, 2, -3, 0, 0, -2);
        define("mohm", 1e6, 1, 2, -3, 0, 0, -2);

        // Capacitance: F = s⁴·A²·kg⁻¹·m⁻²
        define("farad", 1.0, -1, -2, 4, 0, 0, 2);
        define("uf", 1e-6, -1, -2, 4, 0, 0, 2);
        define("nf", 1e-9, -1, -2, 4, 0, 0, 2);
        define("pf", 1e-12, -1, -2, 4, 0, 0, 2);

        // Inductance: H = kg·m²·s⁻²·A⁻²
        define("henry", 1.0, 1, 2, -2, 0, 0, -2);
        defineCaseSensitive("H", 1.0, 1, 2, -2, 0, 0, -2);
        define("mh", 1e-3, 1, 2, -2, 0, 0, -2);
        define("uh", 1e-6, 1, 2, -2, 0, 0, -2);

        // Charge: C = A·s
        define("coulomb", 1.0, 0, 0, 1, 0, 0, 1);
        define("couloumb", 1.0, 0, 0, 1, 0, 0, 1);
        define("uc", 1e-6, 0, 0, 1, 0, 0, 1);
        define("nc", 1e-9, 0, 0, 1, 0, 0, 1);
        define("pc", 1e-12, 0, 0, 1, 0, 0, 1);

        // Conductance: S = A²·s³·kg⁻¹·m⁻²
        define("siemens", 1.0, -1, -2, 3, 0, 0, 2);
        define("siemes", 1.0, -1, -2, 3, 0, 0, 2);
        define("msiemens", 1e-3, -1, -2, 3, 0, 0, 2);
        define("usiemens", 1e-6, -1, -2, 3, 0, 0, 2);

        // Magnetic flux: Wb = kg·m²·s⁻²·A⁻¹
        define("wb", 1.0, 1, 2, -2, 0, 0, -1);
        define("weber", 1.0, 1, 2, -2, 0, 0, -1);
        define("mwb", 1e-3, 1, 2, -2, 0, 0, -1);

        // Magnetic flux density: T = kg·s⁻²·A⁻¹
        define("tesla", 1.0, 1, 0, -2, 0, 0, -1);
        define("t", 1.0, 1, 0, -2, 0, 0, -1);
        define("mt", 1e-3, 1, 0, -2, 0, 0, -1);
        define("ut", 1e-6, 1, 0, -2, 0, 0, -1);
    }

    private static final Pattern FACTOR_PATTERN =
            Pattern.compile("(\\p{L}+)\\s*(?:\\^\\s*(-?\\d+(?:\\.\\d+)?)|(-?\\d+(?:\\.\\d+)?))?");

    private UnitRegistry() {}

    /** Parses a unit expression like "kJ/kg-K", "m^3", "Btu/hr-ft^2-R" or "-". */
    public static Quantity parse(String expression) {
        String text = expression.trim();
        if (text.isEmpty() || text.equals("-")) {
            return Quantity.dimensionless(1.0);
        }

        // Numerator is the first '/'-separated term; every subsequent term is a
        // denominator factor, so "W/m^2/K" reads as W/(m^2·K). (Dash/star/space
        // still mean multiplication *within* a term — see parseProduct.) This
        // matches engineering shorthand and how the correlation unit rules and
        // CoolProp property units are written (e.g. "kg/m^2/s", "W/m^2/K").
        String[] terms = text.split("/", -1);
        Quantity result = parseProduct(terms[0], expression);
        for (int i = 1; i < terms.length; i++) {
            result = result.divide(parseProduct(terms[i], expression));
        }
        return result;
    }

    private static Quantity parseProduct(String part, String full) {
        String trimmed = part.trim();
        if (trimmed.isEmpty() || trimmed.equals("1")) {
            return Quantity.dimensionless(1.0);
        }

        Quantity product = Quantity.dimensionless(1.0);
        // Dash, star, and whitespace mean multiplication in unit expressions. (Dot is
        // omitted so decimal exponents like m^1.5 survive; negative exponents
        // are unsupported — use the denominator instead, by convention.)
        for (String token : trimmed.split("[-*\\s]+")) {
            if (token.isEmpty() || token.equals("1")) {
                continue;
            }
            Matcher matcher = FACTOR_PATTERN.matcher(token);
            if (!matcher.matches()) {
                throw new UnknownUnitException("Cannot parse unit: '" + token
                        + "' in '" + full + "'");
            }
            String name = matcher.group(1);
            Quantity unit = CASE_SENSITIVE_UNITS.get(name);
            if (unit == null) {
                unit = UNITS.get(name.toLowerCase());
            }
            if (unit == null) {
                throw new UnknownUnitException("Unknown unit: '" + name + "' in '" + full + "'");
            }
            String exponentText = matcher.group(2) != null ? matcher.group(2) : matcher.group(3);
            double exponent = exponentText != null ? Double.parseDouble(exponentText) : 1.0;
            product = product.multiply(unit.pow(exponent));
        }
        return product;
    }

    private static final String[] BASE_SYMBOLS = {"kg", "m", "s", "K", "mol", "A", "cd"};

    record NamedUnit(String symbol, double[] dims) {
        @Override
        public boolean equals(Object o) {
            return o instanceof NamedUnit(String otherSymbol, double[] otherDims)
                    && java.util.Objects.equals(symbol, otherSymbol)
                    && java.util.Arrays.equals(dims, otherDims);
        }

        @Override
        public int hashCode() {
            int result = java.util.Objects.hashCode(symbol);
            result = 31 * result + java.util.Arrays.hashCode(dims);
            return result;
        }

        @Override
        public String toString() {
            return "NamedUnit[symbol=" + symbol + DIMS_LABEL + java.util.Arrays.toString(dims) + "]";
        }
    }

    private static final NamedUnit[] NAMED_SI_UNITS = {
            new NamedUnit("N", new double[]{1, 1, -2, 0, 0, 0, 0}),
            new NamedUnit("Pa", new double[]{1, -1, -2, 0, 0, 0, 0}),
            new NamedUnit("J", new double[]{1, 2, -2, 0, 0, 0, 0}),
            new NamedUnit("W", new double[]{1, 2, -3, 0, 0, 0, 0}),
            // Heat-capacity rate / thermal conductance, common in heat transfer.
            new NamedUnit("W/K", new double[]{1, 2, -3, -1, 0, 0, 0}),
            // Convective heat-transfer coefficient and heat flux — the htc/q'' that
            // pervade HX sizing; without these they print as kg/s^3-K and kg/s^3.
            new NamedUnit("W/m^2-K", new double[]{1, 0, -3, -1, 0, 0, 0}),
            new NamedUnit("W/m^2", new double[]{1, 0, -3, 0, 0, 0, 0}),
            // Engineering composites common in thermodynamics output.
            new NamedUnit("J/kg", new double[]{0, 2, -2, 0, 0, 0, 0}),
            new NamedUnit("J/kg-K", new double[]{0, 2, -2, -1, 0, 0, 0}),
            new NamedUnit("W/m-K", new double[]{1, 1, -3, -1, 0, 0, 0}),
            new NamedUnit("Pa-s", new double[]{1, -1, -1, 0, 0, 0, 0}),
            new NamedUnit("m/s", new double[]{0, 1, -1, 0, 0, 0, 0}),
            new NamedUnit("kg/m^3", new double[]{1, -3, 0, 0, 0, 0, 0}),
            new NamedUnit("m^3/kg", new double[]{-1, 3, 0, 0, 0, 0, 0}),
            new NamedUnit("V", new double[]{1, 2, -3, 0, 0, -1, 0}),
            new NamedUnit("Ω", new double[]{1, 2, -3, 0, 0, -2, 0}),
            new NamedUnit("Hz", new double[]{0, 0, -1, 0, 0, 0, 0}),
            new NamedUnit("Coulomb", new double[]{0, 0, 1, 0, 0, 1, 0}),
            new NamedUnit("Siemens", new double[]{-1, -2, 3, 0, 0, 2, 0}),
            new NamedUnit("Farad", new double[]{-1, -2, 4, 0, 0, 2, 0}),
            new NamedUnit("Henry", new double[]{1, 2, -2, 0, 0, -2, 0}),
            new NamedUnit("Wb", new double[]{1, 2, -2, 0, 0, -1, 0}),
            new NamedUnit("T", new double[]{1, 0, -2, 0, 0, -1, 0}),
    };

    /**
     * Canonical SI unit string for a dimension vector: named units (Pa, N, J,
     * W) where they match, otherwise a composed, re-parseable expression like
     * "kg/m-s^2" or "m/s^2". Dimensionless yields "-".
     */
    public static String siName(double[] dims) {
        boolean dimensionless = true;
        for (double d : dims) {
            if (Math.abs(d) > 1e-9) {
                dimensionless = false;
                break;
            }
        }
        if (dimensionless) {
            return "-";
        }

        for (NamedUnit named : NAMED_SI_UNITS) {
            boolean match = true;
            for (int i = 0; i < Quantity.DIMENSIONS; i++) {
                if (Math.abs(dims[i] - named.dims()[i]) > 1e-9) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return named.symbol();
            }
        }

        StringBuilder numerator = new StringBuilder();
        StringBuilder denominator = new StringBuilder();
        for (int i = 0; i < Quantity.DIMENSIONS; i++) {
            double e = dims[i];
            if (Math.abs(e) <= 1e-9) {
                continue;
            }
            StringBuilder target = e > 0 ? numerator : denominator;
            if (!target.isEmpty()) {
                target.append(e > 0 ? ' ' : '-');
            }
            target.append(BASE_SYMBOLS[i]);
            double abs = Math.abs(e);
            if (Math.abs(abs - 1.0) > 1e-9) {
                target.append('^').append(abs == Math.rint(abs)
                        ? String.valueOf((long) abs) : String.valueOf(abs));
            }
        }
        if (denominator.isEmpty()) {
            return numerator.toString();
        }
        return (numerator.isEmpty() ? "1" : numerator.toString()) + "/" + denominator;
    }

    /** Angular-rate units (s⁻¹) that engineers expect displayed as rad/s, not Hz. */
    private static final java.util.Set<String> ANGULAR_RATE_UNITS = java.util.Set.of(
            "rpm", "rad/s", "rad/sec", "radian/s", "radians/s",
            "rad/min", "rad/h", "rad/hr", "rad/hour");

    /**
     * SI display name for a value originally written with {@code originalUnit}.
     *
     * Angular-rate units (rpm, rad/s) are dimensionally identical to frequency
     * (s⁻¹) because radians are dimensionless, so {@link #siName} alone would
     * canonicalize them to "Hz". This preserves the engineer's intent and shows
     * "rad/s" instead; everything else defers to {@link #siName}.
     */
    public static String siDisplayName(String originalUnit, double[] dims) {
        if (originalUnit != null) {
            String normalized = originalUnit.trim().toLowerCase().replace(" ", "");
            if (ANGULAR_RATE_UNITS.contains(normalized)) {
                return "rad/s";
            }
        }
        return siName(dims);
    }

    /**
     * A unit with an affine relation to SI: si = factor * value + offset.
     * Offsets occur only for bare temperature units (C, F); compound
     * expressions like kJ/kg-C use the multiplicative (delta) scale.
     */
    public record OffsetQuantity(double factor, double offset, double[] dims) {
        @Override
        public boolean equals(Object o) {
            return o instanceof OffsetQuantity(double otherFactor, double otherOffset, double[] otherDims)
                    && Double.compare(factor, otherFactor) == 0
                    && Double.compare(offset, otherOffset) == 0
                    && java.util.Arrays.equals(dims, otherDims);
        }

        @Override
        public int hashCode() {
            int result = Double.hashCode(factor);
            result = 31 * result + Double.hashCode(offset);
            result = 31 * result + java.util.Arrays.hashCode(dims);
            return result;
        }

        @Override
        public String toString() {
            return "OffsetQuantity[factor=" + factor + ", offset=" + offset + DIMS_LABEL + java.util.Arrays.toString(dims) + "]";
        }
    }

    private static final double[] TEMPERATURE_DIMS = {0, 0, 0, 1, 0, 0, 0};
    public static final double FAHRENHEIT_OFFSET_K = 459.67 * 5.0 / 9.0;

    public static OffsetQuantity parseWithOffset(String expression) {
        String t = expression.trim().toLowerCase();
        if (t.equals("c")) {
            return new OffsetQuantity(1.0, 273.15, TEMPERATURE_DIMS.clone());
        }
        if (t.equals("f")) {
            return new OffsetQuantity(5.0 / 9.0, FAHRENHEIT_OFFSET_K, TEMPERATURE_DIMS.clone());
        }
        Quantity q = parse(expression);
        return new OffsetQuantity(q.factor(), 0.0, q.dims());
    }

    // ------------------------------------------------------------------
    // Display unit systems (Preferences): values are computed in SI and
    // converted for display only, the Mathcad/SMath model.
    // ------------------------------------------------------------------

    public enum UnitSystem { SI, ENG_SI, ENGLISH }

    /** display = (si - offset) / factor */
    public record DisplayUnit(String name, double factor, double offset, double[] dims) {
        @Override
        public boolean equals(Object o) {
            return o instanceof DisplayUnit(String otherName, double otherFactor, double otherOffset, double[] otherDims)
                    && java.util.Objects.equals(name, otherName)
                    && Double.compare(factor, otherFactor) == 0
                    && Double.compare(offset, otherOffset) == 0
                    && java.util.Arrays.equals(dims, otherDims);
        }

        @Override
        public int hashCode() {
            int result = java.util.Objects.hashCode(name);
            result = 31 * result + Double.hashCode(factor);
            result = 31 * result + Double.hashCode(offset);
            result = 31 * result + java.util.Arrays.hashCode(dims);
            return result;
        }

        @Override
        public String toString() {
            return "DisplayUnit[name=" + name + ", factor=" + factor + ", offset=" + offset + DIMS_LABEL + java.util.Arrays.toString(dims) + "]";
        }
    }

    private static DisplayUnit display(String name, double factor, double offset,
                                       double... exponents) {
        double[] dims = new double[Quantity.DIMENSIONS];
        System.arraycopy(exponents, 0, dims, 0, exponents.length);
        return new DisplayUnit(name, factor, offset, dims);
    }

    // Temperature is deliberately absent from both tables: a temperature
    // difference is dimensionally identical to an absolute temperature, so a
    // blanket affine C/F conversion would corrupt deltas (75 K difference is
    // not -198.15 C). Absolute display in C/F is opt-in per variable via the
    // Variable Information window.
    private static final List<DisplayUnit> ENG_SI_DISPLAY = List.of(
            display("kPa", 1e3, 0, 1, -1, -2),
            display("kJ", 1e3, 0, 1, 2, -2),
            display("kW", 1e3, 0, 1, 2, -3));

    private static final List<DisplayUnit> ENGLISH_DISPLAY = List.of(
            display("psi", 6894.757293168, 0, 1, -1, -2),
            display("Btu", 1055.05585262, 0, 1, 2, -2),
            display("hp", 745.69987158, 0, 1, 2, -3),
            display("lbf", 4.4482216152605, 0, 1, 1, -2),
            display("lbm", 0.45359237, 0, 1),
            display("ft", 0.3048, 0, 0, 1),
            display("ft^2", 0.09290304, 0, 0, 2),
            display("ft^3", 0.028316846592, 0, 0, 3),
            display("lbm/ft^3", 16.018463373960142, 0, 1, -3),
            display("ft/s", 0.3048, 0, 0, 1, -1),
            display("ft/s^2", 0.3048, 0, 0, 1, -2));

    /** Preferred display unit for a dimension in the given system; null = keep as-is. */
    public static DisplayUnit preferredDisplayUnit(double[] dims, UnitSystem system) {
        List<DisplayUnit> table = switch (system) {
            case SI -> List.of();
            case ENG_SI -> ENG_SI_DISPLAY;
            case ENGLISH -> ENGLISH_DISPLAY;
        };
        for (DisplayUnit candidate : table) {
            boolean match = true;
            for (int i = 0; i < Quantity.DIMENSIONS; i++) {
                if (Math.abs(dims[i] - candidate.dims()[i]) > 1e-9) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return candidate;
            }
        }
        return null;
    }

    /** A registered unit for the Help reference: its symbol, the SI dimension it
     * measures (e.g. "Pa", "m", "s", "-"), and its multiplicative factor to SI. */
    public record UnitInfo(String symbol, String dimension, double siFactor) {}

    /**
     * All registered units (case-insensitive and case-sensitive tables) for the
     * Help reference, sorted by dimension then symbol. Names are stored as the
     * language sees them (case-insensitive units are lowercased).
     */
    public static List<UnitInfo> listUnits() {
        List<UnitInfo> out = new java.util.ArrayList<>();
        for (Map.Entry<String, Quantity> e : UNITS.entrySet()) {
            out.add(new UnitInfo(e.getKey(), siName(e.getValue().dims()), e.getValue().factor()));
        }
        for (Map.Entry<String, Quantity> e : CASE_SENSITIVE_UNITS.entrySet()) {
            out.add(new UnitInfo(e.getKey(), siName(e.getValue().dims()), e.getValue().factor()));
        }
        out.sort(java.util.Comparator.comparing(UnitInfo::dimension).thenComparing(UnitInfo::symbol));
        return out;
    }

    /** Convert('From', 'To'): the multiplicative factor between two unit expressions. */
    public static double convert(String from, String to) {
        Quantity source = parse(from);
        Quantity target = parse(to);
        if (!source.sameDimensionsAs(target)) {
            throw new UnknownUnitException(String.format(
                    "Convert(%s, %s): units have different dimensions [%s] vs [%s].",
                    from, to, source.dimensionString(), target.dimensionString()));
        }
        return source.factor() / target.factor();
    }
}
