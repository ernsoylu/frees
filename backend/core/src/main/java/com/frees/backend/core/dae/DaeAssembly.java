package com.frees.backend.core.dae;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * A fully-assembled implicit DAE {@code F(t, y, y') = 0} produced from a frees
 * expanded scalar system (a classified {@code DYNAMIC} block) — the
 * frees-to-IDA bridge of Phase&nbsp;S1.
 *
 * <p>The state vector is laid out as {@code y = [differential states … ;
 * algebraic auxiliaries …]}. A capacitive (storage) state {@code X} contributes
 * a {@code der(X)} term that maps to {@code y'[stateIndex(X)]}; every other
 * equation is algebraic. By the {@code C-R-C} discipline (§2.2) the system is
 * index-1 and square: there is exactly one residual per unknown.
 *
 * @param n          system dimension ({@code states + auxiliaries})
 * @param variables  the {@code y} variable names in layout order (states then aux)
 * @param states     the differential-state names (prefix of {@code variables})
 * @param aux        the algebraic-auxiliary names (suffix of {@code variables})
 * @param id         differential/algebraic marker per state: {@code 1.0} differential, {@code 0.0} algebraic (for {@code IDASetId} / {@code IDA_YA_YDP_INIT})
 * @param residual   the residual closure
 * @param y0         initial {@code y} (state initials; aux seeded or zero)
 * @param yp0        initial {@code y'} guess (state derivatives seeded or zero; aux unused)
 * @param sparsity   per-row column dependency lists (combined ∂F/∂y + ∂F/∂y' pattern) for KLU
 * @param rootFn     switching functions for §4.8 Tier-2 events, or {@code null}
 * @param eventNames event names aligned with {@code rootFn}
 * @param eventStops whether each event halts integration
 */
public record DaeAssembly(
        int n,
        List<String> variables,
        List<String> states,
        List<String> aux,
        double[] id,
        DaeResidual residual,
        double[] y0,
        double[] yp0,
        int[][] sparsity,
        DaeRootFn rootFn,
        List<String> eventNames,
        boolean[] eventStops) {

    public int eventCount() {
        return eventNames == null ? 0 : eventNames.size();
    }

    // equals/hashCode/toString consider array contents (closures by reference) — java:S6218.
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof DaeAssembly other)) {
            return false;
        }
        return n == other.n
                && Objects.equals(variables, other.variables)
                && Objects.equals(states, other.states)
                && Objects.equals(aux, other.aux)
                && Arrays.equals(id, other.id)
                && Objects.equals(residual, other.residual)
                && Arrays.equals(y0, other.y0)
                && Arrays.equals(yp0, other.yp0)
                && Arrays.deepEquals(sparsity, other.sparsity)
                && Objects.equals(rootFn, other.rootFn)
                && Objects.equals(eventNames, other.eventNames)
                && Arrays.equals(eventStops, other.eventStops);
    }

    @Override
    public int hashCode() {
        int result = Objects.hash(n, variables, states, aux, residual, rootFn, eventNames);
        result = 31 * result + Arrays.hashCode(id);
        result = 31 * result + Arrays.hashCode(y0);
        result = 31 * result + Arrays.hashCode(yp0);
        result = 31 * result + Arrays.deepHashCode(sparsity);
        result = 31 * result + Arrays.hashCode(eventStops);
        return result;
    }

    @Override
    public String toString() {
        return "DaeAssembly[n=" + n + ", variables=" + variables + ", states=" + states
                + ", aux=" + aux + ", id=" + Arrays.toString(id) + ", residual=" + residual
                + ", y0=" + Arrays.toString(y0) + ", yp0=" + Arrays.toString(yp0)
                + ", sparsity=" + Arrays.deepToString(sparsity) + ", rootFn=" + rootFn
                + ", eventNames=" + eventNames + ", eventStops=" + Arrays.toString(eventStops) + "]";
    }
}
