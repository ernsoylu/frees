package com.frees.backend.measurement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;

/**
 * mdf4j spike (todo.md Phase 3, gated 1-day timebox) — doubles as the
 * permanent parser regression test against the committed small fixture.
 *
 * <p>Gate 1 (hard assertions, always runs): the committed
 * {@code a_small_uncompressed.mf4} parses, channels enumerate, one channel
 * extracts with correct values (spike sample preserved).
 *
 * <p>Gates 2–3 (support matrix + scale) need the generated fixture set —
 * point {@code -Dmdf.fixtures.dir=<dir>} at the output of
 * {@code generate_mdf_fixtures.py}; they are skipped when absent so CI stays
 * green without megabyte fixtures. Results are PRINTED as the support matrix
 * (recorded in todo.md), not asserted — an OEM-breaker fixture failing is a
 * documented limitation, not a build failure.
 */
class Mf4SpikeTest {

    private final Mf4Parser parser = new Mf4Parser();

    private Path committedFixture() throws Exception {
        return Paths.get(getClass().getResource("/measurement/a_small_uncompressed.mf4").toURI());
    }

    @Test
    void gate1MetadataEnumerates() throws Exception {
        MeasurementMetadata meta = parser.parseMetadata(committedFixture());
        assertEquals(1, meta.groups().size());
        MeasurementMetadata.GroupInfo group = meta.groups().get(0);
        assertEquals(1000, group.records());
        // time master + speed/torque/valve_open
        assertEquals(4, group.channels().size());
        assertTrue(group.channels().stream().anyMatch(MeasurementMetadata.ChannelInfo::timeMaster));
        MeasurementMetadata.ChannelInfo speed = group.channels().stream()
                .filter(c -> c.name().equals("speed")).findFirst().orElseThrow();
        assertEquals("m/s", speed.unit());
        assertEquals("analog", speed.kind());
    }

    @Test
    void gate1ChannelExtractsWithSpike() throws Exception {
        ChannelData data = parser.extractChannel(committedFixture(), 0, "speed");
        assertEquals(1000, data.time().length);
        assertEquals(1000, data.values().length);
        // Time base: 100 Hz, strictly increasing seconds.
        assertEquals(0.0, data.time()[0], 1e-12);
        assertEquals(0.01, data.time()[1] - data.time()[0], 1e-9);
        for (int i = 1; i < 1000; i++) {
            assertTrue(data.time()[i] > data.time()[i - 1], "time must be strictly increasing");
        }
        // Generator injects a single-sample spike of 99.5 at t = 5.00 s.
        assertEquals(99.5, data.values()[500], 1e-9);
        // Neighbours follow 20 + 10*sin(2t).
        assertEquals(20 + 10 * Math.sin(2 * data.time()[499]), data.values()[499], 1e-9);
    }

    @Test
    void gate1MissingChannelIsATypedError() throws Exception {
        Path fixture = committedFixture();
        try {
            parser.extractChannel(fixture, 0, "no_such_channel");
        } catch (MeasurementParseException e) {
            assertTrue(e.getMessage().contains("no_such_channel"));
            return;
        }
        throw new AssertionError("expected MeasurementParseException");
    }

    // ------------------------------------------------------------------
    // Gates 2–3: OEM breakers + scale (fixture-dir gated, matrix printed)
    // ------------------------------------------------------------------

    private static Path fixturesDir() {
        String dir = System.getProperty("mdf.fixtures.dir", System.getenv("MDF_FIXTURES_DIR"));
        return dir == null ? null : Paths.get(dir);
    }

    @Test
    void gate2SupportMatrix() {
        Path dir = fixturesDir();
        assumeTrue(dir != null && Files.isDirectory(dir), "fixture dir not provided");
        System.out.println("=== mdf4j 0.2.0 support matrix (license: Apache-2.0) ===");
        probe(dir.resolve("b_zstd.mf4"), "b: MDF 4.30 ZSTD DZ", 0, "speed");
        probe(dir.resolve("c_lz4.mf4"), "c: MDF 4.30 LZ4 DZ", 0, "speed");
        probe(dir.resolve("d_vlsd.mf4"), "d: VLSD string channel", 0, "speed");
        probe(dir.resolve("e_multigroup.mf4"), "e0: linear-conversion group", 0, "temp_raw");
        probe(dir.resolve("e_multigroup.mf4"), "e1: fast group + value2text", 1, "speed");
        probe(dir.resolve("g_deflate.mf4"), "g: plain deflate DZ", 0, "speed");
        boolean baseline =
                probe(dir.resolve("h_linear_uncompressed.mf4"), "h0: linear conv, uncompressed", 0, "temp_raw");
        probe(dir.resolve("h_linear_uncompressed.mf4"), "h1: second group, uncompressed", 1, "speed");
        // The matrix is informational (FAILs are printed, not thrown), but the
        // plain uncompressed baseline must always parse.
        assertTrue(baseline, "baseline uncompressed fixture must parse");
    }

    private boolean probe(Path file, String label, int group, String channel) {
        try {
            MeasurementMetadata meta = parser.parseMetadata(file);
            int channels = meta.groups().stream().mapToInt(g -> g.channels().size()).sum();
            ChannelData data = parser.extractChannel(file, group, channel);
            System.out.printf("PASS  %-32s groups=%d channels=%d extracted %s n=%d v0=%s%n",
                    label, meta.groups().size(), channels, channel, data.values().length,
                    data.values().length > 0 ? data.values()[0] : "-");
            return true;
        } catch (Exception e) {
            System.out.printf("FAIL  %-32s %s: %s%n", label, e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }

    @Test
    void gate3Scale100Mb() throws Exception {
        Path dir = fixturesDir();
        assumeTrue(dir != null && Files.exists(dir.resolve("f_large.mf4")), "large fixture not provided");
        Path file = dir.resolve("f_large.mf4");
        long fileSize = Files.size(file);

        Runtime rt = Runtime.getRuntime();
        System.gc();
        long heapBefore = rt.totalMemory() - rt.freeMemory();

        long t0 = System.nanoTime();
        MeasurementMetadata meta = parser.parseMetadata(file);
        long metaMs = (System.nanoTime() - t0) / 1_000_000;

        t0 = System.nanoTime();
        ChannelData data = parser.extractChannel(file, 0, "ch03");
        long extractMs = (System.nanoTime() - t0) / 1_000_000;
        // Retained heap while the extracted arrays are still live: GC first so
        // transient allocation noise doesn't mask the number we care about.
        System.gc();
        long heapAfter = rt.totalMemory() - rt.freeMemory();

        assertNotNull(meta);
        assertEquals(1_200_000, data.values().length);
        System.out.printf(
                "=== Gate 3: file=%.1fMB metadata=%dms extract(1ch of 10)=%dms retainedDelta=%.1fMB%n",
                fileSize / 1e6, metaMs, extractMs, (heapAfter - heapBefore) / 1e6);
        // Lazy extraction must not materialize the whole file on the heap:
        // 1 channel + time = ~19 MB of doubles; allow slack for GC noise, but
        // stay far below the 100 MB file size.
        assertTrue(heapAfter - heapBefore < 60_000_000L,
                "extraction materialized too much heap: " + (heapAfter - heapBefore));
        // Keep the arrays live through the measurement above.
        assertTrue(data.time()[1] > data.time()[0]);
    }
}
