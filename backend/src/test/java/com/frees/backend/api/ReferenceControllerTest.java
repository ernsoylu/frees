package com.frees.backend.api;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReferenceControllerTest {

    @SuppressWarnings("unchecked")
    @Test
    void referenceListsUnitsAndConstants() {
        Map<String, Object> ref = new ReferenceController().reference();

        List<?> units = (List<?>) ref.get("units");
        assertFalse(units.isEmpty(), "units list must not be empty");

        List<ReferenceController.ConstantInfo> constants =
                (List<ReferenceController.ConstantInfo>) ref.get("constants");
        assertFalse(constants.isEmpty(), "constants list must not be empty");

        // The universal gas constant is present with its SI unit.
        assertTrue(constants.stream().anyMatch(c ->
                        "R#".equals(c.name()) && "J/mol-K".equals(c.unit())),
                "R# (J/mol-K) must be in the constants reference");
    }
}
