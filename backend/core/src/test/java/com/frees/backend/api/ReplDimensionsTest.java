package com.frees.backend.api;

import com.frees.backend.ast.Expr;
import com.frees.backend.units.Quantity;
import com.frees.backend.units.UnitRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Dimensional analysis of REPL expressions: every AST shape the walker handles
 * (literals, variables, negation, the four arithmetic operators, powers, and
 * the function-call classes) plus the display conversion of a resolved
 * dimension. A null return means "no unit shown" — the REPL's safe fallback —
 * so the null paths are asserted as deliberately as the resolved ones.
 */
class ReplDimensionsTest {

    private static final Function<String, String> NO_UNITS = n -> null;

    private static Quantity dims(Expr e) {
        return ReplDimensions.dimensionOf(e, NO_UNITS, Map.of(), Map.of());
    }

    private static Quantity dims(Expr e, Function<String, String> unitOf) {
        return ReplDimensions.dimensionOf(e, unitOf, Map.of(), Map.of());
    }

    private static Expr num(double v, String unit) {
        return new Expr.Num(v, unit, false);
    }

    private static void assertSameDims(String unit, Quantity actual) {
        assertNotNull(actual, "expected a resolved dimension for " + unit);
        assertTrue(UnitRegistry.parse(unit).sameDimensionsAs(actual),
                "expected dims of " + unit + " but got " + actual);
    }

    @Test
    void numericLiteralCarriesItsUnit() {
        assertSameDims("m", dims(num(3, "m")));
    }

    @Test
    void unitlessAndDashLiteralsAreDimensionless() {
        assertTrue(dims(num(3, null)).isDimensionless());
        assertTrue(dims(num(3, "")).isDimensionless());
        assertTrue(dims(num(3, "-")).isDimensionless());
    }

    @Test
    void unknownUnitStringResolvesToNull() {
        assertNull(dims(num(3, "zorks")));
    }

    @Test
    void variableUsesTheWorkspaceUnit() {
        Function<String, String> unitOf = n -> n.equals("p") ? "kPa" : null;
        assertSameDims("Pa", dims(new Expr.Var("P"), unitOf));
        // no recorded unit -> dimensionless (not null): a bare number variable
        assertTrue(dims(new Expr.Var("x"), unitOf).isDimensionless());
    }

    @Test
    void negationPreservesDimension() {
        assertSameDims("m", dims(new Expr.Neg(num(3, "m"))));
    }

    @Test
    void multiplyAndDivideComposeDimensions() {
        Expr m = num(2, "m");
        Expr s = num(4, "s");
        assertSameDims("m-s", dims(new Expr.BinOp('*', m, s)));
        assertSameDims("m/s", dims(new Expr.BinOp('/', m, s)));
    }

    @Test
    void multiplyOrDivideWithAnUnresolvableSideIsNull() {
        Expr bad = num(1, "zorks");
        Expr m = num(2, "m");
        assertNull(dims(new Expr.BinOp('*', bad, m)));
        assertNull(dims(new Expr.BinOp('/', m, bad)));
    }

    @Test
    void sumKeepsTheResolvedSide() {
        Expr bad = num(1, "zorks");
        Expr m = num(2, "m");
        assertSameDims("m", dims(new Expr.BinOp('+', m, bad)));
        assertSameDims("m", dims(new Expr.BinOp('-', bad, m)));
        assertNull(dims(new Expr.BinOp('+', bad, bad)));
    }

    @Test
    void comparisonOperatorIsNotADimension() {
        assertNull(dims(new Expr.BinOp('<', num(1, "m"), num(2, "m"))));
    }

    @Test
    void powerRaisesTheDimension() {
        Quantity area = dims(new Expr.BinOp('^', num(3, "m"), num(2, null)));
        assertSameDims("m^2", area);
    }

    @Test
    void powerOfDimensionlessBaseStaysDimensionless() {
        assertTrue(dims(new Expr.BinOp('^', num(3, null), num(2, null))).isDimensionless());
    }

    @Test
    void powerWithUnresolvableBaseOrExponentIsNull() {
        assertNull(dims(new Expr.BinOp('^', num(1, "zorks"), num(2, null))));
        // exponent references an unknown variable -> evaluation fails -> null
        assertNull(dims(new Expr.BinOp('^', num(3, "m"), new Expr.Var("nope"))));
    }

    @Test
    void trigAndLogCallsAreDimensionless() {
        Expr angle = num(1.5, null);
        assertTrue(dims(new Expr.Call("Sin", List.of(angle))).isDimensionless());
        assertTrue(dims(new Expr.Call("LN", List.of(angle))).isDimensionless());
    }

    @Test
    void sqrtHalvesTheDimension() {
        Expr area = new Expr.BinOp('*', num(2, "m"), num(3, "m"));
        assertSameDims("m", dims(new Expr.Call("sqrt", List.of(area))));
        assertNull(dims(new Expr.Call("sqrt", List.of(num(1, "zorks")))));
    }

    @Test
    void argPreservingCallsKeepTheFirstArgumentDimension() {
        assertSameDims("m", dims(new Expr.Call("abs", List.of(num(-2, "m")))));
        assertSameDims("m", dims(new Expr.Call("max",
                List.of(num(1, "m"), num(2, "m")))));
    }

    @Test
    void propertyCallCarriesTheOutputUnit() {
        assertSameDims("J/kg", dims(new Expr.Call("prop$enthalpy$water", List.of())));
        assertSameDims("Pa", dims(new Expr.Call("prop$pressure$water", List.of())));
        assertNull(dims(new Expr.Call("prop$nosuchoutput$water", List.of())));
    }

    @Test
    void unknownFunctionsAndUnhandledNodesAreNull() {
        assertNull(dims(new Expr.Call("SomeControlFn", List.of(num(1, null)))));
        assertNull(dims(new Expr.Str("hello")));
    }

    @Test
    void toDisplayIsNullForDimensionless() {
        assertNull(ReplDimensions.toDisplay(5.0, null, UnitRegistry.UnitSystem.SI));
        assertNull(ReplDimensions.toDisplay(5.0, Quantity.dimensionless(1),
                UnitRegistry.UnitSystem.SI));
    }

    @Test
    void toDisplayUsesThePreferredUnitOfTheSystem() {
        Quantity pressure = new Quantity(1.0, UnitRegistry.parse("Pa").dims());
        Object[] out = ReplDimensions.toDisplay(101325.0, pressure, UnitRegistry.UnitSystem.SI);
        assertNotNull(out);
        assertTrue(out[0] instanceof Double d && Double.isFinite(d));
        assertTrue(out[1] instanceof String s && !s.isBlank());
    }

    @Test
    void toDisplayFallsBackToTheSiNameForExoticDimensions() {
        Quantity odd = UnitRegistry.parse("m").pow(7);
        Object[] out = ReplDimensions.toDisplay(42.0, odd, UnitRegistry.UnitSystem.SI);
        assertNotNull(out);
        assertEquals(42.0, (Double) out[0], 1e-12);
        assertEquals(UnitRegistry.siName(odd.dims()), out[1]);
    }
}
