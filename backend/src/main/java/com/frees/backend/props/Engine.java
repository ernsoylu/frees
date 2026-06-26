package com.frees.backend.props;

/**
 * Internal-combustion-engine sub-models. Currently the Wiebe heat-release
 * function (and its rate), the standard empirical description of the burned
 * mass fraction through an engine's combustion event, used to drive
 * single-zone crank-angle energy balances (e.g. in a DYNAMIC block).
 *
 * <p>The crank-angle arguments are unit-agnostic: only the ratio
 * (theta - theta0)/dtheta enters, so degrees or radians both work as long as
 * they are consistent. Outputs are dimensionless (the rate is per unit of the
 * angle measure used).
 */
public final class Engine {

    private Engine() {}

    /**
     * Wiebe burned mass fraction xb(theta) = 1 - exp(-a ((theta-theta0)/dtheta)^(m+1)),
     * zero before combustion starts (theta &lt; theta0). Typical efficiency
     * parameter a = 5 (xb -&gt; 0.993 at theta0+dtheta) and form factor m = 2.
     */
    public static double wiebe(double theta, double theta0, double dtheta, double a, double m) {
        if (!(dtheta > 0.0)) {
            throw new PropertyEvaluationException(
                    "Wiebe: combustion duration dtheta must be > 0, got " + dtheta + ".");
        }
        if (theta <= theta0) {
            return 0.0;
        }
        double xn = (theta - theta0) / dtheta;
        return 1.0 - Math.exp(-a * Math.pow(xn, m + 1.0));
    }

    /**
     * Wiebe burn-rate dxb/dtheta (per unit crank angle), zero before combustion
     * starts. The heat-release rate is this multiplied by the total fuel energy.
     */
    public static double wiebeRate(double theta, double theta0, double dtheta, double a, double m) {
        if (!(dtheta > 0.0)) {
            throw new PropertyEvaluationException(
                    "Wiebe: combustion duration dtheta must be > 0, got " + dtheta + ".");
        }
        if (theta <= theta0) {
            return 0.0;
        }
        double xn = (theta - theta0) / dtheta;
        return a * (m + 1.0) / dtheta * Math.pow(xn, m)
                * Math.exp(-a * Math.pow(xn, m + 1.0));
    }
}
