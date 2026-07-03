package com.frees.backend.api;

import com.frees.backend.measurement.ChannelData;
import com.frees.backend.measurement.ChannelWindowDto;
import com.frees.backend.measurement.EnvelopeDecimator;
import com.frees.backend.measurement.MeasurementMetadata;
import com.frees.backend.measurement.MeasurementParseException;
import com.frees.backend.measurement.MeasurementParser;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Ephemeral per-node store of uploaded measurement files (Data Analyzer
 * Phase 3). Uploads are STREAMED to a temp directory — never buffered on the
 * heap — with the byte count enforced during the stream (the request guard's
 * Content-Length check alone is spoofable) and MDF magic bytes validated
 * before anything is parsed. Channel data is extracted lazily per channel via
 * the {@link MeasurementParser} and kept in a small LRU so zooming (repeated
 * window requests) doesn't re-read the file every time.
 *
 * <p>Metadata + TTL/LRU eviction mirror {@link SolveContextCache}: entries
 * expire after {@code frees.measurements.ttl-minutes} of inactivity or when
 * the file cap is exceeded (oldest first). Statelessness caveat (todo.md
 * risks): the store is per-API-node and vanishes on restart — the frontend's
 * template-mode banner covers re-upload.
 */
@Component
public class MeasurementStore {

    private static final Logger log = LoggerFactory.getLogger(MeasurementStore.class);

    /** "MDF     " — first bytes of the MDF ID block (v3 and v4 alike). */
    private static final byte[] MDF_MAGIC = {'M', 'D', 'F'};

    /** Extracted-channel LRU cap (channels, across all measurements). */
    private static final int CHANNEL_CACHE_MAX = 24;

    /** Signals an upload exceeding the streamed-byte cap. */
    public static final class UploadTooLargeException extends IOException {
        public UploadTooLargeException(long cap) {
            super("Upload exceeds the " + cap + "-byte limit.");
        }
    }

    /** Signals a file whose first bytes are not an MDF ID block. */
    public static final class NotAnMdfFileException extends IOException {
        public NotAnMdfFileException() {
            super("Not an MDF file: the file does not start with the \"MDF\" ID block. "
                    + "CSV/TSV files are imported client-side; only .mf4 uploads are parsed here.");
        }
    }

    record Entry(String id, String name, long size, Path file, MeasurementMetadata metadata,
                 AtomicLong lastAccess) {
        void touch() {
            lastAccess.set(System.currentTimeMillis());
        }
    }

    private final MeasurementParser parser;
    private final long maxUploadBytes;
    private final long ttlMillis;
    private final int maxFiles;
    private final Path tempDir;
    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Map<String, ChannelData> channelCache =
            new LinkedHashMap<>(32, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, ChannelData> eldest) {
                    return size() > CHANNEL_CACHE_MAX;
                }
            };

    public MeasurementStore(
            MeasurementParser parser,
            @Value("${frees.security.max-upload-bytes:209715200}") long maxUploadBytes,
            @Value("${frees.measurements.ttl-minutes:120}") long ttlMinutes,
            @Value("${frees.measurements.max-files:20}") int maxFiles) throws IOException {
        this.parser = parser;
        this.maxUploadBytes = maxUploadBytes;
        this.ttlMillis = Duration.ofMinutes(ttlMinutes).toMillis();
        this.maxFiles = maxFiles;
        this.tempDir = createPrivateTempDir();
    }

    /**
     * The system temp dir is publicly writable; give our upload directory
     * owner-only permissions so other local users can neither read nor swap
     * uploaded files. Falls back to the default-permission variant only on
     * filesystems without POSIX permissions (e.g. Windows dev hosts, where
     * java.io.tmpdir is already per-user).
     */
    private static Path createPrivateTempDir() throws IOException {
        try {
            return Files.createTempDirectory("frees-measurements",
                    PosixFilePermissions.asFileAttribute(
                            PosixFilePermissions.fromString("rwx------")));
        } catch (UnsupportedOperationException e) {
            return Files.createTempDirectory("frees-measurements"); // NOSONAR java:S5443 — non-POSIX fs, per-user tmp
        }
    }

    /**
     * Stream an upload to disk (counting bytes, checking magic), parse its
     * structure, and register it. Returns the stored entry.
     */
    public StoredMeasurement store(InputStream in, String filename)
            throws IOException, MeasurementParseException {
        String id = UUID.randomUUID().toString();
        Path file = tempDir.resolve(id + ".mf4");
        long total = 0;
        try (OutputStream out = Files.newOutputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            boolean checkedMagic = false;
            int read;
            while ((read = in.read(buffer)) > 0) {
                if (!checkedMagic) {
                    if (read < MDF_MAGIC.length
                            || !Arrays.equals(Arrays.copyOf(buffer, MDF_MAGIC.length), MDF_MAGIC)) {
                        throw new NotAnMdfFileException();
                    }
                    checkedMagic = true;
                }
                total += read;
                if (total > maxUploadBytes) {
                    throw new UploadTooLargeException(maxUploadBytes);
                }
                out.write(buffer, 0, read);
            }
            if (!checkedMagic) {
                throw new NotAnMdfFileException(); // empty upload
            }
        } catch (IOException | RuntimeException e) {
            Files.deleteIfExists(file);
            throw e;
        }

        MeasurementMetadata metadata;
        try {
            metadata = parser.parseMetadata(file);
        } catch (MeasurementParseException | IOException | RuntimeException e) {
            Files.deleteIfExists(file);
            throw e;
        }
        Entry entry = new Entry(id, filename, total, file, metadata,
                new AtomicLong(System.currentTimeMillis()));
        entries.put(id, entry);
        evictOverCap();
        return new StoredMeasurement(id, filename, total, metadata);
    }

    /** Upload response / metadata DTO. */
    public record StoredMeasurement(String measurementId, String name, long size,
                                    MeasurementMetadata metadata) {
    }

    public StoredMeasurement get(String id) {
        Entry entry = entries.get(id);
        if (entry == null) {
            return null;
        }
        entry.touch();
        return new StoredMeasurement(entry.id(), entry.name(), entry.size(), entry.metadata());
    }

    /**
     * Windowed channel read (the shared ChannelWindow DTO): raw samples when
     * the range fits {@code maxPoints}, a min/max envelope otherwise.
     */
    public ChannelWindowDto getWindow(String id, int group, String channel,
                                      Double from, Double to, int maxPoints)
            throws IOException, MeasurementParseException {
        Entry entry = entries.get(id);
        if (entry == null) {
            return null;
        }
        entry.touch();
        ChannelData data = extract(entry, group, channel);
        double[] t = data.time();
        double[] v = data.values();
        int n = t.length;
        String unit = entry.metadata().groups().stream()
                .filter(g -> g.index() == group).findFirst()
                .flatMap(g -> g.channels().stream()
                        .filter(c -> c.name().equals(channel)).findFirst())
                .map(MeasurementMetadata.ChannelInfo::unit)
                .orElse(null);
        String kind = sniffKind(v);
        if (n == 0) {
            return ChannelWindowDto.raw(t, v, 0, unit, kind);
        }
        int i0 = Math.max(0, (from == null ? 0 : EnvelopeDecimator.lowerBound(t, from)) - 1);
        int i1 = Math.min(n - 1, to == null ? n - 1 : EnvelopeDecimator.lowerBound(t, to));
        int count = i1 - i0 + 1;
        if (count <= maxPoints) {
            return ChannelWindowDto.raw(
                    Arrays.copyOfRange(t, i0, i1 + 1), Arrays.copyOfRange(v, i0, i1 + 1),
                    n, unit, kind);
        }
        EnvelopeDecimator.Envelope envelope =
                EnvelopeDecimator.minMax(t, v, i0, i1, Math.max(1, maxPoints / 2));
        return ChannelWindowDto.decimated(envelope, n, unit, kind);
    }

    /** Full-resolution channel for the calc engine; null for unknown ids. */
    public ChannelData channel(String id, int group, String channel)
            throws IOException, MeasurementParseException {
        Entry entry = entries.get(id);
        if (entry == null) {
            return null;
        }
        entry.touch();
        return extract(entry, group, channel);
    }

    public boolean delete(String id) {
        Entry entry = entries.remove(id);
        if (entry == null) {
            return false;
        }
        synchronized (channelCache) {
            channelCache.keySet().removeIf(k -> k.startsWith(id + "|"));
        }
        try {
            Files.deleteIfExists(entry.file());
        } catch (IOException e) {
            log.warn("Could not delete measurement file {}", entry.file(), e);
        }
        return true;
    }

    private ChannelData extract(Entry entry, int group, String channel)
            throws IOException, MeasurementParseException {
        String key = entry.id() + "|" + group + "|" + channel;
        synchronized (channelCache) {
            ChannelData cached = channelCache.get(key);
            if (cached != null) {
                return cached;
            }
        }
        ChannelData data = parser.extractChannel(entry.file(), group, channel);
        synchronized (channelCache) {
            channelCache.put(key, data);
        }
        return data;
    }

    /** Boolean sniff mirrors the frontend CSV path: all finite values ∈ {0,1}. */
    private static String sniffKind(double[] v) {
        boolean sawFinite = false;
        for (double x : v) {
            if (Double.isNaN(x)) {
                continue;
            }
            sawFinite = true;
            if (x != 0.0 && x != 1.0) {
                return "analog";
            }
        }
        return sawFinite ? "boolean" : "analog";
    }

    private void evictOverCap() {
        while (entries.size() > maxFiles) {
            entries.values().stream()
                    .min((a, b) -> Long.compare(a.lastAccess().get(), b.lastAccess().get()))
                    .ifPresent(oldest -> {
                        log.info("Evicting measurement {} ({}) — file cap reached",
                                oldest.id(), oldest.name());
                        delete(oldest.id());
                    });
        }
    }

    /** TTL sweep, mirroring SolveContextCache's self-eviction. */
    @Scheduled(fixedDelay = 300_000)
    public void sweepExpired() {
        long cutoff = System.currentTimeMillis() - ttlMillis;
        entries.values().stream()
                .filter(e -> e.lastAccess().get() < cutoff)
                .map(Entry::id)
                .toList()
                .forEach(this::delete);
    }
}
