package com.frees.backend.props;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Cubic equation-of-state property backend (Soave-Redlich-Kwong and
 * Peng-Robinson) for the curated fluids in {@code resources/eos_fluids.json}.
 *
 * <p>This is a self-contained, dependency-free alternative to the CoolProp
 * native backend: it supports custom fluids and fluids CoolProp may lack, at the
 * accuracy of a two-parameter cubic EOS. P-v-T, the compressibility factor, the
 * enthalpy/entropy departure functions and the saturation pressure follow the
 * standard generalized-cubic formulation (e.g. Smith, Van Ness &amp; Abbott;
 * standard property-estimation references).
 *
 * <p>Enthalpy and entropy are returned on an EOS-self-consistent reference
 * (ideal-gas h = 0, s = 0 at 298.15 K, 1 bar), so <b>differences</b> are
 * physical but absolute values will not match CoolProp's reference state.
 * All outputs are SI mass-basis (Pa, m^3/kg, J/kg, J/kg-K).
 */
public final class CubicEos {

    /** Universal gas constant [J/mol-K]. */
    private static final double R = 8.314462618;
    private static final double T_REF = 298.15;
    private static final double P_REF = 1.0e5;

    /** Fluid critical/ideal-gas parameters. cp0 is molar [J/mol-K]. */
    public record Fluid(String name, double tc, double pc, double omega, double mw,
                        double[] cp0) {
        // equals/hashCode/toString consider array contents — java:S6218.
        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Fluid other)) {
                return false;
            }
            return Double.compare(tc, other.tc) == 0
                    && Double.compare(pc, other.pc) == 0
                    && Double.compare(omega, other.omega) == 0
                    && Double.compare(mw, other.mw) == 0
                    && Objects.equals(name, other.name)
                    && Arrays.equals(cp0, other.cp0);
        }

        @Override
        public int hashCode() {
            return 31 * Objects.hash(name, tc, pc, omega, mw) + Arrays.hashCode(cp0);
        }

        @Override
        public String toString() {
            return "Fluid[name=" + name + ", tc=" + tc + ", pc=" + pc + ", omega=" + omega
                    + ", mw=" + mw + ", cp0=" + Arrays.toString(cp0) + "]";
        }
    }

    public enum Model { SRK, PR }

    private static final Map<String, Fluid> FLUIDS = new HashMap<>();
    private static final Map<String, String> ALIASES = new HashMap<>();

    static {
        try (InputStream in = CubicEos.class.getResourceAsStream("/eos_fluids.json")) {
            if (in == null) {
                throw new IllegalStateException("eos_fluids.json resource not found on the classpath.");
            }
            JsonNode root = new ObjectMapper().readTree(in);
            JsonNode fluids = root.get("fluids");
            fluids.fields().forEachRemaining(e -> {
                JsonNode f = e.getValue();
                JsonNode cp = f.get("cp");
                double[] cp0 = {cp.get(0).asDouble(), cp.get(1).asDouble(),
                        cp.get(2).asDouble(), cp.get(3).asDouble()};
                FLUIDS.put(e.getKey(), new Fluid(e.getKey(),
                        f.get("Tc").asDouble(), f.get("Pc").asDouble(),
                        f.get("omega").asDouble(), f.get("M").asDouble(), cp0));
            });
            JsonNode aliases = root.get("aliases");
            if (aliases != null) {
                aliases.fields().forEachRemaining(e -> ALIASES.put(e.getKey(), e.getValue().asText()));
            }
        } catch (Exception ex) {
            throw new ExceptionInInitializerError(ex);
        }
    }

    private CubicEos() {}

    /** Whether the (case-insensitive) token names an EOS fluid or alias. */
    public static boolean isEosFluid(String token) {
        String k = token.toLowerCase();
        return FLUIDS.containsKey(k) || ALIASES.containsKey(k);
    }

    private static Fluid fluid(String token) {
        String k = token.toLowerCase();
        k = ALIASES.getOrDefault(k, k);
        Fluid f = FLUIDS.get(k);
        if (f == null) {
            throw new PropertyEvaluationException("Cubic EOS: unknown fluid '" + token
                    + "'. Known fluids: " + String.join(", ", FLUIDS.keySet().stream().sorted().toList()) + ".");
        }
        return f;
    }

    private static Model model(String name) {
        String k = name == null ? "" : name.trim().toLowerCase().replaceAll("[^a-z]", "");
        return switch (k) {
            case "srk", "soave", "rk", "soaveredlichkwong" -> Model.SRK;
            case "pr", "pengrobinson", "peng" -> Model.PR;
            default -> throw new PropertyEvaluationException(
                    "Cubic EOS: model must be 'SRK' or 'PR', got '" + name + "'.");
        };
    }

    /** Per-model constants: a/b numeric coefficients and the (eps, sigma) volume shifts. */
    private record Constants(double oa, double ob, double eps, double sigma) {}

    private static Constants constants(Model m) {
        return switch (m) {
            case SRK -> new Constants(0.42748, 0.08664, 0.0, 1.0);
            case PR -> new Constants(0.45724, 0.07780, 1.0 - Math.sqrt(2.0), 1.0 + Math.sqrt(2.0));
        };
    }

    private static double mFactor(Model model, double omega) {
        return switch (model) {
            case SRK -> 0.480 + 1.574 * omega - 0.176 * omega * omega;
            case PR -> 0.37464 + 1.54226 * omega - 0.26992 * omega * omega;
        };
    }

    /** Working set of EOS quantities at (T) for a fluid/model: a(T), b, da/dT. */
    private record Params(double a, double b, double dadt, Constants c) {}

    private static Params params(Fluid f, Model model, double t) {
        Constants c = constants(model);
        double ac = c.oa() * R * R * f.tc() * f.tc() / f.pc();
        double b = c.ob() * R * f.tc() / f.pc();
        double m = mFactor(model, f.omega());
        double sqrtTr = Math.sqrt(t / f.tc());
        double alpha = (1.0 + m * (1.0 - sqrtTr)) * (1.0 + m * (1.0 - sqrtTr));
        double a = ac * alpha;
        // dalpha/dT = -m (1 + m(1 - sqrtTr)) / sqrt(T*Tc)
        double dadt = ac * (-m * (1.0 + m * (1.0 - sqrtTr)) / Math.sqrt(t * f.tc()));
        return new Params(a, b, dadt, c);
    }

    /** Pressure [Pa] from temperature [K] and molar volume [m^3/mol]. */
    private static double pressureMolar(Params p, double t, double vMolar) {
        return R * t / (vMolar - p.b())
                - p.a() / ((vMolar + p.c().eps() * p.b()) * (vMolar + p.c().sigma() * p.b()));
    }

    /** Compressibility factor Z for the requested phase at (T, P). */
    public static double z(String fluidTok, String modelTok, double t, double p, String phase) {
        Fluid f = fluid(fluidTok);
        Model model = model(modelTok);
        Params pr = params(f, model, t);
        double a = pr.a();
        double b = pr.b();
        double aA = a * p / (R * R * t * t);
        double bB = b * p / (R * t);
        double eps = pr.c().eps();
        double sig = pr.c().sigma();
        // Generalized cubic in Z:
        // Z^3 + c2 Z^2 + c1 Z + c0 = 0, with eps+sig and eps*sig from the model.
        double s = eps + sig;
        double q = eps * sig;
        double c2 = (s - 1.0) * bB - 1.0;
        double c1 = aA + q * bB * bB - s * bB * (bB + 1.0);
        double c0 = -(aA * bB + q * bB * bB * (bB + 1.0));
        double[] roots = realCubicRoots(c2, c1, c0);
        boolean vapor = !phase.trim().toLowerCase().startsWith("liq");
        double chosen = Double.NaN;
        for (double zr : roots) {
            if (zr > bB) { // physical: v > b
                if (Double.isNaN(chosen)
                        || (vapor ? zr > chosen : zr < chosen)) {
                    chosen = zr;
                }
            }
        }
        if (Double.isNaN(chosen)) {
            throw new PropertyEvaluationException(
                    "Cubic EOS: no physical root for " + f.name() + " at T=" + t + " K, P=" + p + " Pa.");
        }
        return chosen;
    }

    /** Specific volume [m^3/kg] for the requested phase at (T, P). */
    public static double volume(String fluidTok, String modelTok, double t, double p, String phase) {
        Fluid f = fluid(fluidTok);
        double zz = z(fluidTok, modelTok, t, p, phase);
        double vMolar = zz * R * t / p;            // m^3/mol
        return vMolar / (f.mw() / 1000.0);         // m^3/kg
    }

    /** Density [kg/m^3] for the requested phase at (T, P). */
    public static double density(String fluidTok, String modelTok, double t, double p, String phase) {
        return 1.0 / volume(fluidTok, modelTok, t, p, phase);
    }

    /** Pressure [Pa] from temperature [K] and specific volume [m^3/kg]. */
    public static double pressure(String fluidTok, String modelTok, double t, double vSpecific) {
        Fluid f = fluid(fluidTok);
        Model model = model(modelTok);
        Params pr = params(f, model, t);
        double vMolar = vSpecific * (f.mw() / 1000.0);
        return pressureMolar(pr, t, vMolar);
    }

    // ----- enthalpy / entropy ------------------------------------------------

    /** Molar enthalpy departure H_real - H_ideal [J/mol] at (T, P, Z). */
    private static double enthalpyDepartureMolar(Params pr, double t, double z, double bB) {
        double term = (t * pr.dadt() - pr.a()) / (pr.b() * (pr.c().sigma() - pr.c().eps()))
                * logRatio(z, bB, pr.c());
        return R * t * (z - 1.0) + term;
    }

    /** Molar entropy departure S_real - S_ideal [J/mol-K] at (T, P, Z). */
    private static double entropyDepartureMolar(Params pr, double z, double bB) {
        double term = pr.dadt() / (pr.b() * (pr.c().sigma() - pr.c().eps()))
                * logRatio(z, bB, pr.c());
        return R * Math.log(z - bB) + term;
    }

    /** ln[(Z + sigma B)/(Z + eps B)], the recurring departure integral. */
    private static double logRatio(double z, double bB, Constants c) {
        return Math.log((z + c.sigma() * bB) / (z + c.eps() * bB));
    }

    /** Ideal-gas molar enthalpy relative to T_REF [J/mol]. */
    private static double idealEnthalpyMolar(Fluid f, double t) {
        double[] a = f.cp0();
        return a[0] * (t - T_REF)
                + a[1] / 2.0 * (t * t - T_REF * T_REF)
                + a[2] / 3.0 * (t * t * t - T_REF * T_REF * T_REF)
                + a[3] / 4.0 * (t * t * t * t - T_REF * T_REF * T_REF * T_REF);
    }

    /** Ideal-gas molar entropy relative to (T_REF, P_REF) [J/mol-K]. */
    private static double idealEntropyMolar(Fluid f, double t, double p) {
        double[] a = f.cp0();
        double integral = a[0] * Math.log(t / T_REF)
                + a[1] * (t - T_REF)
                + a[2] / 2.0 * (t * t - T_REF * T_REF)
                + a[3] / 3.0 * (t * t * t - T_REF * T_REF * T_REF);
        return integral - R * Math.log(p / P_REF);
    }

    /** Specific enthalpy [J/kg] at (T, P) for the requested phase. */
    public static double enthalpy(String fluidTok, String modelTok, double t, double p, String phase) {
        Fluid f = fluid(fluidTok);
        Model model = model(modelTok);
        Params pr = params(f, model, t);
        double zz = z(fluidTok, modelTok, t, p, phase);
        double bB = pr.b() * p / (R * t);
        double hMolar = idealEnthalpyMolar(f, t) + enthalpyDepartureMolar(pr, t, zz, bB);
        return hMolar / (f.mw() / 1000.0);
    }

    /** Specific entropy [J/kg-K] at (T, P) for the requested phase. */
    public static double entropy(String fluidTok, String modelTok, double t, double p, String phase) {
        Fluid f = fluid(fluidTok);
        Model model = model(modelTok);
        Params pr = params(f, model, t);
        double zz = z(fluidTok, modelTok, t, p, phase);
        double bB = pr.b() * p / (R * t);
        double sMolar = idealEntropyMolar(f, t, p) + entropyDepartureMolar(pr, zz, bB);
        return sMolar / (f.mw() / 1000.0);
    }

    // ----- saturation --------------------------------------------------------

    /**
     * Saturation pressure [Pa] at temperature {@code t} (&lt; Tc) by equating
     * the liquid and vapor fugacity coefficients (successive substitution).
     */
    public static double saturationPressure(String fluidTok, String modelTok, double t) {
        Fluid f = fluid(fluidTok);
        Model model = model(modelTok);
        if (t >= f.tc()) {
            throw new PropertyEvaluationException("Cubic EOS: saturation pressure needs T < Tc ("
                    + f.tc() + " K) for " + f.name() + ", got " + t + " K.");
        }
        Params pr = params(f, model, t);
        // Initial guess: Wilson correlation for vapor pressure.
        double tr = t / f.tc();
        double p = f.pc() * Math.exp(5.373 * (1.0 + f.omega()) * (1.0 - 1.0 / tr));
        for (int iter = 0; iter < 100; iter++) {
            double bB = pr.b() * p / (R * t);
            double aA = pr.a() * p / (R * R * t * t);
            double zv = z(fluidTok, modelTok, t, p, "vapor");
            double zl = z(fluidTok, modelTok, t, p, "liquid");
            double lnPhiV = fugacityCoeff(zv, aA, bB, pr.c());
            double lnPhiL = fugacityCoeff(zl, aA, bB, pr.c());
            double ratio = Math.exp(lnPhiL - lnPhiV); // = phiL/phiV = fL/fV at same P
            double pNew = p * ratio;
            if (Math.abs(pNew - p) < 1e-6 * p) {
                return pNew;
            }
            p = pNew;
        }
        return p;
    }

    /** ln(phi) = Z - 1 - ln(Z - B) - A/(B(sigma-eps)) ln[(Z+sigma B)/(Z+eps B)]. */
    private static double fugacityCoeff(double z, double aA, double bB, Constants c) {
        return z - 1.0 - Math.log(z - bB)
                - aA / (bB * (c.sigma() - c.eps())) * Math.log((z + c.sigma() * bB) / (z + c.eps() * bB));
    }

    // ----- cubic root solver -------------------------------------------------

    /** Real roots of z^3 + c2 z^2 + c1 z + c0 = 0 (1 or 3 real roots). */
    private static double[] realCubicRoots(double c2, double c1, double c0) {
        // Depressed cubic t^3 + p t + q via z = t - c2/3.
        double shift = c2 / 3.0;
        double p = c1 - c2 * c2 / 3.0;
        double q = 2.0 * c2 * c2 * c2 / 27.0 - c2 * c1 / 3.0 + c0;
        double disc = q * q / 4.0 + p * p * p / 27.0;
        if (disc > 0.0) {
            double sqrtDisc = Math.sqrt(disc);
            double u = Math.cbrt(-q / 2.0 + sqrtDisc);
            double v = Math.cbrt(-q / 2.0 - sqrtDisc);
            return new double[] {u + v - shift};
        }
        // Three real roots (disc <= 0): trigonometric solution.
        double r = Math.sqrt(-p * p * p / 27.0);
        double phi = Math.acos(Math.clamp(-q / (2.0 * r), -1.0, 1.0));
        double mag = 2.0 * Math.sqrt(-p / 3.0);
        return new double[] {
                mag * Math.cos(phi / 3.0) - shift,
                mag * Math.cos((phi + 2.0 * Math.PI) / 3.0) - shift,
                mag * Math.cos((phi + 4.0 * Math.PI) / 3.0) - shift
        };
    }
}
