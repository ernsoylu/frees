package com.frees.backend.measurement;

/**
 * A measurement file could not be parsed (unsupported format feature, corrupt
 * block, unknown channel, …). The message is user-facing: the Data Analyzer
 * surfaces it verbatim as a typed error, never a bare 500.
 */
public class MeasurementParseException extends Exception {

    public MeasurementParseException(String message) {
        super(message);
    }

    public MeasurementParseException(String message, Throwable cause) {
        super(message, cause);
    }
}
