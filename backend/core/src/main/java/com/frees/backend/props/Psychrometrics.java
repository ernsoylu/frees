package com.frees.backend.props;

import java.util.ArrayList;
import java.util.List;

/**
 * Psychrometric chart data via CoolProp's HAPropsSI, all SI. Dry-bulb
 * temperature on the x axis, humidity ratio (kg water / kg dry air) on the
 * y axis, at a fixed total pressure. Families follow the ASHRAE chart:
 * saturation line, constant relative humidity, constant wet-bulb, constant
 * mixture enthalpy and constant specific volume lines.
 */
public final class Psychrometrics {

    public record Chart(double pressure, double tMin, double tMax,
                        List<PropertyDiagrams.Curve> curves) {}

    private static final int POINTS = 50;
    /** Wet-bulb/enthalpy/volume lines are nearly straight; few samples needed. */
    private static final int LINE_POINTS = 12;

    private final double pressure;
    private final double tMin;
    private final double tMax;

    private Psychrometrics(double pressure, double tMin, double tMax) {
        this.pressure = pressure;
        this.tMin = tMin;
        this.tMax = tMax;
    }

    /** Standard chart range when not specified: 0-50 C dry bulb. */
    public static Chart generate(Double pressureOrNull, Double tMinOrNull, Double tMaxOrNull) {
        double p = pressureOrNull == null ? 101_325.0 : pressureOrNull;
        double lo = tMinOrNull == null ? 273.15 : tMinOrNull;
        double hi = tMaxOrNull == null ? 323.15 : tMaxOrNull;
        if (p <= 1000 || hi <= lo) {
            throw new IllegalArgumentException(
                    "Psychrometric chart needs pressure > 1 kPa and tMax > tMin (SI units)");
        }
        Psychrometrics gen = new Psychrometrics(p, lo, hi);
        List<PropertyDiagrams.Curve> curves = new ArrayList<>();
        curves.addAll(gen.relativeHumidityLines());
        curves.addAll(gen.wetBulbLines());
        curves.addAll(gen.enthalpyLines());
        curves.addAll(gen.volumeLines());
        return new Chart(p, lo, hi, curves);
    }

    /** RH from 10% to 100%; the 100% line is the saturation boundary. */
    private List<PropertyDiagrams.Curve> relativeHumidityLines() {
        List<PropertyDiagrams.Curve> out = new ArrayList<>();
        for (int pct = 10; pct <= 100; pct += 10) {
            double rh = pct / 100.0;
            List<Double> xs = new ArrayList<>();
            List<Double> ys = new ArrayList<>();
            for (int i = 0; i < POINTS; i++) {
                double t = tMin + (tMax - tMin) * i / (POINTS - 1.0);
                addPoint(xs, ys, t, "R", rh);
            }
            String family = pct == 100 ? "saturation" : "rh";
            String label = pct == 100 ? "Saturation" : "φ = " + pct + "%";
            out.add(new PropertyDiagrams.Curve(family, label, xs, ys));
        }
        return out;
    }

    private List<PropertyDiagrams.Curve> wetBulbLines() {
        List<PropertyDiagrams.Curve> out = new ArrayList<>();
        for (double twb = Math.ceil((tMin - 273.15) / 5) * 5;
                twb <= tMax - 273.15; twb += 5) {
            double twbK = twb + 273.15;
            // A wet-bulb line starts on the saturation curve at T = Twb.
            out.add(sweepLine("wetbulb", "T_wb = " + Math.round(twb) + " °C",
                    twbK, "B", twbK));
        }
        return out;
    }

    /** Sweeps W(Tdb) for a fixed third constraint from tStart to tMax. */
    private PropertyDiagrams.Curve sweepLine(String family, String label,
                                             double tStart, String key, double value) {
        List<Double> xs = new ArrayList<>();
        List<Double> ys = new ArrayList<>();
        double from = Math.max(tStart, tMin);
        for (int i = 0; i < LINE_POINTS; i++) {
            double t = from + (tMax - from) * i / (LINE_POINTS - 1.0);
            addPoint(xs, ys, t, key, value);
        }
        return new PropertyDiagrams.Curve(family, label, xs, ys);
    }

    private List<PropertyDiagrams.Curve> enthalpyLines() {
        double hMin = CoolProp.haPropsSIOrNaN("H", "T", tMin, "P", pressure, "R", 0.0);
        double hMax = CoolProp.haPropsSIOrNaN("H", "T", tMax, "P", pressure, "R", 1.0);
        List<PropertyDiagrams.Curve> out = new ArrayList<>();
        if (Double.isNaN(hMin) || Double.isNaN(hMax)) {
            return out;
        }
        double step = 10_000.0; // 10 kJ/kg dry air
        for (double h = Math.ceil(hMin / step) * step; h <= hMax; h += step) {
            // The line enters the chart where it crosses saturation.
            double tStart = CoolProp.haPropsSIOrNaN("T", "P", pressure, "H", h, "R", 1.0);
            if (Double.isNaN(tStart)) {
                tStart = tMin;
            }
            out.add(sweepLine("enthalpy", "h = " + Math.round(h / 1000) + " kJ/kg",
                    tStart, "H", h));
        }
        return out;
    }

    private List<PropertyDiagrams.Curve> volumeLines() {
        double vMin = CoolProp.haPropsSIOrNaN("V", "T", tMin, "P", pressure, "R", 0.0);
        double vMax = CoolProp.haPropsSIOrNaN("V", "T", tMax, "P", pressure, "R", 1.0);
        List<PropertyDiagrams.Curve> out = new ArrayList<>();
        if (Double.isNaN(vMin) || Double.isNaN(vMax)) {
            return out;
        }
        double step = 0.01;
        for (double v = Math.ceil(vMin / step) * step; v <= vMax; v += step) {
            double tStart = CoolProp.haPropsSIOrNaN("T", "P", pressure, "V", v, "R", 1.0);
            if (Double.isNaN(tStart)) {
                tStart = tMin;
            }
            out.add(sweepLine("volume", "v = " + String.format("%.2f", v) + " m³/kg",
                    tStart, "V", v));
        }
        return out;
    }

    /**
     * Humidity ratio at (Tdb, P, third constraint). Lines never exceed
     * saturation because RH inputs are bounded at 1 and the other families
     * start their sweep at the saturation intersection.
     */
    private void addPoint(List<Double> xs, List<Double> ys,
                          double t, String key, double value) {
        double w = CoolProp.haPropsSIOrNaN("W", "T", t, "P", pressure, key, value);
        if (Double.isNaN(w) || w < 0) {
            xs.add(null);
            ys.add(null);
            return;
        }
        xs.add(t);
        ys.add(w);
    }
}
