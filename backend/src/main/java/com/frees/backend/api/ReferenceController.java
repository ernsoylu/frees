package com.frees.backend.api;

import com.frees.backend.parser.ConstantsRegistry;
import com.frees.backend.units.UnitRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Static language reference surfaced in the Help window: the supported unit
 * table (sourced live from {@link UnitRegistry}) and the built-in constants
 * (from {@link ConstantsRegistry}), so the Help page never drifts from what the
 * solver actually accepts.
 */
@RestController
@RequestMapping("/api")
public class ReferenceController {

    public record ConstantInfo(String name, double value, String unit, String description) {}

    @GetMapping("/reference")
    public Map<String, Object> reference() {
        List<UnitRegistry.UnitInfo> units = UnitRegistry.listUnits();
        List<ConstantInfo> constants = ConstantsRegistry.list().stream()
                .map(c -> new ConstantInfo(c.name(), c.value(),
                        c.unit() == null ? "-" : c.unit(), c.description()))
                .toList();
        return Map.of("units", units, "constants", constants);
    }
}
