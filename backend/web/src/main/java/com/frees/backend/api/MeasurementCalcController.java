package com.frees.backend.api;

import com.frees.backend.ast.Expr;
import com.frees.backend.compute.ComputeDispatcher;
import com.frees.backend.compute.ComputeTask;
import com.frees.backend.measurement.ChannelData;
import com.frees.backend.measurement.MeasurementParseException;
import com.frees.backend.measurement.MergedRaster;
import com.frees.backend.measurement.SampledSeries;
import com.frees.backend.measurement.TimeSeriesEvaluator;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
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
 * call-free formulas always run synchronously (~107 ns/pt compiled, capped
 * at 1M points). Formulas containing function calls get a 100k-point cap
 * AND, above {@link #ASYNC_THRESHOLD} points, are dispatched to the compute
 * tier as a 202 + jobId (the plan's lowered async threshold for property
 * functions: worst-case uncached CoolProp is ~75 µs/call). Before dispatch
 * the request is NORMALIZED — server-side channel refs are resolved to
 * inline series on the API node, because the measurement store is API-node-
 * local. Exceeding a cap stays a GUIDED path: a typed RASTER_CAP_EXCEEDED
 * payload with a suggested dt that verifiably fits. No mid-job cancel in v1.
 *
 * <p>The route lives under /api/measurements so inline input series share
 * the raised upload body cap.
 */
@RestController
public class MeasurementCalcController {

    static final int MAX_RASTER = 1_000_000;
    static final int MAX_RASTER_WITH_CALLS = 100_000;
    /** Call-bearing formulas above this many points go async (202 + job). */
    static final int ASYNC_THRESHOLD = 10_000;

    public record InlineSeries(double[] t, double[] v) {

        @Override
        public boolean equals(Object o) {
            return o instanceof InlineSeries(double[] ot, double[] ov)
                    && Arrays.equals(t, ot)
                    && Arrays.equals(v, ov);
        }

        @Override
        public int hashCode() {
            return 31 * Arrays.hashCode(t) + Arrays.hashCode(v);
        }

        @Override
        public String toString() {
            return "InlineSeries[n=" + (t == null ? 0 : t.length) + "]";
        }
    }

    public record CalcInput(String var, String measurementId, String channel, Integer group,
                            InlineSeries inline, String interp) {
    }

    public record RasterSpec(String mode, Double dt, String sameAs) {
    }

    public record CalcRequest(String name, String formula, List<CalcInput> inputs, RasterSpec raster) {
    }

    public record CalcResult(String name, double[] t, double[] v) {

        @Override
        public boolean equals(Object o) {
            return o instanceof CalcResult(String otherName, double[] ot, double[] ov)
                    && java.util.Objects.equals(name, otherName)
                    && Arrays.equals(t, ot)
                    && Arrays.equals(v, ov);
        }

        @Override
        public int hashCode() {
            int h = name == null ? 0 : name.hashCode();
            h = 31 * h + Arrays.hashCode(t);
            h = 31 * h + Arrays.hashCode(v);
            return h;
        }

        @Override
        public String toString() {
            return "CalcResult[name=" + name + ", n=" + t.length + "]";
        }
    }

    /** Everything resolved and validated, ready to evaluate. */
    record Prepared(Expr formula, double[] raster,
                            Map<String, SampledSeries> inputs, boolean callBearing) {

        @Override
        public boolean equals(Object o) {
            return o instanceof Prepared(
                            Expr otherFormula, double[] otherRaster,
                            Map<String, SampledSeries> otherInputs, boolean otherCallBearing)
                    && callBearing == otherCallBearing
                    && java.util.Objects.equals(formula, otherFormula)
                    && java.util.Objects.equals(inputs, otherInputs)
                    && Arrays.equals(raster, otherRaster);
        }

        @Override
        public int hashCode() {
            return 31 * java.util.Objects.hash(formula, inputs, callBearing)
                    + Arrays.hashCode(raster);
        }

        @Override
        public String toString() {
            return "Prepared[raster=" + raster.length + " pts, callBearing=" + callBearing + "]";
        }
    }

    private final MeasurementStore store;
    private final ComputeDispatcher dispatcher;

    public MeasurementCalcController(MeasurementStore store,
                                     ObjectProvider<ComputeDispatcher> dispatcherProvider) {
        this.store = store;
        this.dispatcher = dispatcherProvider.getIfAvailable();
    }

    @PostMapping("/api/measurements/calc")
    public ResponseEntity<Object> calc(@RequestBody CalcRequest request) throws IOException {
        try {
            Prepared prepared = prepare(request);
            if (dispatcher != null && prepared.callBearing()
                    && prepared.raster().length > ASYNC_THRESHOLD) {
                // Async path: normalize (inline every input — the compute tier
                // has no measurement store) and enqueue; client polls the job.
                return ResponseEntity.accepted()
                        .body(dispatcher.dispatch(ComputeTask.CALC, null, normalize(request, prepared)));
            }
            return ResponseEntity.ok(new CalcResult(request.name(), prepared.raster(),
                    TimeSeriesEvaluator.evaluate(prepared.formula(), prepared.raster(), prepared.inputs())));
        } catch (MergedRaster.RasterCapExceededException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(),
                    Map.of("code", "RASTER_CAP_EXCEEDED",
                            "actualPoints", e.actualPoints,
                            "suggestedDt", e.suggestedDt));
        } catch (MeasurementParseException e) {
            return error(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(), null);
        } catch (NotFoundException e) {
            return error(HttpStatus.NOT_FOUND, e.getMessage(), null);
        }
    }

    /**
     * Compute-tier entry point (ComputeTaskListener CALC case). Inputs are
     * inline-only after normalization; failures become unchecked exceptions
     * whose message lands in the FAILED job state.
     */
    public CalcResult computeCalc(CalcRequest request) {
        try {
            Prepared prepared = prepare(request);
            return new CalcResult(request.name(), prepared.raster(),
                    TimeSeriesEvaluator.evaluate(prepared.formula(), prepared.raster(), prepared.inputs()));
        } catch (MeasurementParseException | MergedRaster.RasterCapExceededException | IOException e) {
            throw new IllegalStateException(e.getMessage(), e);
        }
    }

    private static final class NotFoundException extends RuntimeException {
        NotFoundException(String message) {
            super(message);
        }
    }

    private Prepared prepare(CalcRequest request)
            throws IOException, MeasurementParseException, MergedRaster.RasterCapExceededException {
        if (request.formula() == null || request.formula().isBlank()) {
            throw new MeasurementParseException("The formula is empty.");
        }
        Expr formula = TimeSeriesEvaluator.parseFormula(request.formula());
        boolean callBearing = TimeSeriesEvaluator.containsCall(formula);
        int cap = callBearing ? MAX_RASTER_WITH_CALLS : MAX_RASTER;

        Map<String, SampledSeries> inputs = new LinkedHashMap<>();
        for (CalcInput in : request.inputs() == null ? List.<CalcInput>of() : request.inputs()) {
            if (in.var() == null || in.var().isBlank()) {
                throw new MeasurementParseException("An input is missing its variable name.");
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
                    throw new MeasurementParseException(
                            "Inline series for \"" + in.var() + "\" is malformed.");
                }
            } else {
                ChannelData data = store.channel(in.measurementId(),
                        in.group() == null ? 0 : in.group(), in.channel());
                if (data == null) {
                    throw new NotFoundException("Unknown measurement id for input \"" + in.var()
                            + "\" (the store is ephemeral — re-upload the file).");
                }
                t = data.time();
                v = data.values();
            }
            inputs.put(in.var().toLowerCase(), new SampledSeries(t, v, interp));
        }
        if (inputs.isEmpty()) {
            throw new MeasurementParseException("Bind at least one input signal.");
        }
        return new Prepared(formula, buildRaster(request.raster(), inputs, cap), inputs, callBearing);
    }

    /** Inline every resolved input so the compute tier needs no store access. */
    private static CalcRequest normalize(CalcRequest request, Prepared prepared) {
        List<CalcInput> inlined = new ArrayList<>();
        for (Map.Entry<String, SampledSeries> in : prepared.inputs().entrySet()) {
            SampledSeries s = in.getValue();
            inlined.add(new CalcInput(in.getKey(), null, null, null,
                    new InlineSeries(s.t(), s.v()),
                    s.interp() == SampledSeries.Interp.STEP ? "step" : "linear"));
        }
        return new CalcRequest(request.name(), request.formula(), inlined, request.raster());
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
