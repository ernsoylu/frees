package com.frees.backend.props;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Combustion and ideal-gas-mixture thermochemistry built on a unified molar
 * thermo accessor: NASA-7 polynomials ({@link NasaThermo}) where available
 * (combustion species), falling back to the cubic JANAF fits in
 * {@link IdealGas} (fuels such as octane, methanol that GRI-Mech lacks). Both
 * bases give absolute, formation-referenced enthalpy, so they compose in a
 * single energy balance.
 *
 * <p>Exposed to the language: {@code AdiabaticFlameTemp(fuel$, phi, T_react)}
 * and the mixture functions {@code mix_mw / mix_cp / mix_enthalpy /
 * mix_entropy(comp$, ...)}. Mixture outputs are SI mass-basis.
 */
public final class Thermochemistry {

    private Thermochemistry() {}

    // ----- unified molar accessor (NASA-7 preferred, IdealGas fallback) ------

    /** Absolute molar enthalpy [J/mol], or throws if no thermo data is known. */
    static double hMol(String species, double t) {
        if (NasaThermo.has(species)) {
            return NasaThermo.molarEnthalpy(species, t);
        }
        double h = IdealGas.molarEnthalpy(species.toLowerCase(), t);
        if (Double.isNaN(h)) {
            throw unknown(species);
        }
        return h;
    }

    /** Molar heat capacity [J/mol-K]. */
    static double cpMol(String species, double t) {
        if (NasaThermo.has(species)) {
            return NasaThermo.molarCp(species, t);
        }
        double cp = IdealGas.molarCp(species.toLowerCase(), t);
        if (Double.isNaN(cp)) {
            throw unknown(species);
        }
        return cp;
    }

    /** Absolute molar entropy at (T, partial pressure p) [J/mol-K]. */
    static double sMol(String species, double t, double p) {
        if (NasaThermo.has(species)) {
            return NasaThermo.molarEntropy(species, t, p);
        }
        double s = IdealGas.molarEntropy(species.toLowerCase(), t, p);
        if (Double.isNaN(s)) {
            throw unknown(species);
        }
        return s;
    }

    /** Molar mass [kg/kmol]. */
    static double mwOf(String species) {
        if (NasaThermo.has(species)) {
            return NasaThermo.molarMass(species);
        }
        double m = IdealGas.molarMassOf(species.toLowerCase());
        if (Double.isNaN(m)) {
            return ChemicalFormula.molarMassGramsPerMole(species);
        }
        return m;
    }

    private static PropertyEvaluationException unknown(String species) {
        return new PropertyEvaluationException(
                "Thermochemistry: no ideal-gas thermo data for species '" + species
                        + "'. Known: GRI-Mech species (N2, O2, CO2, H2O, CH4, C3H8, ...) "
                        + "and the IdealGas fuels (C8H18, CH3OH, ...).");
    }

    // ----- adiabatic flame temperature ---------------------------------------

    /**
     * Constant-pressure adiabatic flame temperature [K] for complete combustion
     * of a hydrocarbon/alcohol fuel CxHyOz in air (3.76 N2 : 1 O2) at fuel/air
     * equivalence ratio {@code phi} (&le; 1), with reactants entering at
     * {@code tReact}. Products are CO2, H2O, excess O2 and N2 (no dissociation),
     * so the result is an upper bound that overpredicts real flames the most at
     * stoichiometric conditions.
     */
    public static double adiabaticFlameTemp(String fuel, double phi, double tReact) {
        Map<String, Integer> counts = ChemicalFormula.parse(fuel);
        int x = counts.getOrDefault("C", 0);
        int y = counts.getOrDefault("H", 0);
        int z = counts.getOrDefault("O", 0);
        double aSt = x + y / 4.0 - z / 2.0;          // stoichiometric O2 per mol fuel
        if (aSt <= 0.0) {
            throw new PropertyEvaluationException(
                    "AdiabaticFlameTemp: '" + fuel + "' has no oxygen demand (non-combustible).");
        }
        if (!(phi > 0.0)) {
            throw new PropertyEvaluationException(
                    "AdiabaticFlameTemp: equivalence ratio phi must be > 0, got " + phi + ".");
        }
        if (phi > 1.0) {
            throw new PropertyEvaluationException(
                    "AdiabaticFlameTemp: rich combustion (phi > 1) needs a CO/H2 dissociation model "
                            + "that frees does not have yet; use phi <= 1 (stoichiometric or excess air).");
        }
        double o2sup = aSt / phi;                    // O2 supplied per mol fuel
        double n2 = 3.76 * o2sup;
        double o2ex = o2sup - aSt;                   // unburned excess O2

        double hReact = hMol(fuel, tReact)
                + o2sup * hMol("O2", tReact)
                + n2 * hMol("N2", tReact);

        java.util.function.DoubleUnaryOperator hProd = t ->
                x * hMol("CO2", t) + (y / 2.0) * hMol("H2O", t)
                        + o2ex * hMol("O2", t) + n2 * hMol("N2", t);
        java.util.function.DoubleUnaryOperator cpProd = t ->
                x * cpMol("CO2", t) + (y / 2.0) * cpMol("H2O", t)
                        + o2ex * cpMol("O2", t) + n2 * cpMol("N2", t);

        double t = 2000.0;
        for (int i = 0; i < 100; i++) {
            double f = hProd.applyAsDouble(t) - hReact;
            double slope = cpProd.applyAsDouble(t);
            double step = f / slope;
            double tNext = Math.clamp(t - step, tReact, 6000.0);
            if (Math.abs(tNext - t) < 1e-6) {
                return tNext;
            }
            t = tNext;
        }
        throw new PropertyEvaluationException(
                "AdiabaticFlameTemp: energy balance did not converge for fuel '" + fuel + "'.");
    }

    // ----- ideal-gas mixtures ------------------------------------------------

    /** Parses 'N2:3.76, O2:1, CO2:0.5' into normalized mole fractions. */
    static Map<String, Double> composition(String spec) {
        Map<String, Double> moles = new LinkedHashMap<>();
        double total = 0.0;
        for (String part : spec.split(",")) {
            String token = part.trim();
            if (token.isEmpty()) {
                continue;
            }
            int colon = token.indexOf(':');
            if (colon < 0) {
                throw new PropertyEvaluationException(
                        "Mixture: each component must be 'species:amount', got '" + token
                                + "'. Example: 'N2:0.79, O2:0.21'.");
            }
            String sp = token.substring(0, colon).trim();
            double amount = Double.parseDouble(token.substring(colon + 1).trim());
            if (amount < 0.0) {
                throw new PropertyEvaluationException(
                        "Mixture: amount for '" + sp + "' must be >= 0, got " + amount + ".");
            }
            moles.merge(sp, amount, Double::sum);
            total += amount;
        }
        if (total <= 0.0) {
            throw new PropertyEvaluationException("Mixture: composition '" + spec + "' has no positive amounts.");
        }
        for (Map.Entry<String, Double> e : moles.entrySet()) {
            e.setValue(e.getValue() / total);
        }
        return moles;
    }

    /** Mixture molar mass [kg/mol] (matches MolarMass's SI convention). */
    public static double mixtureMolarMass(String comp) {
        double mw = 0.0;
        for (Map.Entry<String, Double> e : composition(comp).entrySet()) {
            mw += e.getValue() * mwOf(e.getKey());
        }
        return mw / 1000.0;
    }

    /** Mixture specific heat at constant pressure [J/kg-K]. */
    public static double mixtureCp(String comp, double t) {
        Map<String, Double> xs = composition(comp);
        double cpMolar = 0.0;
        double mw = 0.0;
        for (Map.Entry<String, Double> e : xs.entrySet()) {
            cpMolar += e.getValue() * cpMol(e.getKey(), t);
            mw += e.getValue() * mwOf(e.getKey());
        }
        return cpMolar / (mw / 1000.0);
    }

    /** Mixture specific enthalpy [J/kg] (absolute, formation-referenced). */
    public static double mixtureEnthalpy(String comp, double t) {
        Map<String, Double> xs = composition(comp);
        double hMolar = 0.0;
        double mw = 0.0;
        for (Map.Entry<String, Double> e : xs.entrySet()) {
            hMolar += e.getValue() * hMol(e.getKey(), t);
            mw += e.getValue() * mwOf(e.getKey());
        }
        return hMolar / (mw / 1000.0);
    }

    /** Mixture specific entropy at (T, P) [J/kg-K], using partial pressures. */
    public static double mixtureEntropy(String comp, double t, double p) {
        Map<String, Double> xs = composition(comp);
        double sMolar = 0.0;
        double mw = 0.0;
        for (Map.Entry<String, Double> e : xs.entrySet()) {
            double xi = e.getValue();
            sMolar += xi * sMol(e.getKey(), t, xi * p);   // partial pressure xi*P
            mw += xi * mwOf(e.getKey());
        }
        return sMolar / (mw / 1000.0);
    }
}
