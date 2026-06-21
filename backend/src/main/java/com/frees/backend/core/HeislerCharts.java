package com.frees.backend.core;

import org.apache.commons.math3.special.BesselJ;

/**
 * One-term-approximation solution of one-dimensional transient conduction in a
 * solid with internal temperature gradients — the computational replacement for
 * the classic Heisler/Gröber charts. For a plane wall (half-thickness L),
 * infinite cylinder or sphere (radius r0) suddenly exposed to convection, the
 * dimensionless temperature is
 *
 * <pre>theta* = (T - T_inf)/(T_i - T_inf) = C1 exp(-zeta1^2 Fo) * f(zeta1 x*)</pre>
 *
 * where {@code Bi = h Lc / k}, {@code Fo = alpha t / Lc^2}, {@code x*} is the
 * dimensionless position (0 at the centre, 1 at the surface), and the first
 * eigenvalue {@code zeta1} and coefficient {@code C1} depend on Bi and geometry.
 * The approximation is accurate for {@code Fo >= 0.2}.
 */
public final class HeislerCharts {

    private HeislerCharts() {
    }

    private enum Geometry {
        WALL, CYLINDER, SPHERE
    }

    /** Dimensionless temperature theta* at position {@code xStar} (0 centre, 1 surface). */
    public static double temperature(String geometry, double bi, double fo, double xStar) {
        Geometry g = parse(geometry);
        double zeta = firstEigenvalue(g, bi);
        double thetaCentre = coefficient(g, zeta) * Math.exp(-zeta * zeta * fo);
        return thetaCentre * spatial(g, zeta, xStar);
    }

    /** Fraction of the maximum possible heat transfer, Q/Q0, at Fourier number {@code fo}. */
    public static double heatRatio(String geometry, double bi, double fo) {
        Geometry g = parse(geometry);
        double zeta = firstEigenvalue(g, bi);
        double thetaCentre = coefficient(g, zeta) * Math.exp(-zeta * zeta * fo);
        return switch (g) {
            case WALL -> 1.0 - thetaCentre * Math.sin(zeta) / zeta;
            case CYLINDER -> 1.0 - 2.0 * thetaCentre * BesselJ.value(1.0, zeta) / zeta;
            case SPHERE -> 1.0 - 3.0 * thetaCentre * (Math.sin(zeta) - zeta * Math.cos(zeta)) / (zeta * zeta * zeta);
        };
    }

    private static Geometry parse(String geometry) {
        return switch (geometry.toLowerCase()) {
            case "wall", "planewall", "plane", "slab" -> Geometry.WALL;
            case "cylinder", "cyl" -> Geometry.CYLINDER;
            case "sphere", "ball" -> Geometry.SPHERE;
            default -> throw new SolverException("Heisler geometry must be 'wall', 'cylinder' or 'sphere', got '"
                    + geometry + "'.");
        };
    }

    /** Eigenvalue equation residual f(zeta) - Bi = 0 for the first root. */
    private static double residual(Geometry g, double zeta, double bi) {
        return switch (g) {
            case WALL -> zeta * Math.tan(zeta) - bi;
            case CYLINDER -> zeta * BesselJ.value(1.0, zeta) / BesselJ.value(0.0, zeta) - bi;
            case SPHERE -> 1.0 - zeta / Math.tan(zeta) - bi;
        };
    }

    /** Upper bound of the first-eigenvalue interval (the first asymptote). */
    private static double upperBound(Geometry g) {
        return switch (g) {
            case WALL -> Math.PI / 2.0;
            case CYLINDER -> 2.4048255576957727; // first zero of J0
            case SPHERE -> Math.PI;
        };
    }

    private static double firstEigenvalue(Geometry g, double bi) {
        double lo = 1e-9;
        double hi = upperBound(g) - 1e-9;
        // residual is monotone increasing from -bi (at 0+) to +infinity (at the asymptote).
        for (int i = 0; i < 200; i++) {
            double mid = 0.5 * (lo + hi);
            double f = residual(g, mid, bi);
            if (f > 0.0) {
                hi = mid;
            } else {
                lo = mid;
            }
            if (hi - lo < 1e-12) {
                break;
            }
        }
        return 0.5 * (lo + hi);
    }

    private static double coefficient(Geometry g, double zeta) {
        return switch (g) {
            case WALL -> 4.0 * Math.sin(zeta) / (2.0 * zeta + Math.sin(2.0 * zeta));
            case CYLINDER -> {
                double j0 = BesselJ.value(0.0, zeta);
                double j1 = BesselJ.value(1.0, zeta);
                yield (2.0 / zeta) * j1 / (j0 * j0 + j1 * j1);
            }
            case SPHERE -> 4.0 * (Math.sin(zeta) - zeta * Math.cos(zeta)) / (2.0 * zeta - Math.sin(2.0 * zeta));
        };
    }

    private static double spatial(Geometry g, double zeta, double xStar) {
        return switch (g) {
            case WALL -> Math.cos(zeta * xStar);
            case CYLINDER -> BesselJ.value(0.0, zeta * xStar);
            case SPHERE -> xStar == 0.0 ? 1.0 : Math.sin(zeta * xStar) / (zeta * xStar);
        };
    }
}
