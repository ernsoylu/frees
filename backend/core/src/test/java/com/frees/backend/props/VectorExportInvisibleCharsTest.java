package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Plotly wraps log-axis tick exponents in zero-width spaces (U+200B);
 * Batik/FOP has no glyph for them in the PDF base fonts, so viewers drew the
 * missing-glyph box ('#') on every log tick — "10#²#". The transcoder strips
 * invisible Unicode before rendering (the '#' is the viewer's missing-glyph
 * rendering, not a literal byte, so this asserts on the sanitizer itself). */
class VectorExportInvisibleCharsTest {

    @Test
    void stripsPlotlyZeroWidthSpacesAroundExponents() {
        String plotlyTick = "10\u200B<tspan dy=\"-0.6em\">2</tspan>\u200B";
        assertEquals("10<tspan dy=\"-0.6em\">2</tspan>",
                VectorExport.stripInvisibleChars(plotlyTick));
    }

    @Test
    void stripsOtherInvisibleUnicodeButKeepsVisibleText() {
        assertEquals("P [MPa] v [m3/kg]",
                VectorExport.stripInvisibleChars("\uFEFFP [MPa]\u2060 v\u200D [m3/kg]\u2063"));
    }

    @Test
    void sanitizedSvgStillTranscodes() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"40\">"
                + "<text x=\"10\" y=\"20\">10\u200B<tspan dy=\"-0.6em\">2</tspan>\u200B</text>"
                + "</svg>";
        assertTrue(VectorExport.transcode(svg, "pdf").length > 0);
    }
}
