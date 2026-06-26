package com.frees.backend.props;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Transport properties (dynamic viscosity, thermal conductivity) of ideal-gas
 * mixtures from kinetic theory: pure-species values via the Chapman-Enskog
 * relation with the Neufeld collision integral, combined with Wilke's mixing
 * rule (Mason-Saxena for conductivity). Lennard-Jones parameters come from the
 * GRI-Mech transport data embedded in {@link NasaThermo}.
 *
 * <p>This covers arbitrary ideal-gas mixtures (air, combustion products) that
 * CoolProp does not handle as mixtures. Inputs use the same
 * {@code 'species:amount, ...'} composition string as the {@code mix_*}
 * property functions. Outputs are SI: viscosity [Pa-s], conductivity [W/m-K].
 */
public final class GasTransport {

    /** Universal gas constant [J/mol-K]. */
    private static final double R = 8.314462618;

    private GasTransport() {}

    /** Reduced collision integral Omega(2,2)* (Neufeld et al., 1972) at T* = T/(eps/k). */
    private static double collisionIntegral(double tStar) {
        return 1.16145 * Math.pow(tStar, -0.14874)
                + 0.52487 * Math.exp(-0.77320 * tStar)
                + 2.16178 * Math.exp(-2.43787 * tStar);
    }

    /** Pure-species dynamic viscosity [Pa-s] (Chapman-Enskog). */
    public static double viscosity(String species, double t) {
        requireTransport(species);
        double mGmol = NasaThermo.molarMass(species);          // g/mol
        double sigma = NasaThermo.collisionDiameter(species);   // Angstrom
        double tStar = t / NasaThermo.wellDepth(species);
        // mu [Pa-s] = 2.6693e-6 sqrt(M[g/mol] T) / (sigma[A]^2 Omega)
        return 2.6693e-6 * Math.sqrt(mGmol * t) / (sigma * sigma * collisionIntegral(tStar));
    }

    /** Pure-species thermal conductivity [W/m-K] (Eucken relation). */
    public static double conductivity(String species, double t) {
        double mu = viscosity(species, t);
        double cpMolar = NasaThermo.molarCp(species, t);        // J/mol-K
        double mKgmol = NasaThermo.molarMass(species) / 1000.0; // kg/mol
        return (mu / mKgmol) * (cpMolar + 1.25 * R);
    }

    /** Mixture dynamic viscosity [Pa-s] via Wilke's rule. */
    public static double mixtureViscosity(String comp, double t) {
        Component[] cs = components(comp, t);
        return wilkeAverage(cs, true);
    }

    /** Mixture thermal conductivity [W/m-K] via the Wilke/Mason-Saxena rule. */
    public static double mixtureConductivity(String comp, double t) {
        Component[] cs = components(comp, t);
        return wilkeAverage(cs, false);
    }

    /** Per-species data needed for the mixing rule. */
    private record Component(double x, double mw, double mu, double k) {}

    private static Component[] components(String comp, double t) {
        Map<String, Double> xs = Thermochemistry.composition(comp);
        List<Component> list = new ArrayList<>();
        for (Map.Entry<String, Double> e : xs.entrySet()) {
            String sp = e.getKey();
            requireTransport(sp);
            list.add(new Component(e.getValue(), NasaThermo.molarMass(sp),
                    viscosity(sp, t), conductivity(sp, t)));
        }
        return list.toArray(new Component[0]);
    }

    /**
     * Wilke average of the per-species property (viscosity when {@code visc},
     * else conductivity), sharing the same interaction coefficients phi_ij.
     */
    private static double wilkeAverage(Component[] cs, boolean visc) {
        double sum = 0.0;
        for (Component i : cs) {
            double denom = 0.0;
            for (Component j : cs) {
                double ratio = i.mu() / j.mu();
                double mij = i.mw() / j.mw();
                double num = 1.0 + Math.sqrt(ratio) * Math.pow(1.0 / mij, 0.25);
                double phi = num * num / Math.sqrt(8.0 * (1.0 + mij));
                denom += j.x() * phi;
            }
            sum += i.x() * (visc ? i.mu() : i.k()) / denom;
        }
        return sum;
    }

    private static void requireTransport(String species) {
        if (!NasaThermo.hasTransport(species)) {
            throw new PropertyEvaluationException(
                    "Transport: no Lennard-Jones data for species '" + species
                            + "'. Known: GRI-Mech species (N2, O2, CO2, H2O, CH4, ...).");
        }
    }
}
