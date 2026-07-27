package com.frees.backend.props;

/**
 * Phase-split (P,h) property tables for one fluid — the structure the flash
 * surface actually has, so a global interpolant never smears the dome:
 *
 * <ul>
 *   <li><b>Saturation lines</b> (1-D in log P): Tsat, h_f, h_g, v_f, v_fg,
 *       s_f, s_fg — cubic-Hermite interpolated.</li>
 *   <li><b>Two-phase region</b>: exact mixture relations on those lines —
 *       T = Tsat(P), v = v_f + x·v_fg, s = s_f + x·s_fg with
 *       x = (h−h_f)/(h_g−h_f). No 2-D fit crosses the dome, ever.</li>
 *   <li><b>Single-phase regions</b>: bicubic tables in dome-following
 *       coordinates — vapor over (P, h−h_g(P)), liquid over (P, h_f(P)−h) —
 *       where the surface is smooth, so a coarse grid is accurate.</li>
 * </ul>
 *
 * Coverage is honest: pressures outside the served band (up to just inside
 * 0.75·pcrit — the fit extends further so the serve edge sits on interior
 * cells), superheat or subcooling deeper than the transformed rectangles,
 * and the low-pressure band where the liquid sliver is thinner than the
 * grid all return {@code null} — the caller makes the direct native call.
 */
final class SaturationSplitTable {

    private static final int SAT_POINTS = 256;
    private static final int GRID_P = 96;
    private static final int GRID_DH = 48;
    /** Liquid coverage needs at least this much saturated-to-cold headroom. */
    private static final double MIN_LIQUID_DEPTH = 2.0e4;

    private final double[] logP;
    private final double[] tsat;
    private final double[] hf;
    private final double[] hg;
    private final double[] vf;
    private final double[] vfg;
    private final double[] sf;
    private final double[] sfg;

    private final double pMin;
    private final double pMax;
    private final double pServeMax;
    private final double dhVaporMax;
    private final double dhLiquidMax;
    private final double pLiquidMin;

    private final PhPropertyTable vaporT;
    private final PhPropertyTable vaporD;
    private final PhPropertyTable vaporS;
    private final PhPropertyTable liquidT;
    private final PhPropertyTable liquidD;
    private final PhPropertyTable liquidS;

    /** Builds the split tables; throws on any structural failure (caller gates). */
    SaturationSplitTable(String fluid, double hTop, double tLow) {
        double pTriple = CoolProp.props1SI(fluid, "ptriple");
        double pCrit = CoolProp.props1SI(fluid, "pcrit");
        this.pMin = Math.max(pTriple * 1.2, pCrit * 1e-4);
        this.pMax = pCrit * 0.75;
        if (!(pMin > 0) || !(pMax > pMin)) {
            throw new IllegalStateException("no subcritical band");
        }

        this.logP = new double[SAT_POINTS];
        this.tsat = new double[SAT_POINTS];
        this.hf = new double[SAT_POINTS];
        this.hg = new double[SAT_POINTS];
        this.vf = new double[SAT_POINTS];
        this.vfg = new double[SAT_POINTS];
        this.sf = new double[SAT_POINTS];
        this.sfg = new double[SAT_POINTS];
        double logMin = Math.log(pMin);
        double logMax = Math.log(pMax);
        for (int i = 0; i < SAT_POINTS; i++) {
            double p = Math.exp(logMin + (logMax - logMin) * i / (SAT_POINTS - 1.0));
            logP[i] = Math.log(p);
            tsat[i] = CoolProp.propsSI("T", "P", p, "Q", 0.0, fluid);
            hf[i] = CoolProp.propsSI("Hmass", "P", p, "Q", 0.0, fluid);
            hg[i] = CoolProp.propsSI("Hmass", "P", p, "Q", 1.0, fluid);
            double df = CoolProp.propsSI("Dmass", "P", p, "Q", 0.0, fluid);
            double dg = CoolProp.propsSI("Dmass", "P", p, "Q", 1.0, fluid);
            vf[i] = 1.0 / df;
            vfg[i] = 1.0 / dg - 1.0 / df;
            sf[i] = CoolProp.propsSI("Smass", "P", p, "Q", 0.0, fluid);
            sfg[i] = CoolProp.propsSI("Smass", "P", p, "Q", 1.0, fluid) - sf[i];
        }

        // Vapor rectangle: superheat depth available at every pressure.
        double hgMax = 0.0;
        for (double v : hg) {
            hgMax = Math.max(hgMax, v);
        }
        this.dhVaporMax = 0.9 * (hTop - hgMax);
        if (!(dhVaporMax > 0)) {
            throw new IllegalStateException("no superheat band under hTop");
        }

        // Liquid rectangle: start where the liquid sliver is deep enough.
        int liquidStart = -1;
        double depth = Double.POSITIVE_INFINITY;
        for (int i = 0; i < SAT_POINTS; i++) {
            if (tsat[i] < tLow + 5.0) {
                continue;
            }
            double p = Math.exp(logP[i]);
            double hCold = CoolProp.propsSIOrNaN("Hmass", "P", p, "T", tLow, fluid);
            if (!Double.isFinite(hCold)) {
                continue;
            }
            double d = hf[i] - hCold;
            if (liquidStart < 0 && d >= MIN_LIQUID_DEPTH) {
                liquidStart = i;
            }
            if (liquidStart >= 0) {
                depth = Math.min(depth, d);
            }
        }
        if (liquidStart >= 0 && Double.isFinite(depth)) {
            this.pLiquidMin = Math.exp(logP[liquidStart]);
            this.dhLiquidMax = 0.9 * depth;
        } else {
            this.pLiquidMin = Double.POSITIVE_INFINITY; // liquid never served
            this.dhLiquidMax = 0.0;
        }

        // The 2-D fits extend to pMax, but service stops short of it: the last
        // cells before a grid edge use one-sided stencils and carry the worst
        // error (empirically the near-critical vapor band), so the served
        // region keeps an anchored margin of fitted-but-unserved cells.
        this.pServeMax = pMax * 0.95;

        double[] pGrid = logspace(pMin, pMax, GRID_P);
        // Quadratic dh spacing: curvature concentrates at the dome edge
        // (dh -> 0), so the grid is densest exactly there.
        double[] dhVapor = squarespace(dhVaporMax / 0.9, GRID_DH);
        this.vaporT = buildPiece("T", fluid, pGrid, dhVapor, true);
        this.vaporD = buildPiece("Dmass", fluid, pGrid, dhVapor, true);
        this.vaporS = buildPiece("Smass", fluid, pGrid, dhVapor, true);
        if (dhLiquidMax > 0) {
            double[] pGridL = logspace(pLiquidMin, pMax, GRID_P);
            double[] dhLiquid = squarespace(dhLiquidMax / 0.9, GRID_DH);
            this.liquidT = buildPiece("T", fluid, pGridL, dhLiquid, false);
            this.liquidD = buildPiece("Dmass", fluid, pGridL, dhLiquid, false);
            this.liquidS = buildPiece("Smass", fluid, pGridL, dhLiquid, false);
        } else {
            this.liquidT = null;
            this.liquidD = null;
            this.liquidS = null;
        }
    }

    private PhPropertyTable buildPiece(String output, String fluid,
                                       double[] pGrid, double[] dhGrid, boolean vapor) {
        return PhPropertyTable.build(pGrid, dhGrid, (p, dh) -> {
            double h = vapor ? hgAt(p) + dh : hfAt(p) - dh;
            return CoolProp.propsSIOrNaN(output, "P", p, "Hmass", h, fluid);
        });
    }

    /**
     * {@code output(P, h)} from the split tables, or {@code null} when the
     * point lies outside covered territory. Output keys: T, Dmass, Smass.
     */
    Double value(String outputKey, double p, double h) {
        if (p < pMin || p > pServeMax) {
            return null;
        }
        double hfv = hfAt(p);
        double hgv = hgAt(p);
        if (h >= hfv && h <= hgv) { // two-phase: exact mixture relations
            double x = (h - hfv) / (hgv - hfv);
            return switch (outputKey) {
                case "T" -> tsatAt(p);
                case "Dmass" -> 1.0 / (interp(vf, p) + x * interp(vfg, p));
                case "Smass" -> interp(sf, p) + x * interp(sfg, p);
                default -> null;
            };
        }
        if (h > hgv) { // superheated vapor in dome-following coordinates
            double dh = h - hgv;
            if (dh > dhVaporMax) {
                return null;
            }
            return switch (outputKey) {
                case "T" -> vaporT.value(p, dh);
                case "Dmass" -> vaporD.value(p, dh);
                case "Smass" -> vaporS.value(p, dh);
                default -> null;
            };
        }
        // subcooled liquid
        if (liquidT == null || p < pLiquidMin) {
            return null;
        }
        double dh = hfv - h;
        if (dh > dhLiquidMax) {
            return null;
        }
        return switch (outputKey) {
            case "T" -> liquidT.value(p, dh);
            case "Dmass" -> liquidD.value(p, dh);
            case "Smass" -> liquidS.value(p, dh);
            default -> null;
        };
    }

    double pMin() {
        return pMin;
    }

    double pMax() {
        return pMax;
    }

    private double tsatAt(double p) {
        return interp(tsat, p);
    }

    private double hfAt(double p) {
        return interp(hf, p);
    }

    private double hgAt(double p) {
        return interp(hg, p);
    }

    /** Cubic-Hermite on the log-P saturation grid with central-FD slopes. */
    private double interp(double[] f, double p) {
        double x = Math.log(p);
        int n = logP.length;
        int lo = 0;
        int hi = n - 1;
        while (hi - lo > 1) {
            int mid = (lo + hi) >>> 1;
            if (logP[mid] <= x) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        double x0 = logP[lo];
        double x1 = logP[hi];
        double t = Math.clamp((x - x0) / (x1 - x0), 0.0, 1.0);
        double m0 = slope(f, lo);
        double m1 = slope(f, hi);
        double dx = x1 - x0;
        double t2 = t * t;
        double t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * f[lo] + (t3 - 2 * t2 + t) * dx * m0
                + (-2 * t3 + 3 * t2) * f[hi] + (t3 - t2) * dx * m1;
    }

    private double slope(double[] f, int i) {
        int n = logP.length;
        if (i == 0) {
            return (f[1] - f[0]) / (logP[1] - logP[0]);
        }
        if (i == n - 1) {
            return (f[n - 1] - f[n - 2]) / (logP[n - 1] - logP[n - 2]);
        }
        return (f[i + 1] - f[i - 1]) / (logP[i + 1] - logP[i - 1]);
    }

    private static double[] logspace(double lo, double hi, int n) {
        double[] out = new double[n];
        double a = Math.log(lo);
        double b = Math.log(hi);
        for (int i = 0; i < n; i++) {
            out[i] = Math.exp(a + (b - a) * i / (n - 1.0));
        }
        return out;
    }

    private static double[] squarespace(double max, int n) {
        double[] out = new double[n];
        for (int i = 0; i < n; i++) {
            double t = i / (n - 1.0);
            out[i] = max * t * t;
        }
        return out;
    }
}
