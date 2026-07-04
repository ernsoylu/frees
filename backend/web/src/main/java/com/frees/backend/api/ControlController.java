package com.frees.backend.api;

import com.frees.backend.cas.CasEngine;
import com.frees.backend.cas.PidTuner;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Control-design endpoints for the interactive PID Tuner. Pure numeric work
 * (no fluids, no RabbitMQ dispatch), so it runs on the API node directly like
 * {@link PlotController}. The heavy lifting lives in {@link PidTuner}; this
 * class is only request/response marshalling and input validation.
 */
@RestController
@RequestMapping("/api/control")
public class ControlController {

    /** Plant {@code num/den} (descending powers), controller type, and targets. */
    public record TuneRequest(
            double[] num, double[] den, String type,
            Double wc, Double pm, Double horizon, Integer points) {
    }

    public record TuneResponse(
            double kp, double ki, double kd, double wc, double pm,
            double[] t, double[] y,
            double riseTime, double peakTime, double settlingTime, double overshoot,
            double gainMargin, double phaseMargin) {
    }

    public record ErrorResponse(String error) {}

    @PostMapping("/pidtune")
    public ResponseEntity<Object> pidtune(@RequestBody TuneRequest req) {
        if (req.num() == null || req.den() == null || req.num().length == 0 || req.den().length == 0) {
            return bad("A plant transfer function (num and den coefficients) is required.");
        }
        String type = req.type() == null ? "pi" : req.type().toLowerCase();
        if (!type.equals("p") && !type.equals("pi") && !type.equals("pid")) {
            return bad("Controller type must be one of p, pi, pid (got '" + req.type() + "').");
        }
        double wc = req.wc() != null && req.wc() > 0
                ? req.wc()
                : PidTuner.suggestWc(req.num(), req.den());
        double pm = req.pm() != null && req.pm() > 0 && req.pm() < 90 ? req.pm() : 60.0;
        double horizon = req.horizon() != null ? req.horizon() : 0.0;
        int points = req.points() != null && req.points() > 0 ? Math.min(req.points(), 2000) : 400;
        try {
            PidTuner.Result r = PidTuner.tune(req.num(), req.den(), type, wc, pm, horizon, points);
            return ResponseEntity.ok(new TuneResponse(
                    r.kp(), r.ki(), r.kd(), wc, pm,
                    r.t(), r.y(),
                    r.riseTime(), r.peakTime(), r.settlingTime(), r.overshoot(),
                    r.gainMargin(), r.phaseMargin()));
        } catch (CasEngine.CasException | IllegalArgumentException | ArithmeticException e) {
            return bad(e.getMessage());
        }
    }

    private static ResponseEntity<Object> bad(String message) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
    }
}
