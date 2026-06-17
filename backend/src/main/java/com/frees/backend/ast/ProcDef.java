package com.frees.backend.ast;

import java.util.List;

/**
 * Top-level definition: FUNCTION, PROCEDURE, MODULE, or a tabulated curve.
 */
public sealed interface ProcDef
        permits ProcDef.FunctionDef, ProcDef.ProcedureDef, ProcDef.ModuleDef, ProcDef.FunctionTableDef {

    String name();

    /**
     * FUNCTION name(params) ... END
     * Returns a single value assigned to the function name via ':='.
     */
    record FunctionDef(String name, List<String> params, List<ProcStatement> body,
                       String outputUnit, List<String> paramUnits) implements ProcDef {
        /** Function without declared output/parameter units. */
        public FunctionDef(String name, List<String> params, List<ProcStatement> body) {
            this(name, params, body, null, null);
        }
    }

    /**
     * PROCEDURE name(inputs : outputs) ... END
     * Outputs are assigned via ':=' and injected as equations into the solver.
     */
    record ProcedureDef(String name, List<String> inputs, List<String> outputs,
                        List<ProcStatement> body) implements ProcDef {}

    /**
     * MODULE name(inputs : outputs) ... END
     * Body contains '=' equations that are grafted into the main equation system
     * with namespaced variable names to prevent collisions.
     */
    record ModuleDef(String name, List<String> inputs, List<String> outputs,
                     List<Statement> body) implements ProcDef {}

    /**
     * Tabulated function table defined by a Function Table (Epic 8): the table
     * name is the function name and the column names are the arguments —
     * the first column is the lookup argument (e.g. Re) and each further
     * column is one curve whose header holds the family parameter value
     * (e.g. T = 100, 200, ...). One curve evaluates name(x); a family
     * evaluates name(x, param) by interpolating across the curves
     * (see CurveInterpolator).
     */
    record FunctionTableDef(String name, List<String> argNames, boolean xLog, boolean yLog,
                            List<Curve> curves, String outputUnit, List<String> argUnits)
            implements ProcDef {
        /** Table without declared output/argument units. */
        public FunctionTableDef(String name, List<String> argNames, boolean xLog, boolean yLog,
                                List<Curve> curves) {
            this(name, argNames, xLog, yLog, curves, null, null);
        }
    }

    /** One tabulated curve: its family parameter value (null for a lone
     * curve) and sample arrays sorted ascending by x. */
    record Curve(Double param, double[] xs, double[] ys) {
        @Override
        public boolean equals(Object o) {
            return o instanceof Curve(Double p, double[] x, double[] y)
                    && java.util.Objects.equals(param, p)
                    && java.util.Arrays.equals(xs, x)
                    && java.util.Arrays.equals(ys, y);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(param,
                    java.util.Arrays.hashCode(xs), java.util.Arrays.hashCode(ys));
        }

        @Override
        public String toString() {
            return "Curve[param=" + param + ", xs=" + java.util.Arrays.toString(xs)
                    + ", ys=" + java.util.Arrays.toString(ys) + "]";
        }
    }
}
