package com.frees.backend.props;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates thermodynamic property diagram data (saturation dome, isolines,
 * critical/triple markers) for a CoolProp fluid, all in SI units.
 *
 * Curves are produced by sweeping a CoolProp input pair that is robust across
 * the whole region: (T,Q) for the dome and quality lines, (T,D) for isotherms
 * and isochores, (P,S) for isobars/isentropes and (P,H) for isenthalps. The
 * two-phase region falls out naturally from these flashes. Failed points are
 * emitted as nulls so the client renders a line gap.
 */
public final class PropertyDiagrams {

    /** Supported diagram kinds; axis variables are (x, y). */
    public enum Kind {
        TS("s", "T"), PH("h", "P"), PV("v", "P"), TV("v", "T"), HS("s", "h"), PT("T", "P");

        final String x;
        final String y;

        Kind(String x, String y) {
            this.x = x;
            this.y = y;
        }

        public static Kind parse(String name) {
            return switch (name == null ? "" : name.toLowerCase().replace("-", "")) {
                case "ts" -> TS;
                case "ph", "logph" -> PH;
                case "pv" -> PV;
                case "tv" -> TV;
                case "hs" -> HS;
                case "pt" -> PT;
                default -> throw new IllegalArgumentException(
                        "Unknown diagram type '" + name + "'. Supported: T-s, P-h, P-v, T-v, h-s, P-T");
            };
        }
    }

    /** One curve: axis points (nullable for gaps) plus a legend label. */
    public record Curve(String family, String label, List<Double> x, List<Double> y) {}

    public record Marker(String label, double x, double y) {}

    public record Diagram(String fluid, String kind, String xProperty, String yProperty,
                          boolean xLog, boolean yLog,
                          List<Curve> dome, List<Curve> isolines, List<Marker> markers) {}

    private static final int CURVE_POINTS = 120;
    private static final int DOME_POINTS = 200;

    private record Limits(double tTriple, double tCrit, double pTriple, double pCrit) {}

    private final String fluid;
    private final Kind kind;
    private final Limits limits;

    private PropertyDiagrams(String fluid, Kind kind) {
        this.fluid = fluid;
        this.kind = kind;
        this.limits = new Limits(
                CoolProp.props1SI(fluid, "Ttriple"),
                CoolProp.props1SI(fluid, "Tcrit"),
                Math.max(CoolProp.props1SI(fluid, "ptriple"), 1.0),
                CoolProp.props1SI(fluid, "pcrit"));
    }

    /** Builds the full diagram payload for one fluid and diagram kind. */
    public static Diagram generate(String fluid, String kindName) {
        PropertyDiagrams gen = new PropertyDiagrams(fluid, Kind.parse(kindName));
        return gen.build();
    }

    private Diagram build() {
        List<Curve> dome = saturationDome();
        List<Curve> isolines = new ArrayList<>();
        if (kind != Kind.PT) {
            isolines.addAll(qualityLines());
        }
        switch (kind) {
            case TS, TV, HS -> isolines.addAll(isobars());
            case PH, PV -> {
                isolines.addAll(isotherms());
                if (kind == Kind.PH) {
                    isolines.addAll(isentropes());
                }
            }
            case PT -> { /* saturation curve only */ }
        }
        boolean xLog = kind == Kind.PV || kind == Kind.TV;
        boolean yLog = kind == Kind.PH || kind == Kind.PV;
        return new Diagram(fluid, kind.name(), kind.x, kind.y, xLog, yLog,
                dome, isolines, markers());
    }

    private List<Marker> markers() {
        double tc = limits.tCrit();
        List<Marker> out = new ArrayList<>();
        out.add(new Marker("Critical point", axisValueAtQ(kind.x, tc), axisValueAtQ(kind.y, tc)));
        return out;
    }

    /** Axis property exactly at the critical temperature (Q flash degenerates there). */
    private double axisValueAtQ(String axis, double t) {
        double tSafe = Math.min(t, limits.tCrit() * 0.999999);
        return CoolProp.propsSIOrNaN(coolPropKey(axis), "T", tSafe, "Q", 0.5, fluid);
    }

    private List<Curve> saturationDome() {
        List<Double> xs = new ArrayList<>();
        List<Double> ys = new ArrayList<>();
        // Liquid branch up to the critical point, then back down the vapor branch.
        for (int i = 0; i < DOME_POINTS; i++) {
            double t = domeTemperature(i);
            addPoint(xs, ys, "T", t, "Q", 0.0);
        }
        for (int i = DOME_POINTS - 1; i >= 0; i--) {
            double t = domeTemperature(i);
            addPoint(xs, ys, "T", t, "Q", 1.0);
        }
        if (kind == Kind.PT) {
            // P-T saturation line is single-valued; keep only one branch.
            xs = xs.subList(0, DOME_POINTS);
            ys = ys.subList(0, DOME_POINTS);
        }
        return List.of(new Curve("dome", "Saturation", xs, ys));
    }

    /** Cluster dome samples near the critical point where curvature is high. */
    private double domeTemperature(int i) {
        double u = (double) i / (DOME_POINTS - 1);
        double shaped = 1.0 - (1.0 - u) * (1.0 - u);
        double tMax = limits.tCrit() * 0.999999;
        return limits.tTriple() + (tMax - limits.tTriple()) * shaped;
    }

    private List<Curve> qualityLines() {
        List<Curve> out = new ArrayList<>();
        for (int q = 1; q <= 9; q++) {
            double quality = q / 10.0;
            List<Double> xs = new ArrayList<>();
            List<Double> ys = new ArrayList<>();
            for (int i = 0; i < CURVE_POINTS; i++) {
                double u = (double) i / (CURVE_POINTS - 1);
                double t = limits.tTriple()
                        + (limits.tCrit() * 0.9999 - limits.tTriple()) * (1.0 - (1.0 - u) * (1.0 - u));
                addPoint(xs, ys, "T", t, "Q", quality);
            }
            out.add(new Curve("quality", "x = " + quality, xs, ys));
        }
        return out;
    }

    private List<Curve> isobars() {
        List<Curve> out = new ArrayList<>();
        for (double p : niceLogValues(limits.pTriple() * 2, limits.pCrit() * 2.5, 7)) {
            out.add(sweepEntropyAtPressure("isobar", formatPressure(p), p));
        }
        return out;
    }

    private List<Curve> isentropes() {
        double sMin = CoolProp.propsSIOrNaN("S", "T", limits.tTriple() + 1, "Q", 0.0, fluid);
        double sMax = CoolProp.propsSIOrNaN("S", "T", limits.tTriple() + 1, "Q", 1.0, fluid);
        if (Double.isNaN(sMin) || Double.isNaN(sMax)) {
            return List.of();
        }
        List<Curve> out = new ArrayList<>();
        int count = 7;
        for (int i = 1; i <= count; i++) {
            double s = sMin + (sMax - sMin) * i / (count + 1.0);
            List<Double> xs = new ArrayList<>();
            List<Double> ys = new ArrayList<>();
            for (double p : logSweep(limits.pTriple() * 1.2, limits.pCrit() * 2.5, CURVE_POINTS)) {
                addPoint(xs, ys, "P", p, "S", s);
            }
            out.add(new Curve("isentrope", "s = " + Math.round(s) + " J/kg-K", xs, ys));
        }
        return out;
    }

    private Curve sweepEntropyAtPressure(String family, String label, double p) {
        double tMax = limits.tCrit() * 1.15;
        double sLow = CoolProp.propsSIOrNaN("S", "P", p, "T",
                limits.tTriple() + 0.5, fluid);
        double sHigh = CoolProp.propsSIOrNaN("S", "P", p, "T", tMax, fluid);
        List<Double> xs = new ArrayList<>();
        List<Double> ys = new ArrayList<>();
        if (!Double.isNaN(sLow) && !Double.isNaN(sHigh)) {
            for (int i = 0; i < CURVE_POINTS; i++) {
                double s = sLow + (sHigh - sLow) * i / (CURVE_POINTS - 1.0);
                addPoint(xs, ys, "P", p, "S", s);
            }
        }
        return new Curve(family, label, xs, ys);
    }

    private List<Curve> isotherms() {
        List<Curve> out = new ArrayList<>();
        for (double t : niceLinearValues(limits.tTriple(), limits.tCrit() * 1.2, 8)) {
            List<Double> xs = new ArrayList<>();
            List<Double> ys = new ArrayList<>();
            double dGas = CoolProp.propsSIOrNaN("D", "T", t, "P", limits.pTriple() * 1.2, fluid);
            double dLiq = CoolProp.propsSIOrNaN("D", "T", t, "P", limits.pCrit() * 2.5, fluid);
            if (!Double.isNaN(dGas) && !Double.isNaN(dLiq) && dGas > 0 && dLiq > dGas) {
                for (double d : logSweep(dGas, dLiq, CURVE_POINTS)) {
                    addPoint(xs, ys, "T", t, "D", d);
                }
            }
            out.add(new Curve("isotherm", "T = " + Math.round(t) + " K", xs, ys));
        }
        return out;
    }

    /** Appends the (x, y) axis values of the state given by the input pair. */
    private void addPoint(List<Double> xs, List<Double> ys,
                          String key1, double v1, String key2, double v2) {
        double x = stateProp(kind.x, key1, v1, key2, v2);
        double y = stateProp(kind.y, key1, v1, key2, v2);
        if (Double.isNaN(x) || Double.isNaN(y)) {
            xs.add(null);
            ys.add(null);
        } else {
            xs.add(x);
            ys.add(y);
        }
    }

    private double stateProp(String axis, String key1, double v1, String key2, double v2) {
        String out = coolPropKey(axis);
        if (axis.equals("v")) {
            double d = CoolProp.propsSIOrNaN("D", key1, v1, key2, v2, fluid);
            return d > 0 ? 1.0 / d : Double.NaN;
        }
        return CoolProp.propsSIOrNaN(out, key1, v1, key2, v2, fluid);
    }

    private static String coolPropKey(String axis) {
        return switch (axis) {
            case "s" -> "Smass";
            case "h" -> "Hmass";
            case "v" -> "Dmass"; // inverted in stateProp
            case "T" -> "T";
            case "P" -> "P";
            default -> throw new IllegalArgumentException("Unknown axis property: " + axis);
        };
    }

    private static List<Double> logSweep(double from, double to, int points) {
        List<Double> out = new ArrayList<>(points);
        double logFrom = Math.log(from);
        double logTo = Math.log(to);
        for (int i = 0; i < points; i++) {
            out.add(Math.exp(logFrom + (logTo - logFrom) * i / (points - 1.0)));
        }
        return out;
    }

    /** Round values on a 1-2-5 progression covering [from, to]. */
    private static List<Double> niceLogValues(double from, double to, int maxCount) {
        List<Double> candidates = new ArrayList<>();
        double decade = Math.pow(10, Math.floor(Math.log10(from)));
        while (decade <= to) {
            for (double m : new double[] {1, 2, 5}) {
                double v = m * decade;
                if (v >= from && v <= to) {
                    candidates.add(v);
                }
            }
            decade *= 10;
        }
        return thin(candidates, maxCount);
    }

    /** Round step values (10/20/25/50... progression) covering [from, to]. */
    private static List<Double> niceLinearValues(double from, double to, int maxCount) {
        double rawStep = (to - from) / maxCount;
        double magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        double step = magnitude;
        for (double m : new double[] {1, 2, 2.5, 5, 10}) {
            if (m * magnitude >= rawStep) {
                step = m * magnitude;
                break;
            }
        }
        List<Double> out = new ArrayList<>();
        for (double v = Math.ceil(from / step) * step; v <= to; v += step) {
            out.add(v);
        }
        return out;
    }

    private static List<Double> thin(List<Double> values, int maxCount) {
        if (values.size() <= maxCount) {
            return values;
        }
        List<Double> out = new ArrayList<>(maxCount);
        for (int i = 0; i < maxCount; i++) {
            out.add(values.get(Math.round((float) i * (values.size() - 1) / (maxCount - 1))));
        }
        return out;
    }

    private static String formatPressure(double pascal) {
        if (pascal >= 1e6) {
            return trimNumber(pascal / 1e6) + " MPa";
        }
        if (pascal >= 1e3) {
            return trimNumber(pascal / 1e3) + " kPa";
        }
        return trimNumber(pascal) + " Pa";
    }

    private static String trimNumber(double v) {
        if (v == Math.rint(v)) {
            return String.valueOf((long) v);
        }
        return String.valueOf(v);
    }
}
