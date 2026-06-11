package com.frees.backend.api;

import com.frees.backend.props.CoolProp;
import com.frees.backend.props.PropertyDiagrams;
import com.frees.backend.props.Psychrometrics;
import com.frees.backend.props.VectorExport;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

import static com.frees.backend.props.PropertyFunctions.plotFluids;

/** Property diagram, psychrometric chart and vector export endpoints. */
@RestController
@RequestMapping("/api")
public class PlotController {

    public record PropPlotRequest(String fluid, String type) {}

    public record PsychartRequest(Double pressure, Double tMin, Double tMax) {}

    public record ExportRequest(String format, String svg) {}

    public record ErrorResponse(String error) {}

    @GetMapping("/fluids")
    public Map<String, Object> fluids() {
        return Map.of(
                "available", CoolProp.isAvailable(),
                "fluids", CoolProp.isAvailable() ? plotFluids() : List.of());
    }

    @PostMapping("/propplot")
    public ResponseEntity<Object> propertyPlot(@RequestBody PropPlotRequest request) {
        if (request.fluid() == null || request.fluid().isBlank()) {
            return badRequest("A fluid name is required");
        }
        try {
            PropertyDiagrams.Diagram diagram =
                    PropertyDiagrams.generate(request.fluid(), request.type());
            return ResponseEntity.ok(diagram);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return badRequest(e.getMessage());
        }
    }

    @PostMapping("/psychart")
    public ResponseEntity<Object> psychrometricChart(@RequestBody PsychartRequest request) {
        try {
            Psychrometrics.Chart chart = Psychrometrics.generate(
                    request.pressure(), request.tMin(), request.tMax());
            return ResponseEntity.ok(chart);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return badRequest(e.getMessage());
        }
    }

    /** Transcodes a plot SVG to a vector PDF or EPS for publication use. */
    @PostMapping("/export")
    public ResponseEntity<Object> export(@RequestBody ExportRequest request) {
        if (request.svg() == null || request.svg().isBlank()) {
            return badRequest("SVG content is required");
        }
        try {
            byte[] bytes = VectorExport.transcode(request.svg(), request.format());
            MediaType type = "eps".equalsIgnoreCase(request.format())
                    ? MediaType.parseMediaType("application/postscript")
                    : MediaType.APPLICATION_PDF;
            return ResponseEntity.ok().contentType(type).body(bytes);
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    private static ResponseEntity<Object> badRequest(String message) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
    }
}
