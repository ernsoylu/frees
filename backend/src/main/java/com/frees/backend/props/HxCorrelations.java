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

    // ── External / air-side convection (compact finned HX, tube banks) ──────
    /** Žukauskas tube-bank cross-flow Nusselt (forced, gases): Nu = 0.27·Re^0.63·Pr^0.36. */
    public static double nuZukauskas(double re, double pr) {
        return 0.27 * Math.pow(Math.max(re, 1.0), 0.63) * Math.pow(pr, 0.36);
    }

    /** Colburn j-factor Nusselt for compact surfaces: Nu = j·Re·Pr^(1/3). */
    public static double nuColburn(double j, double re, double pr) {
        return j * re * Math.pow(pr, 1.0 / 3.0);
    }

    /** Churchill–Chu natural-convection Nusselt (vertical surface) from Rayleigh Ra. */
    public static double nuChurchillChu(double ra, double pr) {
        double d = Math.pow(1.0 + Math.pow(0.492 / pr, 9.0 / 16.0), 8.0 / 27.0);
        double term = 0.825 + 0.387 * Math.pow(Math.max(ra, 0.0), 1.0 / 6.0) / d;
        return term * term;
    }

    /** Cubic free+forced convection blend Nu = (Nu1³ + Nu2³)^(1/3) (Amesim recipe). */
    public static double nuBlend(double nu1, double nu2) {
        return Math.cbrt(nu1 * nu1 * nu1 + nu2 * nu2 * nu2);
    }

    /** Air-side / external-flow film coefficient h [W/m²K] over a finned tube bank
     *  (Žukauskas), characteristic length = tube outer diameter D. */
    public static double htcExtAir(String fluidTok, double p, double t, double mdot, double d, double aFlow) {
        guardGeom(d, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double mu = CoolProp.propsSI("viscosity", "P", p, "T", t, f);
        double k = CoolProp.propsSI("conductivity", "P", p, "T", t, f);
        double cp = CoolProp.propsSI("Cpmass", "P", p, "T", t, f);
        double re = mdot * d / (aFlow * mu);
        double pr = mu * cp / k;
        return nuZukauskas(re, pr) * k / d;
    }

    // ── Geometry resolution: primary dimensions → D_h, A_conv, σ, η_surf ─────
    /** Compact hydraulic diameter D_h = 4·A_flow·L / A_total. */
    public static double hxDh(double aFlow, double aTotal, double l) {
        if (!(aTotal > 0)) {
            throw new PropertyEvaluationException("hx_dh: total area must be > 0.");
        }
        return 4.0 * aFlow * l / aTotal;
    }

    /** Convective area from the compact identity A = 4·A_flow·L / D_h. */
    public static double hxAconv(double aFlow, double l, double dh) {
        if (!(dh > 0)) {
            throw new PropertyEvaluationException("hx_aconv: D_h must be > 0.");
        }
        return 4.0 * aFlow * l / dh;
    }

    /** Free-flow (contraction) ratio σ = A_flow / A_frontal. */
    public static double hxSigma(double aFlow, double aFrontal) {
        if (!(aFrontal > 0)) {
            throw new PropertyEvaluationException("hx_sigma: frontal area must be > 0.");
        }
        return aFlow / aFrontal;
    }

    /** Overall fin-surface efficiency η_surf = 1 − (A_fin/A_total)(1 − η_fin). */
    public static double hxEtaSurf(double aFin, double aTotal, double etaFin) {
        if (!(aTotal > 0)) {
            throw new PropertyEvaluationException("hx_eta_surf: total area must be > 0.");
        }
        return 1.0 - (aFin / aTotal) * (1.0 - etaFin);
    }

    // ── Pressure drop: Müller–Steinhagen two-phase + compact-core entrance/exit
    /** Müller–Steinhagen–Heck two-phase frictional ΔP [Pa]:
     *  ΔP = [A + 2(B−A)x](1−x)^(1/3) + B·x³, A/B = all-liquid / all-gas Darcy drop. */
    public static double dpMuellerSteinhagen(String fluidTok, double p, double x, double mdot, double dh, double aFlow, double l) {
        guardGeom(dh, aFlow);
        String f = PropertyFunctions.resolveFluid(fluidTok.toLowerCase(java.util.Locale.ROOT));
        double a = darcyDrop(CoolProp.propsSI("Dmass", "P", p, "Q", 0.0, f),
                CoolProp.propsSI("viscosity", "P", p, "Q", 0.0, f), mdot, dh, aFlow, l);
        double b = darcyDrop(CoolProp.propsSI("Dmass", "P", p, "Q", 1.0, f),
                CoolProp.propsSI("viscosity", "P", p, "Q", 1.0, f), mdot, dh, aFlow, l);
        double xx = clip(x, 0.0, 1.0);
        return (a + 2.0 * (b - a) * xx) * Math.pow(1.0 - xx, 1.0 / 3.0) + b * Math.pow(xx, 3.0);
    }

    private static double darcyDrop(double rho, double mu, double mdot, double dh, double aFlow, double l) {
        double v = mdot / (rho * aFlow);
        double re = rho * Math.abs(v) * dh / mu;
        return FlowResistance.frictionFactor(re, 0.0) * (l / dh) * rho * v * Math.abs(v) / 2.0;
    }

    /** Compact-core ΔP [Pa] (Kays & London): entrance contraction Kc, flow
     *  acceleration (ρ_in→ρ_out), and exit expansion Ke, for a free-flow ratio σ. */
    public static double dpCompactCore(double g, double rhoIn, double rhoOut, double sigma, double kc, double ke) {
        if (!(rhoIn > 0) || !(rhoOut > 0)) {
            throw new PropertyEvaluationException("dp_compact_core: densities must be > 0.");
        }
        double s2 = sigma * sigma;
        return (g * g / (2.0 * rhoIn))
                * ((kc + 1.0 - s2) + 2.0 * (rhoIn / rhoOut - 1.0) - (1.0 - s2 - ke) * (rhoIn / rhoOut));
    }

    // ── Remaining correlations (advisory item A) ────────────────────────────

    /** Žukauskas tube-bank cross-flow Nusselt with arrangement + Re-band C,m.
     *  {@code arr} = "inline" | "staggered"; Pr^0.36 (Pr/Prw ratio ≈ 1 for gases). */
    public static double nuTubeBank(String arr, double re, double pr) {
        boolean staggered = arr != null && arr.toLowerCase(java.util.Locale.ROOT).startsWith("stag");
        double reEff = Math.max(re, 1.0);
        double c;
        double m;
        if (reEff < 100) {
            c = staggered ? 0.90 : 0.80;
            m = 0.40;
        } else if (reEff < 1000) {
            c = 0.51;
            m = 0.50;
        } else if (reEff < 2e5) {
            c = staggered ? 0.40 : 0.27;
            m = staggered ? 0.60 : 0.63;
        } else {
            c = staggered ? 0.022 : 0.021;
            m = 0.84;
        }
        return c * Math.pow(reEff, m) * Math.pow(pr, 0.36);
    }

    /** Hilpert single-cylinder cross-flow Nusselt: Nu = C·Re^m·Pr^(1/3), C,m by Re band. */
    public static double nuHilpert(double re, double pr) {
        double reEff = Math.max(re, 0.4);
        double c;
        double m;
        if (reEff < 4) {
            c = 0.989;
            m = 0.330;
        } else if (reEff < 40) {
            c = 0.911;
            m = 0.385;
        } else if (reEff < 4000) {
            c = 0.683;
            m = 0.466;
        } else if (reEff < 4e4) {
            c = 0.193;
            m = 0.618;
        } else {
            c = 0.027;
            m = 0.805;
        }
        return c * Math.pow(reEff, m) * Math.pow(pr, 1.0 / 3.0);
    }

    /** Chevron plate-HX Nusselt: Nu = C(β)·Re^m·Pr^(1/3); C,m rise with chevron
     *  angle β (30°→60°), a Martin/Kumar-style fit. */
    public static double nuPlate(double re, double pr, double betaDeg) {
        double b = clip(betaDeg, 30.0, 60.0);
        double f = (b - 30.0) / 30.0;
        double c = 0.2 + 0.2 * f;
        double m = 0.6 + 0.14 * f;
        return c * Math.pow(Math.max(re, 1.0), m) * Math.pow(pr, 1.0 / 3.0);
    }

    // fin-and-tube geometry (Amesim hx_sizing §1.2): developed fin length and the
    // primary (tube-wall) + secondary (fin) areas → feed hx_eta_surf / hx_dh.
    /** Developed fin length. */
    public static double hxFinLen(double depth, double t, double finDensity, double hTube) {
        double a = hTube - 2.0 * t;
        double b = 1.0 / (2.0 * finDensity);
        return 2.0 * (depth - 2.0 * t) * finDensity * Math.sqrt(a * a + b * b);
    }

    /** Primary (tube-wall) area. */
    public static double hxAreaDirect(double w, double tubeCount, double hTube, double depth, double t) {
        return 2.0 * w * tubeCount * ((hTube - 2.0 * t) + (depth - 2.0 * t));
    }

    /** Secondary (fin) area. */
    public static double hxAreaIndirect(double w, double tubeCount, double finLen) {
        return 2.0 * w * tubeCount * finLen;
    }

    /** Two-phase gravitational (static-head) pressure change [Pa] over length L at
     *  inclination θ from horizontal: (α·ρg+(1−α)·ρl)·g·L·sin θ. */
    public static double dpGravity(double rhoL, double rhoG, double alpha, double l, double thetaDeg) {
        double rhoMix = alpha * rhoG + (1.0 - alpha) * rhoL;
        return rhoMix * 9.80665 * l * Math.sin(Math.toRadians(thetaDeg));
    }

    // ── Gap-completion correlations ─────────────────────────────────────────

    /** Mass flux G = ṁ / A_flow [kg/m²s]. */
    public static double massFlux(double mdot, double aFlow) {
        if (!(aFlow > 0)) {
            throw new PropertyEvaluationException("mass_flux: A_flow must be > 0.");
        }
        return mdot / aFlow;
    }

    /** Colburn j-factor for a compact fin surface (the "j data table" as a
     *  representative Re power-law per surface type): plain / wavy / louvered /
     *  offset-strip. Nu = j·Re·Pr^(1/3) (use with nu_colburn). */
    public static double jFin(String surface, double re) {
        double r = Math.max(re, 1.0);
        return switch (finSurface(surface)) {
            case "wavy" -> 0.394 * Math.pow(r, -0.41);
            case "louvered" -> 0.490 * Math.pow(r, -0.49);
            case "offset" -> 0.650 * Math.pow(r, -0.54);
            default -> 0.264 * Math.pow(r, -0.40); // plain
        };
    }

    /** Fanning friction factor for a compact fin surface (the air-side ΔP analogue
     *  of {@link #jFin}); apply as ΔP = 4·f·(L/D_h)·G²/(2ρ). */
    public static double fFin(String surface, double re) {
        double r = Math.max(re, 1.0);
        return switch (finSurface(surface)) {
            case "wavy" -> 0.890 * Math.pow(r, -0.30);
            case "louvered" -> 1.100 * Math.pow(r, -0.41);
            case "offset" -> 1.500 * Math.pow(r, -0.42);
            default -> 0.508 * Math.pow(r, -0.30); // plain
        };
    }

    private static String finSurface(String s) {
        return s == null ? "plain" : s.toLowerCase(java.util.Locale.ROOT);
    }

    /** Gungor–Winterton (1986) flow-boiling two-phase Nusselt from the liquid-only
     *  Nu: Nu_tp = Nu_l·(1 + 24000·Bo^1.16 + 1.37·(1/X_tt)^0.86). Bo = boiling
     *  number q/(G·h_fg) (pass 0 for the convective limit). */
    public static double nuGungorWinterton(double nuL, double xtt, double bo) {
        double e = 1.0 + 24000.0 * Math.pow(Math.max(bo, 0.0), 1.16)
                + 1.37 * Math.pow(1.0 / Math.max(xtt, 1e-6), 0.86);
        return nuL * e;
    }

    /** Traviss (1973) in-tube condensation Nusselt:
     *  Nu = 0.15·Pr_l·Re_l^0.9 / F_T · (1/X_tt + 2.85/X_tt^0.476),
     *  F_T = 5·Pr_l + 5·ln(1+5·Pr_l) + 2.5·ln(0.00313·Re_l^0.812). */
    public static double nuTraviss(double reL, double prL, double xtt) {
        double r = Math.max(reL, 1.0);
        double ft = 5.0 * prL + 5.0 * Math.log(1.0 + 5.0 * prL) + 2.5 * Math.log(0.00313 * Math.pow(r, 0.812));
        ft = Math.max(ft, 1e-3);
        double x = Math.max(xtt, 1e-6);
        return 0.15 * prL * Math.pow(r, 0.9) / ft * (1.0 / x + 2.85 / Math.pow(x, 0.476));
    }

    /** Quality-integrated two-phase frictional ΔP [Pa]: the local two-phase drop
     *  (dp_2phase basis) integrated across x_in→x_out over n equal cells — the
     *  cell-by-cell average the lumped single-point dp_2phase cannot capture. */
    public static double dp2phaseAvg(String fluidTok, double p, double xIn, double xOut,
                                     double mdot, double dh, double aFlow, double l, double n) {
        guardGeom(dh, aFlow);
        int cells = (int) Math.max(1, Math.round(n));
        double seg = l / cells;
        double total = 0.0;
        for (int i = 0; i < cells; i++) {
            double xMid = xIn + (xOut - xIn) * (i + 0.5) / cells;
            total += dp2phase(fluidTok, p, xMid, mdot, dh, aFlow, seg);
        }
        return total;
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
