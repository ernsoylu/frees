package com.frees.backend.props;

/**
 * Flow-resistance constitutive functions for hydraulic / duct networks
 * (Phase 0 of the component layer): the Darcy friction factor (Colebrook–Moody),
 * the Reynolds number, and minor (fitting) losses. These are the vocabulary that
 * lets pipe/duct components close a pressure-drop equation, so a pump–pipe or
 * fan–duct network has a well-posed operating point for the Newton solver.
 *
 * <p>All SI: Reynolds and friction factor are dimensionless; minor loss is a
 * pressure [Pa].
 */
public final class FlowResistance {

    private FlowResistance() {}

    /** Reynolds number Re = rho V D / mu (dimensionless; |V| so reversed flow is fine). */
    public static double reynolds(double rho, double velocity, double diameter, double viscosity) {
        if (viscosity <= 0.0) {
            throw new PropertyEvaluationException("reynolds: dynamic viscosity must be > 0.");
        }
        // A zero/transient-negative flow gives Re = 0 (handled by frictionFactor);
        // it must not throw, so a Newton iterate passing through zero flow survives.
        return rho * Math.abs(velocity) * diameter / viscosity;
    }

    /**
     * Darcy friction factor f(Re, eps/D). Laminar (Re &lt; 2300): the exact
     * {@code f = 64/Re}. Turbulent (Re &ge; 4000): the implicit Colebrook–White
     * equation
     * <pre>  1/√f = -2 log10( (eps/D)/3.7 + 2.51/(Re √f) )</pre>
     * solved by fixed-point iteration seeded with the explicit Haaland
     * approximation. The transitional band (2300–4000) is linearly blended so f
     * stays continuous (and so does its numerical derivative) for step-halving.
     */
    public static double frictionFactor(double re, double relativeRoughness) {
        // Clamp a zero/negative Reynolds number (a transient Newton iterate at
        // near-zero flow) to a tiny positive value instead of throwing: f then
        // stays large and finite (high resistance at vanishing flow), so the
        // solver can step through it rather than crashing.
        if (re <= 1.0e-6) {
            re = 1.0e-6;
        }
        double laminar = 64.0 / re;
        if (re < 2300.0) {
            return laminar;
        }
        double turbulent = colebrook(Math.max(re, 4000.0), relativeRoughness);
        if (re < 4000.0) {
            double t = (re - 2300.0) / (4000.0 - 2300.0);
            return laminar + t * (turbulent - laminar);
        }
        return turbulent;
    }

    /** Colebrook–White Darcy friction factor (turbulent), iterated to convergence. */
    private static double colebrook(double re, double relativeRoughness) {
        double eps = Math.max(relativeRoughness, 0.0);
        // Haaland explicit initial guess.
        double invSqrt = -1.8 * Math.log10(Math.pow(eps / 3.7, 1.11) + 6.9 / re);
        double f = 1.0 / (invSqrt * invSqrt);
        for (int i = 0; i < 60; i++) {
            double rhs = -2.0 * Math.log10(eps / 3.7 + 2.51 / (re * Math.sqrt(f)));
            double fNew = 1.0 / (rhs * rhs);
            if (Math.abs(fNew - f) <= 1e-13) {
                return fNew;
            }
            f = fNew;
        }
        return f;
    }

    /** Minor (fitting) pressure loss dP = K · ½ρV² [Pa]. */
    public static double minorLoss(double k, double rho, double velocity) {
        return k * 0.5 * rho * velocity * velocity;
    }
}
