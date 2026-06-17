package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CombustionTest {

    @Test
    void formulaMolarMass() {
        assertEquals(114.23, ChemicalFormula.molarMassGramsPerMole("C8H18"), 0.05);
        assertEquals(18.015, ChemicalFormula.molarMassGramsPerMole("H2O"), 0.01);
        assertEquals(74.09, ChemicalFormula.molarMassGramsPerMole("Ca(OH)2"), 0.05);
        assertEquals(342.15, ChemicalFormula.molarMassGramsPerMole("Al2(SO4)3"), 0.1);
        assertEquals(101.10, ChemicalFormula.molarMassGramsPerMole("KNO3"), 0.05);
    }

    @Test
    void formulaParsingErrors() {
        assertThrows(ChemicalFormula.FormulaException.class,
                () -> ChemicalFormula.molarMassGramsPerMole("Xx2"));
        assertThrows(ChemicalFormula.FormulaException.class,
                () -> ChemicalFormula.parse("C(H2"));
    }

    @Test
    void molarMassResolvesIdealGasAndFormula() {
        // Ideal-gas species (g/mol -> kg/mol).
        assertEquals(0.044010, Combustion.molarMass("CO2"), 1e-6);
        assertEquals(0.016043, Combustion.molarMass("CH4"), 1e-6);
        // Formula fallback.
        assertEquals(0.114231, Combustion.molarMass("C8H18"), 1e-5);
    }

    @Test
    void heatingValueMatchesHandbookFuels() {
        // Methane LHV ~ 50.0 MJ/kg, HHV ~ 55.5 MJ/kg.
        assertEquals(50.0e6, Combustion.heatingValue("CH4", "LHV"), 0.5e6);
        assertEquals(55.5e6, Combustion.heatingValue("CH4", "HHV"), 0.5e6);
        // Octane LHV ~ 44.4 MJ/kg.
        assertEquals(44.4e6, Combustion.heatingValue("C8H18", "LHV"), 1.0e6);
        assertTrue(Combustion.heatingValue("CH4", "HHV") > Combustion.heatingValue("CH4", "LHV"));
    }

    @Test
    void stoichAFRMatchesHandbookFuels() {
        assertEquals(17.1, Combustion.stoichAFR("CH4"), 0.2);   // methane ~17.2
        assertEquals(15.0, Combustion.stoichAFR("C8H18"), 0.2); // octane ~15.0
    }

    @Test
    void heatingValueRejectsUntabulatedFuel() {
        // Benzene is a valid formula but has no tabulated formation enthalpy.
        ChemicalFormula.FormulaException e = assertThrows(
                ChemicalFormula.FormulaException.class,
                () -> Combustion.heatingValue("C6H6", "LHV"));
        assertTrue(e.getMessage().contains("formation enthalpy"), e.getMessage());
    }

    @Test
    void heatingValueRejectsSpeciesWithoutCarbonOrHydrogen() {
        // N2 has a tabulated formation enthalpy (0) but nothing to burn.
        assertThrows(ChemicalFormula.FormulaException.class,
                () -> Combustion.heatingValue("N2", "LHV"));
    }

    @Test
    void stoichAFRRejectsNonCombustible() {
        // CO2 needs no oxidizer (O2 demand = 1 + 0 - 1 = 0).
        assertThrows(ChemicalFormula.FormulaException.class,
                () -> Combustion.stoichAFR("CO2"));
    }

    @Test
    void chemFunctionsPreserveCaseThroughTheParser() {
        // Regression: Expr.Call lowercases its function name, so the case-
        // sensitive formula token must travel as a string argument, not in the
        // encoded function name. These all go through the full parse + eval.
        com.frees.backend.parser.EquationParser parser = new com.frees.backend.parser.EquationParser();
        assertEquals(0.114231,
                evalRhs(parser, "m = MolarMass(C8H18)"), 1e-5);
        assertEquals(0.074093,
                evalRhs(parser, "m = MolarMass('Ca(OH)2')"), 1e-4);
        assertEquals(15.0, evalRhs(parser, "afr = StoichAFR(C8H18)"), 0.2);
        assertEquals(50.0e6, evalRhs(parser, "lhv = HeatingValue(CH4, 'LHV')"), 0.5e6);

        // The chemistry call also renders to LaTeX from its string args
        // (covers the parts.length < 3 branch in LatexConverter).
        var parsed = parser.parseResult("m = MolarMass(C8H18)");
        String latex = com.frees.backend.parser.LatexConverter.toLatex(
                parsed.equations().get(0), parsed.displayNames());
        assertTrue(latex.contains("Molarmass") && latex.contains("C8H18"), latex);
    }

    private static double evalRhs(com.frees.backend.parser.EquationParser parser, String src) {
        com.frees.backend.ast.Equation eq = parser.parse(src).get(0);
        return com.frees.backend.ast.Evaluator.eval(eq.rhs(), java.util.Map.of());
    }
}
