package com.frees.backend.props;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.LUDecomposition;

import java.util.Map;

/**
 * Chemical-equilibrium combustion products with dissociation, by the
 * equilibrium-constant (Kp) method. For a fuel CxHyOz burned in air at
 * fuel/air equivalence ratio {@code phi}, the product pool is
 * {CO2, CO, H2O, H2, OH, H, O, O2} with N2 carried inert. The composition
 * satisfies the C/H/O element balances and five independent dissociation
 * equilibria:
 * <pre>
 *   CO2 = CO + 1/2 O2      H2O = H2 + 1/2 O2     H2O = OH + 1/2 H2
 *   1/2 H2 = H             1/2 O2 = O
 * </pre>
 * Each Kp(T) = exp(-dG&deg;/RT) is built from the Gibbs energy g&deg; = h - T s&deg;
 * supplied by {@link NasaThermo}, so no equilibrium-constant tables are needed.
 * The 8x8 nonlinear system is solved by a damped Newton iteration in
 * log-moles. Unlike {@link Thermochemistry#adiabaticFlameTemp} this admits rich
 * mixtures (phi &gt; 1) and predicts the dissociation that lowers real flame
 * temperatures.
 */
public final class Equilibrium {

    private static final double R = 8.314462618;
    private static final double P_REF = 101_325.0;
    /** Product species, fixed index order used throughout. */
    private static final String[] SP = {"CO2", "CO", "H2O", "H2", "OH", "H", "O", "O2"};
    private static final int CO2 = 0, CO = 1, H2O = 2, H2 = 3, OH = 4, H = 5, O = 6, O2 = 7;

    private Equilibrium() {}

    /** Gibbs energy g&deg;(T) [J/mol] at the reference pressure. */
    private static double gibbs(String sp, double t) {
        return NasaThermo.molarEnthalpy(sp, t) - t * NasaThermo.molarEntropy(sp, t, P_REF);
    }

    /** Solved equilibrium state: product moles per mole of fuel, plus inert N2. */
    // Private carrier record, never value-compared or hashed; the array-content
    // equals/hashCode the rule asks for would be dead, untestable code. java:S6218.
    @SuppressWarnings("java:S6218")
    record State(double[] n, double nN2) {
        double total() {
            double s = nN2;
            for (double v : n) {
                s += v;
            }
            return s;
        }
    }

    /**
     * Reaction log-equilibrium constants ln Kp(T) for the five dissociations
     * (index 0 = CO2 = CO + 1/2 O2). Package-visible for validation against
     * standard JANAF thermochemical tables.
     */
    static double[] lnKp(double t) {
        double gco2 = gibbs("CO2", t), gco = gibbs("CO", t), go2 = gibbs("O2", t);
        double gh2o = gibbs("H2O", t), gh2 = gibbs("H2", t), goh = gibbs("OH", t);
        double gh = gibbs("H", t), go = gibbs("O", t);
        double[] dG = {
                gco + 0.5 * go2 - gco2,   // CO2 = CO + 1/2 O2
                gh2 + 0.5 * go2 - gh2o,   // H2O = H2 + 1/2 O2
                goh + 0.5 * gh2 - gh2o,   // H2O = OH + 1/2 H2
                gh - 0.5 * gh2,           // 1/2 H2 = H
                go - 0.5 * go2,           // 1/2 O2 = O
        };
        double[] k = new double[5];
        for (int i = 0; i < 5; i++) {
            k[i] = -dG[i] / (R * t);
        }
        return k;
    }

    /**
     * Solves the equilibrium product composition at temperature {@code t} and
     * pressure {@code p} for fuel CxHyOz with O2 supply {@code a} (mol per mol
     * fuel) and inert N2 {@code nN2}.
     */
    private static State solve(int x, int y, int z, double a, double nN2, double t, double p) {
        double cTot = x;
        double hTot = y;
        double oTot = z + 2.0 * a;
        double[] kp = lnKp(t);
        double lnPP0 = Math.log(p / P_REF);

        double[] u = new double[8];     // log-moles
        initialGuess(u, x, y, oTot);

        for (int iter = 0; iter < 200; iter++) {
            double[] f = residual(u, cTot, hTot, oTot, nN2, kp, lnPP0);
            double norm = 0.0;
            for (double v : f) {
                norm += v * v;
            }
            if (Math.sqrt(norm) < 1e-11) {
                break;
            }
            double[][] j = jacobian(u, cTot, hTot, oTot, nN2, kp, lnPP0);
            double[] du = new LUDecomposition(new Array2DRowRealMatrix(j, false))
                    .getSolver().solve(new ArrayRealVector(negate(f))).toArray();
            double damp = 1.0;
            for (double d : du) {
                if (Math.abs(d) > 2.0) {
                    damp = Math.min(damp, 2.0 / Math.abs(d));
                }
            }
            for (int i = 0; i < 8; i++) {
                u[i] = Math.clamp(u[i] + damp * du[i], -80.0, 80.0);
            }
        }
        double[] n = new double[8];
        for (int i = 0; i < 8; i++) {
            n[i] = Math.exp(u[i]);
        }
        return new State(n, nN2);
    }

    private static void initialGuess(double[] u, int x, int y, double oTot) {
        double[] n = new double[8];
        double oNeed = 2.0 * x + y / 2.0;        // O atoms for full CO2 + H2O
        if (oTot >= oNeed) {
            n[CO2] = x;
            n[H2O] = y / 2.0;
            n[O2] = Math.max((oTot - oNeed) / 2.0, 1e-8);
        } else {
            double def = oNeed - oTot;            // O atoms to free by making CO / H2
            double nco = Math.min(def, x);
            n[CO] = nco;
            n[CO2] = x - nco;
            double def2 = def - nco;
            double nh2 = Math.min(def2, y / 2.0);
            n[H2] = nh2;
            n[H2O] = y / 2.0 - nh2;
            n[O2] = 1e-8;
        }
        n[OH] = 1e-6;
        n[H] = 1e-6;
        n[O] = 1e-6;
        for (int i = 0; i < 8; i++) {
            u[i] = Math.log(Math.max(n[i], 1e-30));
        }
    }

    private static double[] residual(double[] u, double cTot, double hTot, double oTot,
                                     double nN2, double[] kp, double lnPP0) {
        double[] n = new double[8];
        double ntot = nN2;
        for (int i = 0; i < 8; i++) {
            n[i] = Math.exp(u[i]);
            ntot += n[i];
        }
        double lnTot = Math.log(ntot);
        double[] f = new double[8];
        // Element balances, scaled by the element totals to stay O(1).
        f[0] = ((n[CO2] + n[CO]) - cTot) / Math.max(cTot, 1.0);
        f[1] = ((2 * n[H2O] + 2 * n[H2] + n[OH] + n[H]) - hTot) / Math.max(hTot, 1.0);
        f[2] = ((2 * n[CO2] + n[CO] + n[H2O] + n[OH] + n[O] + 2 * n[O2]) - oTot) / Math.max(oTot, 1.0);
        // Dissociation equilibria (all have net moles change +1/2).
        f[3] = (u[CO] + 0.5 * u[O2] - u[CO2]) - 0.5 * lnTot + 0.5 * lnPP0 - kp[0];
        f[4] = (u[H2] + 0.5 * u[O2] - u[H2O]) - 0.5 * lnTot + 0.5 * lnPP0 - kp[1];
        f[5] = (u[OH] + 0.5 * u[H2] - u[H2O]) - 0.5 * lnTot + 0.5 * lnPP0 - kp[2];
        f[6] = (u[H] - 0.5 * u[H2]) - 0.5 * lnTot + 0.5 * lnPP0 - kp[3];
        f[7] = (u[O] - 0.5 * u[O2]) - 0.5 * lnTot + 0.5 * lnPP0 - kp[4];
        return f;
    }

    private static double[][] jacobian(double[] u, double cTot, double hTot, double oTot,
                                       double nN2, double[] kp, double lnPP0) {
        double[] f0 = residual(u, cTot, hTot, oTot, nN2, kp, lnPP0);
        double[][] jac = new double[8][8];
        for (int col = 0; col < 8; col++) {
            double save = u[col];
            double h = 1e-6 * Math.max(Math.abs(save), 1.0);
            u[col] = save + h;
            double[] f1 = residual(u, cTot, hTot, oTot, nN2, kp, lnPP0);
            u[col] = save;
            for (int row = 0; row < 8; row++) {
                jac[row][col] = (f1[row] - f0[row]) / h;
            }
        }
        return jac;
    }

    private static double[] negate(double[] v) {
        double[] r = new double[v.length];
        for (int i = 0; i < v.length; i++) {
            r[i] = -v[i];
        }
        return r;
    }

    // ----- public API --------------------------------------------------------

    private record Reactants(int x, int y, int z, double a, double nN2) {}

    private static Reactants reactants(String fuel, double phi) {
        Map<String, Integer> counts = ChemicalFormula.parse(fuel);
        int x = counts.getOrDefault("C", 0);
        int y = counts.getOrDefault("H", 0);
        int z = counts.getOrDefault("O", 0);
        double aSt = x + y / 4.0 - z / 2.0;
        if (aSt <= 0.0) {
            throw new PropertyEvaluationException(
                    "Equilibrium: '" + fuel + "' has no oxygen demand (non-combustible).");
        }
        if (!(phi > 0.0)) {
            throw new PropertyEvaluationException(
                    "Equilibrium: equivalence ratio phi must be > 0, got " + phi + ".");
        }
        double a = aSt / phi;
        return new Reactants(x, y, z, a, 3.76 * a);
    }

    /**
     * Equilibrium mole fraction of one product species (one of CO2, CO, H2O,
     * H2, OH, H, O, O2, N2) for fuel {@code fuel} at equivalence ratio
     * {@code phi}, temperature {@code t} [K] and pressure {@code p} [Pa].
     */
    public static double moleFraction(String fuel, double phi, double t, double p, String species) {
        Reactants r = reactants(fuel, phi);
        State st = solve(r.x(), r.y(), r.z(), r.a(), r.nN2(), t, p);
        double total = st.total();
        String key = species.trim().toUpperCase();
        if (key.equals("N2")) {
            return st.nN2() / total;
        }
        for (int i = 0; i < SP.length; i++) {
            if (SP[i].equals(key)) {
                return st.n()[i] / total;
            }
        }
        throw new PropertyEvaluationException(
                "Equilibrium: species '" + species + "' is not in the product pool "
                        + "(CO2, CO, H2O, H2, OH, H, O, O2, N2).");
    }

    /** Product mixture enthalpy per mole of fuel [J] at temperature t. */
    private static double productEnthalpy(State st, double t) {
        double h = st.nN2() * NasaThermo.molarEnthalpy("N2", t);
        for (int i = 0; i < SP.length; i++) {
            h += st.n()[i] * NasaThermo.molarEnthalpy(SP[i], t);
        }
        return h;
    }

    /**
     * Adiabatic flame temperature [K] <i>with</i> dissociation: constant-P
     * energy balance where the products are re-equilibrated at each trial
     * temperature. Lower (and more realistic) than the frozen-product value.
     */
    public static double adiabaticFlameTemp(String fuel, double phi, double tReact, double p) {
        Reactants r = reactants(fuel, phi);
        double hReact = Thermochemistry.hMol(fuel, tReact)
                + r.a() * NasaThermo.molarEnthalpy("O2", tReact)
                + r.nN2() * NasaThermo.molarEnthalpy("N2", tReact);

        java.util.function.DoubleUnaryOperator balance = t -> {
            State st = solve(r.x(), r.y(), r.z(), r.a(), r.nN2(), t, p);
            return productEnthalpy(st, t) - hReact;
        };
        // Secant iteration bracketed in a physical flame-temperature window.
        double tLo = 1000.0;
        double tHi = 3200.0;
        double fLo = balance.applyAsDouble(tLo);
        double fHi = balance.applyAsDouble(tHi);
        for (int i = 0; i < 100; i++) {
            double tMid = tHi - fHi * (tHi - tLo) / (fHi - fLo);
            tMid = Math.clamp(tMid, tReact, 3500.0);
            double fMid = balance.applyAsDouble(tMid);
            if (Math.abs(fMid) < 1e-3 * Math.abs(hReact) + 1.0) {
                return tMid;
            }
            if ((fMid > 0.0) == (fLo > 0.0)) {
                tLo = tMid;
                fLo = fMid;
            } else {
                tHi = tMid;
                fHi = fMid;
            }
        }
        return 0.5 * (tLo + tHi);
    }
}
