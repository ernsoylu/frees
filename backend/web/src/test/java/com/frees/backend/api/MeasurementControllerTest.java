package com.frees.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.measurement.Mf4Parser;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Data Analyzer Phase 3 backend tests: multipart upload round-trip, windowed
 * envelope reads (spike preserved), typed errors, magic-byte validation, and
 * the streamed-byte cap that a spoofed Content-Length cannot bypass. The
 * other-routes 1 MB cap staying intact is covered by RequestGuardFilterTest.
 */
@SpringBootTest
@AutoConfigureMockMvc
class MeasurementControllerTest {

    /** The committed spike fixture from the core module's test resources. */
    private static final Path FIXTURE =
            Paths.get("../core/src/test/resources/measurement/a_small_uncompressed.mf4");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String upload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "a_small_uncompressed.mf4", "application/octet-stream",
                Files.readAllBytes(FIXTURE));
        String body = mockMvc.perform(multipart("/api/measurements").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurementId").exists())
                .andExpect(jsonPath("$.metadata.groups[0].records").value(1000))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("measurementId").asText();
    }

    @Test
    void multipartRoundTripAndWindows() throws Exception {
        String id = upload();

        // Metadata fetch.
        mockMvc.perform(get("/api/measurements/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metadata.groups[0].channels[?(@.name=='speed')].unit")
                        .value("m/s"));

        // Raw window (small range fits the budget).
        String raw = mockMvc.perform(get("/api/measurements/{id}/channels/{name}", id, "speed")
                        .param("from", "0").param("to", "0.5").param("maxPoints", "2400"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decimated").value(false))
                .andReturn().getResponse().getContentAsString();
        JsonNode rawNode = objectMapper.readTree(raw);
        assertEquals(1000, rawNode.get("totalSamples").asLong());
        assertTrue(rawNode.get("v").size() > 40);

        // Decimated window over everything: the injected 99.5 spike at t=5.0 s
        // must survive in the max envelope (§2.5d, server side).
        String env = mockMvc.perform(get("/api/measurements/{id}/channels/{name}", id, "speed")
                        .param("maxPoints", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decimated").value(true))
                .andReturn().getResponse().getContentAsString();
        JsonNode envNode = objectMapper.readTree(env);
        double max = Double.NEGATIVE_INFINITY;
        for (JsonNode x : envNode.get("max")) {
            max = Math.max(max, x.asDouble());
        }
        assertEquals(99.5, max, 1e-9);

        // Unknown channel → typed 422, never a bare 500.
        mockMvc.perform(get("/api/measurements/{id}/channels/{name}", id, "nope"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").exists());

        // Delete, then 404s.
        mockMvc.perform(delete("/api/measurements/{id}", id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/measurements/{id}", id)).andExpect(status().isNotFound());
    }

    @Test
    void rejectsNonMdfUploadsByMagicBytes() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "notes.csv", "text/csv", "time,a\n0,1\n".getBytes());
        mockMvc.perform(multipart("/api/measurements").file(file))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void measurementRouteEscapesTheOneMegabyteBodyCap() throws Exception {
        // > 1 MB upload passes the filter's per-route cap (it would be 413 on
        // any other route, see RequestGuardFilterTest) and reaches the
        // controller, which rejects it on content, not size.
        byte[] big = new byte[1_200_000];
        big[0] = 'x';
        MockMultipartFile file = new MockMultipartFile("file", "big.bin",
                "application/octet-stream", big);
        int status = mockMvc.perform(multipart("/api/measurements").file(file))
                .andReturn().getResponse().getStatus();
        assertNotEquals(413, status, "measurement upload must not hit the 1 MB body cap");
        assertEquals(422, status, "non-MDF content is rejected as unprocessable");
    }

    @Test
    void streamedByteCountAbortsOverCapUploadsRegardlessOfContentLength() throws Exception {
        // Direct store-level check: a spoofed/absent Content-Length cannot
        // bypass the cap because the bytes are counted as they stream.
        MeasurementStore store = new MeasurementStore(new Mf4Parser(), 10_000, 60, 5);
        InputStream endless = new SequenceInputStream(
                new ByteArrayInputStream("MDF     ".getBytes()),
                new ByteArrayInputStream(new byte[50_000]));
        assertThrows(MeasurementStore.UploadTooLargeException.class,
                () -> store.store(endless, "big.mf4"));
    }

    @Test
    void streamedMagicCheckRejectsEmptyUploads() throws Exception {
        MeasurementStore store = new MeasurementStore(new Mf4Parser(), 10_000, 60, 5);
        assertThrows(MeasurementStore.NotAnMdfFileException.class,
                () -> store.store(new ByteArrayInputStream(new byte[0]), "empty.mf4"));
    }
}
