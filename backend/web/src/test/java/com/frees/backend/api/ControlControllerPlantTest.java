package com.frees.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ControlControllerPlantTest {

    private final ControlController controller =
            new ControlController(new EquationSystemSolver());

    /** A single first-order-lag plant G = 1/(2s+1) under PI control; the
     *  reference drives the PID's sp input (standard wiring). */
    private static final String LOOP = """
            SigConstant SP(k=5)
            SigPID PID(Kp=2, Ki=1, Kd=0, tau=0.1, i0=0, d0=0)
            SigFirstOrder PLANT(tau=2, y0=0)
            connect(SP.out, PID.sp)
            connect(PID.out, PLANT.in)
            connect(PLANT.out, PID.pv)
            DYNAMIC loop(method = ode23s, time = 0 .. 40, points = 400)
            END
            """;

    @Test
    void recoversTheFirstOrderPlantFromTheLoop() {
        ResponseEntity<Object> res = controller.plant(new ControlController.PlantRequest(
                LOOP, "loop", "SP", "plant.out.sig", true, "pi", 2, 1, 0));
        assertEquals(HttpStatus.OK, res.getStatusCode(), "body: " + res.getBody());
        ControlController.PlantResponse g =
                assertInstanceOf(ControlController.PlantResponse.class, res.getBody());

        // G(jw) should match 1/(2·jw+1) at several frequencies (rational-fn
        // equality is robust to any uncancelled common factors in num/den).
        for (double w : new double[]{0.0, 0.1, 0.5, 1.0, 3.0}) {
            double[] gv = evalRational(g.num(), g.den(), w);
            double denMag2 = 1 + (2 * w) * (2 * w);
            double refRe = 1.0 / denMag2;
            double refIm = -(2 * w) / denMag2;
            assertEquals(refRe, gv[0], 1e-3, "Re G(j" + w + ")");
            assertEquals(refIm, gv[1], 1e-3, "Im G(j" + w + ")");
        }
    }

    @Test
    void shrinkDynamicCollapsesTheNamedBlockSpan() {
        String shrunk = ControlController.shrinkDynamic(
                "DYNAMIC cool(method = ode23s, time = 0 .. 4000, points = 400)\nEND", "cool");
        assertTrue(shrunk.contains("time = 0 .. 1"), "span collapsed to a 1-second run: " + shrunk);
        assertTrue(shrunk.contains("points = 2"), "points reduced: " + shrunk);
        assertTrue(shrunk.contains("method = ode23s"), "method preserved");
    }

    @Test
    void rejectsAMissingDocument() {
        ResponseEntity<Object> res = controller.plant(new ControlController.PlantRequest(
                "  ", "loop", "SP", "plant.out.sig", true, "pi", 2, 1, 0));
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
    }

    @Test
    void rejectsMissingLoopArguments() {
        assertEquals(HttpStatus.BAD_REQUEST, controller.plant(new ControlController.PlantRequest(
                LOOP, null, "SP", "plant.out.sig", true, "pi", 2, 1, 0)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.plant(new ControlController.PlantRequest(
                LOOP, "loop", null, "plant.out.sig", true, "pi", 2, 1, 0)).getStatusCode());
    }

    @Test
    void reportsAnUnfindableReferenceConstant() {
        ResponseEntity<Object> res = controller.plant(new ControlController.PlantRequest(
                LOOP, "loop", "NOPE", "plant.out.sig", true, "pi", 2, 1, 0));
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
    }

    @Test
    void reportsWhenPlantExtractionHasNoSolver() {
        ControlController noSolver = new ControlController(null);
        assertEquals(HttpStatus.BAD_REQUEST, noSolver.plant(new ControlController.PlantRequest(
                LOOP, "loop", "SP", "plant.out.sig", true, "pi", 2, 1, 0)).getStatusCode());
    }

    @Test
    void injectReferenceVariableRewritesTheConstant() {
        String out = ControlController.injectReferenceVariable(
                "SigConstant SP(k=303)\nconnect(SP.out, PID.pv)", "SP", "freespidref");
        assertTrue(out.contains("freespidref = 303"), out);
        assertTrue(out.contains("k = freespidref"), out);
    }

    @Test
    void injectReferenceVariableReturnsNullWhenAbsent() {
        assertEquals(null, ControlController.injectReferenceVariable(
                "SigConstant SP(k=1)", "OTHER", "freespidref"));
        assertEquals(null, ControlController.injectReferenceVariable(
                "SigStep SP(t0=1)", "SP", "freespidref"));
    }

    /** Evaluate num(jw)/den(jw) → {re, im}. */
    private static double[] evalRational(double[] num, double[] den, double w) {
        double[] n = evalPoly(num, w);
        double[] d = evalPoly(den, w);
        double dm = d[0] * d[0] + d[1] * d[1];
        return new double[]{(n[0] * d[0] + n[1] * d[1]) / dm, (n[1] * d[0] - n[0] * d[1]) / dm};
    }

    /** Horner evaluation of a descending real polynomial at s = jw → {re, im}. */
    private static double[] evalPoly(double[] c, double w) {
        double re = 0;
        double im = 0;
        for (double coeff : c) {
            double nre = re * 0 - im * w + coeff;
            double nim = re * w + im * 0;
            re = nre;
            im = nim;
        }
        return new double[]{re, im};
    }
}
