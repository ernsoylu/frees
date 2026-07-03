package com.frees.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.measurement.ChannelData;
import com.frees.backend.measurement.FallbackMeasurementParser;
import com.frees.backend.measurement.MeasurementMetadata;
import com.frees.backend.measurement.MeasurementParseException;
import com.frees.backend.measurement.MeasurementParser;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Sidecar client tests against an embedded HTTP stub: the binary channel
 * protocol, typed error mapping, and the fallback-ladder composition (rung 3
 * of todo.md Phase 3). The real asammdf sidecar is exercised in the Docker
 * e2e (compressed .mf4 upload).
 */
class SidecarMeasurementParserTest {

    private static HttpServer server;
    private static String baseUrl;
    private static Path tempFile;

    @BeforeAll
    static void start() throws IOException {
        tempFile = Files.createTempFile("sidecar-test", ".mf4");
        Files.write(tempFile, "MDF     fake".getBytes(StandardCharsets.UTF_8));

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/parse-metadata", exchange -> {
            byte[] body = ("{\"groups\":[{\"index\":0,\"name\":\"g\",\"records\":3,\"channels\":["
                    + "{\"name\":\"time\",\"unit\":\"s\",\"timeMaster\":true,\"kind\":\"analog\"},"
                    + "{\"name\":\"speed\",\"unit\":\"m/s\",\"timeMaster\":false,\"kind\":\"analog\"}]}]}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.createContext("/extract-channel", exchange -> {
            String query = exchange.getRequestURI().getQuery();
            if (query != null && query.contains("channel=missing")) {
                byte[] err = "{\"error\":\"Channel \\\"missing\\\" not found in group 0\"}".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(422, err.length);
                try (OutputStream out = exchange.getResponseBody()) {
                    out.write(err);
                }
                return;
            }
            ByteBuffer buffer = ByteBuffer.allocate(8 + 16 * 3).order(ByteOrder.LITTLE_ENDIAN);
            buffer.putLong(3);
            buffer.putDouble(0).putDouble(0.5).putDouble(1.0); // time
            buffer.putDouble(10).putDouble(Double.NaN).putDouble(30); // values
            byte[] body = buffer.array();
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterAll
    static void stop() throws IOException {
        server.stop(0);
        Files.deleteIfExists(tempFile);
    }

    private SidecarMeasurementParser parser() {
        return new SidecarMeasurementParser(baseUrl, new ObjectMapper(),
                Duration.ofSeconds(2), Duration.ofSeconds(10));
    }

    @Test
    void decodesMetadataJson() throws Exception {
        MeasurementMetadata meta = parser().parseMetadata(tempFile);
        assertEquals(1, meta.groups().size());
        assertEquals(3, meta.groups().get(0).records());
        assertEquals("m/s", meta.groups().get(0).channels().get(1).unit());
        assertTrue(meta.groups().get(0).channels().get(0).timeMaster());
    }

    @Test
    void decodesBinaryChannelPayloadIncludingNaN() throws Exception {
        ChannelData data = parser().extractChannel(tempFile, 0, "speed");
        assertEquals(3, data.time().length);
        assertEquals(0.5, data.time()[1], 1e-12);
        assertEquals(10, data.values()[0], 1e-12);
        assertTrue(Double.isNaN(data.values()[1]));
    }

    @Test
    void typedErrorsSurfaceTheSidecarMessage() {
        MeasurementParseException e = assertThrows(MeasurementParseException.class,
                () -> parser().extractChannel(tempFile, 0, "missing"));
        assertTrue(e.getMessage().contains("missing"));
    }

    @Test
    void unreachableSidecarIsAnIoErrorNotAParseError() {
        SidecarMeasurementParser dead = new SidecarMeasurementParser(
                "http://127.0.0.1:1", new ObjectMapper(), Duration.ofMillis(300), Duration.ofSeconds(1));
        assertThrows(IOException.class, () -> dead.parseMetadata(tempFile));
    }

    @Test
    void fallbackLadderRetriesParseFailuresOnly() throws Exception {
        // Primary always fails with a parse error → the ladder must reach the stub.
        MeasurementParser failing = new MeasurementParser() {
            @Override
            public MeasurementMetadata parseMetadata(Path file) throws MeasurementParseException {
                throw new MeasurementParseException("Unknown zip type: 2");
            }

            @Override
            public ChannelData extractChannel(Path file, int groupIndex, String channelName)
                    throws MeasurementParseException {
                throw new MeasurementParseException("Unknown zip type: 2");
            }
        };
        FallbackMeasurementParser ladder = new FallbackMeasurementParser(failing, parser());
        assertEquals(1, ladder.parseMetadata(tempFile).groups().size());
        assertEquals(3, ladder.extractChannel(tempFile, 0, "speed").time().length);
    }
}
