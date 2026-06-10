package com.frees.backend.units;

import java.util.Arrays;

/**
 * A physical quantity: a multiplicative factor to SI plus exponents over the
 * seven SI base dimensions, indexed [kg, m, s, K, mol, A, cd].
 */
public record Quantity(double factor, double[] dims) {

    public static final int DIMENSIONS = 7;
    private static final String[] BASE_SYMBOLS = {"kg", "m", "s", "K", "mol", "A", "cd"};

    public static Quantity dimensionless(double factor) {
        return new Quantity(factor, new double[DIMENSIONS]);
    }

    public boolean isDimensionless() {
        for (double d : dims) {
            if (Math.abs(d) > 1e-9) {
                return false;
            }
        }
        return true;
    }

    public boolean sameDimensionsAs(Quantity other) {
        for (int i = 0; i < DIMENSIONS; i++) {
            if (Math.abs(dims[i] - other.dims[i]) > 1e-9) {
                return false;
            }
        }
        return true;
    }

    public Quantity multiply(Quantity other) {
        double[] combined = new double[DIMENSIONS];
        for (int i = 0; i < DIMENSIONS; i++) {
            combined[i] = dims[i] + other.dims[i];
        }
        return new Quantity(factor * other.factor, combined);
    }

    public Quantity divide(Quantity other) {
        double[] combined = new double[DIMENSIONS];
        for (int i = 0; i < DIMENSIONS; i++) {
            combined[i] = dims[i] - other.dims[i];
        }
        return new Quantity(factor / other.factor, combined);
    }

    public Quantity pow(double exponent) {
        double[] combined = new double[DIMENSIONS];
        for (int i = 0; i < DIMENSIONS; i++) {
            combined[i] = dims[i] * exponent;
        }
        return new Quantity(Math.pow(factor, exponent), combined);
    }

    /** Human-readable SI dimension string, e.g. "kg^1 m^-3" or "-" if dimensionless. */
    public String dimensionString() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < DIMENSIONS; i++) {
            if (Math.abs(dims[i]) > 1e-9) {
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(BASE_SYMBOLS[i]);
                double e = dims[i];
                if (Math.abs(e - 1.0) > 1e-9) {
                    sb.append('^').append(e == Math.rint(e)
                            ? String.valueOf((long) e) : String.valueOf(e));
                }
            }
        }
        return sb.length() == 0 ? "-" : sb.toString();
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Quantity q && factor == q.factor && sameDimensionsAs(q);
    }

    @Override
    public int hashCode() {
        return Arrays.hashCode(dims);
    }
}
