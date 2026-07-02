package com.frees.backend.core.ode;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.ast.Expr;
import com.frees.backend.parser.FunctionRegistry;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Event bookkeeping introduced by the E1/E2 enablers: direction filters,
 *  set-action detection, and the catalog entries for the dtable derivatives. */
class OdeEventTest {

    private static final OdeScalarFn G = (t, y) -> y[0];

    @Test
    void directionKeywordsMapToSigns() {
        assertEquals(1, OdeEvent.directionFromKeyword("Rising"));
        assertEquals(-1, OdeEvent.directionFromKeyword("falling"));
        assertEquals(0, OdeEvent.directionFromKeyword(null));
        assertEquals(0, OdeEvent.directionFromKeyword("any"));
    }

    @Test
    void triggersHonoursDirectionFilters() {
        OdeEvent any = new OdeEvent("any", G, 0, false);
        OdeEvent rising = new OdeEvent("up", G, 1, false);
        OdeEvent falling = new OdeEvent("down", G, -1, false);

        assertTrue(any.triggers(-1, 1));
        assertTrue(any.triggers(1, -1));
        assertFalse(any.triggers(0, 0));      // resting on zero is not a crossing
        assertFalse(any.triggers(0.5, 1.5));  // no sign change

        assertTrue(rising.triggers(-1, 1));
        assertFalse(rising.triggers(1, -1));
        assertTrue(falling.triggers(1, -1));
        assertFalse(falling.triggers(-1, 1));
    }

    @Test
    void setEventsAreDistinguishedFromStopAndRecord() {
        OdeEvent record = new OdeEvent("plain", G, 0, false);
        assertFalse(record.isSet());
        assertEquals(-1, record.setIndex());
        assertNull(record.setValue());

        OdeEvent set = new OdeEvent("latch", G, 1, false, 0, (t, y) -> 1.0);
        assertTrue(set.isSet());
        assertFalse(set.stop());
    }

    @Test
    void dynamicSystemEventConvenienceConstructorHasNoSetAction() {
        DynamicSystem.Event ev = new DynamicSystem.Event(
                "e", new Expr.Var("x"), new Expr.Num(0), "rising", "stop");
        assertNull(ev.setVar());
        assertNull(ev.setExpr());
        assertEquals("stop", ev.action());
    }

    @Test
    void dtableDerivativesAreCatalogued() {
        assertTrue(FunctionRegistry.listFunctions().stream()
                .anyMatch(f -> f.name().equals("dtable")));
        assertTrue(FunctionRegistry.listFunctions().stream()
                .anyMatch(f -> f.name().equals("dtable1")));
    }
}
