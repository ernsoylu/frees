package com.frees.backend.core.ode;

/**
 * The right-hand side of an explicit ODE system: given time {@code t} and the
 * state vector {@code y}, returns {@code dy/dt}. For a frees {@code DYNAMIC}
 * block this closure is built by the orchestrator — it writes the state vector
 * into the value map, solves the algebraic auxiliary block with {@code t} and
 * the states pinned (the shared per-step inner-solve), then evaluates each
 * {@code der(...)} right-hand side. All states therefore advance on one shared
 * step cursor — the multi-state capability the single-state {@code Integral()}
 * lacks.
 */
@FunctionalInterface
public interface OdeRhs {
    double[] eval(double t, double[] y);
}
