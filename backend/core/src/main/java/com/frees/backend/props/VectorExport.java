package com.frees.backend.props;

import org.apache.batik.transcoder.SVGAbstractTranscoder;
import org.apache.batik.transcoder.Transcoder;
import org.apache.batik.transcoder.TranscoderException;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.fop.render.ps.EPSTranscoder;
import org.apache.fop.svg.PDFTranscoder;

import java.io.ByteArrayOutputStream;
import java.io.StringReader;

/** SVG to vector PDF/EPS transcoding via Apache FOP (Batik-based). */
public final class VectorExport {

    private VectorExport() {}

    /** Invisible Unicode Plotly embeds in SVG text (zero-width spaces around
     *  log-axis tick exponents, word joiners, invisible operators, BOM).
     *  Batik/FOP has no glyph for them in the PDF/EPS base fonts and draws
     *  the missing-glyph box ('#') instead — "10#²#" on every log tick.
     *  They carry no visual meaning, so strip them before transcoding. */
    private static final java.util.regex.Pattern INVISIBLE_CHARS =
            java.util.regex.Pattern.compile("[\\u200B\\u200C\\u200D\\u2060\\u2061\\u2062\\u2063\\u2064\\uFEFF]");

    /** Package-visible for tests. */
    static String stripInvisibleChars(String svg) {
        return INVISIBLE_CHARS.matcher(svg).replaceAll("");
    }

    public static byte[] transcode(String svg, String format) {
        svg = stripInvisibleChars(svg);
        Transcoder transcoder = switch (format == null ? "" : format.toLowerCase()) {
            case "pdf" -> new PDFTranscoder();
            case "eps" -> new EPSTranscoder();
            default -> throw new IllegalArgumentException(
                    "Unknown export format '" + format + "'. Supported: pdf, eps");
        };
        // Secure the transcoder by disabling external resource resolution (mitigates XXE & SSRF)
        transcoder.addTranscodingHint(SVGAbstractTranscoder.KEY_ALLOW_EXTERNAL_RESOURCES, Boolean.FALSE);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            transcoder.transcode(new TranscoderInput(new StringReader(svg)),
                    new TranscoderOutput(out));
            return out.toByteArray();
        } catch (TranscoderException e) {
            throw new IllegalArgumentException(
                    "Could not convert the SVG: " + rootMessage(e), e);
        }
    }

    private static String rootMessage(Throwable t) {
        Throwable cause = t;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? t.getMessage() : cause.getMessage();
    }
}
