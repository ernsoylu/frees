package com.frees.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ControlControllerTest {

    private final ControlController controller =
            new ControlController(new com.frees.backend.core.EquationSystemSolver());

    private static ControlController.TuneRequest req(
            double[] num, double[] den, String type, Double wc, Double pm) {
        return new ControlController.TuneRequest(num, den, type, wc, pm, null, null);
    }

    @Test
    void tunesAValidPlantAndReturnsGainsPlusStep() {
        ResponseEntity<Object> res =
                controller.pidtune(req(new double[]{2}, new double[]{5, 1}, "pi", 0.5, 60.0));
        assertEquals(HttpStatus.OK, res.getStatusCode());
        ControlController.TuneResponse body =
                assertInstanceOf(ControlController.TuneResponse.class, res.getBody());
        assertTrue(body.ki() > 0, "PI tune should give positive integral gain");
        assertEquals(0.5, body.wc(), 1e-9);
        assertEquals(60.0, body.pm(), 1e-9);
        assertTrue(body.t().length > 50 && body.t().length == body.y().length);
    }

    @Test
    void suggestsCrossoverAndPhaseMarginWhenOmitted() {
        // wc and pm null → backend picks the dominant-pole crossover and 60°.
        ResponseEntity<Object> res =
                controller.pidtune(req(new double[]{1}, new double[]{5, 1}, "pi", null, null));
        assertEquals(HttpStatus.OK, res.getStatusCode());
        ControlController.TuneResponse body =
                assertInstanceOf(ControlController.TuneResponse.class, res.getBody());
        assertEquals(0.2, body.wc(), 1e-6, "dominant pole of 1/(5s+1) is at 0.2");
        assertEquals(60.0, body.pm(), 1e-9);
    }

    @Test
    void rejectsAMissingPlant() {
        assertEquals(HttpStatus.BAD_REQUEST,
                controller.pidtune(req(null, new double[]{1}, "pi", 1.0, 60.0)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,
                controller.pidtune(req(new double[]{}, new double[]{1}, "pi", 1.0, 60.0)).getStatusCode());
    }

    @Test
    void rejectsAnUnknownControllerType() {
        ResponseEntity<Object> res =
                controller.pidtune(req(new double[]{1}, new double[]{1, 1}, "lead", 1.0, 60.0));
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertInstanceOf(ControlController.ErrorResponse.class, res.getBody());
    }

    @Test
    void reportsASingularPlantAsBadRequest() {
        // A zero numerator makes the plant gain zero at wc → CasException → 400.
        ResponseEntity<Object> res =
                controller.pidtune(req(new double[]{0}, new double[]{1, 1}, "pid", 1.0, 60.0));
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
    }

    @Test
    void defaultsControllerTypeToPi() {
        ResponseEntity<Object> res =
                controller.pidtune(req(new double[]{1}, new double[]{2, 1}, null, 0.5, 60.0));
        assertEquals(HttpStatus.OK, res.getStatusCode());
    }
}
