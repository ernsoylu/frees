package com.frees.backend.api;

import com.frees.backend.ast.Expr;
import com.frees.backend.measurement.ChannelData;
import com.frees.backend.measurement.MeasurementParseException;
import com.frees.backend.measurement.MergedRaster;
import com.frees.backend.measurement.SampledSeries;
import com.frees.backend.measurement.TimeSeriesEvaluator;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Calculated signals over measurement data (todo.md Phase 4) — the frees
 * differentiator: the full equation-language function library (units-aware
 * CoolProp properties included) evaluated per sample over a merged raster.
 *
 * <p>Compute policy (decision 3 + pre-spike numbers, recorded in todo.md):
 * synchronous with a hard raster cap — 1M points for call-free formulas
 * (~107 ns/pt compiled), 100k when the formula contains any function call
 * (CoolProp worst case ~75 µs/call uncached; the extended propsSI LRU makes
 * bounded sweeps mostly cache hits). Exceeding the cap is a GUIDED path: a
 * typed RASTER_CAP_EXCEEDED payload carries the actual count and a suggested
 * dt that verifiably lands under the cap. No mid-job cancel in v1.
 *
 * <p>The route lives under /api/measurements so inline input series share the
 * raised upload body cap.
 */
@RestController
public class MeasurementCalcController {

    static final int MAX_RASTER = 1_000_000;
    static final int MAX_RASTER_WITH_CALLS = 100_000;

    public record InlineSeries(double[] t, double[] v) {
    }

    public record CalcInput(String var, String measurementId, String channel, Integer group,
                            InlineSeries inline, String interp) {
    }

    public record RasterSpec(String mode, Double dt, String sameAs) {
    }

    public record CalcRequest(String name, String formula, List<CalcInput> inputs, RasterSpec raster) {
    }

    public record CalcResult(String name, double[] t, double[] v) {
    }

    private final MeasurementStore store;

    public MeasurementCalcController(MeasurementStore store) {
        this.store = store;
    }

    @PostMapping("/api/measurements/calc")
    public ResponseEntity<Object> calc(@RequestBody CalcRequest request) throws IOException {
        try {
            if (request.formula() == null || request.formula().isBlank()) {
                return error(HttpStatus.UNPROCESSABLE_ENTITY, "The formula is empty.", null);
            }
            Expr formula = TimeSeriesEvaluator.parseFormula(request.formula());
            int cap = TimeSeriesEvaluator.containsCall(formula) ? MAX_RASTER_WITH_CALLS : MAX_RASTER;

            // Resolve inputs: inline series (client-parsed CSV) or a channel
            // of a server-side measurement.
            Map<String, SampledSeries> inputs = new LinkedHashMap<>();
            for (CalcInput in : request.inputs() == null ? List.<CalcInput>of() : request.inputs()) {
                if (in.var() == null || in.var().isBlank()) {
                    return error(HttpStatus.UNPROCESSABLE_ENTITY, "An input is missing its variable name.", null);
                }
                SampledSeries.Interp interp =
                        "step".equalsIgnoreCase(in.interp()) ? SampledSeries.Interp.STEP
                                : SampledSeries.Interp.LINEAR;
                double[] t;
                double[] v;
                if (in.inline() != null) {
                    t = in.inline().t();
                    v = in.inline().v();
                    if (t == null || v == null || t.length != v.length) {
                        return error(HttpStatus.UNPROCESSABLE_ENTITY,
                                "Inline series for \"" + in.var() + "\" is malformed.", null);
                    }
                } else {
                    ChannelData data = store.channel(in.measurementId(),
                            in.group() == null ? 0 : in.group(), in.channel());
                    if (data == null) {
                        return error(HttpStatus.NOT_FOUND,
                                "Unknown measurement id for input \"" + in.var()
                                        + "\" (the store is ephemeral — re-upload the file).", null);
                    }
                    t = data.time();
                    v = data.values();
                }
                inputs.put(in.var().toLowerCase(), new SampledSeries(t, v, interp));
            }
            if (inputs.isEmpty()) {
                return error(HttpStatus.UNPROCESSABLE_ENTITY, "Bind at least one input signal.", null);
            }

            double[] raster = buildRaster(request.raster(), inputs, cap);
            double[] values = TimeSeriesEvaluator.evaluate(formula, raster, inputs);
            return ResponseEntity.ok(new CalcResult(request.name(), raster, values));
        } catch (MergedRaster.RasterCapExceededException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(),
                    Map.of("code", "RASTER_CAP_EXCEEDED",
                            "actualPoints", e.actualPoints,
                            "suggestedDt", e.suggestedDt));
        } catch (MeasurementParseException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(), null);
        }
    }

    private static double[] buildRaster(RasterSpec spec, Map<String, SampledSeries> inputs, int cap)
            throws MeasurementParseException, MergedRaster.RasterCapExceededException {
        String mode = spec == null || spec.mode() == null ? "merge" : spec.mode();
        double t0 = Double.POSITIVE_INFINITY;
        double t1 = Double.NEGATIVE_INFINITY;
        for (SampledSeries s : inputs.values()) {
            if (s.t().length > 0) {
                t0 = Math.min(t0, s.t()[0]);
                t1 = Math.max(t1, s.t()[s.t().length - 1]);
            }
        }
        switch (mode) {
            case "merge" -> {
                List<double[]> bases = new ArrayList<>();
                for (SampledSeries s : inputs.values()) {
                    bases.add(s.t());
                }
                return MergedRaster.union(bases, cap);
            }
            case "fixed" -> {
                if (spec == null || spec.dt() == null || !(spec.dt() > 0)) {
                    throw new MeasurementParseException("The fixed raster needs dt > 0.");
                }
                return MergedRaster.fixed(t0, t1, spec.dt(), cap);
            }
            case "sameAs" -> {
                SampledSeries base = spec == null || spec.sameAs() == null
                        ? null
                        : inputs.get(spec.sameAs().toLowerCase());
                if (base == null) {
                    throw new MeasurementParseException("sameAs raster: unknown input variable.");
                }
                if (base.t().length > cap) {
                    throw new MergedRaster.RasterCapExceededException(
                            base.t().length, MergedRaster.suggestDt(t0, t1, cap), cap);
                }
                return base.t();
            }
            default -> throw new MeasurementParseException("Unknown raster mode: " + mode);
        }
    }

    private static ResponseEntity<Object> error(HttpStatus status, String message, Map<String, Object> extra) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", message);
        if (extra != null) {
            body.putAll(extra);
        }
        return ResponseEntity.status(status).body(body);
    }
}
