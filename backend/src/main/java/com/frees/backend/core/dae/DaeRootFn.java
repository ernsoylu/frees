package com.frees.backend.core.dae;

/**
 * Event (root) functions {@code g(t, y, y')} monitored for sign changes during a
 * DAE integration — Phase S1, the frees-side shape of IDA's {@code IDARootFn}.
 *
 * <p>These carry the §4.8 <em>Tier-2</em> structural events only: zone collapse
 * ({@code L_zone − ε}) and valve open/close. The high-frequency Tier-1 crossings
 * (saturation kinks, flow reversal) are <b>not</b> events — they are regularized
 * into the smooth residual/property path and integrated straight through.
 */
@FunctionalInterface
public interface DaeRootFn {
    /** Writes the {@code nroots} switching-function values at {@code (t,y,yp)} into {@code gout}. */
    void eval(double t, double[] y, double[] yp, double[] gout);
}
