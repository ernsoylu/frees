package com.frees.backend.api;

import com.frees.backend.cas.CasEngine;
import com.frees.backend.cas.PidTuner;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverSettings;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
 *
 * <p>{@code /pidtune} tunes an explicit plant; {@code /plant} extracts the
 * plant a SigPID sees from its network by linearizing the closed loop.
 */
@RestController
@RequestMapping("/api/control")
public class ControlController {

    /** Injected so {@code /plant} can solve a linearization synchronously
     *  (the same bean {@code SolveController} uses); null-safe for {@code /pidtune}. */
    private final EquationSystemSolver solver;

    public ControlController(EquationSystemSolver solver) {
        this.solver = solver;
    }

    /** Plant {@code num/den} (descending powers), controller type, and targets.
     *  A request DTO — its coefficient arrays are never compared or hashed. */
    @SuppressWarnings("java:S6218")
    public record TuneRequest(
            double[] num, double[] den, String type,
            Double wc, Double pm, Double horizon, Integer points) {
    }

    /** A response DTO — its {@code t}/{@code y} arrays are never compared or hashed. */
    @SuppressWarnings("java:S6218")
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

    // ---------------------------------------------------------------------
    // Plant extraction: linearize the closed loop a SigPID sees and recover
    // the open-loop plant G(s) it controls (the "auto-identify plant" path).
    // ---------------------------------------------------------------------

    /**
     * @param text          the full document
     * @param dynamic       the DYNAMIC block name holding the control loop
     * @param reference     the reference SigConstant instance (e.g. "SP") whose
     *                      constant is perturbed to probe the loop
     * @param output        the measured plant output (e.g. "bp.t")
     * @param referenceOnSp  true when the reference drives the PID.s sp input
     * @param type,kp,ki,kd the controller currently in the loop
     */
    @SuppressWarnings("java:S6218")
    public record PlantRequest(
            String text, String dynamic, String reference, String output, boolean referenceOnSp,
            String type, double kp, double ki, double kd) {
    }

    @SuppressWarnings("java:S6218")
    public record PlantResponse(double[] num, double[] den) {}

    /** Per-block wall-clock budget for the linearization solve — the FD solve at
     *  the operating point is cheap, but real-fluid loops still call CoolProp. */
    private static final double LINEARIZE_BUDGET_S = 40.0;

    @PostMapping("/plant")
    public ResponseEntity<Object> plant(@RequestBody PlantRequest req) {
        if (solver == null) {
            return bad("Plant extraction is unavailable (no solver).");
        }
        if (req.text() == null || req.text().isBlank()) {
            return bad("The document text is required to linearize the loop.");
        }
        if (req.dynamic() == null || req.reference() == null || req.output() == null) {
            return bad("The DYNAMIC block name, reference source and measured output are required.");
        }
        String type = req.type() == null ? "pi" : req.type().toLowerCase();
        try {
            // Shrink the target DYNAMIC to a near-instant run (LINEARIZE works
            // off the initial-condition operating point, not the trajectory).
            String shrunk = shrinkDynamic(req.text(), req.dynamic());
            // A LINEARIZE INPUT must be an exogenous top-level variable, not a
            // component member. Rewrite the reference SigConstant's constant to
            // draw from a fresh variable, then perturb that.
            String input = "freespidref";
            String doc = injectReferenceVariable(shrunk, req.reference(), input);
            if (doc == null) {
                return bad("Could not find a constant to perturb on reference source '"
                        + req.reference() + "' (expected a SigConstant with a k= value).");
            }
            doc = doc + "\nLINEARIZE freespidlin(block = " + req.dynamic()
                    + ", a = freespid_a, b = freespid_b, c = freespid_c, d = freespid_d)\n"
                    + "  INPUT " + input + "\n"
                    + "  OUTPUT " + req.output() + "\nEND\n";

            SolverSettings settings = new SolverSettings(250, 1e-12, 1e-15, LINEARIZE_BUDGET_S, false);
            EquationSystemSolver.Result result = solver.solve(doc, settings, Map.of());
            Map<String, Double> vars = result.variables();

            double[][] a = readMatrix(vars, "freespid_a");
            int n = a.length;
            if (n == 0) {
                return bad("The linearized loop has no states — nothing to identify.");
            }
            double[][] bMat = readMatrix(vars, "freespid_b");
            double[][] cMat = readMatrix(vars, "freespid_c");
            double[][] dMat = readMatrix(vars, "freespid_d");
            double[] bVec = column(bMat, n);
            double[] cVec = cMat.length > 0 ? cMat[0] : new double[n];
            double dScalar = dMat.length > 0 && dMat[0].length > 0 ? dMat[0][0] : 0.0;

            double[][] m = PidTuner.ssToTf(a, bVec, cVec, dScalar);
            double[][] c0 = PidTuner.controllerTf(type, req.kp(), req.ki(), req.kd());
            double[][] g = PidTuner.recoverPlant(m[0], m[1], c0[0], c0[1], req.referenceOnSp());
            return ResponseEntity.ok(new PlantResponse(g[0], g[1]));
        } catch (CasEngine.CasException | IllegalArgumentException | ArithmeticException e) {
            return bad(e.getMessage());
        } catch (RuntimeException e) {
            return bad("Could not linearize the loop: " + e.getMessage());
        }
    }

    /** Rewrite the named DYNAMIC block's header to a 1-second, 2-point run so the
     *  transient integrates instantly (its span is irrelevant to LINEARIZE). */
    static String shrinkDynamic(String text, String dynamicName) {
        Pattern header = Pattern.compile(
                "(DYNAMIC\\s+" + Pattern.quote(dynamicName) + "\\s*\\()([^)]*)(\\))",
                Pattern.CASE_INSENSITIVE);
        Matcher hm = header.matcher(text);
        if (!hm.find()) {
            return text;
        }
        String args = hm.group(2);
        // time/t = a .. b  →  0 .. 1 (a 1-second run; LINEARIZE only uses t0).
        args = args.replaceAll(
                "\\b(time|t)\\s*=\\s*-?[\\d.eE+]+\\s*\\.\\.\\s*-?[\\d.eE+]+",
                "$1 = 0 .. 1");
        // points = N → points = 2
        args = args.replaceAll("\\bpoints\\s*=\\s*\\d+", "points = 2");
        return text.substring(0, hm.start()) + hm.group(1) + args + hm.group(3)
                + text.substring(hm.end());
    }

    /**
     * Rewrite {@code <reference>(… k = V …)} so its constant draws from a fresh
     * top-level variable {@code <inputVar> = V}, which LINEARIZE can perturb as
     * an exogenous input. Returns the modified document, or null when the
     * reference instance or its {@code k=} value cannot be found.
     */
    static String injectReferenceVariable(String text, String reference, String inputVar) {
        Matcher inst = Pattern.compile(
                "\\b" + Pattern.quote(reference) + "\\s*\\(([^)]*)\\)").matcher(text);
        if (!inst.find()) {
            return null;
        }
        String args = inst.group(1);
        Matcher kv = Pattern.compile("\\bk\\s*=\\s*([^,)]+)").matcher(args);
        if (!kv.find()) {
            return null;
        }
        String value = kv.group(1).trim();
        String newArgs = args.substring(0, kv.start()) + "k = " + inputVar + args.substring(kv.end());
        String rewritten = text.substring(0, inst.start(1)) + newArgs + text.substring(inst.end(1));
        return inputVar + " = " + value + "\n" + rewritten;
    }

    /** Read a flat {@code name[i,j]} matrix back from the solved variables. */
    private static double[][] readMatrix(Map<String, Double> vars, String name) {
        String prefix = name.toLowerCase() + "[";
        int rows = 0;
        int cols = 0;
        Pattern p = Pattern.compile(Pattern.quote(name.toLowerCase()) + "\\[(\\d+),(\\d+)\\]");
        for (String key : vars.keySet()) {
            Matcher mk = p.matcher(key);
            if (mk.matches()) {
                rows = Math.max(rows, Integer.parseInt(mk.group(1)));
                cols = Math.max(cols, Integer.parseInt(mk.group(2)));
            }
        }
        if (rows == 0 || cols == 0) {
            return new double[0][0];
        }
        double[][] out = new double[rows][cols];
        for (int i = 1; i <= rows; i++) {
            for (int j = 1; j <= cols; j++) {
                out[i - 1][j - 1] = vars.getOrDefault(prefix + i + "," + j + "]", 0.0);
            }
        }
        return out;
    }

    private static double[] column(double[][] m, int n) {
        double[] v = new double[n];
        for (int i = 0; i < n && i < m.length; i++) {
            v[i] = m[i].length > 0 ? m[i][0] : 0.0;
        }
        return v;
    }



    private static ResponseEntity<Object> bad(String message) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
    }
}
