package com.frees.backend.api;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ParametricTable;
import com.frees.backend.ast.PlotDef;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.StateTableDef;
import com.frees.backend.core.Block;
import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The static converters that shape parsed solver/AST objects into the wire
 * DTOs: Function Table round-tripping (with curve sorting and invalid-point
 * filtering), the simple list mappers, ODE-table unit resolution, and block
 * display-name substitution.
 */
class SolveDtosTest {

    private static Equation eq(String text) {
        return new Equation(new Expr.Var("x"), new Expr.Num(1, null, false), text);
    }

    @Test
    void variableDtoConvenienceConstructorLeavesUncertaintyNull() {
        SolveDtos.VariableDto dto = new SolveDtos.VariableDto("x", 2.0, "m");
        assertNull(dto.uncertainty());
        assertEquals("m", dto.units());
    }

    @Test
    void toBlockDtoDeduplicatesEquationsAndMapsDisplayNames() {
        Block block = new Block(3,
                List.of(eq("x = 1"), eq("x = 1"), eq("y = x")),
                List.of("x", "y_2"));
        SolveDtos.BlockDto dto = SolveDtos.toBlockDto(block, Map.of("y_2", "Y_2"));
        assertEquals(3, dto.index());
        assertEquals(List.of("x = 1", "y = x"), dto.equations());
        assertEquals(List.of("x", "Y_2"), dto.variables());
    }

    @Test
    void functionDefsOfHandlesNullAndEmpty() {
        assertTrue(SolveDtos.functionDefsOf(null).isEmpty());
        assertTrue(SolveDtos.functionDefsOf(List.of()).isEmpty());
    }

    @Test
    void functionDefsOfSkipsUnusableTables() {
        List<SolveDtos.FunctionTableDto> tables = new ArrayList<>();
        tables.add(new SolveDtos.FunctionTableDto(null, List.of("x"), false, false,
                List.of(new SolveDtos.FunctionCurveDto(null, List.of(List.of(1.0, 2.0), List.of(2.0, 3.0))))));
        tables.add(new SolveDtos.FunctionTableDto("  ", List.of("x"), false, false,
                List.of(new SolveDtos.FunctionCurveDto(null, List.of(List.of(1.0, 2.0), List.of(2.0, 3.0))))));
        tables.add(new SolveDtos.FunctionTableDto("noCurves", List.of("x"), false, false, null));
        // a table whose only curve has no valid points expands to zero curves -> skipped
        List<List<Double>> junk = new ArrayList<>();
        junk.add(null);
        junk.add(List.of(1.0));                       // too short
        junk.add(Arrays.asList(null, 2.0));           // null x
        junk.add(Arrays.asList(1.0, null));           // null y
        tables.add(new SolveDtos.FunctionTableDto("empty", List.of("x"), false, false,
                List.of(new SolveDtos.FunctionCurveDto(null, junk))));
        assertTrue(SolveDtos.functionDefsOf(tables).isEmpty());
    }

    @Test
    void functionDefsOfSortsPointsAndLowercasesTheName() {
        SolveDtos.FunctionTableDto table = new SolveDtos.FunctionTableDto(
                " FanCurve ", null, true, null,
                List.of(new SolveDtos.FunctionCurveDto(2.5,
                        List.of(List.of(3.0, 30.0), List.of(1.0, 10.0), List.of(2.0, 20.0)))));
        Map<String, ProcDef> defs = SolveDtos.functionDefsOf(List.of(table));
        assertEquals(1, defs.size());
        ProcDef.FunctionTableDef def = (ProcDef.FunctionTableDef) defs.get("fancurve");
        assertEquals("fancurve", def.name());
        assertEquals(List.of(), def.argNames());
        assertTrue(def.xLog());
        assertTrue(!def.yLog());
        ProcDef.Curve curve = def.curves().get(0);
        assertEquals(2.5, curve.param());
        assertTrue(Arrays.equals(new double[]{1.0, 2.0, 3.0}, curve.xs()));
        assertTrue(Arrays.equals(new double[]{10.0, 20.0, 30.0}, curve.ys()));
    }

    @Test
    void codeTablesOfRoundTripsAFunctionTableDef() {
        SolveDtos.FunctionTableDto in = new SolveDtos.FunctionTableDto(
                "fan", List.of("v"), false, true,
                List.of(new SolveDtos.FunctionCurveDto(null,
                        List.of(List.of(1.0, 10.0), List.of(2.0, 20.0)))));
        Map<String, ProcDef> defs = SolveDtos.functionDefsOf(List.of(in));
        List<SolveDtos.FunctionTableDto> out = SolveDtos.codeTablesOf(defs);
        assertEquals(1, out.size());
        SolveDtos.FunctionTableDto t = out.get(0);
        assertEquals("fan", t.name());
        assertEquals(List.of("v"), t.argNames());
        assertEquals(List.of(List.of(1.0, 10.0), List.of(2.0, 20.0)),
                t.curves().get(0).points());
        // non-table defs are ignored
        assertTrue(SolveDtos.codeTablesOf(Map.of()).isEmpty());
    }

    @Test
    void parametricPlotAndStateTableMappersCopyFields() {
        List<SolveDtos.ParametricTableDto> pts = SolveDtos.parametricTablesOf(
                List.of(new ParametricTable("sweep", List.of("x"), List.of(List.of(1.0)))));
        assertEquals("sweep", pts.get(0).name());
        assertEquals(List.of("x"), pts.get(0).vars());

        List<SolveDtos.PlotDefDto> plots = SolveDtos.plotsOf(
                List.of(new PlotDef("p1", Map.of("x", List.of("time")))));
        assertEquals("p1", plots.get(0).name());
        assertEquals(List.of("time"), plots.get(0).attributes().get("x"));

        List<SolveDtos.StateTableDto> sts = SolveDtos.stateTablesOf(
                List.of(new StateTableDef("circ", List.of("p1", "t1"), "R134a")));
        assertEquals("circ", sts.get(0).name());
        assertEquals("R134a", sts.get(0).fluid());
    }

    @Test
    void odeTablesOfResolvesUnitsAndDefaultsTimeToSeconds() {
        OdeTableResult t = new OdeTableResult("dyn",
                List.of("Time", "T_tank", "mystery"),
                List.of(List.of(0.0, 300.0, 1.0)),
                List.of(new OdeTableResult.EventHit("boil", 12.5)),
                "ode23s", true, 50.0);
        List<SolveDtos.OdeTableDto> out =
                SolveDtos.odeTablesOf(List.of(t), Map.of("t_tank", "K"));
        SolveDtos.OdeTableDto dto = out.get(0);
        assertEquals(List.of("s", "K", ""), dto.units());
        assertEquals("boil", dto.events().get(0).name());
        assertEquals(12.5, dto.events().get(0).time());
        assertEquals("ode23s", dto.method());
        assertTrue(dto.stopped());
        assertEquals(50.0, dto.endTime());
    }
}
