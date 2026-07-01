package com.frees.backend.core.dae;

/**
 * The residual of an implicit DAE system {@code F(t, y, y') = 0} — Phase S1.
 *
 * <p>This is the frees-side shape of SUNDIALS IDA's {@code IDAResFn}. The
 * implementation writes the residual for the current {@code (t, y, yp)} into
 * {@code res} (length = system dimension). For a frees component network this
 * closure is assembled from the expanded scalar system: algebraic
 * connection/constitutive equations contribute {@code lhs − rhs} (no {@code y'}
 * term), while a capacitive volume's storage equation contributes
 * {@code y'[k] − rhs} — the {@code C-R-C} discipline (§2.2) keeps the index at 1.
 */
@FunctionalInterface
public interface DaeResidual {
    void eval(double t, double[] y, double[] yp, double[] res);
}
