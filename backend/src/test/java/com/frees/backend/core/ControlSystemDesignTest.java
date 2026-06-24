package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end integration tests for the Phase 5 controller-design solvers
 * (lqr, place, pidtune) driven through the equation solver.
 */
class ControlSystemDesignTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // Double-integrator state matrices, shared by the lqr/place cases.
    private static final String DOUBLE_INTEGRATOR =
            "A[1,1] = 0; A[1,2] = 1\n"
                    + "A[2,1] = 0; A[2,2] = 0\n"
                    + "B[1] = 0; B[2] = 1\n";

    @Test
    void placeDoubleIntegrator() {
        // Desired poles -2, -3 -> (s+2)(s+3) = s^2 + 5s + 6.
        // Controllable canonical A-BK char poly is s^2 + K2 s + K1, so K = [6, 5].
        EquationSystemSolver.Result result = solver.solve(
                DOUBLE_INTEGRATOR
                        + "pr[1] = -2; pi[1] = 0\n"
                        + "pr[2] = -3; pi[2] = 0\n"
                        + "CALL place(A[1:2,1:2], B[1:2], pr[1:2], pi[1:2] : K[1:2])");

        assertEquals(6.0, result.variables().get("K[1]"), 1e-6);
        assertEquals(5.0, result.variables().get("K[2]"), 1e-6);
    }

    @Test
    void lqrDoubleIntegrator() {
        // Q = I, R = 1 -> optimal gain K = [1, sqrt(3)].
        EquationSystemSolver.Result result = solver.solve(
                DOUBLE_INTEGRATOR
                        + "Q[1,1] = 1; Q[1,2] = 0\n"
                        + "Q[2,1] = 0; Q[2,2] = 1\n"
                        + "R = 1\n"
                        + "CALL lqr(A[1:2,1:2], B[1:2], Q[1:2,1:2], R : K[1:2])");

        assertEquals(1.0, result.variables().get("K[1]"), 1e-5);
        assertEquals(Math.sqrt(3.0), result.variables().get("K[2]"), 1e-5);
    }

    @Test
    void pidtunePidDesign() {
        // Plant G(s) = 1/(s^2 + s); design a PID with crossover wc = 1 rad/s.
        // Closed-form (60-degree PM target): Kp~1.366, Ki~0.524, Kd~0.890.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 0, 1]\n"
                        + "den = [1, 1, 0]\n"
                        + "wc = 1\n"
                        + "CALL pidtune(num[1:3], den[1:3], 'PID', wc : Kp, Ki, Kd)");

        assertEquals(1.366, result.variables().get("Kp"), 1e-2);
        assertEquals(0.524, result.variables().get("Ki"), 1e-2);
        assertEquals(0.890, result.variables().get("Kd"), 1e-2);
        // All gains positive => a realizable stabilizing PID.
        assertTrue(result.variables().get("Kp") > 0, "Kp should be positive");
        assertTrue(result.variables().get("Ki") > 0, "Ki should be positive");
        assertTrue(result.variables().get("Kd") > 0, "Kd should be positive");
    }
    @Test
    void rankCtrbObsvIntegration() {
        // Double integrator controllability and observability check
        String eqns =
                "A[1,1] = 0; A[1,2] = 1\n"
              + "A[2,1] = -2; A[2,2] = -3\n"
              + "B[1] = 0; B[2] = 1\n"
              + "C[1] = 1; C[2] = 0\n"
              + "CALL ctrb(A[1:2,1:2], B[1:2] : Co[1:2,1:2])\n"
              + "CALL obsv(A[1:2,1:2], C[1:2] : Ob[1:2,1:2])\n"
              + "CALL rank(Co[1:2,1:2] : rCo)\n"
              + "CALL rank(Ob[1:2,1:2] : rOb)\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(0.0, result.variables().get("Co[1,1]"), 1e-6);
        assertEquals(1.0, result.variables().get("Co[1,2]"), 1e-6);
        assertEquals(1.0, result.variables().get("Co[2,1]"), 1e-6);
        assertEquals(-3.0, result.variables().get("Co[2,2]"), 1e-6);

        assertEquals(1.0, result.variables().get("Ob[1,1]"), 1e-6);
        assertEquals(0.0, result.variables().get("Ob[1,2]"), 1e-6);
        assertEquals(0.0, result.variables().get("Ob[2,1]"), 1e-6);
        assertEquals(1.0, result.variables().get("Ob[2,2]"), 1e-6);

        assertEquals(2.0, result.variables().get("rCo"), 1e-6);
        assertEquals(2.0, result.variables().get("rOb"), 1e-6);
    }

    @Test
    void ss2ssIntegration() {
        String eqns =
                "A[1,1] = -3; A[1,2] = 1\n"
              + "A[2,1] = 1; A[2,2] = -3\n"
              + "B[1,1] = 1; B[2,1] = 2\n"
              + "C[1,1] = 2; C[1,2] = 3\n"
              + "D[1,1] = 0\n"
              + "P[1,1] = 1; P[1,2] = 1\n"
              + "P[2,1] = 1; P[2,2] = -1\n"
              + "CALL ss2ss(A[1:2,1:2], B[1:2,1:1], C[1:1,1:2], D[1:1,1:1], P[1:2,1:2] : An[1:2,1:2], Bn[1:2,1:1], Cn[1:1,1:2], Dn[1:1,1:1])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(-2.0, result.variables().get("An[1,1]"), 1e-6);
        assertEquals(0.0, result.variables().get("An[1,2]"), 1e-6);
        assertEquals(0.0, result.variables().get("An[2,1]"), 1e-6);
        assertEquals(-4.0, result.variables().get("An[2,2]"), 1e-6);

        assertEquals(1.5, result.variables().get("Bn[1,1]"), 1e-6);
        assertEquals(-0.5, result.variables().get("Bn[2,1]"), 1e-6);

        assertEquals(5.0, result.variables().get("Cn[1,1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("Cn[1,2]"), 1e-6);

        assertEquals(0.0, result.variables().get("Dn[1,1]"), 1e-6);
    }

    @Test
    void ssConnectionsIntegration() {
        String eqns =
                "A1[1,1] = -2\n"
              + "B1[1,1] = 1\n"
              + "C1[1,1] = 1\n"
              + "D1[1,1] = 1\n"
              + "A2[1,1] = -3\n"
              + "B2[1,1] = 1\n"
              + "C2[1,1] = 2\n"
              + "D2[1,1] = 1\n"
              + "CALL series(A1[1:1,1:1], B1[1:1,1:1], C1[1:1,1:1], D1[1:1,1:1], A2[1:1,1:1], B2[1:1,1:1], C2[1:1,1:1], D2[1:1,1:1] : Aser[1:2,1:2], Bser[1:2,1:1], Cser[1:1,1:2], Dser[1:1,1:1])\n"
              + "CALL parallel(A1[1:1,1:1], B1[1:1,1:1], C1[1:1,1:1], D1[1:1,1:1], A2[1:1,1:1], B2[1:1,1:1], C2[1:1,1:1], D2[1:1,1:1] : Apar[1:2,1:2], Bpar[1:2,1:1], Cpar[1:1,1:2], Dpar[1:1,1:1])\n"
              + "CALL feedback(A1[1:1,1:1], B1[1:1,1:1], C1[1:1,1:1], D1[1:1,1:1], A2[1:1,1:1], B2[1:1,1:1], C2[1:1,1:1], D2[1:1,1:1] : Afdb[1:2,1:2], Bfdb[1:2,1:1], Cfdb[1:1,1:2], Dfdb[1:1,1:1])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        // Series outputs
        assertEquals(-2.0, result.variables().get("Aser[1,1]"), 1e-6);
        assertEquals(0.0, result.variables().get("Aser[1,2]"), 1e-6);
        assertEquals(1.0, result.variables().get("Aser[2,1]"), 1e-6);
        assertEquals(-3.0, result.variables().get("Aser[2,2]"), 1e-6);
        assertEquals(1.0, result.variables().get("Bser[1,1]"), 1e-6);
        assertEquals(1.0, result.variables().get("Bser[2,1]"), 1e-6);
        assertEquals(1.0, result.variables().get("Cser[1,1]"), 1e-6);
        assertEquals(2.0, result.variables().get("Cser[1,2]"), 1e-6);
        assertEquals(1.0, result.variables().get("Dser[1,1]"), 1e-6);

        // Parallel outputs
        assertEquals(-2.0, result.variables().get("Apar[1,1]"), 1e-6);
        assertEquals(0.0, result.variables().get("Apar[1,2]"), 1e-6);
        assertEquals(0.0, result.variables().get("Apar[2,1]"), 1e-6);
        assertEquals(-3.0, result.variables().get("Apar[2,2]"), 1e-6);
        assertEquals(1.0, result.variables().get("Bpar[1,1]"), 1e-6);
        assertEquals(1.0, result.variables().get("Bpar[2,1]"), 1e-6);
        assertEquals(1.0, result.variables().get("Cpar[1,1]"), 1e-6);
        assertEquals(2.0, result.variables().get("Cpar[1,2]"), 1e-6);
        assertEquals(2.0, result.variables().get("Dpar[1,1]"), 1e-6);

        // Feedback outputs
        assertEquals(-2.5, result.variables().get("Afdb[1,1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("Afdb[1,2]"), 1e-6);
        assertEquals(0.5, result.variables().get("Afdb[2,1]"), 1e-6);
        assertEquals(-4.0, result.variables().get("Afdb[2,2]"), 1e-6);
        assertEquals(0.5, result.variables().get("Bfdb[1,1]"), 1e-6);
        assertEquals(0.5, result.variables().get("Bfdb[2,1]"), 1e-6);
        assertEquals(0.5, result.variables().get("Cfdb[1,1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("Cfdb[1,2]"), 1e-6);
        assertEquals(0.5, result.variables().get("Dfdb[1,1]"), 1e-6);
    }

    @Test
    void stepInfoAndPadeIntegration() {
        String eqns =
                "num = [0, 0, 100]\n"
              + "den = [1, 15, 100]\n"
              + "t = 0:0.005:1.5\n"
              + "CALL step(num[1:3], den[1:3], t[1:301] : y[1:301])\n"
              + "CALL stepinfo(t[1:301], y[1:301] : Tr, Tp, Ts, OS)\n"
              + "Td = 0.2\n"
              + "order = 2\n"
              + "CALL pade(Td, order : num_delay[1:3], den_delay[1:3])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(2.83, result.variables().get("OS"), 0.1);
        assertEquals(0.475, result.variables().get("Tp"), 0.015);
        assertEquals(0.574, result.variables().get("Ts"), 0.015);

        assertEquals(0.04, result.variables().get("num_delay[1]"), 1e-6);
        assertEquals(-1.2, result.variables().get("num_delay[2]"), 1e-6);
        assertEquals(12.0, result.variables().get("num_delay[3]"), 1e-6);

        assertEquals(0.04, result.variables().get("den_delay[1]"), 1e-6);
        assertEquals(1.2, result.variables().get("den_delay[2]"), 1e-6);
        assertEquals(12.0, result.variables().get("den_delay[3]"), 1e-6);
    }

    @Test
    void rlocusIntegration() {
        String eqns =
                "num = [1, 3]\n"
              + "den = [1, 7, 14, 8, 0]\n"
              + "CALL rlocus(num[1:2], den[1:5] : K[1:50], cpr[1:50, 1:4], cpi[1:50, 1:4])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(0.0, result.variables().get("K[1]"), 1e-6);

        double p1 = result.variables().get("cpr[1,1]");
        double p2 = result.variables().get("cpr[1,2]");
        double p3 = result.variables().get("cpr[1,3]");
        double p4 = result.variables().get("cpr[1,4]");

        double[] sortedPoles = {p1, p2, p3, p4};
        java.util.Arrays.sort(sortedPoles);
        assertEquals(-4.0, sortedPoles[0], 1e-5);
        assertEquals(-2.0, sortedPoles[1], 1e-5);
        assertEquals(-1.0, sortedPoles[2], 1e-5);
        assertEquals(0.0, sortedPoles[3], 1e-5);
    }

    @Test
    void ackerDoubleIntegrator() {
        // acker is an alias of place (Ackermann's formula): same K = [6, 5].
        EquationSystemSolver.Result result = solver.solve(
                DOUBLE_INTEGRATOR
                        + "pr[1] = -2; pi[1] = 0\n"
                        + "pr[2] = -3; pi[2] = 0\n"
                        + "CALL acker(A[1:2,1:2], B[1:2], pr[1:2], pi[1:2] : K[1:2])");

        assertEquals(6.0, result.variables().get("K[1]"), 1e-6);
        assertEquals(5.0, result.variables().get("K[2]"), 1e-6);
    }

    @Test
    void lyapDiagonalIntegration() {
        // A = diag(-1,-2), Q = I -> X = diag(0.5, 0.25) (decoupled scalar Lyapunov).
        String eqns =
                "A[1,1] = -1; A[1,2] = 0\n"
              + "A[2,1] = 0; A[2,2] = -2\n"
              + "Q[1,1] = 1; Q[1,2] = 0\n"
              + "Q[2,1] = 0; Q[2,2] = 1\n"
              + "CALL lyap(A[1:2,1:2], Q[1:2,1:2] : X[1:2,1:2])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(0.5, result.variables().get("X[1,1]"), 1e-9);
        assertEquals(0.0, result.variables().get("X[1,2]"), 1e-9);
        assertEquals(0.0, result.variables().get("X[2,1]"), 1e-9);
        assertEquals(0.25, result.variables().get("X[2,2]"), 1e-9);
    }

    @Test
    void dlyapDiagonalIntegration() {
        // A = diag(0.5,0.25), Q = I -> X_ii = 1/(1-a_i^2): diag(4/3, 16/15).
        String eqns =
                "A[1,1] = 0.5; A[1,2] = 0\n"
              + "A[2,1] = 0; A[2,2] = 0.25\n"
              + "Q[1,1] = 1; Q[1,2] = 0\n"
              + "Q[2,1] = 0; Q[2,2] = 1\n"
              + "CALL dlyap(A[1:2,1:2], Q[1:2,1:2] : X[1:2,1:2])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(4.0 / 3.0, result.variables().get("X[1,1]"), 1e-9);
        assertEquals(0.0, result.variables().get("X[1,2]"), 1e-9);
        assertEquals(0.0, result.variables().get("X[2,1]"), 1e-9);
        assertEquals(16.0 / 15.0, result.variables().get("X[2,2]"), 1e-9);
    }

    @Test
    void dareDlqrScalarIntegration() {
        // Scalar A=B=Q=R=1: DARE X^2 - X - 1 = 0 -> X = golden ratio; K = X/(1+X).
        String eqns =
                "A[1,1] = 1\n"
              + "B[1,1] = 1\n"
              + "Q[1,1] = 1\n"
              + "R = 1\n"
              + "CALL dare(A[1:1,1:1], B[1:1,1:1], Q[1:1,1:1], R : X[1:1,1:1])\n"
              + "CALL dlqr(A[1:1,1:1], B[1:1,1:1], Q[1:1,1:1], R : K[1:1,1:1])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        double phi = (1.0 + Math.sqrt(5.0)) / 2.0; // 1.618034
        assertEquals(phi, result.variables().get("X[1,1]"), 1e-6);
        assertEquals(phi / (1.0 + phi), result.variables().get("K[1,1]"), 1e-6);
    }

    @Test
    void lqeScalarIntegration() {
        // Scalar A=-1, G=C=Q=R=1: filter ARE P^2 + 2P - 1 = 0 -> P = sqrt(2)-1,
        // and L = P (since L = P C' R^-1).
        String eqns =
                "A[1,1] = -1\n"
              + "G[1,1] = 1\n"
              + "C[1,1] = 1\n"
              + "Q[1,1] = 1\n"
              + "R = 1\n"
              + "CALL lqe(A[1:1,1:1], G[1:1,1:1], C[1:1,1:1], Q[1:1,1:1], R : L[1:1,1:1])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(Math.sqrt(2.0) - 1.0, result.variables().get("L[1,1]"), 1e-6);
    }

    @Test
    void gramControllabilityIntegration() {
        // A = diag(-1,-2), B = [1;1]: Wc_ij = -(BB')_ij/(a_i+a_j).
        String eqns =
                "A[1,1] = -1; A[1,2] = 0\n"
              + "A[2,1] = 0; A[2,2] = -2\n"
              + "B[1,1] = 1; B[2,1] = 1\n"
              + "CALL gram(A[1:2,1:2], B[1:2,1:1], 'c' : Wc[1:2,1:2])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        assertEquals(0.5, result.variables().get("Wc[1,1]"), 1e-9);
        assertEquals(1.0 / 3.0, result.variables().get("Wc[1,2]"), 1e-9);
        assertEquals(1.0 / 3.0, result.variables().get("Wc[2,1]"), 1e-9);
        assertEquals(0.25, result.variables().get("Wc[2,2]"), 1e-9);
    }

    @Test
    void balrealInvariantsIntegration() {
        // A stable, controllable, observable system. Balanced realization must
        // preserve the transfer function (trace/det of A) and equalize the
        // controllability and observability gramians into a common diagonal.
        String eqns =
                "A[1,1] = -1; A[1,2] = 1\n"
              + "A[2,1] = 0; A[2,2] = -2\n"
              + "B[1,1] = 1; B[2,1] = 1\n"
              + "C[1,1] = 1; C[1,2] = 0\n"
              + "CALL balreal(A[1:2,1:2], B[1:2,1:1], C[1:1,1:2] : Ab[1:2,1:2], Bb[1:2,1:1], Cb[1:1,1:2])\n"
              + "CALL gram(Ab[1:2,1:2], Bb[1:2,1:1], 'c' : Wc[1:2,1:2])\n"
              + "CALL gram(Ab[1:2,1:2], Cb[1:1,1:2], 'o' : Wo[1:2,1:2])\n";
        EquationSystemSolver.Result result = solver.solve(eqns);

        double a11 = result.variables().get("Ab[1,1]");
        double a12 = result.variables().get("Ab[1,2]");
        double a21 = result.variables().get("Ab[2,1]");
        double a22 = result.variables().get("Ab[2,2]");
        // Similarity invariants: trace = -3, det = 2.
        assertEquals(-3.0, a11 + a22, 1e-6);
        assertEquals(2.0, a11 * a22 - a12 * a21, 1e-6);

        // Balanced: Wc == Wo, and both diagonal (Hankel singular values).
        assertEquals(result.variables().get("Wo[1,1]"), result.variables().get("Wc[1,1]"), 1e-6);
        assertEquals(result.variables().get("Wo[2,2]"), result.variables().get("Wc[2,2]"), 1e-6);
        assertEquals(0.0, result.variables().get("Wc[1,2]"), 1e-6);
        assertEquals(0.0, result.variables().get("Wc[2,1]"), 1e-6);
    }
}


