package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VectorExportTest {

    private static final String SVG = """
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
              <rect x="10" y="10" width="180" height="80" fill="white" stroke="black"/>
              <path d="M 20 80 L 60 30 L 120 50 L 180 20" stroke="blue" fill="none"/>
              <text x="20" y="95" font-size="10">T-s diagram</text>
            </svg>
            """;

    @Test
    void transcodesSvgToPdf() {
        byte[] pdf = VectorExport.transcode(SVG, "pdf");
        String head = new String(pdf, 0, 5, StandardCharsets.US_ASCII);
        assertTrue(head.startsWith("%PDF-"), "PDF header, got: " + head);
        assertTrue(pdf.length > 500);
    }

    @Test
    void transcodesSvgToEps() {
        byte[] eps = VectorExport.transcode(SVG, "eps");
        String head = new String(eps, 0, 11, StandardCharsets.US_ASCII);
        assertTrue(head.startsWith("%!PS-Adobe-"), "EPS header, got: " + head);
    }

    @Test
    void rejectsUnknownFormatAndBadSvg() {
        assertThrows(IllegalArgumentException.class, () -> VectorExport.transcode(SVG, "tiff"));
        assertThrows(IllegalArgumentException.class, () -> VectorExport.transcode("<svg", "pdf"));
    }
}
