package com.frees.backend.cas;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

class StateSpaceTest {

    @Test
    void firstOrderSystem() {
        // A=-1, B=1, C=1, D=0  ->  G(s) = 1/(s+1)
        StateSpace.TransferCoefficients tf = StateSpace.ss2tf(
                new double[][]{{-1}}, new double[][]{{1}}, new double[][]{{1}}, 0);

        assertArrayEquals(new double[]{0, 1}, tf.num(), 1e-9);
        assertArrayEquals(new double[]{1, 1}, tf.den(), 1e-9);
    }

    @Test
    void secondOrderControllableCanonical() {
        // Controllable canonical form of 1/(s^2 + 3s + 2).
        double[][] a = {{0, 1}, {-2, -3}};
        double[][] b = {{0}, {1}};
        double[][] c = {{1, 0}};
        StateSpace.TransferCoefficients tf = StateSpace.ss2tf(a, b, c, 0);

        assertArrayEquals(new double[]{0, 0, 1}, tf.num(), 1e-9);
        assertArrayEquals(new double[]{1, 3, 2}, tf.den(), 1e-9);
    }

    @Test
    void feedthroughTermAppearsInNumerator() {
        // D = 1 with A=-1,B=1,C=1: G = 1/(s+1) + 1 = (s+2)/(s+1).
        StateSpace.TransferCoefficients tf = StateSpace.ss2tf(
                new double[][]{{-1}}, new double[][]{{1}}, new double[][]{{1}}, 1);

        assertArrayEquals(new double[]{1, 2}, tf.num(), 1e-9);
        assertArrayEquals(new double[]{1, 1}, tf.den(), 1e-9);
    }
}
