package com.frees.backend.parser;

import com.frees.backend.ast.ParametricTable;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 3: PARAMETRIC ... END blocks declare a run-table in the editor text.
 * They never enter the equation system — only the parsed sweep is exposed.
 */
class CodeParametricTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void parsesRangeAndListColumnsIntoRows() {
        String text = """
                PARAMETRIC sweep1 (T_in, mdot)
                  T_in = 300:10:320
                  mdot = [0.1, 0.2, 0.4]
                END
                """;
        var result = parser.parseResult(text);
        // The block contributes no equations to the main system.
        assertTrue(result.equations().isEmpty(), "parametric block must not add equations");

        List<ParametricTable> tables = result.parametricTables();
        assertEquals(1, tables.size());
        ParametricTable t = tables.get(0);
        assertEquals("sweep1", t.name());
        assertEquals(List.of("t_in", "mdot"), t.vars());
        // 3 rows: T_in {300,310,320}, mdot {0.1,0.2,0.4}
        assertEquals(3, t.rows().size());
        assertEquals(300.0, t.rows().get(0).get(0), 1e-9);
        assertEquals(0.1, t.rows().get(0).get(1), 1e-9);
        assertEquals(320.0, t.rows().get(2).get(0), 1e-9);
        assertEquals(0.4, t.rows().get(2).get(1), 1e-9);
    }

    @Test
    void unevenColumnsPadWithNullCells() {
        String text = """
                PARAMETRIC s (a, b)
                  a = 1:1:4
                  b = [10, 20]
                END
                """;
        ParametricTable t = parser.parseResult(text).parametricTables().get(0);
        assertEquals(4, t.rows().size());
        assertEquals(10.0, t.rows().get(0).get(1), 1e-9);
        assertNull(t.rows().get(3).get(1), "short column pads with null");
        assertEquals(4.0, t.rows().get(3).get(0), 1e-9);
    }

    @Test
    void logColumnSpacing() {
        String text = """
                PARAMETRIC s (f)
                  f = 1:5:1000 | Log
                END
                """;
        ParametricTable t = parser.parseResult(text).parametricTables().get(0);
        assertEquals(5, t.rows().size());
        assertEquals(1.0, t.rows().get(0).get(0), 1e-9);
        assertEquals(1000.0, t.rows().get(4).get(0), 1e-9);
    }
}
