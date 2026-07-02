package com.frees.backend.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.measurement.ChannelData;
import com.frees.backend.measurement.MeasurementMetadata;
import com.frees.backend.measurement.MeasurementParseException;
import com.frees.backend.measurement.MeasurementParser;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Remote {@link MeasurementParser} backed by the asammdf sidecar (todo.md
 * decision 4 + fallback-ladder rung 3): covers the DZ-compressed MDF4 files
 * mdf4j cannot read.
 *
 * <p>Contract pinned by the plan: plain internal REST; the client
 * RE-RESOLVES DNS per request (Railway's private IPv6 changes every redeploy
 * — the same foot-gun nginx guards against with its `resolver` directive;
 * the JVM's positive DNS cache is capped at 10 s here); connect timeout
 * ~2 s, read timeout 60 s (GB-scale parses take seconds, not ms); sidecar
 * failures map to typed user-facing errors, never a bare 502. The sidecar is
 * stateless — the file is re-streamed per request, so a sidecar restart is
 * invisible beyond a retried request (the MeasurementStore channel LRU keeps
 * re-streams to one per channel).
 */
public class SidecarMeasurementParser implements MeasurementParser {

    static {
        // Cap the JVM's positive DNS cache so a redeployed sidecar's new
        // private address is picked up within seconds.
        java.security.Security.setProperty("networkaddress.cache.ttl", "10");
    }

    private final URI baseUrl;
    private final HttpClient client;
    private final ObjectMapper objectMapper;
    private final Duration readTimeout;

    public SidecarMeasurementParser(String baseUrl, ObjectMapper objectMapper) {
        this(baseUrl, objectMapper, Duration.ofSeconds(2), Duration.ofSeconds(60));
    }

    public SidecarMeasurementParser(String baseUrl, ObjectMapper objectMapper,
                                    Duration connectTimeout, Duration readTimeout) {
        this.baseUrl = URI.create(baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl);
        this.objectMapper = objectMapper;
        this.readTimeout = readTimeout;
        this.client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
    }

    @Override
    public MeasurementMetadata parseMetadata(Path file) throws IOException, MeasurementParseException {
        byte[] body = send(file, "/parse-metadata");
        JsonNode root = objectMapper.readTree(body);
        List<MeasurementMetadata.GroupInfo> groups = new ArrayList<>();
        for (JsonNode g : root.get("groups")) {
            List<MeasurementMetadata.ChannelInfo> channels = new ArrayList<>();
            for (JsonNode c : g.get("channels")) {
                channels.add(new MeasurementMetadata.ChannelInfo(
                        c.get("name").asText(),
                        c.hasNonNull("unit") ? c.get("unit").asText() : null,
                        c.get("timeMaster").asBoolean(),
                        c.get("kind").asText()));
            }
            groups.add(new MeasurementMetadata.GroupInfo(
                    g.get("index").asInt(),
                    g.get("name").asText(),
                    g.get("records").asLong(),
                    channels));
        }
        return new MeasurementMetadata(groups);
    }

    @Override
    public ChannelData extractChannel(Path file, int groupIndex, String channelName)
            throws IOException, MeasurementParseException {
        byte[] body = send(file, "/extract-channel?group=" + groupIndex
                + "&channel=" + URLEncoder.encode(channelName, StandardCharsets.UTF_8));
        // Binary protocol: int64 LE count n, then n float64 times, n float64 values.
        ByteBuffer buffer = ByteBuffer.wrap(body).order(ByteOrder.LITTLE_ENDIAN);
        if (body.length < 8) {
            throw new MeasurementParseException("Sidecar returned a malformed channel payload.");
        }
        long n = buffer.getLong();
        if (n < 0 || body.length != 8 + 16 * n) {
            throw new MeasurementParseException(
                    "Sidecar channel payload size mismatch (n=" + n + ", bytes=" + body.length + ").");
        }
        double[] time = new double[(int) n];
        double[] values = new double[(int) n];
        buffer.asDoubleBuffer().get(time).get(values);
        return new ChannelData(time, values);
    }

    private byte[] send(Path file, String pathAndQuery) throws IOException, MeasurementParseException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + pathAndQuery))
                .timeout(readTimeout)
                .header("Content-Type", "application/octet-stream")
                .POST(HttpRequest.BodyPublishers.ofFile(file))
                .build();
        HttpResponse<byte[]> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        } catch (IOException e) {
            throw new IOException("The MDF sidecar is unreachable: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while calling the MDF sidecar.", e);
        }
        if (response.statusCode() == 200) {
            return response.body();
        }
        // Typed error payload ({"error": "..."}) — surface the message.
        String message = "MDF sidecar error (HTTP " + response.statusCode() + ").";
        try {
            JsonNode node = objectMapper.readTree(response.body());
            if (node.hasNonNull("error")) {
                message = node.get("error").asText();
            }
        } catch (IOException ignored) {
            // non-JSON error body — keep the generic message
        }
        throw new MeasurementParseException(message);
    }
}
