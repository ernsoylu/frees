package com.frees.backend.props;

import java.util.Map;

/**
 * Chemistry helpers for combustion and stoichiometric analysis, built on the
 * {@link PeriodicTable}/{@link ChemicalFormula} molar-mass machinery and the
 * {@link IdealGas} formation-enthalpy table.
 *
 * Functions exposed to the language (encoded as prop$ calls so the fuel token
 * never becomes a variable):
 *   MolarMass(token)          -> kg/mol  (CoolProp fluid, ideal-gas species, or formula)
 *   HeatingValue(fuel, mode)  -> J/kg    (mode = LHV or HHV)
 *   StoichAFR(fuel)           -> kg air / kg fuel (mass basis, dimensionless)
 */
public final class Combustion {

    private static final double M_O2 = 31.999;   // g/mol
    private static final double M_N2 = 28.013;   // g/mol
    /** Air per mole of O2 on a 1 O2 : 3.76 N2 basis [g]. */
    private static final double AIR_PER_MOL_O2 = M_O2 + 3.76 * M_N2;

    private Combustion() {}

    /**
     * Molar mass [kg/mol] of a fluid name, ideal-gas species, or chemical
     * formula. Resolution order: tabulated ideal-gas species (CO2, CH4, ...),
     * then a CoolProp real fluid (Water, Air, ...), then the formula parser
     * (C8H18, Ca(OH)2). Formulas are case-sensitive.
     */
    public static double molarMass(String token) {
        String lower = token.toLowerCase();
        double ig = IdealGas.molarMassOf(lower);
        if (!Double.isNaN(ig)) {
            return ig / 1000.0;
        }
        if (PropertyFunctions.isKnownFluid(lower) && CoolProp.isAvailable()) {
            try {
                double m = CoolProp.props1SI(PropertyFunctions.resolveFluid(lower), "molar_mass");
                if (Double.isFinite(m) && m > 0) {
                    return m;
                }
            } catch (RuntimeException ignored) {
                // Fall through to the formula parser.
            }
        }
        return ChemicalFormula.molarMassGramsPerMole(token) / 1000.0;
    }

    /**
     * Heating value [J/kg of fuel] for a hydrocarbon/alcohol CxHyOz burned to
     * CO2 and H2O. LHV references water vapour, HHV references liquid water.
     */
    public static double heatingValue(String fuel, String mode) {
        Map<String, Integer> counts = ChemicalFormula.parse(fuel);
        int x = counts.getOrDefault("C", 0);
        int y = counts.getOrDefault("H", 0);
        double hfFuel = IdealGas.formationEnthalpyOf(fuel.toLowerCase());
        if (Double.isNaN(hfFuel)) {
            throw new ChemicalFormula.FormulaException(
                    "No formation enthalpy tabulated for fuel '" + fuel + "'. "
                            + "Add it to IdealGas or supply the heating value directly.");
        }
        if (x == 0 && y == 0) {
            throw new ChemicalFormula.FormulaException(
                    "'" + fuel + "' has no C or H to burn.");
        }
        boolean hhv = "hhv".equalsIgnoreCase(mode);
        double hfWater = hhv ? IdealGas.HF_H2O_LIQUID : IdealGas.formationEnthalpyOf("h2o");
        double hfCo2 = IdealGas.formationEnthalpyOf("co2");
        // Reaction enthalpy per kmol fuel [kJ/kmol]; O2 formation enthalpy is 0.
        double dH = x * hfCo2 + (y / 2.0) * hfWater - hfFuel;
        double mFuel = ChemicalFormula.molarMassGramsPerMole(fuel); // g/mol = kg/kmol
        // -dH [kJ/kmol] / M [kg/kmol] = kJ/kg -> *1000 = J/kg.
        return -dH / mFuel * 1000.0;
    }

    /** Stoichiometric air-fuel ratio (mass basis) for CxHyOz. */
    public static double stoichAFR(String fuel) {
        Map<String, Integer> counts = ChemicalFormula.parse(fuel);
        int x = counts.getOrDefault("C", 0);
        int y = counts.getOrDefault("H", 0);
        int z = counts.getOrDefault("O", 0);
        double o2 = x + y / 4.0 - z / 2.0;
        if (o2 <= 0) {
            throw new ChemicalFormula.FormulaException(
                    "'" + fuel + "' requires no oxidizer (non-combustible).");
        }
        double massAir = o2 * AIR_PER_MOL_O2;            // g air / mol fuel
        double mFuel = ChemicalFormula.molarMassGramsPerMole(fuel);
        return massAir / mFuel;
    }
}
