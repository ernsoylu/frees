package com.frees.backend.props;

/**
 * Heat-exchanger sizing correlations — UA (heat transfer) and dP (friction) —
 * computed from flow + geometry + fluid state, to be evaluated OUTSIDE a
 * component and injected into its {@code UA} / {@code dP} parameters. This is the
 * Amesim "Nu+Geom" engine (research: {@code amesim_hx_sizing_UA_methods.md} §2,
 * {@code amesim_heat_exchanger_algorithms.md} §4-5):
 *
 * <pre>
 *   Re = ṁ·D_h/(A_flow·μ)   Pr = μ·cp/λ   Nu = f(Re,Pr)   h = Nu·λ/D_h
 *   UA = 1 / ( 1/(h_int·A_int) + R_wall + 1/(h_ext·A_ext) )
 * </pre>
 *
 * with a smooth laminar↔turbulent blend, two-phase boiling (Shah convective) and
 * condensation (Shah 1979) factors on the refrigerant side, and a single-phase
 * Darcy / two-phase Chisholm (Lockhart–Martinelli) pressure drop. All scalar,
 * stateless, and reusable from documents (3-site wired like {@code iso6358}).
 */
public final class HxCorrelations {

    private HxCorrelations() {}

    // ── Nusselt: laminar (3.66, const-wall-T) ↔ Gnielinski turbulent, blended ──
    static double nuSinglePhase(double re, double pr) {
        double nuLam = 3.66;
        double reEff = Math.max(re, 1.0);
        double f = Math.pow(0.79 * Math.log(Math.max(reEff, 1e3)) - 1.64, -2.0); // Petukhov
        double nuTurb = (f / 8.0) * (reEff - 1000.0) * pr
                / (1.0 + 12.7 * Math.sqrt(f / 8.0) * (Math.pow(pr, 2.0 / 3.0) - 1.0));
        nuTurb = Math.max(nuTurb, nuLam);
        return smooth(nuLam, nuTurb, reEff, 2300.0, 4000.0);
    }

    /** Single-phase forced-convection coefficient h [W/m²K] from (P,T), flow and geometry. */
    public static double htc1phase(String fluidTok, double p, double t, double mdot, double dh, double aFlow) {
        guardGeom(dh, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double mu = CoolProp.propsSI("viscosity", "P", p, "T", t, f);
        double k = CoolProp.propsSI("conductivity", "P", p, "T", t, f);
        double cp = CoolProp.propsSI("Cpmass", "P", p, "T", t, f);
        double re = mdot * dh / (aFlow * mu);
        double pr = mu * cp / k;
        return nuSinglePhase(re, pr) * k / dh;
    }

    /** Liquid-only single-phase h [W/m²K] (all the mass as saturated liquid), the
     *  base for the two-phase factors. */
    static double htcLiquidOnly(String fluid, double p, double mdot, double dh, double aFlow) {
        double mu = CoolProp.propsSI("viscosity", "P", p, "Q", 0.0, fluid);
        double k = CoolProp.propsSI("conductivity", "P", p, "Q", 0.0, fluid);
        double cp = CoolProp.propsSI("Cpmass", "P", p, "Q", 0.0, fluid);
        double re = mdot * dh / (aFlow * mu);
        double pr = mu * cp / k;
        return nuSinglePhase(re, pr) * k / dh;
    }

    /** Flow-boiling coefficient h [W/m²K] — Shah's convective limit (heat-flux-free):
     *  h = h_lo · max(1, 1.8/Co^0.8), Co = ((1−x)/x)^0.8·√(ρg/ρl). */
    public static double htcEvap(String fluidTok, double p, double x, double mdot, double dh, double aFlow) {
        guardGeom(dh, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double hlo = htcLiquidOnly(f, p, mdot, dh, aFlow);
        double rhol = CoolProp.propsSI("Dmass", "P", p, "Q", 0.0, f);
        double rhog = CoolProp.propsSI("Dmass", "P", p, "Q", 1.0, f);
        double xx = clip(x, 0.01, 0.99);
        double co = Math.pow((1.0 - xx) / xx, 0.8) * Math.sqrt(rhog / rhol);
        return hlo * Math.max(1.0, 1.8 / Math.pow(co, 0.8));
    }

    /** Condensation coefficient h [W/m²K] — Shah (1979):
     *  h = h_lo · [(1−x)^0.8 + 3.8·x^0.76·(1−x)^0.04 / pr^0.38], pr = P/Pcrit. */
    public static double htcCond(String fluidTok, double p, double x, double mdot, double dh, double aFlow) {
        guardGeom(dh, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double hlo = htcLiquidOnly(f, p, mdot, dh, aFlow);
        double pr = p / CoolProp.props1SI(f, "Pcrit");
        double xx = clip(x, 0.01, 0.99);
        double factor = Math.pow(1.0 - xx, 0.8)
                + 3.8 * Math.pow(xx, 0.76) * Math.pow(1.0 - xx, 0.04) / Math.pow(pr, 0.38);
        return hlo * factor;
    }

    /** Overall conductance UA [W/K] in series: internal film, wall, external film. */
    public static double uaHx(double h1, double a1, double h2, double a2, double rWall) {
        if (h1 <= 0 || a1 <= 0 || h2 <= 0 || a2 <= 0) {
            throw new PropertyEvaluationException("ua_hx: film coefficients and areas must be positive.");
        }
        return 1.0 / (1.0 / (h1 * a1) + rWall + 1.0 / (h2 * a2));
    }

    /** Single-phase Darcy pressure drop ΔP [Pa] over length L. */
    public static double dp1phase(String fluidTok, double p, double t, double mdot, double dh, double aFlow, double l) {
        guardGeom(dh, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double rho = CoolProp.propsSI("Dmass", "P", p, "T", t, f);
        double mu = CoolProp.propsSI("viscosity", "P", p, "T", t, f);
        double v = mdot / (rho * aFlow);
        double re = rho * Math.abs(v) * dh / mu;
        double fr = FlowResistance.frictionFactor(re, 0.0);
        return fr * (l / dh) * rho * v * Math.abs(v) / 2.0;
    }

    /** Two-phase frictional ΔP [Pa] = liquid-only Darcy drop × Chisholm (turbulent-
     *  turbulent) two-phase multiplier (Lockhart–Martinelli). */
    public static double dp2phase(String fluidTok, double p, double x, double mdot, double dh, double aFlow, double l) {
        guardGeom(dh, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double rhol = CoolProp.propsSI("Dmass", "P", p, "Q", 0.0, f);
        double mul = CoolProp.propsSI("viscosity", "P", p, "Q", 0.0, f);
        double rhog = CoolProp.propsSI("Dmass", "P", p, "Q", 1.0, f);
        double mug = CoolProp.propsSI("viscosity", "P", p, "Q", 1.0, f);
        double v = mdot / (rhol * aFlow);
        double re = rhol * Math.abs(v) * dh / mul;
        double fr = FlowResistance.frictionFactor(re, 0.0);
        double dpLo = fr * (l / dh) * rhol * v * Math.abs(v) / 2.0;
        double xx = clip(x, 0.01, 0.99);
        double xtt = Math.pow((1.0 - xx) / xx, 0.9) * Math.sqrt(rhog / rhol) * Math.pow(mul / mug, 0.1);
        return dpLo * TwoPhase.lmPhi2(xtt, 20.0); // C=20 turbulent-turbulent
    }

    private static double smooth(double lo, double hi, double x, double x1, double x2) {
        if (x <= x1) {
            return lo;
        }
        if (x >= x2) {
            return hi;
        }
        double t = (x - x1) / (x2 - x1);
        return lo + (hi - lo) * t * t * (3.0 - 2.0 * t); // smoothstep (C¹)
    }

    private static double clip(double v, double a, double b) {
        return v < a ? a : (v > b ? b : v);
    }

    private static void guardGeom(double dh, double aFlow) {
        if (!(dh > 0) || !(aFlow > 0)) {
            throw new PropertyEvaluationException("hx correlation: hydraulic diameter D_h and free-flow area A_flow must be > 0.");
        }
    }
}
