package com.frees.backend.props;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class PropertyDiagramsTest {

    @BeforeEach
    void requireCoolProp() {
        assumeTrue(CoolProp.isAvailable(),
                "CoolProp native library not available; skipping diagram tests");
    }

    private static long finiteCount(PropertyDiagrams.Curve curve) {
        return curve.x().stream().filter(Objects::nonNull).count();
    }

    @Test
    void tsDiagramForWaterHasDomeQualityAndIsobars() {
        PropertyDiagrams.Diagram d = PropertyDiagrams.generate("Water", "T-s");
        assertEquals("s", d.xProperty());
        assertEquals("T", d.yProperty());
        assertFalse(d.yLog());
        PropertyDiagrams.Curve dome = d.dome().get(0);
        assertTrue(finiteCount(dome) > 300, "dome should be densely sampled");
        assertTrue(d.isolines().stream().anyMatch(c -> c.family().equals("quality")));
        assertTrue(d.isolines().stream().anyMatch(c -> c.family().equals("isobar")));
        // Critical point of water at ~647.1 K should be the dome top.
        PropertyDiagrams.Marker crit = d.markers().get(0);
        assertEquals(647.1, crit.y(), 0.2);
    }

    @Test
    void phDiagramForR134aIsLogPressureWithIsotherms() {
        PropertyDiagrams.Diagram d = PropertyDiagrams.generate("R134a", "P-h");
        assertEquals("h", d.xProperty());
        assertEquals("P", d.yProperty());
        assertTrue(d.yLog());
        assertTrue(d.isolines().stream().anyMatch(c -> c.family().equals("isotherm")));
        assertTrue(d.isolines().stream().anyMatch(c -> c.family().equals("isentrope")));
        // R134a critical pressure ~4.06 MPa.
        assertEquals(4.059e6, d.markers().get(0).y(), 5e4);
    }

    @Test
    void ptDiagramIsSingleSaturationCurve() {
        PropertyDiagrams.Diagram d = PropertyDiagrams.generate("CO2", "P-T");
        PropertyDiagrams.Curve sat = d.dome().get(0);
        long n = finiteCount(sat);
        assertTrue(n > 150, "saturation curve sampled");
        assertTrue(d.isolines().isEmpty(), "P-T has no isolines");
    }

    @Test
    void qualityLinesStayInsideDome() {
        PropertyDiagrams.Diagram d = PropertyDiagrams.generate("Water", "T-s");
        PropertyDiagrams.Curve x5 = d.isolines().stream()
                .filter(c -> c.label().equals("x = 0.5")).findFirst().orElseThrow();
        // Entropy of x=0.5 at ~373 K must sit between s_f and s_g.
        double sF = CoolProp.propsSI("Smass", "T", 373.15, "Q", 0, "Water");
        double sG = CoolProp.propsSI("Smass", "T", 373.15, "Q", 1, "Water");
        boolean found = false;
        for (int i = 0; i < x5.x().size(); i++) {
            Double s = x5.x().get(i);
            Double t = x5.y().get(i);
            if (s != null && t != null && Math.abs(t - 373.15) < 5) {
                assertTrue(s > sF && s < sG, "x=0.5 inside the dome");
                found = true;
            }
        }
        assertTrue(found, "x=0.5 line passes near 373 K");
    }

    @Test
    void unknownDiagramTypeRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> PropertyDiagrams.generate("Water", "X-y"));
    }

    @Test
    void fluidListContainsCommonFluids() {
        List<String> fluids = PropertyFunctions.plotFluids();
        assertTrue(fluids.contains("Water"));
        assertTrue(fluids.contains("R134a"));
        assertTrue(fluids.contains("CO2"));
        assertFalse(fluids.contains("HumidAir"), "humid air has its own chart");
    }
}
