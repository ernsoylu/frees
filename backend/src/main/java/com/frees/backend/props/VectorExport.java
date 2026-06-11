package com.frees.backend.props;

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

    public static byte[] transcode(String svg, String format) {
        Transcoder transcoder = switch (format == null ? "" : format.toLowerCase()) {
            case "pdf" -> new PDFTranscoder();
            case "eps" -> new EPSTranscoder();
            default -> throw new IllegalArgumentException(
                    "Unknown export format '" + format + "'. Supported: pdf, eps");
        };
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
