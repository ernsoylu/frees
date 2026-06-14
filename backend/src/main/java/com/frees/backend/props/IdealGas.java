package com.frees.backend.props;

import java.util.List;
import java.util.Map;

/**
 * Ideal-gas property functions: spelled chemical formulas (N2, CO2, ...)
 * are ideal gases whose enthalpy is referenced to the enthalpy of formation
 * at 298.15 K, 1 atm — the convention that makes combustion energy balances
 * work directly (h of CO2 at 25 C is -8941 kJ/kg, not 0). Full fluid names
 * (Nitrogen, CarbonDioxide) remain real fluids via CoolProp.
 *
 * Specific heats use standard cubic polynomial fits (JANAF-style data),
 * cp = a + bT + cT^2 + dT^3 [kJ/kmol-K], integrated in closed form for
 * enthalpy and entropy. Unlike CoolProp's real-fluid equations of state
 * (whose validity ends near 600-2000 K depending on the fluid), the
 * polynomials extrapolate smoothly through flame temperatures.
 *
 * All outputs are SI mass basis (J/kg, J/kg-K, m^3/kg); entropy is absolute
 * (third law), referenced to 1 atm.
 */
public final class IdealGas {

    /** Universal gas constant [kJ/kmol-K]. */
    private static final double R_U = 8.31446;
    private static final double T_REF = 298.15;
    private static final double P_REF = 101_325.0;

    /**
     * molarMass [kg/kmol], formation enthalpy hf [kJ/kmol] and absolute
     * entropy s0 [kJ/kmol-K] at 298.15 K / 1 atm, and the
     * cp(T) cubic coefficients [kJ/kmol-K] from standard thermochemical tables.
     */
    private record Species(double molarMass, double hf, double s0,
                           double a, double b, double c, double d) {}

    private static final Map<String, Species> SPECIES = Map.ofEntries(
            Map.entry("n2", new Species(28.013, 0.0, 191.61,
                    28.90, -0.1571e-2, 0.8081e-5, -2.873e-9)),
            Map.entry("o2", new Species(31.999, 0.0, 205.04,
                    25.48, 1.520e-2, -0.7155e-5, 1.312e-9)),
            Map.entry("co2", new Species(44.01, -393_520.0, 213.80,
                    22.26, 5.981e-2, -3.501e-5, 7.469e-9)),
            Map.entry("co", new Species(28.011, -110_530.0, 197.65,
                    28.16, 0.1675e-2, 0.5372e-5, -2.222e-9)),
            Map.entry("h2o", new Species(18.015, -241_820.0, 188.83,
                    32.24, 0.1923e-2, 1.055e-5, -3.595e-9)),
            Map.entry("h2", new Species(2.016, 0.0, 130.68,
                    29.11, -0.1916e-2, 0.4003e-5, -0.8704e-9)),
            Map.entry("ch4", new Species(16.043, -74_850.0, 186.16,
                    19.89, 5.024e-2, 1.269e-5, -11.01e-9)),
            Map.entry("c2h6", new Species(30.070, -84_680.0, 229.49,
                    6.900, 17.27e-2, -6.406e-5, 7.285e-9)),
            Map.entry("c3h8", new Species(44.097, -103_850.0, 269.91,
                    -4.04, 30.48e-2, -15.72e-5, 31.74e-9)),
            Map.entry("c4h10", new Species(58.124, -126_150.0, 310.12,
                    3.96, 37.15e-2, -18.34e-5, 35.00e-9)),
            Map.entry("c2h4", new Species(28.054, 52_280.0, 219.83,
                    3.95, 15.64e-2, -8.344e-5, 17.67e-9)),
            Map.entry("c2h2", new Species(26.038, 226_730.0, 200.85,
                    21.80, 9.2143e-2, -6.527e-5, 18.21e-9)),
            Map.entry("so2", new Species(64.065, -296_830.0, 248.11,
                    25.78, 5.795e-2, -3.812e-5, 8.612e-9)),
            Map.entry("no", new Species(30.006, 90_250.0, 210.76,
                    29.34, -0.09395e-2, 0.9747e-5, -4.187e-9)),
            Map.entry("no2", new Species(46.006, 33_180.0, 240.06,
                    22.90, 5.715e-2, -3.52e-5, 7.87e-9)));

    private IdealGas() {}

    /** Whether the (lowercased) fluid spelling is an ideal-gas formula. */
    public static boolean isIdealGas(String fluid) {
        return SPECIES.containsKey(fluid);
    }

    /** Molar enthalpy with formation reference [kJ/kmol]. */
    private static double hMolar(Species gas, double t) {
        return gas.hf()
                + gas.a() * (t - T_REF)
                + gas.b() / 2.0 * (t * t - T_REF * T_REF)
                + gas.c() / 3.0 * (t * t * t - T_REF * T_REF * T_REF)
                + gas.d() / 4.0 * (t * t * t * t - T_REF * T_REF * T_REF * T_REF);
    }

    /** Molar cp [kJ/kmol-K]. */
    private static double cpMolar(Species gas, double t) {
        return gas.a() + gas.b() * t + gas.c() * t * t + gas.d() * t * t * t;
    }

    /** Absolute molar entropy at (T, P) [kJ/kmol-K]. */
    private static double sMolar(Species gas, double t, double p) {
        double integral = gas.a() * Math.log(t / T_REF)
                + gas.b() * (t - T_REF)
                + gas.c() / 2.0 * (t * t - T_REF * T_REF)
                + gas.d() / 3.0 * (t * t * t - T_REF * T_REF * T_REF);
        return gas.s0() + integral - R_U * Math.log(p / P_REF);
    }

    /** kJ/kmol (or kJ/kmol-K) to J/kg (or J/kg-K). */
    private static double perMass(Species gas, double molar) {
        return molar * 1000.0 / gas.molarMass();
    }

    /** Inverts a monotone molar function of T by safeguarded Newton. */
    private static double temperatureFrom(double target,
                                          java.util.function.DoubleUnaryOperator f,
                                          java.util.function.DoubleUnaryOperator slope) {
        double t = 1000.0;
        for (int i = 0; i < 100; i++) {
            double error = f.applyAsDouble(t) - target;
            double step = error / slope.applyAsDouble(t);
            t = Math.clamp(t - step, 10.0, 20_000.0);
            if (Math.abs(step) < 1e-9 * Math.max(t, 1.0)) {
                return t;
            }
        }
        throw new PropertyEvaluationException(
                "Ideal-gas temperature lookup did not converge.");
    }

    /**
     * Evaluates an encoded ideal-gas call (see PropertyFunctions): parts are
     * [prop, output, fluid, indicator...], values the indicator values in SI.
     */
    public static double evaluate(String output, String[] parts, List<Double> values) {
        Species gas = SPECIES.get(parts[2]);
        String[] indicators = new String[parts.length - 3];
        System.arraycopy(parts, 3, indicators, 0, indicators.length);

        switch (output) {
            case "enthalpy", "intenergy", "cp", "specheat", "cv" -> {
                double t = singleIndicator(output, parts[2], indicators, values, "t");
                requirePositiveTemperature(t, parts[2]);
                return switch (output) {
                    case "enthalpy" -> perMass(gas, hMolar(gas, t));
                    case "intenergy" -> perMass(gas, hMolar(gas, t) - R_U * t);
                    case "cv" -> perMass(gas, cpMolar(gas, t) - R_U);
                    default -> perMass(gas, cpMolar(gas, t));
                };
            }
            case "entropy" -> {
                double[] tp = temperaturePressure(output, parts[2], indicators, values);
                requirePositiveTemperature(tp[0], parts[2]);
                return perMass(gas, sMolar(gas, tp[0], tp[1]));
            }
            case "volume", "density" -> {
                double[] tp = temperaturePressure(output, parts[2], indicators, values);
                double v = perMass(gas, R_U) * tp[0] / tp[1];
                return "volume".equals(output) ? v : 1.0 / v;
            }
            case "temperature" -> {
                if (indicators.length == 1 && "h".equals(indicators[0])) {
                    double target = values.get(0) * gas.molarMass() / 1000.0;
                    return temperatureFrom(target,
                            t -> hMolar(gas, t), t -> cpMolar(gas, t));
                }
                if (indicators.length == 2 && "s".equals(indicators[0])
                        && "p".equals(indicators[1])) {
                    double target = values.get(0) * gas.molarMass() / 1000.0;
                    double p = values.get(1);
                    return temperatureFrom(target,
                            t -> sMolar(gas, t, p), t -> cpMolar(gas, t) / t);
                }
                throw new IllegalStateException("Temperature(" + parts[2].toUpperCase()
                        + ", ...) takes h=... or s=..., P=... for an ideal gas.");
            }
            default -> throw new IllegalStateException("Function '" + output
                    + "' is not available for the ideal gas " + parts[2].toUpperCase()
                    + ". Use the full fluid name for real-fluid properties.");
        }
    }

    private static void requirePositiveTemperature(double t, String fluid) {
        if (t <= 0.0) {
            throw new PropertyEvaluationException(
                    "Ideal-gas properties of " + fluid.toUpperCase()
                            + " need an absolute temperature above 0 K, got " + t + ".");
        }
    }

    private static double singleIndicator(String output, String fluid,
                                          String[] indicators, List<Double> values,
                                          String expected) {
        if (indicators.length != 1 || !expected.equals(indicators[0])) {
            throw new IllegalStateException(capitalize(output) + "(" + fluid.toUpperCase()
                    + ", ...) is an ideal-gas function of temperature only, e.g. "
                    + capitalize(output) + "(" + fluid.toUpperCase() + ", T=300)");
        }
        return values.get(0);
    }

    private static double[] temperaturePressure(String output, String fluid,
                                                String[] indicators, List<Double> values) {
        if (indicators.length == 2 && "t".equals(indicators[0]) && "p".equals(indicators[1])) {
            return new double[] {values.get(0), values.get(1)};
        }
        if (indicators.length == 2 && "p".equals(indicators[0]) && "t".equals(indicators[1])) {
            return new double[] {values.get(1), values.get(0)};
        }
        throw new IllegalStateException(capitalize(output) + "(" + fluid.toUpperCase()
                + ", ...) needs T=... and P=... for an ideal gas, e.g. "
                + capitalize(output) + "(" + fluid.toUpperCase() + ", T=300, P=101325)");
    }

    private static String capitalize(String s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }
}
