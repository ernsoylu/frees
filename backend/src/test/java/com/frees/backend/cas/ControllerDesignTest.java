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
    @Test
    void rankAndCtrbNiseExample() {
        // Nise Chapter 12, Example 12.1
        double[][] a = {
            {0, 1, 0},
            {0, 0, 1},
            {-1, -2, -3}
        };
        double[][] b = {
            {0},
            {0},
            {1}
        };
        double[][] expectedCtrb = {
            {0, 0, 1},
            {0, 1, -3},
            {1, -3, 7}
        };

        double[][] c = ControllerDesign.ctrb(a, b);
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                assertEquals(expectedCtrb[i][j], c[i][j], 1e-6);
            }
        }
        assertEquals(3, ControllerDesign.rank(c));
    }

    @Test
    void obsvNiseExample() {
        double[][] a = {
            {0, 1},
            {-2, -3}
        };
        double[][] cv = {
            {1, 0}
        };
        double[][] expectedObsv = {
            {1, 0},
            {0, 1}
        };

        double[][] o = ControllerDesign.obsv(a, cv);
        for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 2; j++) {
                assertEquals(expectedObsv[i][j], o[i][j], 1e-6);
            }
        }
        assertEquals(2, ControllerDesign.rank(o));
    }

    @Test
    void ss2ssNiseExample() {
        // Nise Chapter 5, Example 5.10 / 5.11
        double[][] a = {
            {-3, 1},
            {1, -3}
        };
        double[] b = {1, 2};
        double[] c = {2, 3};
        double d = 0;
        double[][] p = {
            {1, 1},
            {1, -1}
        };

        double[][] expectedAn = {
            {-2, 0},
            {0, -4}
        };
        double[] expectedBn = {1.5, -0.5};
        double[] expectedCn = {5, -1};

        StateSpace.StateSpaceMatrices res = ControllerDesign.ss2ss(a, b, c, d, p);
        for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 2; j++) {
                assertEquals(expectedAn[i][j], res.a()[i][j], 1e-6);
            }
            assertEquals(expectedBn[i], res.b()[i], 1e-6);
            assertEquals(expectedCn[i], res.c()[i], 1e-6);
        }
    }

    @Test
    void ssConnections() {
        double[][] a1 = {{-2}};
        double[] b1 = {1};
        double[] c1 = {1};
        double d1 = 1;

        double[][] a2 = {{-3}};
        double[] b2 = {1};
        double[] c2 = {2};
        double d2 = 1;

        // Series
        StateSpace.StateSpaceMatrices ser = ControllerDesign.ssSeries(a1, b1, c1, d1, a2, b2, c2, d2);
        assertEquals(-2.0, ser.a()[0][0], 1e-6);
        assertEquals(0.0, ser.a()[0][1], 1e-6);
        assertEquals(1.0, ser.a()[1][0], 1e-6);
        assertEquals(-3.0, ser.a()[1][1], 1e-6);
        assertEquals(1.0, ser.b()[0], 1e-6);
        assertEquals(1.0, ser.b()[1], 1e-6);
        assertEquals(1.0, ser.c()[0], 1e-6);
        assertEquals(2.0, ser.c()[1], 1e-6);
        assertEquals(1.0, ser.d(), 1e-6);

        // Parallel
        StateSpace.StateSpaceMatrices par = ControllerDesign.ssParallel(a1, b1, c1, d1, a2, b2, c2, d2);
        assertEquals(-2.0, par.a()[0][0], 1e-6);
        assertEquals(0.0, par.a()[0][1], 1e-6);
        assertEquals(0.0, par.a()[1][0], 1e-6);
        assertEquals(-3.0, par.a()[1][1], 1e-6);
        assertEquals(1.0, par.b()[0], 1e-6);
        assertEquals(1.0, par.b()[1], 1e-6);
        assertEquals(1.0, par.c()[0], 1e-6);
        assertEquals(2.0, par.c()[1], 1e-6);
        assertEquals(2.0, par.d(), 1e-6);

        // Feedback (Negative feedback, sign = 1.0)
        StateSpace.StateSpaceMatrices fdb = ControllerDesign.ssFeedback(a1, b1, c1, d1, a2, b2, c2, d2, 1.0);
        assertEquals(-2.5, fdb.a()[0][0], 1e-6);
        assertEquals(-1.0, fdb.a()[0][1], 1e-6);
        assertEquals(0.5, fdb.a()[1][0], 1e-6);
        assertEquals(-4.0, fdb.a()[1][1], 1e-6);
        assertEquals(0.5, fdb.b()[0], 1e-6);
        assertEquals(0.5, fdb.b()[1], 1e-6);
        assertEquals(0.5, fdb.c()[0], 1e-6);
        assertEquals(-1.0, fdb.c()[1], 1e-6);
        assertEquals(0.5, fdb.d(), 1e-6);
    }

    @Test
    void stepInfoNiseExample() {
        double[] num = {0, 0, 100};
        double[] den = {1, 15, 100};

        int N = 301;
        double[] t = new double[N];
        for (int i = 0; i < N; i++) {
            t[i] = i * 0.005;
        }

        double[] y = TimeResponse.response(TimeResponse.Kind.STEP, num, den, null, t);
        double[] metrics = ControllerDesign.stepinfo(t, y);

        double tr = metrics[0];
        double tp = metrics[1];
        double ts = metrics[2];
        double os = metrics[3];

        System.out.println("DEBUG STEPINFO: OS=" + os + ", Tp=" + tp + ", Ts=" + ts + ", Tr=" + tr);
        assertEquals(2.83, os, 0.1);
        assertEquals(0.475, tp, 0.015);
        assertEquals(0.574, ts, 0.015);
    }

    @Test
    void padeSecondOrderNiseExample() {
        double Td = 0.2;
        int order = 2;
        double[][] res = ControllerDesign.pade(Td, order);
        double[] num = res[0];
        double[] den = res[1];

        double[] expectedNum = {0.04, -1.2, 12.0};
        double[] expectedDen = {0.04, 1.2, 12.0};

        assertEquals(3, num.length);
        assertEquals(3, den.length);
        for (int i = 0; i < 3; i++) {
            assertEquals(expectedNum[i], num[i], 1e-6);
            assertEquals(expectedDen[i], den[i], 1e-6);
        }
    }

    @Test
    void rlocusNiseExample() {
        double[] num = {1, 3};
        double[] den = {1, 7, 14, 8, 0};

        int M = 1000;
        ControllerDesign.RlocusResult res = ControllerDesign.rlocus(num, den, M);

        double bestK = -1;
        double bestReal = 0;
        double bestImag = 0;
        double minZetaDiff = 1.0;

        for (int i = 0; i < M; i++) {
            double kVal = res.k[i];
            for (int j = 0; j < 4; j++) {
                double real = res.cpr[i][j];
                double imag = res.cpi[i][j];
                if (imag > 0.1 && real < 0) {
                    double wn = Math.sqrt(real * real + imag * imag);
                    double zeta = -real / wn;
                    double diff = Math.abs(zeta - 0.5);
                    if (diff < minZetaDiff) {
                        minZetaDiff = diff;
                        bestK = kVal;
                        bestReal = real;
                        bestImag = imag;
                    }
                }
            }
        }

        // Print values around zeta = 0.5
        for (int i = 0; i < M; i++) {
            double kVal = res.k[i];
            if (kVal > 1.0 && kVal < 2.0) {
                for (int j = 0; j < 4; j++) {
                    double real = res.cpr[i][j];
                    double imag = res.cpi[i][j];
                    if (imag > 0.1 && real < 0) {
                        double wn = Math.sqrt(real * real + imag * imag);
                        double zeta = -real / wn;
                        System.out.println("DEBUG RLOCUS POINT: K=" + kVal + " -> pole=" + real + " + j" + imag + ", zeta=" + zeta);
                    }
                }
            }
        }

        assertEquals(1.49, bestK, 0.05);
        assertEquals(-0.35, bestReal, 0.02);
        assertEquals(0.61, bestImag, 0.02);
    }
}


