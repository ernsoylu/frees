package com.frees.backend.props;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class PsychrometricsTest {

    @BeforeEach
    void requireCoolProp() {
        assumeTrue(CoolProp.isAvailable(),
                "CoolProp native library not available; skipping psychrometric tests");
    }

    @Test
    void standardChartHasAllFamilies() {
        Psychrometrics.Chart chart = Psychrometrics.generate(null, null, null);
        assertEquals(101_325.0, chart.pressure());
        List<String> families = chart.curves().stream()
                .map(PropertyDiagrams.Curve::family).distinct().toList();
        assertTrue(families.containsAll(
                List.of("saturation", "rh", "wetbulb", "enthalpy", "volume")), families.toString());
    }

    @Test
    void saturationLineMatchesHaPropsSI() {
        // W at saturation, 25 C, 1 atm is ~0.0202 kg/kg (ASHRAE).
        assertEquals(0.0202,
                CoolProp.haPropsSI("W", "T", 298.15, "P", 101_325.0, "R", 1.0), 0.001);

        Psychrometrics.Chart chart = Psychrometrics.generate(101_325.0, 273.15, 323.15);
        PropertyDiagrams.Curve sat = chart.curves().stream()
                .filter(c -> c.family().equals("saturation")).findFirst().orElseThrow();
        // Every sampled curve point must agree with HAPropsSI at its own T.
        boolean found = false;
        for (int i = 0; i < sat.x().size(); i++) {
            Double t = sat.x().get(i);
            if (t != null && Math.abs(t - 298.15) < 2.0) {
                assertEquals(CoolProp.haPropsSI("W", "T", t, "P", 101_325.0, "R", 1.0),
                        sat.y().get(i), 1e-9);
                found = true;
            }
        }
        assertTrue(found, "saturation line passes near 298 K");
    }

    @Test
    void rhLinesStayBelowSaturation() {
        Psychrometrics.Chart chart = Psychrometrics.generate(null, null, null);
        PropertyDiagrams.Curve sat = chart.curves().stream()
                .filter(c -> c.family().equals("saturation")).findFirst().orElseThrow();
        PropertyDiagrams.Curve rh50 = chart.curves().stream()
                .filter(c -> c.label().contains("50%")).findFirst().orElseThrow();
        for (int i = 0; i < sat.x().size(); i++) {
            Double wSat = sat.y().get(i);
            Double w50 = rh50.y().get(i);
            if (wSat != null && w50 != null) {
                assertTrue(w50 < wSat, "50% RH below saturation");
            }
        }
    }

    @Test
    void invalidRangeRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> Psychrometrics.generate(101_325.0, 320.0, 280.0));
    }
}
