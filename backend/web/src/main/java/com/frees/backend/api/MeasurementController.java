package com.frees.backend.api;

import com.frees.backend.measurement.ChannelWindowDto;
import com.frees.backend.measurement.MeasurementParseException;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Measurement upload + windowed channel reads for the Data Analyzer
 * (todo.md Phase 3). I/O-bound, not solver compute, so it runs on the API
 * node directly — no RabbitMQ dispatch. Parse failures surface as typed 422
 * payloads (user-facing message), never a bare 500.
 */
@RestController
@RequestMapping("/api/measurements")
public class MeasurementController {

    private final MeasurementStore store;

    public MeasurementController(MeasurementStore store) {
        this.store = store;
    }

    @PostMapping
    public ResponseEntity<Object> upload(@RequestParam("file") MultipartFile file) throws IOException {
        try {
            MeasurementStore.StoredMeasurement stored =
                    store.store(file.getInputStream(), file.getOriginalFilename());
            return ResponseEntity.ok(stored);
        } catch (MeasurementStore.UploadTooLargeException e) {
            return error(HttpStatus.PAYLOAD_TOO_LARGE, e.getMessage());
        } catch (MeasurementStore.NotAnMdfFileException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        } catch (MeasurementParseException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> metadata(@PathVariable String id) {
        MeasurementStore.StoredMeasurement stored = store.get(id);
        if (stored == null) {
            return error(HttpStatus.NOT_FOUND, "Unknown measurement id (the store is ephemeral — re-upload the file).");
        }
        return ResponseEntity.ok(stored);
    }

    @GetMapping("/{id}/channels/{name}")
    public ResponseEntity<Object> window(
            @PathVariable String id,
            @PathVariable String name,
            @RequestParam(defaultValue = "0") int group,
            @RequestParam(required = false) Double from,
            @RequestParam(required = false) Double to,
            @RequestParam(defaultValue = "2400") int maxPoints) throws IOException {
        try {
            ChannelWindowDto window =
                    store.getWindow(id, group, name, from, to, Math.min(Math.max(maxPoints, 2), 20_000));
            if (window == null) {
                return error(HttpStatus.NOT_FOUND, "Unknown measurement id (the store is ephemeral — re-upload the file).");
            }
            return ResponseEntity.ok(window);
        } catch (MeasurementParseException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return store.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private static ResponseEntity<Object> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
