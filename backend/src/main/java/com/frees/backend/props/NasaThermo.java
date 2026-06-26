package com.frees.backend.props;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Ideal-gas thermochemistry from NASA-7 two-range polynomials, the standard
 * basis for combustion calculations. Coefficients come from Cantera's GRI-Mech
 * 3.0 dataset (`resources/nasa7_species.json`, parsed verbatim), so enthalpies
 * are absolute (formation-referenced): h(CO2, 298.15 K) = -393.5 kJ/mol, etc.
 *
 * <p>Per species, two coefficient sets {a1..a7} cover a low and a high
 * temperature range:
 * <pre>
 *   cp/R   = a1 + a2 T + a3 T^2 + a4 T^3 + a5 T^4
 *   h/(RT) = a1 + a2 T/2 + a3 T^2/3 + a4 T^3/4 + a5 T^4/5 + a6/T
 *   s/R    = a1 ln T + a2 T + a3 T^2/2 + a4 T^3/3 + a5 T^4/4 + a7
 * </pre>
 * Molar outputs are J/mol-K and J/mol. This complements {@link IdealGas}, whose
 * cubic JANAF fits cover fuels (octane, alcohols) absent from GRI-Mech.
 */
public final class NasaThermo {

    /** Universal gas constant [J/mol-K]. */
    private static final double R = 8.314462618;
    /** Reference pressure for the tabulated entropy [Pa] (matches IdealGas). */
    private static final double P_REF = 101_325.0;

    private record Species(double mw, double[] tRanges, double[] low, double[] high,
                           double sigma, double epsK) {
        double[] coeffsFor(double t) {
            return t <= tRanges[1] ? low : high;
        }
    }

    private static final Map<String, Species> SPECIES = new HashMap<>();

    static {
        try (InputStream in = NasaThermo.class.getResourceAsStream("/nasa7_species.json")) {
            if (in == null) {
                throw new IllegalStateException("nasa7_species.json resource not found.");
            }
            JsonNode root = new ObjectMapper().readTree(in).get("species");
            root.fields().forEachRemaining(e -> {
                JsonNode s = e.getValue();
                double[] tr = arr(s.get("Tranges"));
                double[] low = arr(s.get("coeffs").get(0));
                double[] high = arr(s.get("coeffs").get(1));
                double sigma = s.hasNonNull("sigma") ? s.get("sigma").asDouble() : Double.NaN;
                double epsK = s.hasNonNull("epsk") ? s.get("epsk").asDouble() : Double.NaN;
                SPECIES.put(e.getKey().toUpperCase(),
                        new Species(s.get("M").asDouble(), tr, low, high, sigma, epsK));
            });
        } catch (Exception ex) {
            throw new ExceptionInInitializerError(ex);
        }
    }

    private NasaThermo() {}

    private static double[] arr(JsonNode n) {
        double[] a = new double[n.size()];
        for (int i = 0; i < a.length; i++) {
            a[i] = n.get(i).asDouble();
        }
        return a;
    }

    /** Canonical GRI-Mech key for a token (uppercased; argon spellings -> AR). */
    private static String key(String token) {
        String k = token.toUpperCase();
        return switch (k) {
            case "ARGON" -> "AR";
            default -> k;
        };
    }

    /** Whether NASA-7 coefficients are tabulated for the (case-insensitive) species. */
    public static boolean has(String token) {
        return SPECIES.containsKey(key(token));
    }

    private static Species species(String token) {
        Species s = SPECIES.get(key(token));
        if (s == null) {
            throw new PropertyEvaluationException(
                    "NASA-7 thermo: no data for species '" + token + "'.");
        }
        return s;
    }

    /** Molar mass [kg/kmol == g/mol]. */
    public static double molarMass(String token) {
        return species(token).mw();
    }

    /** Molar heat capacity at constant pressure [J/mol-K]. */
    public static double molarCp(String token, double t) {
        double[] c = species(token).coeffsFor(t);
        return R * (c[0] + c[1] * t + c[2] * t * t + c[3] * t * t * t + c[4] * t * t * t * t);
    }

    /** Absolute molar enthalpy (includes enthalpy of formation) [J/mol]. */
    public static double molarEnthalpy(String token, double t) {
        double[] c = species(token).coeffsFor(t);
        return R * t * (c[0] + c[1] * t / 2.0 + c[2] * t * t / 3.0
                + c[3] * t * t * t / 4.0 + c[4] * t * t * t * t / 5.0 + c[5] / t);
    }

    /** Absolute molar entropy at (T, partial pressure p) [J/mol-K]. */
    public static double molarEntropy(String token, double t, double p) {
        double[] c = species(token).coeffsFor(t);
        double s0 = R * (c[0] * Math.log(t) + c[1] * t + c[2] * t * t / 2.0
                + c[3] * t * t * t / 3.0 + c[4] * t * t * t * t / 4.0 + c[6]);
        return s0 - R * Math.log(p / P_REF);
    }

    /** Whether Lennard-Jones transport parameters are tabulated for the species. */
    public static boolean hasTransport(String token) {
        Species s = SPECIES.get(key(token));
        return s != null && !Double.isNaN(s.sigma()) && !Double.isNaN(s.epsK());
    }

    /** Lennard-Jones collision diameter sigma [Angstrom]. */
    public static double collisionDiameter(String token) {
        return species(token).sigma();
    }

    /** Lennard-Jones potential well depth eps/k [K]. */
    public static double wellDepth(String token) {
        return species(token).epsK();
    }
}
