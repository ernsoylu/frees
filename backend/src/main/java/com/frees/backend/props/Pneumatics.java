package com.frees.backend.props;

/**
 * Pneumatic (compressible-gas power) constitutive functions for the component
 * layer (Phase A). The vocabulary that lets a pneumatic restriction close a
 * mass-flow equation against a pressure drop, so a supply → valve → volume gas
 * circuit has a well-posed operating point for the Newton solver.
 *
 * <p>The flow law is the {@code ISO 6358} standard for pneumatic components,
 * parameterised by the <b>sonic conductance</b> {@code C} and the <b>critical
 * pressure ratio</b> {@code b}. It reuses the existing fluid node rule
 * ({@code P} equal, {@code Σṁ=0}) — a pneumatic port is structurally a fluid
 * port — so no new connection domain is needed.
 *
 * <p>All SI: pressures in Pa (absolute), temperatures in K, mass flow in kg/s.
 */
public final class Pneumatics {

    private Pneumatics() {}

    /** Reference density at ANR conditions (air, 20 °C, 0.1 MPa, 65 % RH) [kg/m^3]. */
    private static final double RHO_ANR = 1.185;
    /** Reference temperature at ANR conditions [K]. */
    private static final double T_ANR = 293.15;

    /**
     * ISO 6358 pneumatic mass flow [kg/s] from an upstream port to a downstream
     * port through a restriction of sonic conductance {@code C}
     * [m^3/(s·Pa)] and critical pressure ratio {@code b} (typically 0.2–0.5):
     * <pre>
     *   ṁ_choked = C · ρ_ANR · P_up · √(T_ANR / T_up)
     *   pr = P_down / P_up
     *   ṁ = ṁ_choked                                    (pr ≤ b,  choked / sonic)
     *   ṁ = ṁ_choked · √(1 − ((pr − b)/(1 − b))²)        (b < pr < 1, subsonic)
     *   ṁ = 0                                            (pr ≥ 1,  no forward flow)
     * </pre>
     * The subsonic factor falls smoothly to 0 as {@code pr → 1}, so the law is
     * continuous through the choke point and at zero flow (good for step-halving).
     * Directional (upstream-defined); reverse flow returns 0. The ANR reference
     * density is air's — {@code C} is, by the standard, characterised with air.
     *
     * @param c     sonic conductance C [m^3/(s·Pa)]   (must be ≥ 0)
     * @param b     critical pressure ratio (0 ≤ b &lt; 1)
     * @param pUp   upstream absolute pressure [Pa]    (must be &gt; 0)
     * @param tUp   upstream absolute temperature [K]  (must be &gt; 0)
     * @param pDown downstream absolute pressure [Pa]
     */
    public static double iso6358(double c, double b, double pUp, double tUp, double pDown) {
        if (c < 0.0) {
            throw new PropertyEvaluationException("iso6358: sonic conductance C must be >= 0.");
        }
        if (b < 0.0 || b >= 1.0) {
            throw new PropertyEvaluationException("iso6358: critical pressure ratio b must be in [0, 1).");
        }
        if (pUp <= 0.0 || tUp <= 0.0) {
            // A Newton iterate may stray to a non-physical state; return no flow
            // rather than throwing so the solver can step back.
            return 0.0;
        }
        double choked = c * RHO_ANR * pUp * Math.sqrt(T_ANR / tUp);
        double pr = pDown / pUp;
        if (pr <= b) {
            return choked;
        }
        if (pr >= 1.0) {
            return 0.0;
        }
        double x = (pr - b) / (1.0 - b);
        return choked * Math.sqrt(1.0 - x * x);
    }
}
