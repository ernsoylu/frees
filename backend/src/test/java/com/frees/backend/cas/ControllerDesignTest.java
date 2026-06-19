package com.frees.backend.cas;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ControllerDesignTest {

    @Test
    void lqrScalar() {
        // A=0,B=1,Q=1,R=1 -> CARE: -P^2+1=0 -> P=1, K=1.
        double[][] k = ControllerDesign.lqr(
                new double[][]{{0}}, new double[][]{{1}},
                new double[][]{{1}}, new double[][]{{1}});
        assertEquals(1.0, k[0][0], 1e-6);
    }

    @Test
    void lqrDoubleIntegrator() {
        // A=[[0,1],[0,0]],B=[0;1],Q=I,R=1 -> K=[1, sqrt(3)].
        double[][] k = ControllerDesign.lqr(
                new double[][]{{0, 1}, {0, 0}},
                new double[][]{{0}, {1}},
                new double[][]{{1, 0}, {0, 1}},
                new double[][]{{1}});
        assertEquals(1.0, k[0][0], 1e-5);
        assertEquals(Math.sqrt(3.0), k[0][1], 1e-5);
    }

    @Test
    void placeDoubleIntegrator() {
        // A=[[0,1],[0,0]],B=[0;1], poles -2,-3 -> K=[6,5].
        double[] k = ControllerDesign.place(
                new double[][]{{0, 1}, {0, 0}}, new double[]{0, 1},
                new double[][]{{-2, 0}, {-3, 0}});
        assertEquals(6.0, k[0], 1e-6);
        assertEquals(5.0, k[1], 1e-6);
    }

    @Test
    void placeComplexPoles() {
        // poles -1+/-2j -> char (s+1)^2+4 = s^2+2s+5 -> K=[5,2].
        double[] k = ControllerDesign.place(
                new double[][]{{0, 1}, {0, 0}}, new double[]{0, 1},
                new double[][]{{-1, 2}, {-1, -2}});
        assertEquals(5.0, k[0], 1e-6);
        assertEquals(2.0, k[1], 1e-6);
    }

    @Test
    void pidtuneAchievesTargetPhaseMargin() {
        // Plant G(s) = 1 / (s^2 + s) = 1/(s(s+1)). Design a PID for crossover wc=1.
        double[] num = {0, 0, 1};
        double[] den = {1, 1, 0};
        double wc = 1.0;
        double[] g = ControllerDesign.pidtune(num, den, "pid", wc);
        double kp = g[0];
        double ki = g[1];
        double kd = g[2];

        // Open loop L = C(s)*G(s), C(s) = (Kd s^2 + Kp s + Ki)/s.
        double[] cNum = {kd, kp, ki};
        double[] cDen = {1, 0};
        double[] loopNum = PolynomialHelpers.multiply(cNum, num);
        double[] loopDen = PolynomialHelpers.multiply(cDen, den);

        double[] m = PolynomialHelpers.margin(loopNum, loopDen);
        assertEquals(60.0, m[1], 1.0, "phase margin should hit the 60-degree target");
        assertEquals(1.0, m[2], 0.02, "gain crossover should land at wc=1");
    }

    @Test
    void pidtunePiAchievesTargetPhaseMargin() {
        // Same plant, PI controller: C(s) = (Kp s + Ki)/s.
        double[] num = {0, 0, 1};
        double[] den = {1, 1, 0};
        double wc = 0.5;
        double[] g = ControllerDesign.pidtune(num, den, "pi", wc);
        double kp = g[0];
        double ki = g[1];
        assertEquals(0.0, g[2], 1e-12, "PI design must have zero derivative gain");

        double[] cNum = {kp, ki};
        double[] cDen = {1, 0};
        double[] loopNum = PolynomialHelpers.multiply(cNum, num);
        double[] loopDen = PolynomialHelpers.multiply(cDen, den);

        double[] m = PolynomialHelpers.margin(loopNum, loopDen);
        assertEquals(60.0, m[1], 1.0, "PI phase margin should hit the 60-degree target");
        assertEquals(0.5, m[2], 0.02, "PI gain crossover should land at wc=0.5");
    }
}
